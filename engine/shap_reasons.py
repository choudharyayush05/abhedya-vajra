"""
Vajra SHAP Attribution Engine - Distributes ml_points Proportionally with Largest-Remainder Rounding.
Guarantees that the sum of ML drivers exactly equals ml_points down to the single decimal.
"""

from typing import Any

import numpy as np

from templates.reasons import ML_FEATURE_TEMPLATES


def largest_remainder_round(values: list[float], target_sum: float) -> list[float]:
    """
    Rounds a list of floats to 1 decimal place such that their sum EXACTLY equals target_sum.
    Uses the Hare-Niemeyer / Hamilton largest remainder method.
    """
    if not values or abs(target_sum) < 1e-5:
        return [0.0] * len(values)

    # Work in units of 0.1 (tenths)
    target_tenths = round(target_sum * 10.0)
    raw_tenths = [v * 10.0 for v in values]
    floored_tenths = [int(np.floor(t)) if target_tenths >= 0 else int(np.ceil(t)) for t in raw_tenths]

    diff = target_tenths - sum(floored_tenths)
    remainders = [(abs(raw_tenths[i] - floored_tenths[i]), i) for i in range(len(values))]
    remainders.sort(key=lambda x: x[0], reverse=True)

    step = 1 if target_tenths >= 0 else -1
    for i in range(abs(diff)):
        idx = remainders[i % len(values)][1]
        floored_tenths[idx] += step

    return [round(t / 10.0, 1) for t in floored_tenths]


def extract_shap_reasons(
    shap_vector: np.ndarray,      # Length p+1, last element is bias
    feature_names: list[str],
    ml_points: float,
    feature_values: dict[str, Any]
) -> list[dict[str, Any]]:
    """
    Distributes ml_points across top 4 SHAP drivers and maps them to court-ready explanations.
    """
    if abs(ml_points) < 0.1:
        return []

    # Exclude bias term (last column)
    feat_contribs = shap_vector[:len(feature_names)]

    # Filter by direction matching ml_points
    if ml_points > 0:
        candidates = [(feature_names[i], float(feat_contribs[i])) for i in range(len(feature_names)) if feat_contribs[i] > 0]
    else:
        candidates = [(feature_names[i], float(feat_contribs[i])) for i in range(len(feature_names)) if feat_contribs[i] < 0]

    if not candidates:
        return []

    # Take top 4 drivers by absolute contribution
    candidates.sort(key=lambda x: abs(x[1]), reverse=True)
    top_candidates = candidates[:4]

    # Proportional distribution of ml_points
    total_abs = sum(abs(c[1]) for c in top_candidates)
    if total_abs <= 0:
        return []

    proportional_pts = [ml_points * (abs(c[1]) / total_abs) for c in top_candidates]
    rounded_pts = largest_remainder_round(proportional_pts, ml_points)

    reasons: list[dict[str, Any]] = []
    for (feat_name, contrib), pts in zip(top_candidates, rounded_pts):
        if abs(pts) < 0.1:
            continue

        tmpl_pair = ML_FEATURE_TEMPLATES.get(feat_name, (
            f"Elevated risk indicator from feature {feat_name}",
            f"Mitigating factor from feature {feat_name}"
        ))
        text = tmpl_pair[0] if pts > 0 else tmpl_pair[1]

        reasons.append({
            "source": "ml",
            "code": f"ML_{feat_name.upper()}",
            "points": pts,
            "feature": feat_name,
            "value": float(feature_values.get(feat_name, 0.0)),
            "text": text,
            "evidence_txns": []
        })

    return reasons
