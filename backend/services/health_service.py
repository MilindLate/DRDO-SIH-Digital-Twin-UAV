"""
Engine Health Calculation Service

Computes composite health indices from engine telemetry.

IMPORTANT: This is a DEMONSTRATION MODEL.
The health indices computed here are NOT validated aerospace certification metrics.
They are engineering tools for trend monitoring in a research/demonstration context.

Health Index Scale: 0–100 (100 = nominal, 0 = failed)
Thresholds: CONFIGURABLE (see engine_config.yaml)

References:
  - General PHM methodology: Pecht (2008), Jardine et al. (2006)
  - Parameter monitoring basis: FAA AC 65-12A, Heywood (1988)
  (See docs/research/references.md)
"""

import numpy as np
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Configurable Parameters (SIMULATED/CONFIGURABLE)
# ─────────────────────────────────────────────────────────────────────────────

# Health index weights — must sum to 1.0
# Based on relative importance of each subsystem to engine operation [CONFIGURABLE]
HEALTH_WEIGHTS = {
    "thermal": 0.20,      # CHT, EGT, oil temp
    "mechanical": 0.20,   # RPM stability, torque, mechanical loading
    "lubrication": 0.15,  # Oil pressure, oil temp, oil flow
    "combustion": 0.15,   # EGT stability, fuel flow, RPM regularity
    "fuel": 0.10,         # Fuel flow, fuel pressure
    "electrical": 0.10,   # Battery V, alternator V, current
    "sensor": 0.05,       # Data quality, sensor freshness
    "vibration": 0.05,    # Vibration RMS
}

# Parameter limits for health scoring (SIMULATED/CONFIGURABLE)
LIMITS = {
    "rpm": {
        "normal_min": 800, "normal_max": 5500,
        "warning_min": 700, "warning_max": 5800,
        "critical_min": 500, "critical_max": 6000,
    },
    "cht_c": {
        "normal_min": 0, "normal_max": 200,
        "warning_min": 0, "warning_max": 220,
        "critical_min": 0, "critical_max": 240,
    },
    "egt_c": {
        "normal_min": 0, "normal_max": 700,
        "warning_min": 0, "warning_max": 750,
        "critical_min": 0, "critical_max": 800,
    },
    "oil_pressure_kpa": {
        "normal_min": 200, "normal_max": 550,
        "warning_min": 170, "warning_max": 600,
        "critical_min": 100, "critical_max": 700,
    },
    "oil_temperature_c": {
        "normal_min": 40, "normal_max": 110,
        "warning_min": 30, "warning_max": 120,
        "critical_min": 20, "critical_max": 130,
    },
    "vibration_rms_g": {
        "normal_min": 0, "normal_max": 0.5,
        "warning_min": 0, "warning_max": 1.0,
        "critical_min": 0, "critical_max": 2.0,
    },
    "battery_voltage_v": {
        "normal_min": 11.8, "normal_max": 15.0,
        "warning_min": 11.5, "warning_max": 15.5,
        "critical_min": 11.0, "critical_max": 16.0,
    },
    "alternator_voltage_v": {
        "normal_min": 13.5, "normal_max": 15.0,
        "warning_min": 13.0, "warning_max": 15.5,
        "critical_min": 12.0, "critical_max": 16.0,
    },
    "fuel_flow_lph": {
        "normal_min": 0, "normal_max": 20,
        "warning_min": 0, "warning_max": 25,
        "critical_min": 0, "critical_max": 30,
    },
}

# Health category thresholds (CONFIGURABLE)
HEALTH_CATEGORIES = {
    "EXCELLENT": (85.0, 100.0),
    "HEALTHY": (70.0, 85.0),
    "DEGRADED": (50.0, 70.0),
    "POOR": (30.0, 50.0),
    "CRITICAL": (0.0, 30.0),
}


# ─────────────────────────────────────────────────────────────────────────────
# Parameter Health Scoring
# ─────────────────────────────────────────────────────────────────────────────

def score_parameter(value: Optional[float], param: str) -> float:
    """
    Score a single parameter on 0–100 scale.
    
    Scoring:
    - Within normal range: 100
    - Between normal and warning: linear decay to 70
    - Between warning and critical: linear decay to 30
    - Beyond critical: decay to 0
    
    Returns 100 if value is None (sensor fault handled separately)
    """
    if value is None or np.isnan(value):
        return 70.0  # Unknown — neutral score (sensor quality tracked separately)

    limits = LIMITS.get(param)
    if not limits:
        return 100.0  # No limits defined — assume nominal

    norm_min = limits["normal_min"]
    norm_max = limits["normal_max"]
    warn_min = limits["warning_min"]
    warn_max = limits["warning_max"]
    crit_min = limits["critical_min"]
    crit_max = limits["critical_max"]

    # Within normal range
    if norm_min <= value <= norm_max:
        return 100.0

    # Above normal range
    if value > norm_max:
        if value <= warn_max:
            t = (value - norm_max) / max(1e-9, warn_max - norm_max)
            return 100.0 - t * 30.0  # 100 → 70
        elif value <= crit_max:
            t = (value - warn_max) / max(1e-9, crit_max - warn_max)
            return 70.0 - t * 40.0  # 70 → 30
        else:
            # Beyond critical max
            t = min(1.0, (value - crit_max) / max(1e-9, crit_max * 0.1))
            return max(0.0, 30.0 - t * 30.0)  # 30 → 0

    # Below normal range
    if value < norm_min:
        if value >= warn_min:
            t = (norm_min - value) / max(1e-9, norm_min - warn_min)
            return 100.0 - t * 30.0
        elif value >= crit_min:
            t = (warn_min - value) / max(1e-9, warn_min - crit_min)
            return 70.0 - t * 40.0
        else:
            t = min(1.0, (crit_min - value) / max(1e-9, crit_min * 0.1 + 1e-9))
            return max(0.0, 30.0 - t * 30.0)

    return 100.0


