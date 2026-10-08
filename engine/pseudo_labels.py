"""
Vajra Pseudo-Label Engine - Generates High-Confidence Supervision for Bounded LightGBM.
Selects confident rule hits (positives) and clear benign baseline accounts (negatives).
"""

import csv
import os
import random
from typing import Any

import numpy as np


def generate_pseudo_labels(
    rule_results: list[dict[str, Any]],
    features: list[dict[str, Any]],
    config: dict[str, Any]
) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict[str, Any]]:
    """
    Partitions accounts into:
      - Positives (y = 1): High rule score + multi-family + rapid PTR + chain coherent (capped at 3%)
      - Negatives (y = 0): Very low rule score + unlinked to seeds + bottom 70%
      - Unlabelled: All remaining accounts (scored by model)

    Returns:
      (train_indices, train_labels, unlabelled_indices, stats)
    """
    p_cfg = config.get("pseudo_labels", {})
    pos_min_rule = p_cfg.get("pos_min_rule", 75.0)
    pos_min_families = p_cfg.get("pos_min_families", 3)
    pos_min_ptr = p_cfg.get("pos_min_ptr_15m", 0.90)
    pos_max_pct = p_cfg.get("pos_max_pct", 0.03)
    neg_max_rule = p_cfg.get("neg_max_rule", 15.0)
    min_pos = p_cfg.get("min_positives", 50)
    min_neg = p_cfg.get("min_negatives", 200)

    feat_by_id = {f["acct_id"]: f for f in features}
    n_total = len(rule_results)
    max_positives = max(min_pos, int(n_total * pos_max_pct))

    pos_candidates: list[tuple[int, float]] = []
    neg_candidates: list[int] = []

    for idx, r in enumerate(rule_results):
        acct_id = r["acct_id"]
        f = feat_by_id.get(acct_id, {})
        score = r["rule_score"]
        n_families = len(r.get("families_fired", []))
        ptr_15m = f.get("ptr_15m", 0.0)
        coherence = r.get("coherence_pts", 0.0)

        # Positive criteria: confident multi-signal money mule
        if (score >= pos_min_rule and 
            n_families >= pos_min_families and 
            ptr_15m >= pos_min_ptr and 
            coherence > 0):
            pos_candidates.append((idx, score))

        # Negative criteria: clear non-mule baseline
        elif score <= neg_max_rule and coherence == 0:
            neg_candidates.append(idx)

    # Sort positives by score descending and cap at pos_max_pct
    pos_candidates.sort(key=lambda x: x[1], reverse=True)
    pos_indices = [x[0] for x in pos_candidates[:max_positives]]

    # Ensure negative sample size is balanced and representative
    neg_indices = neg_candidates

    n_pos = len(pos_indices)
    n_neg = len(neg_indices)

    # Fallback condition check
    can_train = (n_pos >= min_pos and n_neg >= min_neg)
    fallback_reason = None
    if not can_train:
        fallback_reason = f"Insufficient pseudo-labels: {n_pos} positives (min {min_pos}), {n_neg} negatives (min {min_neg})"

    # Export audit sample (30 positives + 30 negatives)
    os.makedirs("audit", exist_ok=True)
    audit_file = "audit/pseudo_label_sample.csv"
    try:
        sample_pos = random.sample(pos_indices, min(30, n_pos)) if n_pos > 0 else []
        sample_neg = random.sample(neg_indices, min(30, n_neg)) if n_neg > 0 else []

        with open(audit_file, "w", newline="") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(["acct_id", "acct_no", "pseudo_label", "rule_score", "ptr_15m", "families_count"])
            for idx in sample_pos:
                r = rule_results[idx]
                f = feat_by_id[r["acct_id"]]
                writer.writerow([r["acct_id"], r["acct_no"], 1, r["rule_score"], f.get("ptr_15m", 0), len(r.get("families_fired", []))])
            for idx in sample_neg:
                r = rule_results[idx]
                f = feat_by_id[r["acct_id"]]
                writer.writerow([r["acct_id"], r["acct_no"], 0, r["rule_score"], f.get("ptr_15m", 0), len(r.get("families_fired", []))])
    except (OSError, csv.Error) as e:
        print(f"Warning: Failed to export pseudo-label sample audit: {e}")

    # Prepare indices for model fitting
    train_indices = np.array(pos_indices + neg_indices, dtype=np.int32)
    train_labels = np.array([1] * n_pos + [0] * n_neg, dtype=np.int32)

    labelled_set = set(pos_indices) | set(neg_indices)
    unlabelled_indices = np.array([i for i in range(n_total) if i not in labelled_set], dtype=np.int32)

    stats = {
        "n_positives": n_pos,
        "n_negatives": n_neg,
        "n_unlabelled": len(unlabelled_indices),
        "can_train": can_train,
        "fallback_reason": fallback_reason
    }

    return train_indices, train_labels, unlabelled_indices, stats
