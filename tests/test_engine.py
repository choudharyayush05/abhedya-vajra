"""
Vajra Test Suite - Comprehensive Verification of all 10 Mandatory Engineering Requirements.
Tests Deterministic Ledgers, Invariance, Monotonicity, FIFO Matching, Gate Fallbacks, and GroupKFold Integrity.
"""

import json
import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import duckdb
import numpy as np
import pytest
import yaml
from sklearn.model_selection import GroupKFold

from engine.fallback import FallbackGate
from engine.features import compute_fifo_pass_through
from engine.fusion import run_pipeline
from engine.ml import ML_FEATURES


@pytest.fixture(scope="module")
def duckdb_con():
    """Provides a DuckDB connection, or skips if server holds exclusive lock."""
    db_path = "data/duckdb/vajra.duckdb"
    try:
        con = duckdb.connect(db_path)
    except duckdb.IOException:
        try:
            con = duckdb.connect(db_path, read_only=True)
        except duckdb.IOException:
            pytest.skip("DuckDB file lock currently held by running dev server.")
    yield con
    con.close()


def test_1_ledger_sums_to_risk_index_100_percent(duckdb_con):
    """TEST 1: Ledger sums to risk_index for 100% of accounts."""
    rows = duckdb_con.execute("SELECT risk_index, ledger FROM account_scores").fetchall()
    assert len(rows) > 0, "account_scores table must not be empty"

    for risk_index, ledger_raw in rows:
        ledger = json.loads(ledger_raw) if isinstance(ledger_raw, str) else ledger_raw
        reasons_sum = sum(r["points"] for r in ledger["reasons"])
        clip_adj = ledger["clip_adjust"]
        total = round(reasons_sum + clip_adj, 1)
        assert abs(total - risk_index) < 1e-4, f"Mismatch for account {ledger['acct']}: {total} != {risk_index}"


def test_2_determinism_same_input_and_config(duckdb_con):
    """TEST 2: Same input + config -> identical scores (determinism)."""
    # Run pipeline first to ensure known baseline state
    run_pipeline(duckdb_con, config_path="config.yaml")
    scores_1 = duckdb_con.execute("SELECT acct_id, risk_index, rule_score, ml_points FROM account_scores ORDER BY acct_id").fetchall()
    
    # Run pipeline again under identical conditions
    run_pipeline(duckdb_con, config_path="config.yaml")
    scores_2 = duckdb_con.execute("SELECT acct_id, risk_index, rule_score, ml_points FROM account_scores ORDER BY acct_id").fetchall()

    assert scores_1 == scores_2, "Pipeline output must be 100% deterministic across consecutive runs"


def test_3_ml_points_never_positive_when_rule_score_under_10(duckdb_con):
    """TEST 3: ml_points never > 0 when rule_score < 10."""
    violations = duckdb_con.execute("""
        SELECT COUNT(*) FROM account_scores 
        WHERE rule_score < 10.0 AND ml_points > 0.0
    """).fetchone()[0]
    assert violations == 0, f"Found {violations} accounts with rule_score < 10 and ml_points > 0"


def test_4_isolation_forest_leaves_risk_index_unchanged(duckdb_con):
    """TEST 4: Isolation Forest enabled or disabled leaves risk_index unchanged."""
    scores_before = duckdb_con.execute("SELECT acct_id, risk_index FROM account_scores ORDER BY acct_id").fetchall()

    # Create temporary config with iforest enabled
    with open("config.yaml", "r") as f:
        cfg = yaml.safe_load(f)
    cfg["iforest"]["enabled"] = True

    with open("config_temp_iforest.yaml", "w") as f:
        yaml.safe_dump(cfg, f)

    try:
        run_pipeline(duckdb_con, config_path="config_temp_iforest.yaml")
        scores_after = duckdb_con.execute("SELECT acct_id, risk_index FROM account_scores ORDER BY acct_id").fetchall()
        assert scores_before == scores_after, "Isolation Forest altered risk_index! It must only populate needs_review."
    finally:
        if os.path.exists("config_temp_iforest.yaml"):
            os.remove("config_temp_iforest.yaml")
        # Restore standard run
        run_pipeline(duckdb_con, config_path="config.yaml")


def test_5_no_forbidden_features_reach_ml_model():
    """TEST 5: No forbidden features (IDs, absolute amounts) reach the model."""
    forbidden = ["id", "acct_id", "src_id", "dst_id", "txn_id", "amount", "amount_paise", "total_credit_paise", "total_debit_paise"]
    for feat in ML_FEATURES:
        feat_lower = feat.lower()
        for forb in forbidden:
            assert feat_lower != forb, f"Forbidden feature '{feat}' detected in ML_FEATURES"
            assert not feat_lower.endswith("_id"), f"Identifier feature '{feat}' detected in ML_FEATURES"


