"""
Dynamic High-Performance Ingestion Engine.
Supports ANY banking transaction CSV export with dynamic column alias mapping (schema_map.yaml),
streaming SHA-256 verification, and automated downstream feature/ML self-training.
"""

import os
import hashlib
import time
import csv
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, Callable, List
import duckdb
import numpy as np

from backend.app.core.telemetry import telemetry
from backend.app.core.config import config

DB_PATH = Path("data/duckdb/vajra.duckdb")
PARQUET_PATH = Path("data/parquet/normalised_txns.parquet")
DICT_PATH = Path("data/cache/account_dict.npz")

def compute_file_sha256(filepath: str, block_size: int = 65536) -> str:
    """Stream SHA-256 computation to avoid high RAM usage."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        for block in iter(lambda: f.read(block_size), b""):
            hasher.update(block)
    return hasher.hexdigest()

def resolve_csv_columns(csv_path: str) -> Dict[str, str]:
    """
    Read the header row of any CSV and match against canonical columns using schema_map.yaml.
    """
    with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        headers = next(reader)

    header_lower_map = {h.strip().lower(): h.strip() for h in headers}
    mapping_rules = config.schema_map

    resolved = {}
    canonical_keys = [
        "txn_id", "src_account", "dst_account", "src_ifsc", "dst_ifsc",
        "amount", "timestamp", "payment_mode", "narration", "ip_address", "device_type"
    ]

    for key in canonical_keys:
        aliases = mapping_rules.get(key, [key])
        found_col = None
        for alias in aliases:
            if alias.lower() in header_lower_map:
                found_col = header_lower_map[alias.lower()]
                break
        resolved[key] = found_col

    return resolved

class IngestEngine:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = str(db_path) if db_path else str(DB_PATH)
        self.conn: Optional[duckdb.DuckDBPyConnection] = None
        self.dataset_name: str = "VoidHacks8_MuleAccount_2M_Transactions.csv"
        self.dataset_sha256: str = ""
        self.account_to_id: Dict[str, int] = {}
        self.id_to_account: np.ndarray = np.array([], dtype=object)

    def get_connection(self) -> duckdb.DuckDBPyConnection:
        if self.conn is None:
            self.conn = duckdb.connect(self.db_path)
            self.conn.execute("PRAGMA threads=8;")
            self.conn.execute("PRAGMA memory_limit='4GB';")
        return self.conn

    def ingest_csv(
        self,
        csv_path: str,
        dataset_label: Optional[str] = None,
        progress_callback: Optional[Callable[[str, int, float, float], None]] = None
    ) -> Dict[str, Any]:
        """
        Ingest ANY bulk transaction CSV dynamically.
        Maps columns, normalizes accounts & amounts, builds CSR, and triggers model self-training.
        """
        telemetry.start_timer()
        t0 = time.perf_counter()
        self.dataset_name = dataset_label or os.path.basename(csv_path)

        if progress_callback:
            progress_callback("Calculating SHA-256 Digital Custody Hash", 0, 0.0, telemetry.current_ram_mb)

        self.dataset_sha256 = compute_file_sha256(csv_path)

        # Resolve columns dynamically using schema_map.yaml
        col_map = resolve_csv_columns(csv_path)

        # SQL expressions with fallback defaults if optional columns are absent in non-standard CSVs
        c_txn = f'"{col_map["txn_id"]}"' if col_map.get("txn_id") else "CONCAT('TXN_', ROW_NUMBER() OVER ())"
        c_src = f'"{col_map["src_account"]}"' if col_map.get("src_account") else "'UNKNOWN_SRC'"
        c_dst = f'"{col_map["dst_account"]}"' if col_map.get("dst_account") else "'UNKNOWN_DST'"
        c_s_ifsc = f'"{col_map["src_ifsc"]}"' if col_map.get("src_ifsc") else "'SBIN0001000'"
        c_d_ifsc = f'"{col_map["dst_ifsc"]}"' if col_map.get("dst_ifsc") else "'HDFC0001000'"
        c_amt = f'"{col_map["amount"]}"' if col_map.get("amount") else "100.0"
        c_ts = f'"{col_map["timestamp"]}"' if col_map.get("timestamp") else "CURRENT_TIMESTAMP"
        c_mode = f'"{col_map["payment_mode"]}"' if col_map.get("payment_mode") else "'UPI'"
        c_narr = f'"{col_map["narration"]}"' if col_map.get("narration") else "'TRANSFER'"
        c_ip = f'"{col_map["ip_address"]}"' if col_map.get("ip_address") else "'127.0.0.1'"
        c_dev = f'"{col_map["device_type"]}"' if col_map.get("device_type") else "'Android'"

        conn = self.get_connection()

        if progress_callback:
            progress_callback("Parsing & Normalizing Dynamic Columns in DuckDB", 0, 0.0, telemetry.current_ram_mb)

        conn.execute("DROP TABLE IF EXISTS raw_txns;")
        conn.execute("DROP TABLE IF EXISTS accounts;")
        conn.execute("DROP TABLE IF EXISTS txns;")
        conn.execute("DROP TABLE IF EXISTS dataset_meta;")

        # Read CSV dynamically
        conn.execute(f"""
            CREATE TABLE raw_txns AS
            SELECT 
                CAST({c_txn} AS VARCHAR) AS txn_id,
                LPAD(CAST({c_src} AS VARCHAR), 12, '0') AS src_acct,
                LPAD(CAST({c_dst} AS VARCHAR), 12, '0') AS dst_acct,
                UPPER(CAST({c_s_ifsc} AS VARCHAR)) AS src_ifsc,
                UPPER(CAST({c_d_ifsc} AS VARCHAR)) AS dst_ifsc,
                CAST({c_amt} AS DOUBLE) AS amount,
                CAST({c_ts} AS TIMESTAMP) AS ts,
                UPPER(CAST({c_mode} AS VARCHAR)) AS payment_mode,
                CAST({c_narr} AS VARCHAR) AS narration,
                CAST({c_ip} AS VARCHAR) AS ip,
                CAST({c_dev} AS VARCHAR) AS device_type
            FROM read_csv(
                '{csv_path}',
                header=true,
                parallel=true,
                ignore_errors=false
            );
        """)

        total_rows = conn.execute("SELECT count(*) FROM raw_txns;").fetchone()[0]
        t_read = time.perf_counter()
        rate_read = total_rows / max(0.001, (t_read - t0))

        if progress_callback:
            progress_callback("Indexing Unique Accounts", total_rows, rate_read, telemetry.current_ram_mb)

        # Unique Account dictionary
        conn.execute("""
            CREATE TABLE accounts AS
            WITH distinct_accts AS (
                SELECT src_acct AS acct_no, src_ifsc AS ifsc FROM raw_txns
                UNION
                SELECT dst_acct AS acct_no, dst_ifsc AS ifsc FROM raw_txns
            )
            SELECT 
                ROW_NUMBER() OVER (ORDER BY acct_no) - 1 AS acct_id,
                acct_no,
                FIRST(ifsc) AS primary_ifsc,
                LEFT(FIRST(ifsc), 4) AS primary_bank
            FROM distinct_accts
            GROUP BY acct_no;
        """)

        total_accounts = conn.execute("SELECT count(*) FROM accounts;").fetchone()[0]

        if progress_callback:
            progress_callback("Constructing Sorted Transaction Relational Engine", total_rows, rate_read, telemetry.current_ram_mb)

        # Sorted txns table with dense integer IDs
        conn.execute("""
            CREATE TABLE txns AS
            SELECT 
                r.txn_id,
                a_src.acct_id AS src_id,
                a_dst.acct_id AS dst_id,
                r.src_acct,
                r.dst_acct,
                r.src_ifsc,
                r.dst_ifsc,
                LEFT(r.src_ifsc, 4) AS src_bank,
                LEFT(r.dst_ifsc, 4) AS dst_bank,
                r.amount,
                CAST(ROUND(r.amount * 100) AS BIGINT) AS amount_paise,
                r.ts,
                CAST(epoch(r.ts) AS BIGINT) AS ts_epoch,
                r.payment_mode,
                r.narration,
                r.ip,
                (r.ip LIKE '185.%' OR r.ip LIKE '194.%') AS ip_foreign,
                r.device_type,
                (r.device_type IN ('Web_Emulator', 'Linux_Script')) AS device_headless
            FROM raw_txns r
            JOIN accounts a_src ON r.src_acct = a_src.acct_no
            JOIN accounts a_dst ON r.dst_acct = a_dst.acct_no
            ORDER BY src_id, ts;
        """)

        conn.execute("DROP TABLE raw_txns;")

        # Save metadata record
        conn.execute(f"""
            CREATE TABLE dataset_meta AS
            SELECT 
                '{self.dataset_name}' AS dataset_name,
                '{self.dataset_sha256}' AS dataset_sha256,
                {total_rows} AS total_rows,
                {total_accounts} AS total_accounts,
                CURRENT_TIMESTAMP AS ingested_at;
        """)

        # Parquet Cache
        PARQUET_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn.execute(f"COPY txns TO '{PARQUET_PATH}' (FORMAT PARQUET, COMPRESSION ZSTD);")

        # Memory dictionary
        acct_rows = conn.execute("SELECT acct_id, acct_no FROM accounts ORDER BY acct_id;").fetchall()
        self.id_to_account = np.array([r[1] for r in acct_rows], dtype=object)
        self.account_to_id = {r[1]: r[0] for r in acct_rows}

        DICT_PATH.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(DICT_PATH, id_to_account=self.id_to_account)

        if progress_callback:
            progress_callback("Computing Behavioural & Pass-Through Features", total_rows, rate_read, telemetry.current_ram_mb)

        # Automatically execute Downstream Feature Extraction & Scoring
        from backend.app.detect.features import feature_engine
        from backend.app.detect.rules import rule_scoring_engine
        from backend.app.graph.csr import csr_graph
        from backend.app.detect.isolation_detector import isolation_detector

        feature_engine.compute_features(conn)
        rule_scoring_engine.compute_scores(conn)
        csr_graph.build_from_duckdb(conn)

        if progress_callback:
            progress_callback("Fitting Unsupervised Isolation Forest & TreeSHAP Explainer", total_rows, rate_read, telemetry.current_ram_mb)

        isolation_detector.train_unsupervised_model(conn)

        total_time = time.perf_counter() - t0
        peak_ram = telemetry.peak_ram_mb

        stats = {
            "dataset_name": self.dataset_name,
            "dataset_sha256": self.dataset_sha256,
            "total_transactions": total_rows,
            "total_accounts": total_accounts,
            "ingest_time_seconds": round(total_time, 2),
            "rows_per_second": int(total_rows / max(0.001, total_time)),
            "peak_ram_mb": round(peak_ram, 2)
        }

        if progress_callback:
            progress_callback("Dataset Ingestion & Model Adaptation Complete", total_rows, stats["rows_per_second"], peak_ram)

        return stats

ingest_engine = IngestEngine()
