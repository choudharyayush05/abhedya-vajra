"""
Run Feature Extraction and Rule Scoring Benchmark.
"""

import sys
import duckdb
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.detect.features import feature_engine
from backend.app.detect.rules import rule_scoring_engine

if __name__ == "__main__":
    conn = duckdb.connect("data/duckdb/vajra.duckdb")
    print("Computing Behavioural Features for all accounts...")
    f_res = feature_engine.compute_features(conn)
    print(f"Features computed in {f_res['elapsed_seconds']}s for {f_res['num_accounts']:,} accounts.")

    print("\nComputing Mule Risk Scores and Classifications...")
    s_res = rule_scoring_engine.compute_scores(conn)
    print(f"Risk Scores computed in {s_res['elapsed_seconds']}s.")
    print("Tier Distribution:", s_res["tier_distribution"])
    print("Role Distribution:", s_res["role_distribution"])

    print("\nTop 10 Flagged Suspect Accounts:")
    top_df = conn.execute("""
        SELECT acct_no, primary_bank, risk_index, tier, predicted_role, score_velocity, score_topology, score_cashout
        FROM account_scores
        ORDER BY risk_index DESC, acct_id ASC
        LIMIT 10;
    """).df()
    print(top_df)
