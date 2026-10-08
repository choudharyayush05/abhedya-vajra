"""
High-Speed In-Memory CSR Graph Traversal Engine.
Provides sub-second multi-hop BFS and FIFO Taint Tracking for 25,000 accounts and 2,000,000 transactions.
"""

import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Set
import numpy as np
import duckdb

CACHE_DIR = Path("data/cache")

class CSRGraph:
    def __init__(self):
        self.num_nodes: int = 0
        self.num_edges: int = 0
        self.indptr: np.ndarray = np.array([], dtype=np.int32)
        self.dst_indices: np.ndarray = np.array([], dtype=np.int32)
        self.edge_amounts_paise: np.ndarray = np.array([], dtype=np.int64)
        self.edge_ts_epoch: np.ndarray = np.array([], dtype=np.int64)
        self.edge_txn_ids: np.ndarray = np.array([], dtype=object)
        self.edge_foreign_ip: np.ndarray = np.array([], dtype=bool)
        self.edge_headless: np.ndarray = np.array([], dtype=bool)
        self.edge_narrations: np.ndarray = np.array([], dtype=object)
        self.edge_modes: np.ndarray = np.array([], dtype=object)

        # Dictionary mappings
        self.id_to_account: np.ndarray = np.array([], dtype=object)
        self.account_to_id: Dict[str, int] = {}
        self.account_meta: Dict[int, Dict[str, Any]] = {}

    def is_built(self) -> bool:
        return self.num_nodes > 0 and len(self.indptr) > 0

    def build_from_duckdb(self, conn: duckdb.DuckDBPyConnection) -> None:
        """Build CSR arrays directly from DuckDB sorted txns table."""
        t0 = time.perf_counter()

        # 1. Fetch account metadata
        acct_rows = conn.execute("SELECT acct_id, acct_no, primary_ifsc, primary_bank FROM accounts ORDER BY acct_id;").fetchall()
        self.num_nodes = len(acct_rows)
        self.id_to_account = np.array([r[1] for r in acct_rows], dtype=object)
        self.account_to_id = {r[1]: r[0] for r in acct_rows}
        self.account_meta = {
            r[0]: {"acct_no": r[1], "ifsc": r[2], "bank": r[3]}
            for r in acct_rows
        }

        # 2. Fetch sorted edges: ORDER BY src_id, ts
        df = conn.execute("""
            SELECT 
                src_id, 
                dst_id, 
                amount_paise, 
                ts_epoch, 
                txn_id, 
                ip_foreign, 
                device_headless, 
                narration, 
                payment_mode
            FROM txns
            ORDER BY src_id, ts_epoch;
        """).fetch_df()

        self.num_edges = len(df)
        src_ids = df["src_id"].to_numpy(dtype=np.int32)
        self.dst_indices = df["dst_id"].to_numpy(dtype=np.int32)
        self.edge_amounts_paise = df["amount_paise"].to_numpy(dtype=np.int64)
        self.edge_ts_epoch = df["ts_epoch"].to_numpy(dtype=np.int64)
        self.edge_txn_ids = df["txn_id"].to_numpy(dtype=object)
        self.edge_foreign_ip = df["ip_foreign"].to_numpy(dtype=bool)
        self.edge_headless = df["device_headless"].to_numpy(dtype=bool)
        self.edge_narrations = df["narration"].to_numpy(dtype=object)
        self.edge_modes = df["payment_mode"].to_numpy(dtype=object)

        # 3. Construct indptr array (size N + 1)
        counts = np.bincount(src_ids, minlength=self.num_nodes)
        self.indptr = np.zeros(self.num_nodes + 1, dtype=np.int32)
        self.indptr[1:] = np.cumsum(counts)

        # Save to disk for instantaneous reloading
        self.save_cache()
        t_elapsed = time.perf_counter() - t0
        print(f"CSR Graph built in {t_elapsed:.2f}s: {self.num_nodes:,} nodes, {self.num_edges:,} edges.")

    def save_cache(self) -> None:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            CACHE_DIR / "csr_graph.npz",
            indptr=self.indptr,
            dst_indices=self.dst_indices,
            edge_amounts_paise=self.edge_amounts_paise,
            edge_ts_epoch=self.edge_ts_epoch,
            id_to_account=self.id_to_account
        )

    def load_cache(self, conn: Optional[duckdb.DuckDBPyConnection] = None) -> bool:
        cache_file = CACHE_DIR / "csr_graph.npz"
        if not cache_file.exists():
            return False
        data = np.load(cache_file, allow_pickle=True)
        self.indptr = data["indptr"]
        self.dst_indices = data["dst_indices"]
        self.edge_amounts_paise = data["edge_amounts_paise"]
        self.edge_ts_epoch = data["edge_ts_epoch"]
        self.id_to_account = data["id_to_account"]
        self.num_nodes = len(self.id_to_account)
        self.num_edges = len(self.dst_indices)
        self.account_to_id = {acct: idx for idx, acct in enumerate(self.id_to_account)}

        if conn:
            acct_rows = conn.execute("SELECT acct_id, acct_no, primary_ifsc, primary_bank FROM accounts;").fetchall()
            self.account_meta = {
                r[0]: {"acct_no": r[1], "ifsc": r[2], "bank": r[3]}
                for r in acct_rows
            }
        return True

    def trace_victim(
        self,
        victim_acct: str,
        start_ts_epoch: Optional[int] = None,
        max_hops: int = 4,
        max_wait_hours: int = 72,
        min_amount_fraction: float = 0.005,
        frontier_cap: int = 3000
    ) -> Dict[str, Any]:
        """
        Sub-second, time-respecting Multi-Hop Trace with FIFO Taint Lots.
        """
        t0 = time.perf_counter()

        v_clean = victim_acct.strip()
        victim_id = self.account_to_id.get(v_clean)
        if victim_id is None:
            victim_id = self.account_to_id.get(v_clean.upper())
        if victim_id is None:
            v_lower = v_clean.lower()
            for acct, aid in self.account_to_id.items():
                if acct.lower() == v_lower:
                    victim_id = aid
                    v_clean = acct
                    break
        if victim_id is None:
            return {"error": f"Victim account {victim_acct} not found in database."}
        victim_acct = v_clean

        max_wait_sec = max_wait_hours * 3600

        # Find initial fraudulent outgoing transactions from victim if not supplied
        v_start = self.indptr[victim_id]
        v_end = self.indptr[victim_id + 1]

        if v_start == v_end:
            return {"error": f"No outgoing transactions recorded for victim account {victim_acct}."}

        # Select initial outgoing transfers (or filter by start_ts_epoch)
        victim_edges_idx = np.arange(v_start, v_end)
        if start_ts_epoch is not None:
            mask = self.edge_ts_epoch[victim_edges_idx] >= start_ts_epoch
            victim_edges_idx = victim_edges_idx[mask]

        if len(victim_edges_idx) == 0:
            return {"error": f"No outgoing transactions from {victim_acct} after selected timestamp."}

        # Calculate initial victim loss
        initial_loss_paise = int(np.sum(self.edge_amounts_paise[victim_edges_idx]))
        min_prune_paise = min(int(initial_loss_paise * min_amount_fraction), 100000) # Cap at ₹1,000 so micro-smurfing isn't pruned

        # BFS state
        # frontier: dict of acct_id -> list of lots [(amount_paise, arrival_ts)]
        # visited_edges: list of recorded graph edges
        recorded_edges: List[Dict[str, Any]] = []
        node_taint_in: Dict[int, int] = {victim_id: initial_loss_paise}
        node_taint_out: Dict[int, int] = {victim_id: initial_loss_paise}
        node_hop: Dict[int, int] = {victim_id: 0}
        node_first_seen: Dict[int, int] = {victim_id: int(self.edge_ts_epoch[victim_edges_idx[0]])}

        # Initial frontier: downstream recipients of victim
        current_frontier: Dict[int, List[Tuple[int, int]]] = {}

        for e_idx in victim_edges_idx:
            dst = int(self.dst_indices[e_idx])
            amt = int(self.edge_amounts_paise[e_idx])
            ts = int(self.edge_ts_epoch[e_idx])
            txn_id = str(self.edge_txn_ids[e_idx]) if len(self.edge_txn_ids) > 0 else f"TXN_{e_idx}"

            recorded_edges.append({
                "txn_id": txn_id,
                "src_id": victim_id,
                "dst_id": dst,
                "src_acct": victim_acct,
                "dst_acct": str(self.id_to_account[dst]),
                "amount_paise": amt,
                "taint_paise": amt,
                "ts_epoch": ts,
                "hop": 1,
                "narration": str(self.edge_narrations[e_idx]) if len(self.edge_narrations) > 0 else "",
                "payment_mode": str(self.edge_modes[e_idx]) if len(self.edge_modes) > 0 else "UPI",
                "ip_foreign": bool(self.edge_foreign_ip[e_idx]) if len(self.edge_foreign_ip) > 0 else False,
                "device_headless": bool(self.edge_headless[e_idx]) if len(self.edge_headless) > 0 else False
            })

            node_taint_in[dst] = node_taint_in.get(dst, 0) + amt
            node_hop[dst] = 1
            if dst not in node_first_seen or ts < node_first_seen[dst]:
                node_first_seen[dst] = ts

            if dst not in current_frontier:
                current_frontier[dst] = []
            current_frontier[dst].append((amt, ts))

        # Hop 2, 3, 4 BFS Traversal with FIFO Taint
        for hop in range(2, max_hops + 1):
            next_frontier: Dict[int, List[Tuple[int, int]]] = {}

            # Sort frontier nodes by total available taint descending to obey frontier cap
            sorted_nodes = sorted(
                current_frontier.keys(),
                key=lambda u: sum(lot[0] for lot in current_frontier[u]),
                reverse=True
            )[:frontier_cap]

            for u in sorted_nodes:
                lots = current_frontier[u]
                if not lots:
                    continue

                earliest_lot_ts = min(lot[1] for lot in lots)
                latest_allowed_ts = earliest_lot_ts + max_wait_sec

                u_start = self.indptr[u]
                u_end = self.indptr[u + 1]
                if u_start == u_end:
                    continue

                # Scan outgoing edges of u that happened AFTER the earliest incoming lot
                for e_idx in range(u_start, u_end):
                    e_ts = int(self.edge_ts_epoch[e_idx])
                    if e_ts < earliest_lot_ts:
                        continue
                    if e_ts > latest_allowed_ts:
                        break

                    e_amt = int(self.edge_amounts_paise[e_idx])
                    e_dst = int(self.dst_indices[e_idx])

                    # FIFO Taint consumption: take funds from lots that arrived BEFORE e_ts
                    consumed_taint = 0
                    remaining_edge_cap = e_amt

                    new_lots = []
                    for lot_amt, lot_ts in lots:
                        if remaining_edge_cap <= 0 or lot_ts > e_ts:
                            new_lots.append((lot_amt, lot_ts))
                        else:
                            take = min(lot_amt, remaining_edge_cap)
                            consumed_taint += take
                            remaining_edge_cap -= take
                            if lot_amt > take:
                                new_lots.append((lot_amt - take, lot_ts))
                    lots = new_lots

                    if consumed_taint >= min_prune_paise:
                        txn_id = str(self.edge_txn_ids[e_idx]) if len(self.edge_txn_ids) > 0 else f"TXN_{e_idx}"
                        recorded_edges.append({
                            "txn_id": txn_id,
                            "src_id": u,
                            "dst_id": e_dst,
                            "src_acct": str(self.id_to_account[u]),
                            "dst_acct": str(self.id_to_account[e_dst]),
                            "amount_paise": e_amt,
                            "taint_paise": consumed_taint,
                            "ts_epoch": e_ts,
                            "hop": hop,
                            "narration": str(self.edge_narrations[e_idx]) if len(self.edge_narrations) > 0 else "",
                            "payment_mode": str(self.edge_modes[e_idx]) if len(self.edge_modes) > 0 else "UPI",
                            "ip_foreign": bool(self.edge_foreign_ip[e_idx]) if len(self.edge_foreign_ip) > 0 else False,
                            "device_headless": bool(self.edge_headless[e_idx]) if len(self.edge_headless) > 0 else False
                        })

                        node_taint_out[u] = node_taint_out.get(u, 0) + consumed_taint
                        node_taint_in[e_dst] = node_taint_in.get(e_dst, 0) + consumed_taint

                        if e_dst not in node_hop:
                            node_hop[e_dst] = hop
                        if e_dst not in node_first_seen or e_ts < node_first_seen[e_dst]:
                            node_first_seen[e_dst] = e_ts

                        if e_dst not in next_frontier:
                            next_frontier[e_dst] = []
                        next_frontier[e_dst].append((consumed_taint, e_ts))

                    if not lots:
                        break

            current_frontier = next_frontier
            if not current_frontier:
                break

        # Compute remaining held balance per node: held = taint_in - taint_out
        nodes_result = []
        freeze_list = []
        total_held_paise = 0
        total_cashed_out_paise = 0

        for nid, hop in node_hop.items():
            acct_no = str(self.id_to_account[nid])
            tin = node_taint_in.get(nid, 0)
            tout = node_taint_out.get(nid, 0)
            held = max(0, tin - tout)
            meta = self.account_meta.get(nid, {})

            # Layer assignment: 0: Victim, 1: Collector (L1), 2: Distributor (L2), 3+: Terminal (L3)
            if hop == 0:
                layer = "Victim"
            elif hop == 1:
                layer = "L1_Collector"
            elif hop == 2:
                layer = "L2_Distributor"
            else:
                layer = "L3_Terminal"

            is_terminal = (tout == 0) and (hop > 0)
            if is_terminal and held == 0:
                total_cashed_out_paise += tin
            elif held > 0 and hop > 0:
                total_held_paise += held
                freeze_list.append({
                    "acct_no": acct_no,
                    "bank": meta.get("bank", acct_no[:4]),
                    "ifsc": meta.get("ifsc", ""),
                    "layer": layer,
                    "hop": hop,
                    "held_paise": held,
                    "held_inr": round(held / 100.0, 2),
                    "coverage_pct": round((held / max(1, initial_loss_paise)) * 100, 2)
                })

            nodes_result.append({
                "acct_id": nid,
                "acct_no": acct_no,
                "bank": meta.get("bank", acct_no[:4]),
                "ifsc": meta.get("ifsc", ""),
                "layer": layer,
                "hop": hop,
                "taint_in_paise": tin,
                "taint_out_paise": tout,
                "held_paise": held,
                "first_seen_epoch": node_first_seen.get(nid, 0)
            })

        # Sort freeze list by recoverable held amount descending
        freeze_list.sort(key=lambda x: x["held_paise"], reverse=True)

        trace_elapsed = time.perf_counter() - t0

        return {
            "trace_id": f"TRC_{int(time.time()*1000)}",
            "victim_account": victim_acct,
            "initial_loss_paise": initial_loss_paise,
            "initial_loss_inr": round(initial_loss_paise / 100.0, 2),
            "total_held_paise": total_held_paise,
            "total_held_inr": round(total_held_paise / 100.0, 2),
            "total_cashed_out_paise": total_cashed_out_paise,
            "total_cashed_out_inr": round(total_cashed_out_paise / 100.0, 2),
            "recovery_potential_pct": round((total_held_paise / max(1, initial_loss_paise)) * 100, 2),
            "timing_ms": round(trace_elapsed * 1000, 2),
            "num_nodes": len(nodes_result),
            "num_edges": len(recorded_edges),
            "nodes": nodes_result,
            "edges": recorded_edges,
            "freeze_recommendations": freeze_list
        }

csr_graph = CSRGraph()
