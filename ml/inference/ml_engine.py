"""
ML Analytics Engine for the Digital Twin UAV Engine System.

Models:
  1. AnomalyDetector — IsolationForest-based anomaly detection
  2. FaultClassifier — RandomForest fault classification
  3. RULEstimator — Linear degradation-based RUL estimation

ALL MODELS ARE DEMONSTRATION MODELS.
Trained on SYNTHETIC/SIMULATED data only.
NOT validated against real engine failure data.
NOT suitable for operational use or flight safety decisions.
"""

import numpy as np
import os
import json
import logging
import joblib
from datetime import datetime
from typing import Optional, List, Dict, Tuple, Any
from pathlib import Path

try:
    from sklearn.ensemble import IsolationForest, RandomForestClassifier, GradientBoostingClassifier
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    from sklearn.metrics import classification_report, f1_score
    from sklearn.model_selection import train_test_split
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logging.warning("scikit-learn not available — ML features disabled")

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Feature Configuration
# ─────────────────────────────────────────────────────────────────────────────

ANOMALY_FEATURES = [
    "rpm", "cht_c", "egt_c", "oil_pressure_kpa", "oil_temperature_c",
    "fuel_flow_lph", "vibration_rms_g", "engine_load_pct", "throttle_pct",
    "battery_voltage_v", "alternator_voltage_v",
]

FAULT_FEATURES = [
    "rpm", "cht_c", "egt_c", "oil_pressure_kpa", "oil_temperature_c",
    "fuel_flow_lph", "vibration_rms_g", "engine_load_pct", "throttle_pct",
]

FAULT_CLASSES = [
    "NORMAL",
    "INJECTOR_DEGRADATION",
    "LUBRICATION_ISSUE",
    "OVERHEATING",
    "VIBRATION_FAULT",
    "COMBUSTION_INSTABILITY",
]

MODEL_DIR = os.environ.get("ML_MODELS_DIR", "./ml/models")


# ─────────────────────────────────────────────────────────────────────────────
# Feature Engineering
# ─────────────────────────────────────────────────────────────────────────────

def extract_features(telemetry_record: Dict[str, Any],
                     feature_list: List[str]) -> np.ndarray:
    """Extract feature vector from telemetry record."""
    values = []
    for feat in feature_list:
        val = telemetry_record.get(feat, 0.0)
        if val is None:
            val = 0.0
        values.append(float(val))
    return np.array(values)


def compute_rolling_features(records: List[Dict], window: int = 10) -> Dict[str, float]:
    """Compute rolling statistics over recent records."""
    if len(records) < 2:
        return {}

    window_records = records[-window:]
    features = {}

    for param in ["rpm", "cht_c", "egt_c", "oil_pressure_kpa", "vibration_rms_g"]:
        vals = [r.get(param, 0) or 0 for r in window_records]
        if vals:
            features[f"{param}_mean"] = float(np.mean(vals))
            features[f"{param}_std"] = float(np.std(vals))
            features[f"{param}_trend"] = float(np.polyfit(range(len(vals)), vals, 1)[0]) if len(vals) > 1 else 0.0
            features[f"{param}_min"] = float(np.min(vals))
            features[f"{param}_max"] = float(np.max(vals))

    return features


# ─────────────────────────────────────────────────────────────────────────────
# Anomaly Detector
# ─────────────────────────────────────────────────────────────────────────────