# ─────────────────────────────────────────────────────────────────────────────
# Subsystem Health Calculators
# ─────────────────────────────────────────────────────────────────────────────

def compute_thermal_health(record: Dict) -> float:
    """
    Thermal health index.
    Based on: CHT, EGT, oil temperature.
    
    Thermal health deteriorates when temperatures exceed normal ranges.
    High CHT indicates cooling degradation or mixture problems.
    High EGT indicates lean mixture or combustion irregularity.
    High oil temp indicates lubrication/cooling system issues.
    """
    scores = [
        score_parameter(record.get("cht_c"), "cht_c"),
        score_parameter(record.get("egt_c"), "egt_c"),
        score_parameter(record.get("oil_temperature_c"), "oil_temperature_c"),
    ]
    return float(np.mean([s for s in scores if s is not None]))


def compute_mechanical_health(record: Dict, rpm_history: Optional[List[float]] = None) -> float:
    """
    Mechanical health index.
    Based on: RPM stability, engine load.
    
    RPM instability can indicate mechanical issues, combustion problems,
    or governor faults.
    """
    scores = []

    rpm = record.get("rpm", 0)
    if rpm and rpm > 100:
        scores.append(score_parameter(rpm, "rpm"))

        # RPM stability from history
        if rpm_history and len(rpm_history) > 5:
            rpm_std = np.std(rpm_history[-10:])
            # High RPM std indicates combustion or mechanical irregularity [SIMULATED]
            stability_score = max(0.0, 100.0 - rpm_std * 0.5)
            scores.append(stability_score)

    if scores:
        return float(np.mean(scores))
    return 100.0


def compute_lubrication_health(record: Dict) -> float:
    """
    Lubrication health index.
    Based on: oil pressure, oil temperature.
    
    Oil pressure is the primary indicator of lubrication system integrity.
    Oil temperature trend indicates cooler effectiveness.
    """
    scores = [
        score_parameter(record.get("oil_pressure_kpa"), "oil_pressure_kpa"),
        score_parameter(record.get("oil_temperature_c"), "oil_temperature_c"),
    ]
    # Weight oil pressure higher (more critical indicator)
    weights = [0.65, 0.35]
    return float(np.average(scores, weights=weights))


def compute_combustion_health(record: Dict, egt_history: Optional[List[float]] = None) -> float:
    """
    Combustion health index.
    Based on: EGT stability, fuel flow consistency.
    
    EGT variance indicates combustion irregularity.
    """
    scores = [score_parameter(record.get("egt_c"), "egt_c")]

    # EGT stability
    if egt_history and len(egt_history) > 5:
        egt_std = np.std(egt_history[-10:])
        # Higher std → lower combustion health [SIMULATED]
        stability = max(0.0, 100.0 - egt_std * 0.2)
        scores.append(stability)

    return float(np.mean(scores))


def compute_fuel_health(record: Dict) -> float:
    """
    Fuel system health.
    Based on: fuel flow, fuel pressure.
    """
    scores = []
    fuel_flow = record.get("fuel_flow_lph")
    if fuel_flow is not None:
        scores.append(score_parameter(fuel_flow, "fuel_flow_lph"))

    fuel_pressure = record.get("fuel_pressure_kpa")
    if fuel_pressure is not None:
        # Normal fuel pressure range [SIMULATED/CONFIGURABLE]
        if 250 <= fuel_pressure <= 400:
            scores.append(100.0)
        elif 200 <= fuel_pressure <= 450:
            scores.append(75.0)
        else:
            scores.append(50.0)

    return float(np.mean(scores)) if scores else 100.0


def compute_electrical_health(record: Dict) -> float:
    """
    Electrical system health.
    Based on: battery voltage, alternator voltage.
    """
    scores = []

    # Only score alternator if engine is running
    rpm = record.get("rpm", 0)
    if rpm and rpm > 1500:
        alt_v = record.get("alternator_voltage_v")
        if alt_v is not None:
            scores.append(score_parameter(alt_v, "alternator_voltage_v"))

    batt_v = record.get("battery_voltage_v")
    if batt_v is not None:
        scores.append(score_parameter(batt_v, "battery_voltage_v"))

    return float(np.mean(scores)) if scores else 100.0


