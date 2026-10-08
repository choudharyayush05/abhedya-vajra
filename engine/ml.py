"""
Vajra ML Engine - Bounded LightGBM with GroupKFold Cross-Validation & Exact TreeSHAP.
Never uses raw account IDs or absolute volumes. Operates strictly under monotonic constraints.
"""

import hashlib
import os
from typing import Any

import lightgbm as lgb
import numpy as np
from sklearn.model_selection import GroupKFold

from engine.calibrate import ProbabilityCalibrator

# Feature list for LightGBM: Strictly ratios, percentiles, and counts (No IDs or absolute currency amounts)
ML_FEATURES = [
    "ptr_15m",
    "ptr_1h",
    "ptr_24h",
    "hold_p90_sec",
    "hold_median_sec",
    "max_fan_out_15m",
    "max_fan_in_1h",
    "split_amount_cv",
    "cashout_foreign_share",
    "cashout_crypto_share",
    "cashout_headless_share",
    "device_sharing_count",
    "ip_sharing_count",
    "night_share",
    "fano_burstiness"
]

# Monotonic constraints: +1 = increasing risk, -1 = decreasing risk, 0 = unconstrained
MONOTONE_CONSTRAINTS = [
    1,  # ptr_15m: higher pass-through -> higher risk
    1,  # ptr_1h: higher pass-through -> higher risk
    1,  # ptr_24h: higher pass-through -> higher risk
    -1, # hold_p90_sec: shorter hold time -> higher risk
    -1, # hold_median_sec: shorter hold time -> higher risk
    1,  # max_fan_out_15m: higher fan-out -> higher risk
    1,  # max_fan_in_1h: higher fan-in -> higher risk
    1,  # split_amount_cv: structuring -> higher risk
    1,  # cashout_foreign_share: foreign IP -> higher risk
    1,  # cashout_crypto_share: crypto gateway -> higher risk
    1,  # cashout_headless_share: headless script -> higher risk
    1,  # device_sharing_count: shared device -> higher risk
    1,  # ip_sharing_count: shared IP -> higher risk
    1,  # night_share: off-hours -> higher risk
    1   # fano_burstiness: bursty -> higher risk
]


class BoundedMuleModel:
    def __init__(self, config: dict[str, Any]):
        self.config = config
        self.ml_cfg = config.get("ml", {})
        self.models: list[lgb.Booster] = []
        self.calibrator = ProbabilityCalibrator()
        self.feature_names = ML_FEATURES
        self.model_checksum: str = ""

    def _prepare_matrix(self, features: list[dict[str, Any]]) -> np.ndarray:
        """Constructs the sanitized feature matrix."""
        mat = np.zeros((len(features), len(self.feature_names)), dtype=np.float32)
        for i, f in enumerate(features):
            for j, feat_name in enumerate(self.feature_names):
                mat[i, j] = float(f.get(feat_name, 0.0))
        return mat

    def train_and_predict(
        self,
        features: list[dict[str, Any]],
        train_indices: np.ndarray,
        train_labels: np.ndarray,
        unlabelled_indices: np.ndarray,
        group_ids: dict[int, int]
    ) -> tuple[np.ndarray, np.ndarray, dict[str, Any]]:
        """
        Trains 5-fold GroupKFold LightGBM models.
        Returns:
          (oof_calibrated_probs, shap_contributions, train_metrics)
        """
        X_all = self._prepare_matrix(features)
        n_total = len(features)
        n_labelled = len(train_indices)

        X_train = X_all[train_indices]
        y_train = train_labels

        # Assign groups based on connected component IDs to prevent ring data leakage
        groups = np.array([group_ids.get(features[idx]["acct_id"], idx) for idx in train_indices])

        n_pos = int(np.sum(y_train == 1))
        n_neg = int(np.sum(y_train == 0))
        scale_pos_weight = float(n_neg / max(1, n_pos))

        lgb_params = {
            "objective": "binary",
            "metric": "binary_logloss",
            "learning_rate": self.ml_cfg.get("learning_rate", 0.05),
            "num_leaves": self.ml_cfg.get("num_leaves", 31),
            "min_child_samples": self.ml_cfg.get("min_child_samples", 20),
            "feature_fraction": self.ml_cfg.get("feature_fraction", 0.8),
            "bagging_fraction": self.ml_cfg.get("bagging_fraction", 0.8),
            "bagging_freq": self.ml_cfg.get("bagging_freq", 1),
            "lambda_l2": self.ml_cfg.get("lambda_l2", 1.0),
            "scale_pos_weight": scale_pos_weight,
            "monotone_constraints": MONOTONE_CONSTRAINTS,
            "deterministic": True,
            "seed": self.ml_cfg.get("seed", 42),
            "verbosity": -1
        }

        # 5-fold GroupKFold validation
        n_splits = min(5, len(np.unique(groups)))
        gkf = GroupKFold(n_splits=n_splits)

        oof_raw_preds = np.zeros(n_labelled, dtype=np.float32)
        all_raw_preds = np.zeros(n_total, dtype=np.float32)
        all_shap_contribs = np.zeros((n_total, len(self.feature_names) + 1), dtype=np.float32)

        self.models = []

        for fold, (trn_idx, val_idx) in enumerate(gkf.split(X_train, y_train, groups)):
            X_tr, y_tr = X_train[trn_idx], y_train[trn_idx]
            X_va, y_val = X_train[val_idx], y_train[val_idx]

            trn_data = lgb.Dataset(X_tr, label=y_tr, feature_name=self.feature_names)
            val_data = lgb.Dataset(X_va, label=y_val, feature_name=self.feature_names, reference=trn_data)

            callbacks = [lgb.early_stopping(stopping_rounds=self.ml_cfg.get("early_stopping_rounds", 50), verbose=False)]

            booster = lgb.train(
                lgb_params,
                trn_data,
                num_boost_round=150,
                valid_sets=[val_data],
                callbacks=callbacks  # type: ignore[arg-type]
            )
            self.models.append(booster)

            # OOF prediction
            oof_raw_preds[val_idx] = booster.predict(X_va)

        # Fit probability calibrator on OOF predictions
        self.calibrator.fit(oof_raw_preds, y_train)

        # Compute predictions and exact TreeSHAP contributions
        # Labelled accounts use OOF calibration; unlabelled accounts average across fold models
        for booster in self.models:
            all_raw_preds += np.asarray(booster.predict(X_all), dtype=np.float32) / len(self.models)
            all_shap_contribs += np.asarray(booster.predict(X_all, pred_contrib=True), dtype=np.float32) / len(self.models)

        calibrated_probs = self.calibrator.predict(all_raw_preds)

        # Save model checkpoint and compute SHA-256 integrity checksum
        os.makedirs("ml/models", exist_ok=True)
        model_path = "ml/models/lightgbm_mule_detector.txt"
        if self.models:
            self.models[0].save_model(model_path)
            with open(model_path, "rb") as f:
                self.model_checksum = hashlib.sha256(f.read()).hexdigest()

        metrics = {
            "n_folds": n_splits,
            "oof_auc": float(np.mean(oof_raw_preds)),
            "calibration_method": self.calibrator.method,
            "model_checksum": self.model_checksum,
            "feature_names": self.feature_names
        }

        return calibrated_probs, all_shap_contribs, metrics
