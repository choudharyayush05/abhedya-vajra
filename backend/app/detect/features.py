"""
High-Performance Unsupervised Feature Extraction Engine.
Extracts per-account behavioral, topological, velocity, and drainage signals
using DuckDB vectorized SQL for unsupervised anomaly detection.
"""

import time
from typing import Dict, Any, List
import duckdb

FEATURE_COLUMNS: List[str] = [
    "in_cnt",
    "in_deg_distinct",
    "in_sum",
    "out_cnt",
    "out_deg_distinct",
    "out_sum",
    "drain_ratio",
    "pass_through_ratio_15m",
    "avg_txn_size_in",
    "avg_txn_size_out",
    "in_out_degree_skew",
    "foreign_ip_ratio",
    "headless_ratio",
    "cashout_narr_ratio",
    "scam_narr_cnt"
]

FEATURE_LABELS: Dict[str, str] = {
    "in_cnt": "Inbound Transaction Count",
    "in_deg_distinct": "Fan-In Distinct Depositors",
    "in_sum": "Total Inflow Volume",
    "out_cnt": "Outbound Transaction Count",
    "out_deg_distinct": "Fan-Out Distinct Beneficiaries",
    "out_sum": "Total Outflow Volume",
    "drain_ratio": "Drainage Ratio (Outflow / Inflow)",
    "pass_through_ratio_15m": "Rapid 15-Minute Velocity Drain",
    "avg_txn_size_in": "Average Inflow Transaction Size",
    "avg_txn_size_out": "Average Outflow Transaction Size",
    "in_out_degree_skew": "In/Out Degree Topological Asymmetry",
    "foreign_ip_ratio": "Offshore / VPN IP Origin Ratio",
    "headless_ratio": "Headless Script / Emulator Ratio",
    "cashout_narr_ratio": "Cashout / P2P / Crypto Narrations Ratio",
    "scam_narr_cnt": "Scam Narration Flags Count"
}

class FeatureEngine:
    def __init__(self):
        self.feature_columns = FEATURE_COLUMNS
        self.feature_labels = FEATURE_LABELS

    def compute_features(self, conn: duckdb.DuckDBPyConnection) -> Dict[str, Any]:
        """Compute all unsupervised behavioral features and store in account_features table."""
        t0 = time.perf_counter()

        conn.execute("DROP TABLE IF EXISTS account_features;")

        conn.execute("""
            CREATE TABLE account_features AS
            WITH in_stats AS (
                SELECT 
                    dst_id AS acct_id,
                    count(*) AS in_cnt,
                    count(DISTINCT src_id) AS in_deg_distinct,
                    sum(amount) AS in_sum,
                    avg(amount) AS in_mean,
                    max(amount) AS in_max,
                    min(ts_epoch) AS first_in_ts,
                    max(ts_epoch) AS last_in_ts
                FROM txns
                GROUP BY dst_id
            ),
            out_stats AS (
                SELECT 
                    src_id AS acct_id,
                    count(*) AS out_cnt,
                    count(DISTINCT dst_id) AS out_deg_distinct,
                    sum(amount) AS out_sum,
                    avg(amount) AS out_mean,
                    max(amount) AS out_max,
                    min(ts_epoch) AS first_out_ts,
                    max(ts_epoch) AS last_out_ts,
                    sum(CASE WHEN ip_foreign THEN 1 ELSE 0 END) AS foreign_ip_out_cnt,
                    sum(CASE WHEN device_headless THEN 1 ELSE 0 END) AS headless_out_cnt,
                    sum(CASE WHEN narration LIKE '%CRYPTO%' OR narration LIKE '%P2P%' OR narration LIKE '%WALLET%' THEN 1 ELSE 0 END) AS cashout_narr_cnt,
                    sum(CASE WHEN narration LIKE '%TASK%' OR narration LIKE '%INVESTMENT%' OR narration LIKE '%REFUND%' THEN 1 ELSE 0 END) AS scam_narr_cnt
                FROM txns
                GROUP BY src_id
            )
            SELECT 
                a.acct_id,
                a.acct_no,
                a.primary_ifsc,
                a.primary_bank,
                COALESCE(i.in_cnt, 0) AS in_cnt,
                COALESCE(i.in_deg_distinct, 0) AS in_deg_distinct,
                COALESCE(i.in_sum, 0.0) AS in_sum,
                COALESCE(o.out_cnt, 0) AS out_cnt,
                COALESCE(o.out_deg_distinct, 0) AS out_deg_distinct,
                COALESCE(o.out_sum, 0.0) AS out_sum,
                -- 1. Drainage Ratio: What portion of incoming funds were evacuated?
                CASE 
                    WHEN COALESCE(i.in_sum, 0.0) <= 0 THEN 0.0 
                    ELSE LEAST(1.0, COALESCE(o.out_sum, 0.0) / (i.in_sum + 1e-5)) 
                END AS drain_ratio,
                -- 2. Rapid Velocity Drain (15-min Pass-Through): Dispersed within short turnaround
                CASE
                    WHEN COALESCE(i.in_sum, 0.0) > 0 AND COALESCE(o.out_sum, 0.0) > 0 
                         AND (COALESCE(o.last_out_ts, 0) - COALESCE(i.first_in_ts, 0)) BETWEEN 30 AND 3600
                    THEN LEAST(1.0, (o.out_sum / (i.in_sum + 1e-5)))
                    ELSE 0.0
                END AS pass_through_ratio_15m,
                -- 3. Average Transaction Sizes
                COALESCE(i.in_mean, 0.0) AS avg_txn_size_in,
                COALESCE(o.out_mean, 0.0) AS avg_txn_size_out,
                -- 4. In/Out Degree Asymmetry (Smurfing vs Aggregation)
                CASE
                    WHEN (COALESCE(i.in_deg_distinct, 0) + COALESCE(o.out_deg_distinct, 0)) = 0 THEN 0.0
                    ELSE ABS(COALESCE(i.in_deg_distinct, 0) - COALESCE(o.out_deg_distinct, 0))::FLOAT / 
                         (COALESCE(i.in_deg_distinct, 0) + COALESCE(o.out_deg_distinct, 0))
                END AS in_out_degree_skew,
                -- 5. Infrastructure & Narration Anomalies
                CASE WHEN COALESCE(o.out_cnt, 0) = 0 THEN 0.0 ELSE o.foreign_ip_out_cnt::FLOAT / o.out_cnt END AS foreign_ip_ratio,
                CASE WHEN COALESCE(o.out_cnt, 0) = 0 THEN 0.0 ELSE o.headless_out_cnt::FLOAT / o.out_cnt END AS headless_ratio,
                CASE WHEN COALESCE(o.out_cnt, 0) = 0 THEN 0.0 ELSE o.cashout_narr_cnt::FLOAT / o.out_cnt END AS cashout_narr_ratio,
                COALESCE(o.scam_narr_cnt, 0) AS scam_narr_cnt
            FROM accounts a
            LEFT JOIN in_stats i ON a.acct_id = i.acct_id
            LEFT JOIN out_stats o ON a.acct_id = o.acct_id;
        """)

        num_accounts = conn.execute("SELECT count(*) FROM account_features;").fetchone()[0]
        elapsed = time.perf_counter() - t0
        return {
            "num_accounts": num_accounts,
            "feature_count": len(self.feature_columns),
            "elapsed_seconds": round(elapsed, 2)
        }

feature_engine = FeatureEngine()
