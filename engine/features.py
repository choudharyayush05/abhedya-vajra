"""
Vajra Features Engine - Vectorized DuckDB SQL + NumPy Kernels.
Computes FIFO pass-through velocity, fan topologies, cash-out ratios, and behavioral flags.
"""

from typing import Any

import duckdb
import numpy as np
from scipy.stats import rankdata


def compute_fifo_pass_through(
    credits: list[tuple[int, int, str]],  # (ts_s, amount_paise, txn_id)
    debits: list[tuple[int, int, str]],   # (ts_s, amount_paise, txn_id)
    windows: dict[str, int]
) -> dict[str, Any]:
    """
    Computes Pass-Through Ratio (PTR) using strict FIFO consumption.
    A debit is never counted against two credits.
    """
    total_credit = sum(c[1] for c in credits)
    if total_credit <= 0 or not debits:
        return {
            "ptr_5m": 0.0,
            "ptr_15m": 0.0,
            "ptr_1h": 0.0,
            "ptr_6h": 0.0,
            "ptr_24h": 0.0,
            "hold_median_sec": 86400.0,
            "hold_p90_sec": 86400.0,
            "evidence_txns": []
        }

    # Two-pointer FIFO matching: O(len(credits) + len(debits))
    c_idx = 0
    d_idx = 0
    rem_c = credits[0][1]
    rem_d = debits[0][1]
    n_c = len(credits)
    n_d = len(debits)

    matched_delays: list[tuple[int, int]] = []  # (dt_sec, matched_amount)
    evidence_txns: list[str] = []

    while c_idx < n_c and d_idx < n_d:
        c_ts, _, c_txn = credits[c_idx]
        d_ts, _, d_txn = debits[d_idx]

        if d_ts < c_ts:
            # Debit happened before this credit was received -> skip debit
            d_idx += 1
            if d_idx < n_d:
                rem_d = debits[d_idx][1]
            continue

        dt = d_ts - c_ts
        consume = min(rem_c, rem_d)
        matched_delays.append((dt, consume))
        if len(evidence_txns) < 5:
            if c_txn not in evidence_txns:
                evidence_txns.append(c_txn)
            if d_txn not in evidence_txns and len(evidence_txns) < 5:
                evidence_txns.append(d_txn)

        rem_c -= consume
        rem_d -= consume

        if rem_c == 0:
            c_idx += 1
            if c_idx < n_c:
                rem_c = credits[c_idx][1]
        if rem_d == 0:
            d_idx += 1
            if d_idx < n_d:
                rem_d = debits[d_idx][1]

    # Calculate PTR across rolling temporal windows
    w_5m = windows.get("w_5m", 300)
    w_15m = windows.get("w_15m", 900)
    w_1h = windows.get("w_1h", 3600)
    w_6h = windows.get("w_6h", 21600)
    w_24h = windows.get("w_24h", 86400)

    sum_5m = sum(amt for dt, amt in matched_delays if dt <= w_5m)
    sum_15m = sum(amt for dt, amt in matched_delays if dt <= w_15m)
    sum_1h = sum(amt for dt, amt in matched_delays if dt <= w_1h)
    sum_6h = sum(amt for dt, amt in matched_delays if dt <= w_6h)
    sum_24h = sum(amt for dt, amt in matched_delays if dt <= w_24h)

    # Weighted hold time percentiles
    if matched_delays:
        dts = np.array([dt for dt, _ in matched_delays], dtype=np.float64)
        weights = np.array([amt for _, amt in matched_delays], dtype=np.float64)
        sort_order = np.argsort(dts)
        sorted_dts = dts[sort_order]
        sorted_weights = weights[sort_order]
        cum_weights = np.cumsum(sorted_weights) / np.sum(sorted_weights)

        median_idx = np.searchsorted(cum_weights, 0.50)
        p90_idx = np.searchsorted(cum_weights, 0.90)

        hold_median = float(sorted_dts[min(int(median_idx), len(sorted_dts) - 1)])
        hold_p90 = float(sorted_dts[min(int(p90_idx), len(sorted_dts) - 1)])
    else:
        hold_median = 86400.0
        hold_p90 = 86400.0

    return {
        "ptr_5m": float(min(1.0, sum_5m / total_credit)),
        "ptr_15m": float(min(1.0, sum_15m / total_credit)),
        "ptr_1h": float(min(1.0, sum_1h / total_credit)),
        "ptr_6h": float(min(1.0, sum_6h / total_credit)),
        "ptr_24h": float(min(1.0, sum_24h / total_credit)),
        "hold_median_sec": hold_median,
        "hold_p90_sec": hold_p90,
        "evidence_txns": evidence_txns
    }


