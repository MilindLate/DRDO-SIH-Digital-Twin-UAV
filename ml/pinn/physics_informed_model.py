"""
Physics-Informed AI (PINN) Module for Aero Piston Engine Digital Twin

This module implements Physics-Informed constraints on the ML predictions.
Instead of purely data-driven anomaly detection, we encode known physical
laws of the engine into the anomaly scoring. Violations of physics = stronger
anomaly signal.

Concept (Physics-Informed Neural Networks — Raissi et al., 2019):
  Traditional ML: minimize L_data (prediction error on training data)
  PINN approach:  minimize L_data + λ × L_physics (physics residual penalty)

Here we implement this concept using numpy-based analytical physics constraints
(no deep learning required), which is practical for edge deployment.

Physical Laws Encoded:
  1. CHT-EGT Thermal Correlation (Heywood 1988, Ch.4)
  2. Oil Pressure-RPM Relationship (Heywood 1988, Ch.5 — hydrodynamic lubrication)
  3. Fuel Flow-Power Relationship (fuel consumption ∝ BMEP × RPM)
  4. Thermal Equilibrium (steady-state CHT bounded by heat balance)
  5. Arrhenius Thermal Degradation (for RUL estimation)
  6. Miner's Rule Cumulative Damage (vibration fatigue)

DISCLAIMER:
  All constants are SIMULATED/CONFIGURABLE — NOT certified engine specifications.
  References are to publicly available engineering literature.
  NOT for operational or flight-safety use.

References:
  - Heywood, J.B. (1988). Internal Combustion Engine Fundamentals. McGraw-Hill.
  - Raissi, M. et al. (2019). Physics-informed neural networks. J. Comp. Physics.
  - Miner, M.A. (1945). Cumulative damage in fatigue. J. Applied Mechanics.
  - Arrhenius, S. (1889). Activation energies in chemical reactions.
"""

import math
import numpy as np
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Physical Constants (public domain values)
# ─────────────────────────────────────────────────────────────────────────────
R_GAS = 8.314          # Universal gas constant [J/(mol·K)]
KELVIN_OFFSET = 273.15 # °C to K conversion

# ─────────────────────────────────────────────────────────────────────────────
# Engine Physics Parameters [SIMULATED / CONFIGURABLE]
# These are representative values for a generic 4-cylinder aero piston engine.
# Replace with actual engine test data for real deployment.
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class PhysicsConstants:
    """
    Physics model constants. All values SIMULATED/CONFIGURABLE.
    Basis: Heywood (1988) for a generic ~100hp 4-cylinder aero engine.
    """
    # Thermal model [SIMULATED — Heywood 1988 Ch.12]
    cht_egt_ratio_nominal: float = 0.38   # CHT/EGT ratio at cruise (dimensionless)
    cht_egt_ratio_tol: float = 0.12       # Acceptable deviation
    cht_max_steady_state: float = 220.0   # °C [SIMULATED — warn limit]
    egt_max_steady_state: float = 750.0   # °C [SIMULATED]

    # Lubrication model [SIMULATED — Heywood 1988 Ch.5]
    oil_pressure_rpm_coeff: float = 0.065  # kPa per RPM [SIMULATED]
    oil_pressure_min_idle: float = 100.0   # kPa at idle [SIMULATED]
    oil_pressure_nom_cruise: float = 350.0 # kPa at cruise [SIMULATED]
    oil_pressure_tol_frac: float = 0.30    # ±30% tolerance

    # Fuel-power relationship [SIMULATED — BSFC-based]
    bsfc_nominal: float = 280.0           # g/kWh nominal BSFC [SIMULATED]
    fuel_power_tol_frac: float = 0.25     # ±25% tolerance

    # Arrhenius degradation [Arrhenius 1889 — public domain equation]
    activation_energy_thermal: float = 45000.0  # J/mol [SIMULATED — typical polymer/seal value]
    pre_exponential_factor: float = 1e8          # s⁻¹ [SIMULATED]
    reference_temp_k: float = 393.15             # 120°C reference [SIMULATED]

    # Miner's Rule fatigue [Miner 1945 — public domain]
    vibration_fatigue_limit_g: float = 0.3       # g RMS fatigue limit [SIMULATED]
    cycles_to_failure_at_limit: float = 1e8      # cycles [SIMULATED — S-N curve intercept]
    wohler_exponent: float = 5.0                  # Wöhler exponent for metal [SIMULATED]

    # TBO and life [SIMULATED]
    tbo_hours: float = 1500.0                    # Time Between Overhaul [SIMULATED]