class AnomalyDetector:
    """
    Isolation Forest-based anomaly detector.
    
    Algorithm: Isolation Forest (Liu et al., 2008)
    - Builds random forests by randomly selecting features and split values
    - Anomalous points are isolated in fewer splits than normal points
    - Anomaly score = average depth across trees (normalized 0–1)
    
    Training: Unsupervised, trained on "normal" engine data
    
    DEMONSTRATION MODEL — trained on synthetic data
    NOT validated for operational use
    """

    MODEL_NAME = "AnomalyDetector"
    MODEL_VERSION = "v1.0"
    DISCLAIMER = "DEMONSTRATION MODEL. Trained on synthetic data. Not validated for operational use."

    def __init__(self):
        self.model: Optional[Pipeline] = None
        self.is_trained = False
        self.training_samples = 0
        self.training_timestamp: Optional[str] = None
        self.features = ANOMALY_FEATURES
        self.contamination = 0.05  # Expected fraction of anomalies [CONFIGURABLE]

    def _build_pipeline(self) -> Pipeline:
        return Pipeline([
            ("scaler", StandardScaler()),
            ("detector", IsolationForest(
                n_estimators=100,
                contamination=self.contamination,
                random_state=42,
                n_jobs=-1,
            ))
        ])

    def train(self, normal_records: List[Dict]) -> Dict[str, Any]:
        """Train on normal operation records."""
        if not SKLEARN_AVAILABLE:
            logger.warning("scikit-learn not available")
            return {"status": "disabled"}

        if len(normal_records) < 10:
            logger.warning(f"Too few records for training: {len(normal_records)}")
            return {"status": "insufficient_data"}

        X = np.array([extract_features(r, self.features) for r in normal_records])
        # Remove any NaN rows
        valid_mask = ~np.any(np.isnan(X), axis=1)
        X = X[valid_mask]

        if len(X) < 10:
            return {"status": "insufficient_valid_data"}

        self.model = self._build_pipeline()
        self.model.fit(X)
        self.is_trained = True
        self.training_samples = len(X)
        self.training_timestamp = datetime.utcnow().isoformat()

        logger.info(f"AnomalyDetector trained on {len(X)} samples")
        return {
            "status": "trained",
            "samples": len(X),
            "features": self.features,
            "contamination": self.contamination,
            "disclaimer": self.DISCLAIMER,
        }

    def predict(self, record: Dict) -> Dict[str, Any]:
        """Predict anomaly score for a single record."""
        if not self.is_trained or self.model is None:
            return {
                "anomaly_score": 0.0,
                "is_anomaly": False,
                "confidence": 0.0,
                "status": "model_not_trained",
            }

        X = extract_features(record, self.features).reshape(1, -1)
        if np.any(np.isnan(X)):
            return {
                "anomaly_score": 0.0,
                "is_anomaly": False,
                "confidence": 0.0,
                "status": "invalid_features",
            }

        # IsolationForest: score_samples returns -anomaly_score (more negative = more anomalous)
        raw_score = self.model.score_samples(X)[0]
        # Normalize to 0–1 (0=normal, 1=highly anomalous)
        # Typical range: -0.1 (normal) to -0.5 (anomalous)
        anomaly_score = max(0.0, min(1.0, (-raw_score - 0.1) / 0.4))

        prediction = self.model.named_steps["detector"].predict(X)[0]
        is_anomaly = (prediction == -1)

        # Feature importance via deviation from training distribution
        scaler = self.model.named_steps["scaler"]
        X_scaled = scaler.transform(X)[0]
        feature_contributions = {
            feat: abs(float(val)) for feat, val in zip(self.features, X_scaled)
        }
        total = sum(feature_contributions.values()) + 1e-9
        feature_contributions = {k: round(v / total, 4) for k, v in feature_contributions.items()}

        return {
            "anomaly_score": round(anomaly_score, 4),
            "is_anomaly": is_anomaly,
            "confidence": round(min(1.0, anomaly_score * 2) if is_anomaly else 1.0 - anomaly_score, 4),
            "contributing_features": dict(sorted(feature_contributions.items(),
                                                   key=lambda x: x[1], reverse=True)[:5]),
            "model_name": self.MODEL_NAME,
            "model_version": self.MODEL_VERSION,
            "disclaimer": self.DISCLAIMER,
        }

    def save(self, directory: str = MODEL_DIR):
        if self.model is None:
            return
        os.makedirs(directory, exist_ok=True)
        path = os.path.join(directory, "anomaly_detector.joblib")
        joblib.dump({
            "model": self.model,
            "features": self.features,
            "training_samples": self.training_samples,
            "training_timestamp": self.training_timestamp,
            "version": self.MODEL_VERSION,
        }, path)
        logger.info(f"AnomalyDetector saved to {path}")

    def load(self, directory: str = MODEL_DIR) -> bool:
        path = os.path.join(directory, "anomaly_detector.joblib")
        if not os.path.exists(path):
            return False
        try:
            data = joblib.load(path)
            self.model = data["model"]
            self.features = data.get("features", ANOMALY_FEATURES)
            self.training_samples = data.get("training_samples", 0)
            self.training_timestamp = data.get("training_timestamp")
            self.is_trained = True
            logger.info(f"AnomalyDetector loaded from {path}")
            return True
        except Exception as e:
            logger.error(f"Failed to load AnomalyDetector: {e}")
            return False


