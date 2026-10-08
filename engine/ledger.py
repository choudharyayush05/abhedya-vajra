"""
Vajra Audit Ledger Engine - Constructs Immutable Evidence Record for Every Scored Account.
Strictly asserts that the sum of all reason points + clip_adjust == risk_index (raises error otherwise).
"""

from typing import Any


def determine_role(
    features: dict[str, Any],
    rule_score: float
) -> dict[str, Any]:
    """
    Infers money mule operational role from behavioral and network topology traits.
    """
    if rule_score < 40.0:
        return {"behaviour": "BENIGN", "confidence": 0.92}

    max_out = features.get("max_fan_out_15m", 0)
    max_in = features.get("max_fan_in_1h", 0)
    cashout_crypto = features.get("cashout_crypto_share", 0)
    cashout_foreign = features.get("cashout_foreign_share", 0)
    ptr_15m = features.get("ptr_15m", 0)

    if cashout_crypto > 0.20 or cashout_foreign > 0.20:
        return {"behaviour": "CASH_OUT", "confidence": 0.88}
    elif max_out >= 4 and max_in <= 2:
        return {"behaviour": "DISTRIBUTOR", "confidence": 0.85}
    elif max_in >= 4 and max_out <= 2:
        return {"behaviour": "COLLECTOR", "confidence": 0.84}
    elif ptr_15m >= 0.85:
        return {"behaviour": "LAYERER", "confidence": 0.86}
    else:
        return {"behaviour": "DISTRIBUTOR", "confidence": 0.75}


def build_account_ledger(
    acct_no: str,
    rule_score: float,
    ml_prob: float,
    ml_points: float,
    ring_points: float,
    rule_reasons: list[dict[str, Any]],
    shap_reasons: list[dict[str, Any]],
    upstream_flagged: int = 0,
    downstream_flagged: int = 0,
    role_info: dict[str, Any] | None = None,
    features: dict[str, Any] | None = None
) -> dict[str, Any]:
    """
    Constructs the exact audit ledger and asserts zero mathematical discrepancy.
    """
    # 1. Unclipped Sum Calculation
    unclipped_sum = round(rule_score + ml_points + ring_points, 1)
    clipped_risk = round(max(0.0, min(100.0, unclipped_sum)), 1)
    clip_adjust = round(clipped_risk - unclipped_sum, 1)

    # 2. Combine all reasons
    all_reasons: list[dict[str, Any]] = []
    all_reasons.extend(rule_reasons)
    all_reasons.extend(shap_reasons)

    if ring_points > 0:
        all_reasons.append({
            "source": "ring",
            "code": "RING_TOPOLOGY",
            "points": ring_points,
            "feature": "ring_points",
            "value": ring_points,
            "text": f"Identified as intermediary bridge node between high-risk anchor accounts (+{ring_points:.1f} ring boost)",
            "evidence_txns": []
        })

    # 3. Deterministic Sum Assertion (Must equal risk_index exactly)
    points_sum = round(sum(r["points"] for r in all_reasons) + clip_adjust, 1)
    if abs(points_sum - clipped_risk) > 0.05:
        raise ValueError(
            f"Mathematical ledger mismatch for account {acct_no}: "
            f"Sum of reason points ({points_sum}) + clip_adjust ({clip_adjust}) "
            f"!= clipped risk_index ({clipped_risk})"
        )

    # 4. Tier Assignment
    if clipped_risk >= 75.0:
        tier = "Critical"
    elif clipped_risk >= 40.0:
        tier = "High"
    elif clipped_risk >= 20.0:
        tier = "Medium"
    else:
        tier = "Low"

    # 5. Confidence Calculation
    # HIGH if >= 3 independent rule families fired AND ml_prob >= 0.7 AND chain coherence fired
    # MEDIUM if >= 2 families; else LOW
    families_fired = set()
    for r in rule_reasons:
        code = r.get("code", "")
        if "PTR" in code or "HOLD" in code:
            families_fired.add("velocity")
        elif "FAN" in code or "SPLIT" in code:
            families_fired.add("fan")
        elif "CASHOUT" in code:
            families_fired.add("cashout")
        elif "SHARED" in code:
            families_fired.add("device_ip")
        elif "CHAIN" in code:
            families_fired.add("chain")

    chain_fired = "chain" in families_fired
    if len(families_fired) >= 3 and ml_prob >= 0.70 and chain_fired:
        confidence = "HIGH"
    elif len(families_fired) >= 2:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"

    # Top ML Drivers summary
    ml_top_drivers = [[r["feature"], r["points"]] for r in shap_reasons[:4]]

    ledger = {
        "acct": acct_no,
        "risk_index": clipped_risk,
        "risk_display": round(clipped_risk),
        "tier": tier,
        "confidence": confidence,
        "role": role_info or {"behaviour": "DISTRIBUTOR", "confidence": 0.80},
        "rule_score": rule_score,
        "ml_prob": round(ml_prob, 3),
        "ml_points": ml_points,
        "ring_points": ring_points,
        "clip_adjust": clip_adjust,
        "reasons": all_reasons,
        "ml": {
            "prob": round(ml_prob, 3),
            "top_drivers": ml_top_drivers
        },
        "upstream_flagged": upstream_flagged,
        "downstream_flagged": downstream_flagged
    }

    return ledger