CONSTANTS = PhysicsConstants()


# ─────────────────────────────────────────────────────────────────────────────
# Physics Constraints
# ─────────────────────────────────────────────────────────────────────────────

class PhysicsConstraints:
    """
    Encodes known physical laws of the engine as mathematical constraints.
    Returns residuals (how much a measurement violates each physical law).

    Residual = 0.0  → perfectly consistent with physics
    Residual = 1.0  → significant violation (normalized)
    """

    def __init__(self, constants: PhysicsConstants = CONSTANTS):
        self.c = constants

    def cht_egt_constraint(self, cht_c: float, egt_c: float, load_pct: float) -> Dict[str, Any]:
        """
        CHT and EGT are thermodynamically coupled — CHT is roughly proportional
        to EGT via the heat transfer through the cylinder head.

        Basis: Heywood (1988) Ch.4 — combustion heat transfer.
        """
        if egt_c < 50:  # Engine not running
            return {"residual": 0.0, "law": "cht_egt_correlation", "note": "engine off"}

        expected_cht = egt_c * self.c.cht_egt_ratio_nominal
        actual_ratio = cht_c / max(egt_c, 1.0)
        deviation = abs(actual_ratio - self.c.cht_egt_ratio_nominal)
        residual = min(1.0, deviation / self.c.cht_egt_ratio_tol)

        return {
            "law": "cht_egt_thermal_correlation",
            "residual": round(residual, 4),
            "expected_cht": round(expected_cht, 1),
            "actual_cht": round(cht_c, 1),
            "ratio_actual": round(actual_ratio, 3),
            "ratio_nominal": self.c.cht_egt_ratio_nominal,
            "interpretation": (
                "HIGH CHT relative to EGT — possible cooling duct blockage or lean mixture"
                if actual_ratio > self.c.cht_egt_ratio_nominal + self.c.cht_egt_ratio_tol
                else "LOW CHT relative to EGT — possible CHT sensor drift or over-rich mixture"
                if actual_ratio < self.c.cht_egt_ratio_nominal - self.c.cht_egt_ratio_tol
                else "Within expected thermal correlation"
            ),
            "violated": bool(residual > 0.5),
        }

    def oil_pressure_rpm_constraint(self, oil_pressure_kpa: float, rpm: float) -> Dict[str, Any]:
        """
        Oil pressure is driven by the oil pump (engine-driven).
        At higher RPM, pump delivers more flow → higher pressure.

        Basis: Heywood (1988) Ch.5 — hydrodynamic lubrication, pressure-flow relations.
        """
        if rpm < 500:  # Idle/off
            return {"residual": 0.0, "law": "oil_pressure_rpm", "note": "low RPM region"}

        expected_pressure = max(
            self.c.oil_pressure_min_idle,
            rpm * self.c.oil_pressure_rpm_coeff
        )
        tolerance = expected_pressure * self.c.oil_pressure_tol_frac
        deviation = abs(oil_pressure_kpa - expected_pressure)
        residual = min(1.0, max(0.0, (deviation - tolerance / 2) / tolerance))

        return {
            "law": "oil_pressure_rpm_relationship",
            "residual": round(residual, 4),
            "expected_kpa": round(expected_pressure, 1),
            "actual_kpa": round(oil_pressure_kpa, 1),
            "tolerance_kpa": round(tolerance, 1),
            "interpretation": (
                "LOW oil pressure for given RPM — possible oil pump wear, low oil level, or blockage"
                if oil_pressure_kpa < expected_pressure - tolerance / 2
                else "HIGH oil pressure for given RPM — possible relief valve sticking"
                if oil_pressure_kpa > expected_pressure + tolerance / 2
                else "Oil pressure consistent with RPM"
            ),
            "violated": bool(residual > 0.5),
        }

    def fuel_power_constraint(self, fuel_flow_lph: float, engine_load_pct: float,
                               rpm: float) -> Dict[str, Any]:
        """
        Fuel consumption is proportional to power output (BSFC relationship).
        Power = Torque × RPM / 9549  →  fuel_flow = BSFC × Power

        Basis: Heywood (1988) Ch.2 — engine performance metrics, BSFC definition.
        Diesel density ≈ 0.835 kg/L [SIMULATED/CONFIGURABLE]
        """
        if rpm < 500 or engine_load_pct < 5:
            return {"residual": 0.0, "law": "fuel_power_bsfc", "note": "low load region"}

        # Estimated power from load and RPM [SIMULATED — generic curve]
        max_power_kw = 74.6  # 100 hp [SIMULATED]
        estimated_power_kw = max_power_kw * (engine_load_pct / 100.0) * (rpm / 5500.0)
        fuel_density_kg_l = 0.835  # Diesel/Avgas density [SIMULATED]

        # Expected fuel flow from BSFC
        expected_ff_kg_h = (self.c.bsfc_nominal / 1000.0) * estimated_power_kw
        expected_ff_lph = expected_ff_kg_h / fuel_density_kg_l
        tolerance = expected_ff_lph * self.c.fuel_power_tol_frac
        deviation = abs(fuel_flow_lph - expected_ff_lph)
        residual = min(1.0, max(0.0, (deviation - tolerance / 2) / tolerance))

        return {
            "law": "fuel_power_bsfc_relationship",
            "residual": round(residual, 4),
            "expected_ff_lph": round(expected_ff_lph, 2),
            "actual_ff_lph": round(fuel_flow_lph, 2),
            "estimated_power_kw": round(estimated_power_kw, 1),
            "implied_bsfc": round((fuel_flow_lph * fuel_density_kg_l * 1000) / max(estimated_power_kw, 0.1), 1),
            "interpretation": (
                "HIGH fuel consumption for power output — possible injector flooding, rich mixture, or timing issue"
                if fuel_flow_lph > expected_ff_lph + tolerance / 2
                else "LOW fuel consumption — possible injector blockage or lean mixture"
                if fuel_flow_lph < expected_ff_lph - tolerance / 2
                else "Fuel flow consistent with power output"
            ),
            "violated": bool(residual > 0.5),
        }

    def compute_all_residuals(self, telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """Compute all physics constraint residuals for a telemetry snapshot."""
        constraints = {}
        try:
            constraints["cht_egt"] = self.cht_egt_constraint(
                telemetry.get("cht_c", 100),
                telemetry.get("egt_c", 300),
                telemetry.get("engine_load_pct", 50),
            )
            constraints["oil_pressure_rpm"] = self.oil_pressure_rpm_constraint(
                telemetry.get("oil_pressure_kpa", 350),
                telemetry.get("rpm", 3000),
            )
            constraints["fuel_power"] = self.fuel_power_constraint(
                telemetry.get("fuel_flow_lph", 12),
                telemetry.get("engine_load_pct", 50),
                telemetry.get("rpm", 3000),
            )
        except Exception as e:
            logger.error(f"Physics residual computation error: {e}")

        violated_laws = [k for k, v in constraints.items() if isinstance(v, dict) and v.get("violated")]
        composite_residual = (
            np.mean([v["residual"] for v in constraints.values() if isinstance(v, dict) and "residual" in v])
            if constraints else 0.0
        )

        # Ensure all values are JSON-serializable Python native types (no numpy bools)
        def _jsonify(obj):
            if isinstance(obj, dict):
                return {k: _jsonify(v) for k, v in obj.items()}
            if isinstance(obj, (np.bool_,)):
                return bool(obj)
            if isinstance(obj, (np.integer,)):
                return int(obj)
            if isinstance(obj, (np.floating,)):
                return float(obj)
            return obj

        safe_constraints = _jsonify(constraints)

        return {
            "constraints": safe_constraints,
            "composite_residual": round(float(composite_residual), 4),
            "violated_laws": violated_laws,
            "physics_anomaly": bool(composite_residual > 0.4),
            "timestamp": datetime.utcnow().isoformat(),
            "disclaimer": "PHYSICS-INFORMED ANALYSIS — DEMONSTRATION MODEL — NOT FOR OPERATIONAL USE",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Physics-Informed Anomaly Detector
# ─────────────────────────────────────────────────────────────────────────────

class PhysicsInformedAnomalyDetector:
    """
    Combines ML anomaly score with physics residual penalty.

    Combined score = α × ML_score + (1-α) × physics_residual
    where α is the ML trust weight (default 0.6).

    This ensures that even if the ML model misses an anomaly,
    physics law violations raise the alert score.

    Concept from: Raissi et al. (2019) PINN paper — physics as regularization.
    """

    def __init__(self, ml_trust_weight: float = 0.6):
        self.constraints = PhysicsConstraints()
        self.ml_weight = ml_trust_weight
        self.physics_weight = 1.0 - ml_trust_weight

    def combined_anomaly_score(self, ml_score: float,
                                telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fuse ML anomaly score with physics residuals.

        Args:
            ml_score: IsolationForest score 0–1 (1 = most anomalous)
            telemetry: Raw telemetry dict

        Returns:
            Enhanced anomaly assessment with physics grounding.
        """
        residuals = self.constraints.compute_all_residuals(telemetry)
        physics_residual = residuals["composite_residual"]

        # Weighted combination
        combined = (self.ml_weight * ml_score) + (self.physics_weight * physics_residual)
        combined = min(1.0, combined)

        # Boost if physics laws are violated (even if ML says normal)
        if residuals["physics_anomaly"] and ml_score < 0.3:
            combined = max(combined, 0.5)  # Floor at 0.5 if physics violated

        return {
            "ml_score": round(ml_score, 4),
            "physics_residual": round(physics_residual, 4),
            "combined_score": round(combined, 4),
            "ml_weight": self.ml_weight,
            "physics_weight": self.physics_weight,
            "violated_laws": residuals["violated_laws"],
            "physics_anomaly_detected": residuals["physics_anomaly"],
            "overall_anomaly": combined > 0.5,
            "severity": (
                "CRITICAL" if combined > 0.8
                else "WARNING" if combined > 0.6
                else "ADVISORY" if combined > 0.4
                else "NOMINAL"
            ),
            "constraint_details": residuals["constraints"],
            "explanation": self._explain(ml_score, physics_residual, residuals["violated_laws"]),
            "method": "PHYSICS-INFORMED ANOMALY DETECTION [DEMONSTRATION MODEL]",
        }

    def _explain(self, ml_score: float, physics_residual: float,
                 violated_laws: List[str]) -> str:
        parts = []
        if ml_score > 0.5:
            parts.append(f"ML model flagged anomaly (score={ml_score:.2f})")
        if violated_laws:
            law_names = {
                "cht_egt": "CHT-EGT thermal correlation",
                "oil_pressure_rpm": "oil pressure-RPM relationship",
                "fuel_power": "fuel consumption-power relationship",
            }
            named = [law_names.get(l, l) for l in violated_laws]
            parts.append(f"Physics violations detected: {', '.join(named)}")
        if not parts:
            return "All parameters within normal operating envelope."
        return ". ".join(parts) + ". Inspection recommended."


# ─────────────────────────────────────────────────────────────────────────────
# Physics-Informed RUL Estimator
# ─────────────────────────────────────────────────────────────────────────────

class PhysicsInformedRUL:
    """
    Physics-based RUL estimation using:
    1. Arrhenius equation for thermal aging of seals/gaskets/elastomers
    2. Miner's Rule for fatigue damage accumulation from vibration

    These are established engineering models in the public domain.
    Constants are SIMULATED/CONFIGURABLE.

    References:
      - Arrhenius, S. (1889). Z. Phys. Chem. 4: 226–248.
      - Miner, M.A. (1945). J. Appl. Mech. 12(3): A159–A164.
      - MIL-HDBK-338B (1998). Electronic Reliability Design Handbook. DoD. [PUBLIC]
    """

    def __init__(self, constants: PhysicsConstants = CONSTANTS):
        self.c = constants

    def arrhenius_degradation_rate(self, cht_c: float) -> float:
        """
        Compute thermal degradation rate using Arrhenius equation.
        Higher temperature → exponentially faster degradation.

        k(T) = A × exp(-Ea / (R × T))

        Returns: relative degradation rate (normalized to 1.0 at reference temp)
        """
        T_k = cht_c + KELVIN_OFFSET
        T_ref = self.c.reference_temp_k
        Ea = self.c.activation_energy_thermal

        rate = math.exp(-Ea / (R_GAS * T_k))
        rate_ref = math.exp(-Ea / (R_GAS * T_ref))

        return rate / max(rate_ref, 1e-30)  # Normalized rate

    def miners_rule_damage_per_hour(self, vibration_rms_g: float,
                                    engine_rpm: float) -> float:
        """
        Compute cumulative fatigue damage per operating hour using Miner's Rule.

        D = n / N_f  where N_f = N_0 × (S_0 / S)^b

        Returns: fractional damage per hour (1.0 = failure if sustained)
        """
        if vibration_rms_g < 0.01:
            return 0.0

        # Cycles per hour from RPM
        cycles_per_hour = engine_rpm * 60.0 / 2.0  # 4-stroke: firing every 2 rev

        # S-N curve (Wöhler): N_f = N_0 × (S_limit / S_actual)^b
        stress_ratio = self.c.vibration_fatigue_limit_g / max(vibration_rms_g, 0.001)
        n_to_failure = self.c.cycles_to_failure_at_limit * (stress_ratio ** self.c.wohler_exponent)

        damage_per_hour = cycles_per_hour / max(n_to_failure, 1.0)
        return min(1.0, damage_per_hour)

    def estimate_rul(self, operating_hours: float, overall_health: float,
                     cht_c: float, vibration_rms_g: float, rpm: float,
                     fault_count: int = 0) -> Dict[str, Any]:
        """
        Estimate Remaining Useful Life using physics-informed degradation models.

        Combines:
        1. Base TBO-based estimate
        2. Arrhenius thermal aging penalty
        3. Miner's Rule vibration fatigue penalty
        4. Fault history penalty
        5. Overall health index adjustment

        Returns:
            dict with RUL point estimate, confidence interval, and breakdown.
        """
        base_rul = max(0.0, self.c.tbo_hours - operating_hours)

        # Thermal aging factor (Arrhenius)
        thermal_rate = self.arrhenius_degradation_rate(cht_c)
        thermal_factor = 1.0 / max(thermal_rate, 0.1)  # Higher temp → lower factor
        thermal_factor = max(0.3, min(1.5, thermal_factor))  # Clamp

        # Vibration fatigue factor (Miner's Rule)
        damage_rate = self.miners_rule_damage_per_hour(vibration_rms_g, rpm)
        if damage_rate > 0:
            vib_life_hours = 1.0 / damage_rate
            vib_factor = min(1.0, vib_life_hours / self.c.tbo_hours)
        else:
            vib_factor = 1.0

        # Health index factor
        health_factor = (overall_health / 100.0) ** 1.5  # Nonlinear penalty below 50%

        # Fault penalty
        fault_penalty = max(0.5, 1.0 - fault_count * 0.1)

        # Combined RUL
        rul_estimate = base_rul * thermal_factor * vib_factor * health_factor * fault_penalty
        rul_estimate = max(0.0, rul_estimate)

        # Confidence interval (±15% at 80% CI — SIMULATED)
        ci_pct = 0.15
        rul_lower = rul_estimate * (1 - ci_pct)
        rul_upper = rul_estimate * (1 + ci_pct)

        return {
            "rul_hours": round(rul_estimate, 1),
            "rul_lower_80ci": round(rul_lower, 1),
            "rul_upper_80ci": round(rul_upper, 1),
            "base_rul_hours": round(base_rul, 1),
            "factors": {
                "thermal_arrhenius": round(thermal_factor, 4),
                "vibration_miners_rule": round(vib_factor, 4),
                "health_index": round(health_factor, 4),
                "fault_penalty": round(fault_penalty, 4),
            },
            "degradation_breakdown": {
                "arrhenius_rate_normalized": round(thermal_rate, 4),
                "miner_damage_per_hour": round(damage_rate, 8),
                "thermal_reference_temp_c": self.c.reference_temp_k - KELVIN_OFFSET,
            },
            "confidence_interval_pct": ci_pct * 100,
            "method": "Physics-Informed RUL: Arrhenius + Miner's Rule + Health Index",
            "disclaimer": "SIMULATION-BASED ESTIMATE. NOT validated. NOT for flight decisions.",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Singleton instances
# ─────────────────────────────────────────────────────────────────────────────
physics_constraints = PhysicsConstraints()
pinn_analyzer = PhysicsInformedAnomalyDetector()
physics_rul = PhysicsInformedRUL()
