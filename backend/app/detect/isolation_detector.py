"""
Pure Unsupervised Money Mule Detector (Isolation Forest).
Implements Liu, Ting & Zhou (TKDD) Isolation Forest for unsupervised anomaly isolation.
Operates with zero ground-truth labels, isolating structural and behavioral mule patterns
directly from high-dimensional tabular & topological banking features.
"""

import os
import time
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
import numpy as np
import duckdb
import joblib
from sklearn.ensemble import IsolationForest

from backend.app.detect.features import FEATURE_COLUMNS, FEATURE_LABELS

MODEL_DIR = Path("ml/models")
MODEL_PATH = MODEL_DIR / "isolation_forest.joblib"

class IsolationMuleDetector:
    def __init__(self, n_estimators: int = 150, random_state: int = 42):
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model: Optional[IsolationForest] = None
        self.feature_columns = FEATURE_COLUMNS
        self.feature_labels = FEATURE_LABELS
        self.metrics: Dict[str, Any] = {}
        self.is_trained: bool = False

    def train_unsupervised_model(self, conn: duckdb.DuckDBPyConnection) -> Dict[str, Any]:
        """
        Fit Isolation Forest purely on unsupervised account features.
        Computes calibrated Anomaly Scores S in [0.0, 1.0] and updates account_scores.
        """
        t0 = time.perf_counter()
        MODEL_DIR.mkdir(parents=True, exist_ok=True)

        # 1. Fetch feature matrix from account_features
        has_features = conn.execute("SELECT count(*) FROM information_schema.tables WHERE table_name = 'account_features';").fetchone()[0] > 0
        if not has_features:
            from backend.app.detect.features import feature_engine
            feature_engine.compute_features(conn)

        cols_sql = ", ".join(self.feature_columns)
        query = f"SELECT acct_id, acct_no, {cols_sql} FROM account_features ORDER BY acct_id;"
        df = conn.execute(query).fetch_df()

        if len(df) == 0:
            return {"error": "No accounts found to train Isolation Forest"}

        X = df[self.feature_columns].to_numpy(dtype=np.float32)
        X = np.nan_to_num(X, nan=0.0, posinf=1e6, neginf=-1e6)

        # 2. Fit Unsupervised Isolation Forest
        # Uses n_estimators=150 isolation trees with random axis-aligned cuts
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            max_samples="auto",
            contamination="auto",
            random_state=self.random_state,
            n_jobs=-1
        )
        self.model.fit(X)

        # 3. Compute Anomaly Scores
        # decision_function: positive for inliers, negative for outliers
        # We invert so higher = more anomalous, then calibrate to [0.0, 1.0]
        raw_deviations = -self.model.decision_function(X)
        min_dev = np.percentile(raw_deviations, 1)
        max_dev = np.percentile(raw_deviations, 99)
        spread = max(1e-6, max_dev - min_dev)
        calibrated_scores = np.clip((raw_deviations - min_dev) / spread, 0.0, 1.0)

        # Percentile rank
        sorted_indices = np.argsort(calibrated_scores)
        ranks = np.empty_like(sorted_indices)
        ranks[sorted_indices] = np.arange(len(calibrated_scores))
        percentiles = (ranks / max(1, len(calibrated_scores) - 1)) * 100.0

        # Outlier flag: Top 5% or calibrated score >= 0.70
        is_anomaly = (calibrated_scores >= 0.65) | (percentiles >= 95.0)

        # 4. Save Trained Model Checkpoint
        joblib.dump({
            "model": self.model,
            "feature_columns": self.feature_columns,
            "feature_labels": self.feature_labels,
            "min_dev": float(min_dev),
            "spread": float(spread)
        }, MODEL_PATH)
        self.is_trained = True

        # 5. Write Scores to DuckDB account_scores Table
        df["isolation_anomaly_score"] = np.round(calibrated_scores, 4)
        df["anomaly_percentile"] = np.round(percentiles, 2)
        df["is_anomaly"] = is_anomaly

        # Prepare update table
        conn.execute("DROP TABLE IF EXISTS _temp_isolation_scores;")
        conn.register("_temp_isolation_df", df[["acct_no", "isolation_anomaly_score", "anomaly_percentile", "is_anomaly"]])
        conn.execute("CREATE TABLE _temp_isolation_scores AS SELECT * FROM _temp_isolation_df;")
        conn.unregister("_temp_isolation_df")

        # Update or add columns into account_scores
        conn.execute("ALTER TABLE account_scores ADD COLUMN IF NOT EXISTS isolation_anomaly_score FLOAT DEFAULT 0.0;")
        conn.execute("ALTER TABLE account_scores ADD COLUMN IF NOT EXISTS anomaly_percentile FLOAT DEFAULT 0.0;")
        conn.execute("ALTER TABLE account_scores ADD COLUMN IF NOT EXISTS is_anomaly BOOLEAN DEFAULT FALSE;")

        conn.execute("""
            UPDATE account_scores
            SET 
                isolation_anomaly_score = t.isolation_anomaly_score,
                anomaly_percentile = t.anomaly_percentile,
                is_anomaly = t.is_anomaly,
                ml_prob = t.isolation_anomaly_score,
                blended_score = ROUND(0.5 * account_scores.risk_index + 0.5 * (t.isolation_anomaly_score * 100), 1)
            FROM _temp_isolation_scores t
            WHERE account_scores.acct_no = t.acct_no;
        """)
        conn.execute("DROP TABLE IF EXISTS _temp_isolation_scores;")

        train_time = round(time.perf_counter() - t0, 3)
        num_flagged = int(np.sum(is_anomaly))

        self.metrics = {
            "algorithm": "Isolation Forest (Liu et al. TKDD)",
            "learning_type": "100% Unsupervised Anomaly Detection",
            "total_accounts": len(df),
            "num_anomalies_flagged": num_flagged,
            "flagged_ratio_pct": round((num_flagged / max(1, len(df))) * 100, 2),
            "mean_anomaly_score": round(float(np.mean(calibrated_scores)), 4),
            "training_time_seconds": train_time,
            "num_trees": self.n_estimators,
            "feature_count": len(self.feature_columns),
            "model_path": str(MODEL_PATH)
        }

        # Initialize or invalidate TreeSHAP explainer cache
        try:
            from backend.app.detect.shap_explainer import tree_shap_engine
            tree_shap_engine.set_model(self.model, self.feature_columns, self.feature_labels)
        except Exception as e:
            print("TreeSHAP engine initialization deferred:", e)

        return self.metrics

    def load_model(self) -> bool:
        """Load trained Isolation Forest from disk."""
        if not MODEL_PATH.exists():
            return False
        try:
            ckpt = joblib.load(MODEL_PATH)
            self.model = ckpt["model"]
            self.feature_columns = ckpt["feature_columns"]
            self.feature_labels = ckpt["feature_labels"]
            self.is_trained = True
            return True
        except Exception as e:
            print("Failed loading Isolation Forest checkpoint:", e)
            return False

isolation_detector = IsolationMuleDetector()
