"""
Vajra Fusion Orchestration Engine - Complete End-to-End Pipeline Execution.
Coordinates DuckDB ingestion, Pass 1 Rules, Chain CSR Traversal, Bounded LightGBM,
TreeSHAP Proportional Allocation, Pass 2 Ring Detection, Failsafe Gates, and Table Persistence.
"""

import json
import os
import time
from collections import deque
from typing import Any

import duckdb
import numpy as np
import yaml

from engine.chain import ChainGraphEngine
from engine.fallback import FallbackGate, compute_psi
from engine.features import extract_features
from engine.ledger import build_account_ledger, determine_role
from engine.ml import BoundedMuleModel
from engine.pseudo_labels import generate_pseudo_labels
from engine.rules import evaluate_rules
from engine.shap_reasons import extract_shap_reasons


def calibrate_flag_threshold(scores: np.ndarray, config_thresh: Any) -> float:
    """
    Auto-calibrates flag threshold in [55.0, 80.0] using score percentiles / elbow, or returns numeric default.
    """
    if isinstance(config_thresh, (int, float)):
        return float(config_thresh)

    if len(scores) == 0:
        return 65.0

    # 85th percentile or elbow bounded within [55.0, 80.0]
    p85 = float(np.percentile(scores, 85))
    return float(max(55.0, min(80.0, p85)))