# ─────────────────────────────────────────────────────────────────────────────
# Fault Classifier
# ─────────────────────────────────────────────────────────────────────────────

class FaultClassifier:
    """
    Random Forest fault classifier.
    
    Algorithm: Random Forest Classifier (Breiman, 2001)
    - Ensemble of decision trees trained on labeled fault data
    - Returns probability distribution over fault classes
    - Feature importance available as SHAP-style attribution
    
    Classes: NORMAL, INJECTOR_DEGRADATION, LUBRICATION_ISSUE,
             OVERHEATING, VIBRATION_FAULT, COMBUSTION_INSTABILITY
    
    DEMONSTRATION MODEL — trained on synthetic data
    NOT validated for operational use
    """

    MODEL_NAME = "FaultClassifier"
    MODEL_VERSION = "v1.1"
    DISCLAIMER = "DEMONSTRATION MODEL. Synthetic training data. Not validated for fault diagnosis."

    def __init__(self):
        self.model: Optional[Pipeline] = None
        self.is_trained = False
        self.features = FAULT_FEATURES
        self.classes = FAULT_CLASSES
        self.training_samples = 0
        self.training_timestamp: Optional[str] = None
        self.metrics: Dict = {}

    def _build_pipeline(self) -> Pipeline:
        return Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1,
                class_weight="balanced",
            ))
        ])

    def train(self, records: List[Dict]) -> Dict[str, Any]:
        """Train on labeled fault records."""
        if not SKLEARN_AVAILABLE:
            return {"status": "disabled"}

        if len(records) < 50:
            return {"status": "insufficient_data", "count": len(records)}

        # Build training set
        X_list, y_list = [], []
        for r in records:
            fault_type = r.get("fault_type", "NORMAL")
            # Map to classifier classes
            if fault_type not in self.classes:
                fault_type = "NORMAL"

            feat = extract_features(r, self.features)
            if not np.any(np.isnan(feat)):
                X_list.append(feat)
                y_list.append(fault_type)

        if len(X_list) < 50:
            return {"status": "insufficient_valid_data"}

        X = np.array(X_list)
        y = np.array(y_list)

        # Check class distribution
        unique, counts = np.unique(y, return_counts=True)
        class_dist = dict(zip(unique, counts.tolist()))
        logger.info(f"Training class distribution: {class_dist}")

        # Split for validation
        if len(X) >= 100:
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y if len(unique) > 1 else None
            )
        else:
            X_train, X_val, y_train, y_val = X, X, y, y

        self.model = self._build_pipeline()
        self.model.fit(X_train, y_train)

        # Evaluate
        y_pred = self.model.predict(X_val)
        self.metrics = {
            "f1_weighted": round(f1_score(y_val, y_pred, average="weighted", zero_division=0), 4),
            "class_distribution": class_dist,
            "validation_samples": len(X_val),
        }

        self.is_trained = True
        self.training_samples = len(X_train)
        self.training_timestamp = datetime.utcnow().isoformat()

        logger.info(f"FaultClassifier trained — F1: {self.metrics['f1_weighted']:.4f}")
        return {
            "status": "trained",
            "samples": len(X_train),
            "metrics": self.metrics,
            "disclaimer": self.DISCLAIMER,
        }

    def predict(self, record: Dict) -> Dict[str, Any]:
        """Predict fault class for a single record."""
        if not self.is_trained or self.model is None:
            return {
                "predicted_class": "UNKNOWN",
                "probabilities": {c: 0.0 for c in self.classes},
                "confidence": 0.0,
                "status": "model_not_trained",
            }

        X = extract_features(record, self.features).reshape(1, -1)
        if np.any(np.isnan(X)):
            return {
                "predicted_class": "UNKNOWN",
                "probabilities": {},
                "confidence": 0.0,
                "status": "invalid_features",
            }

        proba = self.model.predict_proba(X)[0]
        classes = self.model.named_steps["classifier"].classes_
        prob_dict = {cls: round(float(p), 4) for cls, p in zip(classes, proba)}

        predicted_class = classes[np.argmax(proba)]
        confidence = float(np.max(proba))

        # Feature importance (global, normalized to sum=1)
        importances = self.model.named_steps["classifier"].feature_importances_
        feature_importance = {
            feat: round(float(imp), 4)
            for feat, imp in zip(self.features, importances)
        }
        top_features = dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:5])

        return {
            "predicted_class": predicted_class,
            "probabilities": prob_dict,
            "confidence": round(confidence, 4),
            "top_features": top_features,
            "model_name": self.MODEL_NAME,
            "model_version": self.MODEL_VERSION,
            "disclaimer": self.DISCLAIMER,
            "interpretation": f"Model predicts '{predicted_class}' with {confidence*100:.1f}% probability. "
                              f"This is a DEMONSTRATION prediction. Requires engineering confirmation.",
        }

    def save(self, directory: str = MODEL_DIR):
        if self.model is None:
            return
        os.makedirs(directory, exist_ok=True)
        path = os.path.join(directory, "fault_classifier.joblib")
        joblib.dump({
            "model": self.model,
            "features": self.features,
            "classes": self.classes,
            "metrics": self.metrics,
            "training_samples": self.training_samples,
            "training_timestamp": self.training_timestamp,
            "version": self.MODEL_VERSION,
        }, path)
        logger.info(f"FaultClassifier saved to {path}")

    def load(self, directory: str = MODEL_DIR) -> bool:
        path = os.path.join(directory, "fault_classifier.joblib")
        if not os.path.exists(path):
            return False
        try:
            data = joblib.load(path)
            self.model = data["model"]
            self.features = data.get("features", FAULT_FEATURES)
            self.classes = data.get("classes", FAULT_CLASSES)
            self.metrics = data.get("metrics", {})
            self.training_samples = data.get("training_samples", 0)
            self.training_timestamp = data.get("training_timestamp")
            self.is_trained = True
            logger.info(f"FaultClassifier loaded from {path}")
            return True
        except Exception as e:
            logger.error(f"Failed to load FaultClassifier: {e}")
            return False


