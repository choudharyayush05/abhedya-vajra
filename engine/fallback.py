"""
Vajra Fallback Engine - Automatic Failsafe Gate.
Validates Model Checksums, Flagged Distribution Share, Coherence Rates, and Feature PSI.
"""

from typing import Any

import numpy as np


def compute_psi(reference: np.ndarray, current: np.ndarray, num_bins: int = 10) -> float:
    """
    Computes Population Stability Index (PSI) between reference and current feature distributions.
    """
    if len(reference) == 0 or len(current) == 0:
        return 0.0

    # Determine quantile bins from reference
    quantiles = np.linspace(0, 100, num_bins + 1)
    bin_edges = np.percentile(reference, quantiles)
    bin_edges[0] -= 1e-5
    bin_edges[-1] += 1e-5

    ref_counts = np.histogram(reference, bins=bin_edges)[0]
    curr_counts = np.histogram(current, bins=bin_edges)[0]

    ref_pct = np.maximum(ref_counts / len(reference), 1e-4)
    curr_pct = np.maximum(curr_counts / len(current), 1e-4)

    psi_val = np.sum((curr_pct - ref_pct) * np.log(curr_pct / ref_pct))
    return float(psi_val)


class FallbackGate:
    def __init__(self, config: dict[str, Any]):
        self.config = config
        self.fb_cfg = config.get("fallback_limits", {})
        def _to_float(v, default):
            try:
                if isinstance(v, str):
                    v = v.split("#")[0].strip()
                return float(v)
            except (ValueError, TypeError):
                return float(default)

        self.min_flag_share = _to_float(self.fb_cfg.get("flagged_share_min", 0.01), 0.01)
        self.max_flag_share = _to_float(self.fb_cfg.get("flagged_share_max", 0.15), 0.15)
        self.max_coherence_delta = _to_float(self.fb_cfg.get("coherence_delta_max", 0.05), 0.05)
        self.psi_thresh = _to_float(self.fb_cfg.get("psi_threshold", 0.25), 0.25)
        self.max_psi_feature_pct = _to_float(self.fb_cfg.get("psi_feature_max_pct", 0.30), 0.30)

    def evaluate_gate(
        self,
        training_success: bool,
        model_checksum_valid: bool,
        hybrid_flagged_share: float,
        hybrid_coherence_rate: float,
        rules_coherence_rate: float,
        feature_psis: dict[str, float]
    ) -> tuple[bool, str | None]:
        """
        Evaluates the 4 strict fallback rules.
        Returns:
          (trigger_fallback: bool, reason_description: Optional[str])
        """
        # Rule 1: Model Training / Checksum Failure
        if not training_success:
            return True, "LightGBM training did not complete or failed convergence"
        if not model_checksum_valid:
            return True, "Model file checksum mismatch or checkpoint corruption detected"

        # Rule 2: Flagged Population Share Out of Forensic Bounds [1%, 15%]
        if not (self.min_flag_share <= hybrid_flagged_share <= self.max_flag_share):
            return True, (
                f"Hybrid flagged share ({hybrid_flagged_share * 100:.1f}%) outside permissible "
                f"forensic bounds [{self.min_flag_share * 100:.0f}%, {self.max_flag_share * 100:.0f}%]"
            )

        # Rule 3: Chain Coherence Degradation > 0.05
        coherence_drop = rules_coherence_rate - hybrid_coherence_rate
        if coherence_drop > self.max_coherence_delta:
            return True, (
                f"Hybrid chain coherence rate ({hybrid_coherence_rate:.3f}) degraded by {coherence_drop:.3f} "
                f"vs rules-only baseline ({rules_coherence_rate:.3f}), exceeding {self.max_coherence_delta} limit"
            )

        # Rule 4: Feature Distribution Drift (PSI > 0.25 on > 30% features)
        high_psi_features = [f for f, psi in feature_psis.items() if psi > self.psi_thresh]
        high_psi_ratio = len(high_psi_features) / max(1, len(feature_psis))
        if high_psi_ratio > self.max_psi_feature_pct:
            return True, (
                f"Population drift detected: {len(high_psi_features)}/{len(feature_psis)} features "
                f"exceed PSI > {self.psi_thresh} threshold ({high_psi_ratio * 100:.1f}% > {self.max_psi_feature_pct * 100:.0f}%)"
            )

        return False, None
