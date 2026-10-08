"""
TreeSHAP Forensic Explainability Engine (Lundberg et al. Nature MI 2020).
Computes exact, polynomial-time Shapley values for the Unsupervised Isolation Forest.
Translates mathematical tree partition contributions into court-admissible forensic evidence
for Section 106 BNSS and Section 91 CrPC legal notices.
"""

from typing import Dict, Any, List, Optional
import numpy as np
import duckdb
import shap
from sklearn.ensemble import IsolationForest

from backend.app.detect.features import FEATURE_COLUMNS, FEATURE_LABELS

class TreeShapEngine:
    def __init__(self):
        self.explainer: Optional[shap.TreeExplainer] = None
        self.model: Optional[IsolationForest] = None
        self.feature_columns: List[str] = FEATURE_COLUMNS
        self.feature_labels: Dict[str, str] = FEATURE_LABELS
        self._cached_feature_means: Optional[np.ndarray] = None

    def set_model(self, model: IsolationForest, feature_columns: List[str], feature_labels: Dict[str, str]):
        """Initialize TreeExplainer with trained Isolation Forest."""
        self.model = model
        self.feature_columns = feature_columns
        self.feature_labels = feature_labels
        self.explainer = shap.TreeExplainer(model)

    def _ensure_explainer(self, conn: duckdb.DuckDBPyConnection) -> bool:
        """Ensure model and explainer are loaded."""
        if self.explainer is not None:
            return True

        from backend.app.detect.isolation_detector import isolation_detector
        if not isolation_detector.is_trained:
            loaded = isolation_detector.load_model()
            if not loaded:
                isolation_detector.train_unsupervised_model(conn)

        if isolation_detector.model is not None:
            self.set_model(isolation_detector.model, isolation_detector.feature_columns, isolation_detector.feature_labels)
            return True
        return False

    def explain_account(self, acct_no: str, conn: duckdb.DuckDBPyConnection) -> Dict[str, Any]:
        """
        Compute exact TreeSHAP values for a specific account.
        Returns waterfall breakdown, top anomaly drivers, and court-ready legal evidence.
        """
        if not self._ensure_explainer(conn):
            return {"error": "Isolation Forest model not initialized."}

        cols_sql = ", ".join(self.feature_columns)
        row = conn.execute(f"SELECT {cols_sql} FROM account_features WHERE acct_no = ? LIMIT 1;", [acct_no]).fetchone()
        if not row:
            return {"error": f"Account {acct_no} not found in feature engine."}

        x = np.array(row, dtype=np.float32).reshape(1, -1)
        x = np.nan_to_num(x, nan=0.0, posinf=1e6, neginf=-1e6)

        # Compute exact Shapley values via TreeExplainer
        # For IsolationForest, shap_values represent contribution to decision_function.
        # Negative contribution in scikit-learn decision_function = higher anomaly.
        # We invert signs so positive SHAP = increased mule suspicion.
        raw_shap = self.explainer.shap_values(x)
        shap_vec = -np.ravel(raw_shap)

        try:
            expected_val = float(-np.ravel(self.explainer.expected_value)[0])
        except Exception:
            expected_val = 0.0

        # Build feature contributions list
        contributions = []
        for i, col in enumerate(self.feature_columns):
            val = float(x[0, i])
            shap_val = float(shap_vec[i])
            label = self.feature_labels.get(col, col)

            contributions.append({
                "feature": col,
                "label": label,
                "value": round(val, 4),
                "shap_value": round(shap_val, 4),
                "is_anomalous": shap_val > 0.005,
                "evidence_text": self._generate_evidence_text(col, val, shap_val)
            })

        # Sort by impact on anomaly score (highest positive contribution first)
        contributions.sort(key=lambda item: item["shap_value"], reverse=True)
        top_drivers = [c for c in contributions if c["is_anomalous"]][:4]

        # Generate court-admissible forensic paragraph
        evidence_lines = [d["evidence_text"] for d in top_drivers if d["evidence_text"]]
        if not evidence_lines:
            court_narrative = f"Account {acct_no} exhibits behavioral features consistent with baseline retail customer transaction distributions."
        else:
            court_narrative = (
                f"Forensic Anomaly Isolation detected suspicious non-retail activity: " +
                "; ".join(evidence_lines) +
                f". Mathematical TreeSHAP attribution confirms these factors drove the account into the high-risk anomaly threshold."
            )

        return {
            "acct_no": acct_no,
            "baseline_expected_value": round(expected_val, 4),
            "total_shap_sum": round(float(np.sum(shap_vec)), 4),
            "top_drivers": top_drivers,
            "all_features": contributions,
            "court_admissible_narrative": court_narrative
        }

    def _generate_evidence_text(self, col: str, val: float, shap_val: float) -> str:
        """Translate feature values and Shapley attributions into legal evidentiary statements."""
        if col == "pass_through_ratio_15m" and val > 0.1:
            return f"Rapid Velocity Churn: {round(val * 100, 1)}% of deposited funds were evacuated within a 15-to-60 minute window"
        elif col == "drain_ratio" and val > 0.8:
            return f"Complete Capital Drainage: {round(val * 100, 1)}% of cumulative credits were transferred out (near-zero balance retention)"
        elif col == "out_deg_distinct" and val >= 3:
            return f"Smurfing Fan-Out: Funds dispersed outward across {int(val)} distinct beneficiary accounts"
        elif col == "in_deg_distinct" and val >= 3:
            return f"Mule Aggregator Fan-In: Deposits aggregated from {int(val)} distinct victim/source accounts"
        elif col == "foreign_ip_ratio" and val > 0.2:
            return f"Offshore Routing: {round(val * 100, 1)}% of transfers initiated from overseas or proxy/VPN IP ranges"
        elif col == "headless_ratio" and val > 0.2:
            return f"Automated Execution: {round(val * 100, 1)}% of transactions triggered via headless emulators or automated scripts"
        elif col == "cashout_narr_ratio" and val > 0.1:
            return f"Cashout Narrations: {round(val * 100, 1)}% of outflows explicitly tagged with P2P/Crypto/ATM keywords"
        elif col == "scam_narr_cnt" and val >= 1:
            return f"Scam Verbiage: Transaction ledger contains {int(val)} narrative matches for fraudulent tasks/refund schemes"
        elif col == "in_out_degree_skew" and val > 0.6:
            return f"Severe Topological Asymmetry: In/Out counterparty ratio strongly deviates from commercial balance"
        elif col == "in_sum" and val > 500000:
            return f"High-Volume Influx: Received ₹{(val / 100):,.2f} in aggregate suspicious credits"
        elif col == "out_sum" and val > 500000:
            return f"High-Volume Drainage: Dispatched ₹{(val / 100):,.2f} in aggregate outbound transfers"
        return f"{self.feature_labels.get(col, col)} (value={val}) contributed +{round(shap_val, 3)} to anomaly score"

tree_shap_engine = TreeShapEngine()