# ─────────────────────────────────────────────────────────────────────────────
# RUL Estimator
# ─────────────────────────────────────────────────────────────────────────────

class RULEstimator:
    """
    Remaining Useful Life estimator.
    
    DEMONSTRATION MODEL / SIMULATION-BASED ESTIMATE.
    NOT validated against real engine failure data.
    Confidence intervals are indicative only.
    
    Algorithm:
    1. Base RUL = TBO - accumulated operating hours
    2. Health-based correction: poor health → faster remaining life consumption
    3. Thermal exposure penalty: accumulated time above normal CHT
    4. Vibration exposure penalty: accumulated high-vibration time
    5. Fault history penalty: each historical fault reduces estimated RUL
    
    Reference approach inspired by: Saxena et al. (2008) — NASA PHM Conference
    (See docs/research/references.md for full citation)
    """

    MODEL_NAME = "RULEstimator"
    MODEL_VERSION = "v0.3"
    DISCLAIMER = (
        "SIMULATION-BASED ESTIMATE. NOT validated against real engine failure data. "
        "Do NOT use for flight operations or maintenance decisions without proper validation."
    )

    def __init__(self, tbo_hours: float = 1500.0, maintenance_threshold_pct: float = 30.0):
        self.tbo_hours = tbo_hours  # Time Between Overhaul [SIMULATED/CONFIGURABLE]
        self.maintenance_threshold_pct = maintenance_threshold_pct

    def estimate(
        self,
        operating_hours: float,
        current_health: float,           # 0–100 health index
        health_history: List[float],     # Recent health values (newest last)
        thermal_exposure_h: float = 0.0, # Hours above normal CHT [SIMULATED]
        vibration_exposure_h: float = 0.0, # Hours above normal vibration [SIMULATED]
        fault_count: int = 0,
        last_overhaul_hours: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Estimate RUL given engine condition.
        
        Returns point estimate with confidence interval.
        All values: SIMULATION-BASED ESTIMATE
        """
        hours_since_overhaul = operating_hours - last_overhaul_hours
        base_rul = max(0.0, self.tbo_hours - hours_since_overhaul)

        # Health factor: health < 100 reduces remaining life
        # Formula: health_factor = (current_health / 100) ^ 1.5 [SIMULATED]
        health_factor = (max(0.0, current_health) / 100.0) ** 1.5
        health_factor = max(0.1, health_factor)

        # Degradation rate from health trend
        degradation_rate = 0.0
        if len(health_history) >= 2:
            recent = health_history[-min(20, len(health_history)):]
            if len(recent) >= 2:
                degradation_rate = max(0.0, (recent[0] - recent[-1]) / max(1, len(recent)))
        # Limit unrealistic rates [SIMULATED]
        degradation_rate = min(degradation_rate, 5.0)

        # Thermal exposure penalty [SIMULATED]
        # Excessive CHT exposure accelerates fatigue
        thermal_penalty = 1.0 - min(0.3, thermal_exposure_h / 500.0)

        # Vibration exposure penalty [SIMULATED]
        vibration_penalty = 1.0 - min(0.2, vibration_exposure_h / 300.0)

        # Fault history penalty [SIMULATED]
        # Each unresolved fault reduces estimated remaining life
        fault_penalty = 1.0 - min(0.25, fault_count * 0.05)

        # Final RUL estimate
        rul = base_rul * health_factor * thermal_penalty * vibration_penalty * fault_penalty
        rul = max(0.0, rul)

        # Confidence interval: ±15% at 80% confidence [SIMULATED]
        ci_factor = 0.15
        rul_lower = max(0.0, rul * (1.0 - ci_factor))
        rul_upper = rul * (1.0 + ci_factor)

        # Estimate hours to maintenance threshold
        threshold_health = self.maintenance_threshold_pct
        if degradation_rate > 0 and current_health > threshold_health:
            hours_to_threshold = (current_health - threshold_health) / degradation_rate
        elif current_health <= threshold_health:
            hours_to_threshold = 0.0
        else:
            # Use RUL as estimate when degradation rate is unclear
            hours_to_threshold = rul * 0.7

        # Model confidence — lower when health is poor or degradation is fast
        model_confidence = min(1.0, health_factor * (1.0 - degradation_rate / 10.0))
        model_confidence = max(0.2, model_confidence)

        return {
            "rul_hours": round(rul, 1),
            "rul_lower_ci_hours": round(rul_lower, 1),
            "rul_upper_ci_hours": round(rul_upper, 1),
            "confidence_level": 0.80,
            "model_confidence": round(model_confidence, 3),
            "degradation_rate_pct_per_h": round(degradation_rate, 4),
            "estimated_hours_to_threshold": round(hours_to_threshold, 1),
            "maintenance_threshold_pct": self.maintenance_threshold_pct,
            "factors": {
                "base_rul_hours": round(base_rul, 1),
                "health_factor": round(health_factor, 3),
                "thermal_penalty": round(thermal_penalty, 3),
                "vibration_penalty": round(vibration_penalty, 3),
                "fault_penalty": round(fault_penalty, 3),
            },
            "model_name": self.MODEL_NAME,
            "model_version": self.MODEL_VERSION,
            "disclaimer": self.DISCLAIMER,
        }


# ─────────────────────────────────────────────────────────────────────────────
# ML Engine (singleton)
# ─────────────────────────────────────────────────────────────────────────────

class MLEngine:
    """
    Central ML analytics engine.
    Manages all ML models as a singleton.
    
    DEMONSTRATION SYSTEM — synthetic training data only.
    """

    def __init__(self):
        self.anomaly_detector = AnomalyDetector()
        self.fault_classifier = FaultClassifier()
        self.rul_estimator = RULEstimator()
        self.is_initialized = False

    def initialize(self, training_records: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Initialize all models — load if saved, or train from provided records."""
        results = {}

        # Try to load saved models first
        if self.anomaly_detector.load():
            results["anomaly_detector"] = "loaded_from_disk"
        elif training_records:
            normal_records = [r for r in training_records
                              if r.get("fault_type", "NORMAL") == "NORMAL"]
            results["anomaly_detector"] = self.anomaly_detector.train(normal_records)
            self.anomaly_detector.save()

        if self.fault_classifier.load():
            results["fault_classifier"] = "loaded_from_disk"
        elif training_records:
            results["fault_classifier"] = self.fault_classifier.train(training_records)
            self.fault_classifier.save()

        results["rul_estimator"] = {"status": "ready", "disclaimer": RULEstimator.DISCLAIMER}

        self.is_initialized = True
        logger.info(f"MLEngine initialized: {results}")
        return results

    def analyze(self, record: Dict, operating_hours: float = 0.0,
                health_history: Optional[List[float]] = None,
                fault_count: int = 0) -> Dict[str, Any]:
        """Run all ML analyses on a telemetry record."""
        analysis = {}

        if self.anomaly_detector.is_trained:
            analysis["anomaly"] = self.anomaly_detector.predict(record)

        if self.fault_classifier.is_trained:
            analysis["fault"] = self.fault_classifier.predict(record)

        if health_history is None:
            health_history = [100.0]

        current_health = health_history[-1] if health_history else 100.0
        analysis["rul"] = self.rul_estimator.estimate(
            operating_hours=operating_hours,
            current_health=current_health,
            health_history=health_history,
            fault_count=fault_count,
        )

        return analysis

    def get_model_registry(self) -> List[Dict]:
        """Return model registry information."""
        registry = [
            {
                "model_name": AnomalyDetector.MODEL_NAME,
                "model_version": AnomalyDetector.MODEL_VERSION,
                "model_type": "ANOMALY_DETECTION",
                "algorithm": "IsolationForest",
                "description": "Unsupervised anomaly detection on engine telemetry",
                "is_active": self.anomaly_detector.is_trained,
                "training_samples": self.anomaly_detector.training_samples,
                "training_timestamp": self.anomaly_detector.training_timestamp,
                "features": ANOMALY_FEATURES,
                "disclaimer": AnomalyDetector.DISCLAIMER,
            },
            {
                "model_name": FaultClassifier.MODEL_NAME,
                "model_version": FaultClassifier.MODEL_VERSION,
                "model_type": "FAULT_CLASSIFICATION",
                "algorithm": "RandomForestClassifier",
                "description": "Multi-class fault diagnosis from telemetry features",
                "is_active": self.fault_classifier.is_trained,
                "training_samples": self.fault_classifier.training_samples,
                "training_timestamp": self.fault_classifier.training_timestamp,
                "features": FAULT_FEATURES,
                "metrics": self.fault_classifier.metrics,
                "disclaimer": FaultClassifier.DISCLAIMER,
            },
            {
                "model_name": RULEstimator.MODEL_NAME,
                "model_version": RULEstimator.MODEL_VERSION,
                "model_type": "RUL_ESTIMATION",
                "algorithm": "Physics-Informed Degradation Model",
                "description": "Remaining Useful Life estimation from health and exposure",
                "is_active": True,
                "disclaimer": RULEstimator.DISCLAIMER,
            },
        ]
        return registry


# Global ML engine instance
ml_engine = MLEngine()
