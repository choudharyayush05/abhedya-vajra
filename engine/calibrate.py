"""
Vajra Calibration Engine - Probability Calibration for Bounded LightGBM.
Uses Isotonic Regression (>= 1,000 samples) or Platt Scaling (< 1,000 samples).
"""

from typing import Any

import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression


class ProbabilityCalibrator:
    def __init__(self):
        self.method: str = "platt"
        self.model: Any = None

    def fit(self, raw_probs: np.ndarray, y_true: np.ndarray) -> "ProbabilityCalibrator":
        """
        Fits either an Isotonic Regression curve or Platt Logistic Regression.
        """
        raw_probs = np.clip(raw_probs, 1e-6, 1.0 - 1e-6)
        n = len(y_true)

        if n >= 1000:
            self.method = "isotonic"
            self.model = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
            self.model.fit(raw_probs, y_true)
        else:
            self.method = "platt"
            # Fit sigmoid over log-odds (Platt scaling)
            log_odds = np.log(raw_probs / (1.0 - raw_probs)).reshape(-1, 1)
            self.model = LogisticRegression(solver="lbfgs", max_iter=200, random_state=42)
            self.model.fit(log_odds, y_true)

        return self

    def predict(self, raw_probs: np.ndarray) -> np.ndarray:
        """
        Returns calibrated probabilities in [0.0, 1.0].
        """
        raw_probs = np.clip(raw_probs, 1e-6, 1.0 - 1e-6)
        if self.model is None:
            return raw_probs

        if self.method == "isotonic":
            return np.clip(self.model.predict(raw_probs), 0.0, 1.0)
        else:
            log_odds = np.log(raw_probs / (1.0 - raw_probs)).reshape(-1, 1)
            return self.model.predict_proba(log_odds)[:, 1]