def run_pipeline(
    con: duckdb.DuckDBPyConnection,
    config_path: str = "config.yaml",
    config_override: dict[str, Any] | None = None
) -> dict[str, Any]:
    """
    Executes the entire 9-step Mule Risk Engine pipeline in <= 30 seconds.
    """
    start_time = time.time()

    # 1. Load Configuration
    if config_override is not None:
        config = config_override
    elif os.path.exists(config_path):
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)
    else:
        config = {}

    print(">>> [Vajra 1/9] Extracting behavioral & FIFO pass-through features from DuckDB...")
    feat_data = extract_features(con, config)
    features = feat_data["features"]
    feature_keys = feat_data["feature_keys"]
    n_accounts = len(features)
    {f["acct_id"]: f for f in features}

    # 2. Pass 1: Compute Rule Scores without chain coherence component
    print(">>> [Vajra 2/9] Evaluating Pass-1 authoritative deterministic rules...")
    pass_1_rules = evaluate_rules(features, config, chain_coherence_scores=None)
    {r["acct_id"]: r for r in pass_1_rules}

    # Seeds = accounts with pass-1 score >= 60
    seed_accounts = {r["acct_id"] for r in pass_1_rules if r["rule_score"] >= 60.0}

    # 3. Compute Chain Coherence using CSR Time-Respecting Traversal
    print(f">>> [Vajra 3/9] Building CSR graph and computing time-respecting coherence for {len(seed_accounts)} seed nodes...")
    graph_engine = ChainGraphEngine(con, max_wait_hours=config.get("ring", {}).get("max_wait_hours", 72))
    coherence_scores = graph_engine.compute_chain_coherence(seed_accounts, max_hops=3)

    # Re-evaluate rules with chain coherence points added
    final_rules = evaluate_rules(features, config, chain_coherence_scores=coherence_scores)
    rules_by_id = {r["acct_id"]: r for r in final_rules}

    # 4. Pseudo-Labelling for Bounded LightGBM
    print(">>> [Vajra 4/9] Deriving confident pseudo-labels for bounded LightGBM...")
    train_idx, train_labels, unlabelled_idx, pseudo_stats = generate_pseudo_labels(final_rules, features, config)

    # Compute Weakly Connected Components for Fold Grouping (Prevents ring data leakage)
    component_groups = graph_engine.compute_connected_components(seed_accounts)

    # 5. Model Training or Rules-Only Fallback Decision
    ml_enabled = config.get("ml", {}).get("enabled", True) and pseudo_stats["can_train"]
    mode = "hybrid" if ml_enabled else "rules_only"
    fallback_reason = pseudo_stats.get("fallback_reason")

    calibrated_probs = np.zeros(n_accounts, dtype=np.float32)
    shap_contributions = np.zeros((n_accounts, len(feature_keys) + 1), dtype=np.float32)
    model_obj = BoundedMuleModel(config)
    training_success = False

    if ml_enabled:
        print(f">>> [Vajra 5/9] Training GroupKFold LightGBM on {len(train_idx)} labelled accounts (monotonically constrained)...")
        try:
            calibrated_probs, shap_contributions, _ml_metrics = model_obj.train_and_predict(
                features, train_idx, train_labels, unlabelled_idx, component_groups
            )
            training_success = True
        except (RuntimeError, ValueError, TypeError, KeyError) as e:
            mode = "rules_only"
            fallback_reason = f"Model training exception: {e!s}"
            training_success = False
            calibrated_probs = np.zeros(n_accounts, dtype=np.float32)

    # 6. TreeSHAP Attribution & ml_points Calculation
    print(">>> [Vajra 6/9] Computing exact TreeSHAP attribution and largest-remainder points...")
    gate_min_rule = config.get("ml", {}).get("gate_min_rule", 10.0)
    max_ml_pts = config.get("ml", {}).get("max_points", 20.0)

    ml_points_list: list[float] = []
    shap_reasons_list: list[list[dict[str, Any]]] = []

    for i in range(n_accounts):
        acct_id = features[i]["acct_id"]
        r_score = rules_by_id[acct_id]["rule_score"]

        if mode == "hybrid":
            prob = float(calibrated_probs[i])
            # ml_points = 20 * (2 * ml_prob - 1)
            raw_ml_pts = round(max_ml_pts * (2.0 * prob - 1.0), 1)

            # Gate: If rule_score < 10, ml_points = min(ml_points, 0)
            if r_score < gate_min_rule:
                raw_ml_pts = min(raw_ml_pts, 0.0)

            shap_reasons = extract_shap_reasons(
                shap_contributions[i],
                feature_keys,
                raw_ml_pts,
                features[i]
            )
        else:
            prob = 0.0
            raw_ml_pts = 0.0
            shap_reasons = []

        ml_points_list.append(raw_ml_pts)
        shap_reasons_list.append(shap_reasons)

    # 7. Pass 2: Ring Detection & Topology Points
    print(">>> [Vajra 7/9] Traversing second-pass bridge topology for ring points (+0 to +8)...")
    intermediate_scores = {
        features[i]["acct_id"]: rules_by_id[features[i]["acct_id"]]["rule_score"] + ml_points_list[i]
        for i in range(n_accounts)
    }

    ring_cfg = config.get("ring", {})
    ring_results = graph_engine.compute_ring_points(
        intermediate_scores,
        anchor_threshold=ring_cfg.get("anchor_risk", 85.0),
        min_rule=ring_cfg.get("min_rule", 25.0),
        max_rule=ring_cfg.get("max_rule", 65.0),
        max_ring_points=ring_cfg.get("max_points", 8.0),
        max_hops=ring_cfg.get("max_hops", 3)
    )

    # 8. Fallback Gate Checks
    print(">>> [Vajra 8/9] Verifying fallback integrity gates (flag share, PSI, coherence drop)...")
    tentative_risks = np.array([
        max(0.0, min(100.0, intermediate_scores[features[i]["acct_id"]] + ring_results.get(features[i]["acct_id"], {}).get("ring_points", 0.0)))
        for i in range(n_accounts)
    ])

    rules_only_risks = np.array([
        max(0.0, min(100.0, rules_by_id[features[i]["acct_id"]]["rule_score"] + ring_results.get(features[i]["acct_id"], {}).get("ring_points", 0.0)))
        for i in range(n_accounts)
    ])

    flag_threshold = calibrate_flag_threshold(tentative_risks, config.get("flag_threshold", "auto"))

    hybrid_flagged_cnt = int(np.sum(tentative_risks >= flag_threshold))
    hybrid_flagged_share = hybrid_flagged_cnt / max(1, n_accounts)
    # Compute coherence rate: fraction of flagged accounts with a flagged upstream AND downstream within 3 hops
    def _calc_coherence_rate(flagged_ids_set):
        if not flagged_ids_set:
            return 0.0
        coherent = 0
        for u in flagged_ids_set:
            # Upstream check
            has_up = False
            q_up = deque([(u, 0)])
            v_up = {u}
            while q_up and len(v_up) < 200:
                curr, h = q_up.popleft()
                if h > 0 and curr in flagged_ids_set:
                    has_up = True
                    break
                if h < 3:
                    for p, _ in graph_engine.adj_in.get(curr, []):
                        if p not in v_up:
                            v_up.add(p)
                            q_up.append((p, h + 1))
            if not has_up:
                continue

            # Downstream check
            has_down = False
            q_down = deque([(u, 0)])
            v_down = {u}
            while q_down and len(v_down) < 200:
                curr, h = q_down.popleft()
                if h > 0 and curr in flagged_ids_set:
                    has_down = True
                    break
                if h < 3:
                    for nxt, _ in graph_engine.adj_out.get(curr, []):
                        if nxt not in v_down:
                            v_down.add(nxt)
                            q_down.append((nxt, h + 1))

            if has_up and has_down:
                coherent += 1
        return float(coherent / len(flagged_ids_set))

    rules_flagged_set = {features[i]["acct_id"] for i in range(n_accounts) if rules_only_risks[i] >= flag_threshold}
    hybrid_flagged_set = {features[i]["acct_id"] for i in range(n_accounts) if tentative_risks[i] >= flag_threshold}

    rules_coherence_rate = _calc_coherence_rate(rules_flagged_set)
    hybrid_coherence_rate = _calc_coherence_rate(hybrid_flagged_set)

    # Check PSI across features vs training reference
    feature_psis: dict[str, float] = {}
    ref_file = "data/models/feature_reference.json"
    if os.path.exists(ref_file) and not training_success:
        try:
            with open(ref_file, "r") as rf:
                ref_dict = json.load(rf)
            for k in feature_keys:
                if k in ref_dict:
                    ref_vals = np.array(ref_dict[k], dtype=np.float64)
                    curr_vals = np.array([f[k] for f in features], dtype=np.float64)
                    feature_psis[k] = compute_psi(ref_vals, curr_vals)
        except (OSError, json.JSONDecodeError, KeyError, ValueError):
            feature_psis = {}
    else:
        # Store training reference feature distribution sample
        os.makedirs("data/models", exist_ok=True)
        try:
            sample_step = max(1, n_accounts // 2000)
            ref_dict = {k: [float(features[i][k]) for i in range(0, n_accounts, sample_step)] for k in feature_keys}
            with open(ref_file, "w") as wf:
                json.dump(ref_dict, wf)
        except (OSError, TypeError, ValueError):
            pass
        feature_psis = {k: 0.0 for k in feature_keys}

    fb_gate = FallbackGate(config)
    trigger_fb, fb_desc = fb_gate.evaluate_gate(
        training_success=training_success,
        model_checksum_valid=bool(model_obj.model_checksum or mode == "rules_only"),
        hybrid_flagged_share=hybrid_flagged_share,
        hybrid_coherence_rate=hybrid_coherence_rate,
        rules_coherence_rate=rules_coherence_rate,
        feature_psis=feature_psis
    )

    if trigger_fb and mode == "hybrid":
        print(f"⚠️  [Vajra Fallback] Reverting to rules_only: {fb_desc}")
        mode = "rules_only"
        fallback_reason = fb_desc
        # Zero out ml_points in fallback mode
        ml_points_list = [0.0] * n_accounts
        shap_reasons_list = [[] for _ in range(n_accounts)]

    # Optional Isolation Forest (Default False, never modifies risk_index)
    needs_review_flags = [False] * n_accounts
    if config.get("iforest", {}).get("enabled", False):
        try:
            from sklearn.ensemble import IsolationForest
            X_mat = model_obj._prepare_matrix(features)
            iso = IsolationForest(contamination=config.get("iforest", {}).get("contamination", 0.02), random_state=42)
            iso_preds = iso.fit_predict(X_mat)
            needs_review_flags = [bool(p == -1) for p in iso_preds]
        except (RuntimeError, ValueError, TypeError):
            pass

    # 9. Build Immutable Ledgers and Persist Tables in DuckDB
    print(">>> [Vajra 9/9] Compiling exact audit ledgers and writing to DuckDB tables...")
    account_score_rows: list[tuple] = []
    reason_evidence_rows: list[tuple] = []

    for i in range(n_accounts):
        acct_id = features[i]["acct_id"]
        acct_no = features[i]["acct_no"]
        r_info = rules_by_id[acct_id]
        rule_score = r_info["rule_score"]
        ml_pts = ml_points_list[i]
        ml_p = float(calibrated_probs[i])

        ring_info = ring_results.get(acct_id, {"ring_points": 0.0, "upstream_flagged": 0, "downstream_flagged": 0})
        ring_pts = ring_info["ring_points"]

        role_info = determine_role(features[i], rule_score)

        ledger = build_account_ledger(
            acct_no=acct_no,
            rule_score=rule_score,
            ml_prob=ml_p,
            ml_points=ml_pts,
            ring_points=ring_pts,
            rule_reasons=r_info["reasons"],
            shap_reasons=shap_reasons_list[i],
            upstream_flagged=ring_info["upstream_flagged"],
            downstream_flagged=ring_info["downstream_flagged"],
            role_info=role_info,
            features=features[i]
        )

        risk_idx = ledger["risk_index"]
        risk_disp = ledger["risk_display"]
        tier = ledger["tier"]
        conf = ledger["confidence"]
        flagged = bool(risk_idx >= flag_threshold)
        needs_rev = needs_review_flags[i]
        ledger_json = json.dumps(ledger)

        account_score_rows.append((
            acct_id,
            risk_idx,
            risk_disp,
            tier,
            role_info["behaviour"],
            role_info["confidence"],
            rule_score,
            ml_p,
            ml_pts,
            ring_pts,
            ledger["clip_adjust"],
            conf,
            flagged,
            needs_rev,
            ledger_json
        ))

        # Populate reason_evidence(acct_id, reason_code, txn_id)
        for r_item in ledger["reasons"]:
            for tx_id in r_item.get("evidence_txns", []):
                reason_evidence_rows.append((acct_id, r_item.get("code", "UNKNOWN"), str(tx_id)))

    # Persist Tables into DuckDB
    con.execute("DROP TABLE IF EXISTS account_scores")
    con.execute("""
        CREATE TABLE account_scores (
            acct_id BIGINT PRIMARY KEY,
            risk_index DOUBLE,
            risk_display INT,
            tier VARCHAR,
            role VARCHAR,
            role_confidence DOUBLE,
            rule_score DOUBLE,
            ml_prob DOUBLE,
            ml_points DOUBLE,
            ring_points DOUBLE,
            clip_adjust DOUBLE,
            confidence VARCHAR,
            flagged BOOLEAN,
            needs_review BOOLEAN,
            ledger JSON
        )
    """)

    import pandas as pd
    df_scores = pd.DataFrame(account_score_rows, columns=[  # noqa: F841
        "acct_id", "risk_index", "risk_display", "tier", "role", "role_confidence",
        "rule_score", "ml_prob", "ml_points", "ring_points", "clip_adjust",
        "confidence", "flagged", "needs_review", "ledger"
    ])
    con.execute("INSERT INTO account_scores SELECT * FROM df_scores")

    con.execute("DROP TABLE IF EXISTS reason_evidence")
    con.execute("""
        CREATE TABLE reason_evidence (
            acct_id BIGINT,
            reason_code VARCHAR,
            txn_id VARCHAR
        )
    """)
    if reason_evidence_rows:
        df_ev = pd.DataFrame(reason_evidence_rows, columns=["acct_id", "reason_code", "txn_id"])  # noqa: F841
        con.execute("INSERT INTO reason_evidence SELECT * FROM df_ev")

    # Persist model_status table
    con.execute("DROP TABLE IF EXISTS model_status")
    con.execute("""
        CREATE TABLE model_status (
            mode VARCHAR,
            fallback_reason VARCHAR,
            flag_threshold DOUBLE,
            total_accounts INT,
            flagged_accounts INT,
            runtime_sec DOUBLE,
            model_checksum VARCHAR
        )
    """)
    elapsed = round(time.time() - start_time, 2)
    flagged_total = sum(1 for r in account_score_rows if r[12])

    con.execute("""
        INSERT INTO model_status VALUES (?, ?, ?, ?, ?, ?, ?)
    """, [
        mode,
        fallback_reason or "None - All validation gates passed",
        flag_threshold,
        n_accounts,
        flagged_total,
        elapsed,
        model_obj.model_checksum or "N/A"
    ])

    print(f"✅ [Vajra Complete] Processed {n_accounts} accounts in {elapsed}s | Mode: {mode} | Flagged: {flagged_total} (Threshold: {flag_threshold})")

    return {
        "status": "success",
        "mode": mode,
        "runtime_sec": elapsed,
        "total_accounts": n_accounts,
        "flagged_accounts": flagged_total,
        "flag_threshold": flag_threshold,
        "fallback_reason": fallback_reason,
        "model_checksum": model_obj.model_checksum
    }