def compute_vibration_health(record: Dict) -> float:
    """
    Vibration health.
    Based on: vibration RMS.
    High vibration indicates mechanical wear, imbalance, or combustion issues.
    """
    return score_parameter(record.get("vibration_rms_g"), "vibration_rms_g")


def compute_sensor_health(record: Dict, sensor_quality_scores: Optional[Dict[str, float]] = None) -> float:
    """
    Sensor health index.
    Based on: data quality scores, missing data, freshness.
    """
    if sensor_quality_scores:
        scores = list(sensor_quality_scores.values())
        return float(np.mean(scores)) if scores else 100.0
    # Default: check for None values in critical parameters
    critical_params = ["rpm", "cht_c", "egt_c", "oil_pressure_kpa"]
    missing = sum(1 for p in critical_params if record.get(p) is None)
    return max(0.0, 100.0 - missing * 15.0)


# ─────────────────────────────────────────────────────────────────────────────
# Composite Health Calculator
# ─────────────────────────────────────────────────────────────────────────────

def compute_engine_health(
    record: Dict,
    rpm_history: Optional[List[float]] = None,
    egt_history: Optional[List[float]] = None,
    sensor_quality: Optional[Dict] = None,
    weights: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Compute comprehensive engine health assessment.
    
    Returns:
        Dict with overall and per-subsystem health indices,
        major contributors, and confidence level.
        
    DEMONSTRATION MODEL — not a validated aerospace health metric.
    """
    w = weights or HEALTH_WEIGHTS

    # Compute subsystem health
    subsystem_health = {
        "thermal": compute_thermal_health(record),
        "mechanical": compute_mechanical_health(record, rpm_history),
        "lubrication": compute_lubrication_health(record),
        "combustion": compute_combustion_health(record, egt_history),
        "fuel": compute_fuel_health(record),
        "electrical": compute_electrical_health(record),
        "vibration": compute_vibration_health(record),
        "sensor": compute_sensor_health(record, sensor_quality),
    }

    # Weighted composite health
    overall_health = sum(
        subsystem_health[k] * w.get(k, 0.0)
        for k in subsystem_health
    )
    overall_health = max(0.0, min(100.0, overall_health))

    # Identify major contributors (subsystems with lowest health)
    contributors = sorted(
        [{"subsystem": k, "health": round(v, 1), "weight": w.get(k, 0), "impact": round((100 - v) * w.get(k, 0), 2)}
         for k, v in subsystem_health.items()],
        key=lambda x: x["health"]
    )
    major_contributors = [c for c in contributors if c["health"] < 90][:5]

    # Health category
    category = "EXCELLENT"
    for cat, (low, high) in HEALTH_CATEGORIES.items():
        if low <= overall_health < high:
            category = cat
            break

    # Confidence: lower when sensor quality is poor or data is missing
    sensor_h = subsystem_health["sensor"]
    confidence = min(1.0, sensor_h / 100.0 * 0.9 + 0.1)

    return {
        "overall_health": round(overall_health, 2),
        "mechanical_health": round(subsystem_health["mechanical"], 2),
        "thermal_health": round(subsystem_health["thermal"], 2),
        "lubrication_health": round(subsystem_health["lubrication"], 2),
        "combustion_health": round(subsystem_health["combustion"], 2),
        "fuel_system_health": round(subsystem_health["fuel"], 2),
        "electrical_health": round(subsystem_health["electrical"], 2),
        "sensor_health": round(subsystem_health["sensor"], 2),
        "vibration_health": round(subsystem_health["vibration"], 2),
        "health_category": category,
        "major_contributors": major_contributors,
        "health_confidence": round(confidence, 3),
        "health_weights": w,
        "disclaimer": "DEMONSTRATION MODEL — Not a validated aerospace health metric.",
    }


def compute_degradation_rate(health_history: List[float], window_h: int = 10) -> float:
    """
    Estimate rate of health degradation (% per hour).
    Uses linear regression over recent history.
    
    Returns: degradation rate in %/hour (positive = degrading)
    DEMONSTRATION estimate only.
    """
    if len(health_history) < 2:
        return 0.0

    window = health_history[-min(window_h, len(health_history)):]
    if len(window) < 2:
        return 0.0

    # Linear regression
    x = np.arange(len(window), dtype=float)
    y = np.array(window, dtype=float)

    if np.std(y) < 0.01:  # Stable
        return 0.0

    slope = np.polyfit(x, y, 1)[0]
    return max(0.0, -slope)  # Positive rate means decreasing health


def get_health_category(health_score: float) -> Dict[str, str]:
    """Return health category label and CSS color class."""
    if health_score >= 85:
        return {"label": "EXCELLENT", "color": "green", "css": "text-green-400"}
    elif health_score >= 70:
        return {"label": "HEALTHY", "color": "green", "css": "text-green-300"}
    elif health_score >= 50:
        return {"label": "DEGRADED", "color": "amber", "css": "text-amber-400"}
    elif health_score >= 30:
        return {"label": "POOR", "color": "orange", "css": "text-orange-500"}
    else:
        return {"label": "CRITICAL", "color": "red", "css": "text-red-500"}