def test_6_deleting_model_file_triggers_rules_only(duckdb_con):
    """TEST 6: Deleting the model file triggers rules_only with a recorded reason."""
    gate = FallbackGate({"fallback_limits": {}})
    # Simulate missing model checksum
    triggered, reason = gate.evaluate_gate(
        training_success=True,
        model_checksum_valid=False, # Simulates deleted/corrupted model
        hybrid_flagged_share=0.05,
        hybrid_coherence_rate=0.40,
        rules_coherence_rate=0.40,
        feature_psis={}
    )
    assert triggered is True, "Fallback gate did not trigger on invalid model checksum"
    assert "checksum" in reason.lower() or "corruption" in reason.lower()


def test_7_every_evidence_txn_id_exists_in_txn(duckdb_con):
    """TEST 7: Every evidence txn_id exists in txn."""
    missing = duckdb_con.execute("""
        SELECT COUNT(*) 
        FROM reason_evidence re
        LEFT JOIN txn t ON re.txn_id = t.txn_id
        WHERE t.txn_id IS NULL
    """).fetchone()[0]
    assert missing == 0, f"Found {missing} evidence txn_ids that do not exist in the transaction table"


def test_8_fifo_pass_through_exact_consumption_no_double_counting():
    """TEST 8: Hand-built cases for PTR/FIFO (debit not double-counted)."""
    # Credit 1: ₹10,000 at t = 100s
    # Credit 2: ₹10,000 at t = 200s
    # Debit 1: ₹15,000 at t = 250s (should consume ₹10,000 from credit 1 and ₹5,000 from credit 2)
    # Total credits = ₹20,000. Total consumed = ₹15,000.
    credits = [
        (100, 1000000, "TX_C1"),
        (200, 1000000, "TX_C2")
    ]
    debits = [
        (250, 1500000, "TX_D1")
    ]
    windows = {"w_5m": 300, "w_15m": 900, "w_1h": 3600, "w_6h": 21600, "w_24h": 86400}

    res = compute_fifo_pass_through(credits, debits, windows)

    # Within 300s (5m), all 15,000 consumed should be captured
    assert abs(res["ptr_5m"] - (1500000 / 2000000)) < 1e-4, f"PTR_5m was {res['ptr_5m']}, expected 0.75"
    assert abs(res["ptr_15m"] - 0.75) < 1e-4

    # Ensure evidence txns captured both
    assert "TX_C1" in res["evidence_txns"]
    assert "TX_D1" in res["evidence_txns"]


def test_9_group_kfold_groups_never_straddle_folds():
    """TEST 9: GroupKFold groups never straddle folds."""
    X = np.random.randn(20, 4)
    y = np.random.randint(0, 2, 20)
    # 5 distinct connected component groups
    groups = np.array([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 1, 2, 3, 4, 5])

    gkf = GroupKFold(n_splits=3)
    for trn_idx, val_idx in gkf.split(X, y, groups):
        trn_groups = set(groups[trn_idx])
        val_groups = set(groups[val_idx])
        intersection = trn_groups.intersection(val_groups)
        assert len(intersection) == 0, f"GroupKFold leaked group across folds: {intersection}"


def test_10_fallback_gate_triggers_when_flagged_share_exceeds_20_percent():
    """TEST 10: Fallback gate triggers when flagged share is forced to 20%."""
    gate = FallbackGate({"fallback_limits": {"flagged_share_min": 0.01, "flagged_share_max": 0.15}})
    triggered, reason = gate.evaluate_gate(
        training_success=True,
        model_checksum_valid=True,
        hybrid_flagged_share=0.20, # 20% > 15% max
        hybrid_coherence_rate=0.40,
        rules_coherence_rate=0.40,
        feature_psis={}
    )
    assert triggered is True, "Fallback gate failed to trigger when flagged share was 20%"
    assert "outside permissible forensic bounds" in reason


def test_11_air_gapped_no_network_calls(duckdb_con, monkeypatch):
    """TEST 11: Assert zero outbound network calls during execution."""
    import socket

    def guard_connect(*args, **kwargs):
        raise RuntimeError("Network call attempted in air-gapped environment!")

    monkeypatch.setattr(socket.socket, "connect", guard_connect)
    # Re-running pipeline should succeed with zero socket connections attempted
    res = run_pipeline(duckdb_con, config_path="config.yaml")
    assert res["status"] == "success"

