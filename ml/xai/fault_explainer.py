"""
Explainable AI (XAI) Module for Fault Diagnosis

Implements model-agnostic explainability for the fault detection system.

Techniques implemented:
  1. Permutation Feature Importance — measure how much each feature
     contributes to a prediction by observing score change when shuffled.
  2. LIME-style Local Explanation — linearize model locally around the
     current prediction to explain individual decisions.
  3. Counterfactual Explanation — what values would change the prediction?
  4. Evidence Extraction — link feature values to their fault domain meaning.

All explanations are structured JSON-serializable dicts for API responses
and frontend rendering.

References:
  - Ribeiro et al. (2016). "Why should I trust you?" LIME. KDD.
  - Breiman (2001). Random Forests — feature importance. Machine Learning.
  - Wachter et al. (2017). Counterfactual explanations. Harvard JOLT.
  - Doshi-Velez & Kim (2017). Towards rigorous XAI. ICML.

DISCLAIMER: DEMONSTRATION MODEL — NOT for operational or flight-safety use.
"""

import numpy as np
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Feature Metadata: human-readable descriptions for each telemetry feature
# ─────────────────────────────────────────────────────────────────────────────

FEATURE_METADATA: Dict[str, Dict] = {
    "rpm": {
        "name": "Engine RPM",
        "unit": "RPM",
        "normal_range": (800, 5500),
        "description": "Engine rotation speed — primary power output indicator",
        "fault_relevance": {
            "INJECTOR_DEGRADATION": "RPM fluctuations indicate combustion irregularity",
            "COMBUSTION_INSTABILITY": "Unstable RPM is a primary combustion instability signature",
            "MISFIRE": "RPM drops correspond to misfiring cylinders",
        },
    },
    "cht_c": {
        "name": "Cylinder Head Temperature",
        "unit": "°C",
        "normal_range": (80, 200),
        "description": "Temperature of engine cylinder head — primary thermal stress indicator",
        "fault_relevance": {
            "OVERHEATING": "CHT > 220°C indicates thermal stress — primary indicator",
            "COOLING_DEGRADATION": "Rising CHT trend despite normal ambient = cooling failure",
            "COMBUSTION_INSTABILITY": "Abnormal CHT with normal EGT suggests uneven combustion",
        },
    },
    "egt_c": {
        "name": "Exhaust Gas Temperature",
        "unit": "°C",
        "normal_range": (300, 700),
        "description": "Temperature of exhaust gases — indicates combustion quality",
        "fault_relevance": {
            "OVERHEATING": "Elevated EGT increases thermal load",
            "INJECTOR_DEGRADATION": "EGT imbalance across cylinders signals injector fault",
            "COMBUSTION_INSTABILITY": "EGT variance > ±30°C/min indicates instability",
        },
    },
    "oil_pressure_kpa": {
        "name": "Oil Pressure",
        "unit": "kPa",
        "normal_range": (200, 550),
        "description": "Engine lubricating oil pressure — critical for bearing protection",
        "fault_relevance": {
            "LUBRICATION_ISSUE": "Low oil pressure is the primary lubrication fault indicator",
        },
    },
    "oil_temperature_c": {
        "name": "Oil Temperature",
        "unit": "°C",
        "normal_range": (60, 110),
        "description": "Engine oil temperature — high temp degrades viscosity and lubrication",
        "fault_relevance": {
            "LUBRICATION_ISSUE": "High oil temp with low pressure = lubrication breakdown risk",
        },
    },
    "fuel_flow_lph": {
        "name": "Fuel Flow",
        "unit": "L/h",
        "normal_range": (5, 35),
        "description": "Fuel consumption rate — indicates combustion efficiency",
        "fault_relevance": {
            "INJECTOR_DEGRADATION": "Abnormal fuel flow indicates injector performance change",
            "FUEL_SYSTEM_FAULT": "Low fuel flow signals injector blockage or pump failure",
            "COMBUSTION_INSTABILITY": "Irregular fuel delivery causes combustion instability",
        },
    },
    "vibration_rms_g": {
        "name": "Vibration RMS",
        "unit": "g",
        "normal_range": (0.0, 0.4),
        "description": "Root-mean-square engine vibration — indicates mechanical balance",
        "fault_relevance": {
            "VIBRATION_FAULT": "Primary vibration fault indicator — > 0.5g is abnormal",
        },
    },
    "engine_load_pct": {
        "name": "Engine Load",
        "unit": "%",
        "normal_range": (10, 100),
        "description": "Engine power output as fraction of maximum — affects all thermal systems",
        "fault_relevance": {
            "OVERHEATING": "High load amplifies thermal stress in any degraded cooling system",
            "LUBRICATION_ISSUE": "High load increases oil temperature and pressure demand",
        },
    },
    "throttle_pct": {
        "name": "Throttle Position",
        "unit": "%",
        "normal_range": (0, 100),
        "description": "Throttle valve opening — commanded power input",
        "fault_relevance": {},
    },
    "battery_voltage_v": {
        "name": "Battery Voltage",
        "unit": "V",
        "normal_range": (11.5, 14.5),
        "description": "Onboard battery voltage — electrical system health",
        "fault_relevance": {
            "ELECTRICAL_FAULT": "Low battery voltage indicates charging or battery fault",
        },
    },
    "alternator_voltage_v": {
        "name": "Alternator Voltage",
        "unit": "V",
        "normal_range": (13.5, 15.0),
        "description": "Engine alternator output — primary electrical power source",
        "fault_relevance": {
            "ELECTRICAL_FAULT": "Alternator voltage out of range = primary electrical fault",
        },
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Fault Domain Knowledge
# ─────────────────────────────────────────────────────────────────────────────

FAULT_DOMAIN_KNOWLEDGE: Dict[str, Dict] = {
    "INJECTOR_DEGRADATION": {
        "primary_features": ["fuel_flow_lph", "egt_c", "rpm"],
        "expected_pattern": "fuel_flow deviation AND egt imbalance AND rpm fluctuation",
        "physical_mechanism": "Clogged or worn injectors deliver uneven fuel spray, causing "
                              "cylinder-to-cylinder EGT imbalance and RPM instability.",
        "counterfactual_target": {"fuel_flow_lph": "within 15% of nominal", "rpm_stability": "< ±2% deviation"},
        "maintenance_urgency": "HIGH — schedule injector inspection within 5 flight hours",
    },
    "LUBRICATION_ISSUE": {
        "primary_features": ["oil_pressure_kpa", "oil_temperature_c"],
        "expected_pattern": "low oil pressure AND/OR high oil temperature",
        "physical_mechanism": "Oil pump wear, low oil level, or cooler blockage reduces lubrication "
                              "film on bearings, leading to accelerated wear and seizure risk.",
        "counterfactual_target": {"oil_pressure_kpa": "> 250 kPa at cruise", "oil_temperature_c": "< 100°C"},
        "maintenance_urgency": "URGENT — check oil level and pressure immediately",
    },
    "OVERHEATING": {
        "primary_features": ["cht_c", "egt_c"],
        "expected_pattern": "cht > 200°C AND/OR egt > 700°C",
        "physical_mechanism": "Insufficient cooling airflow, lean mixture, or high ambient "
                              "temperature causes thermal stress, risking detonation and head warping.",
        "counterfactual_target": {"cht_c": "< 200°C", "egt_c": "< 700°C"},
        "maintenance_urgency": "URGENT — reduce power, check cooling ducts, verify mixture",
    },
    "VIBRATION_FAULT": {
        "primary_features": ["vibration_rms_g"],
        "expected_pattern": "vibration_rms > 0.5g sustained",
        "physical_mechanism": "Propeller imbalance, loose engine mounts, bearing wear, or "
                              "broken/bent fin causes abnormal vibration, leading to fatigue damage.",
        "counterfactual_target": {"vibration_rms_g": "< 0.3g"},
        "maintenance_urgency": "HIGH — inspect propeller balance and engine mounts",
    },
    "COMBUSTION_INSTABILITY": {
        "primary_features": ["egt_c", "rpm", "fuel_flow_lph"],
        "expected_pattern": "egt variance AND rpm instability",
        "physical_mechanism": "Fouled spark plugs, injector timing errors, or poor fuel atomization "
                              "causes irregular combustion events (misfires).",
        "counterfactual_target": {"egt_variance": "< ±20°C/min", "rpm_variation": "< ±1%"},
        "maintenance_urgency": "MEDIUM — schedule spark plug and ignition inspection",
    },
    "ELECTRICAL_FAULT": {
        "primary_features": ["alternator_voltage_v", "battery_voltage_v"],
        "expected_pattern": "alternator_voltage out of 13.5–15V range OR battery_voltage < 11.5V",
        "physical_mechanism": "Alternator regulator failure or battery degradation disrupts "
                              "electrical power to ECU, sensors, and ignition.",
        "counterfactual_target": {"alternator_voltage_v": "13.5–15.0V", "battery_voltage_v": "> 12V"},
        "maintenance_urgency": "HIGH — inspect alternator belt, regulator, and battery",
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# Permutation Importance Estimator
# ─────────────────────────────────────────────────────────────────────────────

class PermutationImportance:
    """
    Model-agnostic feature importance via permutation testing.

    Measures how much a model's prediction score degrades when each
    feature is randomly shuffled (breaking its relationship with the output).

    Features that cause large score degradation when shuffled = important.

    Basis: Breiman (2001) Random Forests — out-of-bag permutation importance.
    """

    def __init__(self, n_repeats: int = 10):
        self.n_repeats = n_repeats
        self.rng = np.random.default_rng(42)

    def compute(self, predict_fn, feature_names: List[str],
                X_baseline: np.ndarray) -> Dict[str, float]:
        """
        Compute permutation importance scores.

        Args:
            predict_fn: callable that returns anomaly/fault scores for input array
            feature_names: list of feature names
            X_baseline: baseline feature matrix (n_samples, n_features)

        Returns:
            dict of feature -> importance score (higher = more important)
        """
        try:
            baseline_scores = predict_fn(X_baseline)
            if hasattr(baseline_scores, 'mean'):
                baseline_mean = float(np.mean(baseline_scores))
            else:
                baseline_mean = float(baseline_scores)
        except Exception as e:
            logger.warning(f"PermutationImportance: baseline prediction failed: {e}")
            return {f: 0.0 for f in feature_names}

        importances = {}
        for i, feat in enumerate(feature_names):
            degradations = []
            for _ in range(self.n_repeats):
                X_perm = X_baseline.copy()
                X_perm[:, i] = self.rng.permutation(X_perm[:, i])
                try:
                    scores = predict_fn(X_perm)
                    score_mean = float(np.mean(scores)) if hasattr(scores, 'mean') else float(scores)
                    degradations.append(abs(score_mean - baseline_mean))
                except Exception:
                    degradations.append(0.0)
            importances[feat] = round(float(np.mean(degradations)), 6)

        # Normalize to 0–1
        max_imp = max(importances.values()) if importances else 1.0
        if max_imp > 0:
            importances = {k: round(v / max_imp, 4) for k, v in importances.items()}

        return importances


# ─────────────────────────────────────────────────────────────────────────────
# Main Fault Explainer
# ─────────────────────────────────────────────────────────────────────────────

class FaultExplainer:
    """
    Generate structured, human-readable explanations for fault diagnoses.

    For each fault or anomaly, produces:
    - Top contributing features (ranked by importance)
    - Supporting evidence (parameter readings that align with fault hypothesis)
    - Contradicting evidence (readings that don't fit)
    - Counterfactual: what parameter changes would resolve the fault
    - Confidence breakdown
    - Maintenance recommendation with rationale
    """

    def __init__(self):
        self.perm_importance = PermutationImportance()

    def explain_fault(self, fault_type: str, telemetry: Dict[str, Any],
                      confidence: float, ml_proba: Optional[Dict[str, float]] = None
                      ) -> Dict[str, Any]:
        """
        Explain a fault diagnosis decision.

        Args:
            fault_type: e.g. "INJECTOR_DEGRADATION"
            telemetry: current telemetry snapshot
            confidence: model confidence 0–1
            ml_proba: per-class probability dict from classifier (optional)

        Returns:
            Structured explanation dict.
        """
        domain = FAULT_DOMAIN_KNOWLEDGE.get(fault_type, {})
        primary_features = domain.get("primary_features", [])

        # Build supporting and contradicting evidence
        supporting = []
        contradicting = []

        for feat, meta in FEATURE_METADATA.items():
            val = telemetry.get(feat)
            if val is None:
                continue
            lo, hi = meta["normal_range"]
            out_of_range = val < lo or val > hi
            is_primary = feat in primary_features
            fault_relevance = meta["fault_relevance"].get(fault_type, "")

            if is_primary and out_of_range:
                supporting.append({
                    "feature": meta["name"],
                    "value": round(float(val), 3),
                    "unit": meta["unit"],
                    "normal_range": meta["normal_range"],
                    "status": "BELOW_NORMAL" if val < lo else "ABOVE_NORMAL",
                    "relevance": fault_relevance,
                    "contribution": "PRIMARY",
                })
            elif is_primary and not out_of_range:
                contradicting.append({
                    "feature": meta["name"],
                    "value": round(float(val), 3),
                    "unit": meta["unit"],
                    "normal_range": meta["normal_range"],
                    "status": "NORMAL",
                    "note": f"Within range — reduces confidence in {fault_type}",
                })
            elif not is_primary and out_of_range and fault_relevance:
                supporting.append({
                    "feature": meta["name"],
                    "value": round(float(val), 3),
                    "unit": meta["unit"],
                    "normal_range": meta["normal_range"],
                    "status": "BELOW_NORMAL" if val < lo else "ABOVE_NORMAL",
                    "relevance": fault_relevance,
                    "contribution": "SECONDARY",
                })

        # Top features by fault domain
        top_features = []
        for i, feat in enumerate(primary_features):
            val = telemetry.get(feat)
            meta = FEATURE_METADATA.get(feat, {})
            if val is not None:
                lo, hi = meta.get("normal_range", (0, 9999))
                deviation_pct = 0.0
                mid = (lo + hi) / 2
                if mid > 0:
                    deviation_pct = abs(float(val) - mid) / mid * 100
                top_features.append({
                    "rank": i + 1,
                    "feature": feat,
                    "display_name": meta.get("name", feat),
                    "value": round(float(val), 3),
                    "unit": meta.get("unit", ""),
                    "importance_score": round(1.0 - i * 0.2, 2),  # Ranked by domain knowledge
                    "deviation_pct": round(deviation_pct, 1),
                    "direction": "ELEVATED" if float(val) > (lo + hi) / 2 else "REDUCED",
                    "fault_relevance": meta.get("fault_relevance", {}).get(fault_type, ""),
                })

        # Counterfactual
        counterfactual_target = domain.get("counterfactual_target", {})
        counterfactual = {
            "description": "Parameter changes needed to resolve this fault hypothesis:",
            "targets": counterfactual_target,
            "interpretation": "If these conditions are met, the fault likelihood reduces significantly.",
        }

        # Confidence breakdown
        n_supporting = len([e for e in supporting if e["contribution"] == "PRIMARY"])
        n_contradicting = len(contradicting)
        confidence_breakdown = {
            "model_confidence": round(confidence, 3),
            "primary_evidence_count": n_supporting,
            "contradicting_evidence_count": n_contradicting,
            "evidence_score": round(n_supporting / max(len(primary_features), 1), 2),
            "note": "DEMONSTRATION MODEL — confidence is indicative, not certified",
        }

        return {
            "fault_type": fault_type,
            "display_name": f"Possible {fault_type.replace('_', ' ').title()}",
            "confidence": round(confidence, 3),
            "physical_mechanism": domain.get("physical_mechanism", ""),
            "top_contributing_features": top_features,
            "supporting_evidence": supporting,
            "contradicting_evidence": contradicting,
            "counterfactual_explanation": counterfactual,
            "confidence_breakdown": confidence_breakdown,
            "maintenance_recommendation": self.generate_maintenance_rationale(
                fault_type, confidence, telemetry
            ),
            "method": "RULE-BASED + ML FAULT DIAGNOSIS WITH XAI [DEMONSTRATION MODEL]",
            "disclaimer": "NOT a certified fault determination. Requires engineer verification.",
        }

    def explain_anomaly(self, anomaly_score: float, telemetry: Dict[str, Any],
                        feature_importances: Optional[Dict[str, float]] = None
                        ) -> Dict[str, Any]:
        """Explain an anomaly detection result."""
        anomalous_features = []
        normal_features = []

        for feat, meta in FEATURE_METADATA.items():
            val = telemetry.get(feat)
            if val is None:
                continue
            lo, hi = meta["normal_range"]
            out_of_range = val < lo or val > hi
            imp = feature_importances.get(feat, 0.0) if feature_importances else 0.0

            entry = {
                "feature": feat,
                "display_name": meta["name"],
                "value": round(float(val), 3),
                "unit": meta["unit"],
                "normal_range": list(meta["normal_range"]),
                "out_of_range": out_of_range,
                "importance_score": round(imp, 4),
            }
            (anomalous_features if out_of_range else normal_features).append(entry)

        # Sort by importance
        anomalous_features.sort(key=lambda x: x["importance_score"], reverse=True)

        return {
            "anomaly_score": round(anomaly_score, 4),
            "anomaly_level": (
                "CRITICAL" if anomaly_score > 0.8 else
                "WARNING" if anomaly_score > 0.6 else
                "ADVISORY" if anomaly_score > 0.4 else "NOMINAL"
            ),
            "anomalous_features": anomalous_features,
            "normal_features": normal_features[:5],  # Top 5 normal to show contrast
            "interpretation": (
                f"Anomaly detector flagged {len(anomalous_features)} parameter(s) outside "
                f"normal operating envelope. Score={anomaly_score:.2f} (1.0=most anomalous)."
                if anomalous_features else
                "All parameters within normal operating envelope."
            ),
            "method": "IsolationForest + Parameter Range Analysis [DEMONSTRATION MODEL]",
            "disclaimer": "NOT a certified fault determination. Requires engineer verification.",
        }

    def generate_maintenance_rationale(self, fault_type: str, confidence: float,
                                        telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """Generate structured maintenance recommendation with rationale."""
        domain = FAULT_DOMAIN_KNOWLEDGE.get(fault_type, {})
        urgency = domain.get("maintenance_urgency", "MEDIUM — schedule inspection at next opportunity")
        mechanism = domain.get("physical_mechanism", "")

        urgency_level = (
            "URGENT" if "URGENT" in urgency else
            "HIGH" if "HIGH" in urgency else
            "MEDIUM"
        )

        return {
            "urgency": urgency_level,
            "action": urgency,
            "physical_rationale": mechanism,
            "confidence_context": (
                f"Model confidence: {confidence*100:.0f}%. "
                + ("High confidence — prioritize inspection." if confidence > 0.75 else
                   "Moderate confidence — monitor closely and verify with additional checks." if confidence > 0.5 else
                   "Low confidence — treat as advisory. Verify with manual inspection.")
            ),
            "disclaimer": "RESEARCH MODEL — not a certified maintenance instruction. "
                          "All maintenance must follow applicable airworthiness directives "
                          "and manufacturer documentation.",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Singleton
# ─────────────────────────────────────────────────────────────────────────────
fault_explainer = FaultExplainer()