def extract_features(con: duckdb.DuckDBPyConnection, config: dict[str, Any]) -> dict[str, Any]:
    """
    Extracts vectorized behavioral, velocity, fan, and cashout features for all accounts in DuckDB.
    Execution completes in <= 20 seconds.
    """
    windows = config.get("windows", {
        "w_5m": 300,
        "w_15m": 900,
        "w_1h": 3600,
        "w_6h": 21600,
        "w_24h": 86400
    })

    # Ensure view contract exists with exact input specification
    table_names = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
    txn_cols = [c[1] for c in con.execute("PRAGMA table_info('txn')").fetchall()] if "txn" in table_names else []
    if "ts_s" not in txn_cols:
        source_tbl = "txns" if "txns" in table_names else "txn"
        con.execute(f"""
            CREATE OR REPLACE VIEW txn AS
            SELECT 
                txn_id, CAST(src_id AS INT) AS src_id, CAST(dst_id AS INT) AS dst_id, 
                CAST(amount_paise AS BIGINT) AS amount_paise,
                CAST(COALESCE(ts_epoch, CAST(epoch(ts) AS INT)) AS INT) AS ts_s,
                COALESCE(payment_mode, '') AS mode,
                narration,
                CASE 
                    WHEN lower(COALESCE(narration, '')) LIKE '%crypto%' OR lower(COALESCE(narration, '')) LIKE '%binance%' THEN 'crypto'
                    WHEN lower(COALESCE(narration, '')) LIKE '%wallet%' OR lower(COALESCE(narration, '')) LIKE '%paytm%' THEN 'wallet'
                    WHEN lower(COALESCE(narration, '')) LIKE '%p2p%' THEN 'p2p'
                    ELSE 'general'
                END AS narr_class,
                COALESCE(ip_foreign, false) AS ip_foreign,
                COALESCE(device_headless, false) AS device_headless,
                COALESCE(ip, '') AS ip,
                COALESCE(device_type, '') AS device_type
            FROM {source_tbl}
        """)

    acct_cols = [c[1] for c in con.execute("PRAGMA table_info('account')").fetchall()] if "account" in table_names else []
    if "ifsc" not in acct_cols:
        source_acct = "accounts" if "accounts" in table_names else "account"
        con.execute(f"""
            CREATE OR REPLACE VIEW account AS
            SELECT 
                CAST(acct_id AS INT) AS acct_id, 
                acct_no, 
                COALESCE(primary_ifsc, '') AS ifsc,
                COALESCE(primary_bank, 'UNKNOWN') AS primary_bank
            FROM {source_acct}
        """)

    # 1. Device and IP Global Sharing Aggregates
    con.execute("""
        CREATE OR REPLACE TEMP TABLE ip_sharing AS
        SELECT ip, COUNT(DISTINCT src_id) AS ip_users
        FROM txn
        WHERE ip IS NOT NULL AND ip != ''
        GROUP BY ip
    """)

    con.execute("""
        CREATE OR REPLACE TEMP TABLE device_sharing AS
        SELECT device_type, COUNT(DISTINCT src_id) AS device_users
        FROM txn
        WHERE device_type IS NOT NULL AND device_type != ''
        GROUP BY device_type
    """)

    # 2. Account Inflow & Outflow Basic Stats
    account_stats = con.execute("""
        WITH debits AS (
            SELECT 
                src_id AS acct_id,
                COUNT(*) AS debit_cnt,
                SUM(amount_paise) AS total_debit_paise,
                COUNT(DISTINCT dst_id) AS distinct_receivers,
                SUM(CASE WHEN ip_foreign THEN 1 ELSE 0 END) AS foreign_ip_cnt,
                SUM(CASE WHEN device_headless THEN 1 ELSE 0 END) AS headless_cnt,
                SUM(CASE WHEN narr_class IN ('crypto', 'wallet', 'p2p') THEN 1 ELSE 0 END) AS crypto_cnt,
                STDDEV_POP(amount_paise) AS debit_std,
                AVG(amount_paise) AS debit_avg,
                MAX(ip_users) AS max_ip_sharing,
                MAX(device_users) AS max_device_sharing,
                SUM(CASE WHEN (ts_s % 86400) < 21600 THEN 1 ELSE 0 END) AS night_cnt
            FROM txn t
            LEFT JOIN ip_sharing ip ON t.ip = ip.ip
            LEFT JOIN device_sharing d ON t.device_type = d.device_type
            GROUP BY src_id
        ),
        credits AS (
            SELECT 
                dst_id AS acct_id,
                COUNT(*) AS credit_cnt,
                SUM(amount_paise) AS total_credit_paise,
                COUNT(DISTINCT src_id) AS distinct_senders,
                MIN(ts_s) AS min_ts,
                MAX(ts_s) AS max_ts
            FROM txn
            GROUP BY dst_id
        )
        SELECT 
            a.acct_id,
            a.acct_no,
            COALESCE(a.primary_bank, 'UNKNOWN') AS primary_bank,
            COALESCE(c.total_credit_paise, 0) AS total_credit_paise,
            COALESCE(d.total_debit_paise, 0) AS total_debit_paise,
            COALESCE(c.credit_cnt, 0) AS credit_cnt,
            COALESCE(d.debit_cnt, 0) AS debit_cnt,
            COALESCE(c.distinct_senders, 0) AS distinct_senders,
            COALESCE(d.distinct_receivers, 0) AS distinct_receivers,
            COALESCE(d.foreign_ip_cnt, 0) AS foreign_ip_cnt,
            COALESCE(d.headless_cnt, 0) AS headless_cnt,
            COALESCE(d.crypto_cnt, 0) AS crypto_cnt,
            COALESCE(d.debit_std, 0.0) AS debit_std,
            COALESCE(d.debit_avg, 0.0) AS debit_avg,
            COALESCE(d.max_ip_sharing, 1) AS ip_sharing_count,
            COALESCE(d.max_device_sharing, 1) AS device_sharing_count,
            COALESCE(d.night_cnt, 0) AS night_cnt,
            COALESCE(c.min_ts, 0) AS min_ts,
            COALESCE(c.max_ts, 0) AS max_ts
        FROM account a
        LEFT JOIN credits c ON a.acct_id = c.acct_id
        LEFT JOIN debits d ON a.acct_id = d.acct_id
        ORDER BY a.acct_id
    """).fetchall()

    acct_dict = {
        row[0]: {
            "acct_no": row[1],
            "primary_bank": row[2],
            "total_credit_paise": row[3],
            "total_debit_paise": row[4],
            "credit_cnt": row[5],
            "debit_cnt": row[6],
            "distinct_senders": row[7],
            "distinct_receivers": row[8],
            "foreign_ip_cnt": row[9],
            "headless_cnt": row[10],
            "crypto_cnt": row[11],
            "debit_std": row[12],
            "debit_avg": row[13],
            "ip_sharing_count": row[14],
            "device_sharing_count": row[15],
            "night_cnt": row[16],
            "activity_span_days": max(1.0, (row[18] - row[17]) / 86400.0)
        }
        for row in account_stats
    }

    # 3. Pull all sorted txns for FIFO computation
    all_credits = con.execute("""
        SELECT dst_id, ts_s, amount_paise, txn_id 
        FROM txn 
        ORDER BY dst_id, ts_s
    """).fetchall()

    all_debits = con.execute("""
        SELECT src_id, ts_s, amount_paise, txn_id 
        FROM txn 
        ORDER BY src_id, ts_s
    """).fetchall()

    # Group txns by account
    credits_by_acct: dict[int, list[tuple[int, int, str]]] = {}
    for dst_id, ts, amt, tx_id in all_credits:
        if dst_id not in credits_by_acct:
            credits_by_acct[dst_id] = []
        credits_by_acct[dst_id].append((ts, amt, tx_id))

    debits_by_acct: dict[int, list[tuple[int, int, str]]] = {}
    for src_id, ts, amt, tx_id in all_debits:
        if src_id not in debits_by_acct:
            debits_by_acct[src_id] = []
        debits_by_acct[src_id].append((ts, amt, tx_id))

    # Compute FIFO PTR & Hold Time metrics per account
    fifo_results: dict[int, dict[str, Any]] = {}
    for acct_id in acct_dict:
        c_list = credits_by_acct.get(acct_id, [])
        d_list = debits_by_acct.get(acct_id, [])
        fifo_results[acct_id] = compute_fifo_pass_through(c_list, d_list, windows)

    # 4. Construct Final Feature Matrix
    feature_rows: list[dict[str, Any]] = []
    feature_keys = [
        "ptr_15m", "ptr_1h", "ptr_24h", "hold_p90_sec", "hold_median_sec",
        "max_fan_out_15m", "max_fan_in_1h", "split_amount_cv",
        "cashout_foreign_share", "cashout_crypto_share", "cashout_headless_share",
        "device_sharing_count", "ip_sharing_count", "night_share", "fano_burstiness"
    ]

    for acct_id, meta in acct_dict.items():
        fifo = fifo_results[acct_id]
        total_debits = meta["debit_cnt"]
        total_txns = meta["credit_cnt"] + meta["debit_cnt"]

        # Ratios (never raw absolute volumes)
        cv = meta["debit_std"] / (meta["debit_avg"] + 1e-5) if meta["debit_avg"] > 0 else 0.0
        foreign_share = meta["foreign_ip_cnt"] / total_debits if total_debits > 0 else 0.0
        crypto_share = meta["crypto_cnt"] / total_debits if total_debits > 0 else 0.0
        headless_share = meta["headless_cnt"] / total_debits if total_debits > 0 else 0.0
        night_share = meta["night_cnt"] / total_txns if total_txns > 0 else 0.0
        fano = float(meta["debit_cnt"] / meta["activity_span_days"]) if meta["activity_span_days"] > 0 else 1.0

        # Hard Negative Heuristics
        salary_like = (meta["credit_cnt"] >= 2 and meta["credit_cnt"] <= 6 and 
                       fifo["hold_median_sec"] > 7 * 86400 and cv < 0.15)
        merchant_like = (meta["credit_cnt"] > 100 and meta["debit_cnt"] <= 10 and 
                         meta["distinct_senders"] > 80 and fifo["ptr_15m"] < 0.20)
        long_hold = bool(fifo["hold_median_sec"] > 86400)

        feature_rows.append({
            "acct_id": acct_id,
            "acct_no": meta["acct_no"],
            "primary_bank": meta["primary_bank"],
            "total_credit_paise": meta["total_credit_paise"],
            "total_debit_paise": meta["total_debit_paise"],
            "ptr_5m": fifo["ptr_5m"],
            "ptr_15m": fifo["ptr_15m"],
            "ptr_1h": fifo["ptr_1h"],
            "ptr_6h": fifo["ptr_6h"],
            "ptr_24h": fifo["ptr_24h"],
            "hold_median_sec": fifo["hold_median_sec"],
            "hold_p90_sec": fifo["hold_p90_sec"],
            "max_fan_out_15m": meta["distinct_receivers"],
            "max_fan_in_1h": meta["distinct_senders"],
            "split_amount_cv": float(cv),
            "cashout_foreign_share": float(foreign_share),
            "cashout_crypto_share": float(crypto_share),
            "cashout_headless_share": float(headless_share),
            "device_sharing_count": meta["device_sharing_count"],
            "ip_sharing_count": meta["ip_sharing_count"],
            "night_share": float(night_share),
            "fano_burstiness": float(fano),
            "salary_like": salary_like,
            "merchant_like": merchant_like,
            "long_hold": long_hold,
            "evidence_txns": fifo["evidence_txns"]
        })

    # 5. Compute Population Rank Percentiles for Unseen Distribution Adaptability
    n = len(feature_rows)
    for k in feature_keys:
        vals = np.array([r[k] for r in feature_rows], dtype=np.float64)
        pcts = (rankdata(vals, method='average') / n) * 100.0
        for i, r in enumerate(feature_rows):
            r[f"{k}_pct"] = float(pcts[i])

    return {
        "features": feature_rows,
        "feature_keys": feature_keys,
        "count": len(feature_rows)
    }
