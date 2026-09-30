"""
Fault Detection and Diagnosis Service

Implements rule-based fault detection combined with ML anomaly scores.

IMPORTANT:
All diagnoses are PROBABILISTIC — NOT certified fault determinations.
Confidence values represent model probability, not physical certainty.
Wording uses: 'Detected anomaly', 'Probable fault', 'Model confidence',
              'Requires inspection' — NOT definitive diagnoses.

Do NOT use for flight safety decisions without proper engineering validation.

References:
  - FAA AC 65-12A — general piston engine fault symptoms
  - Heywood (1988) — engine physics basis for fault relationships
  - Jardine et al. (2006) — CBM diagnostic methodology
  (See docs/research/references.md)
"""

import uuid
import numpy as np
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Fault Definitions
# ─────────────────────────────────────────────────────────────────────────────

FAULT_DEFINITIONS = {
    "INJECTOR_DEGRADATION": {
        "label": "Possible Injector Degradation",
        "description": "Suspected fuel injector performance degradation",
        "subsystem": "FUEL",
        "initial_severity": "ADVISORY",
        "parameters": ["fuel_flow_lph", "egt_c", "rpm"],
        "inspection": "Inspect fuel injectors for clogging, deposits, or electrical faults. "
                      "Check fuel pressure. Verify EGT balance between cylinders if 4-probe EGT available.",
    },
    "LUBRICATION_ISSUE": {
        "label": "Possible Lubrication System Issue",
        "description": "Oil pressure below normal or temperature above normal",
        "subsystem": "LUBRICATION",
        "initial_severity": "WARNING",
        "parameters": ["oil_pressure_kpa", "oil_temperature_c"],
        "inspection": "Check oil level. Inspect for oil leaks. Verify oil cooler is clear. "
                      "Check oil pressure sender. Monitor bearing temperatures if possible.",
    },
    "OVERHEATING": {
        "label": "Engine Overheating Detected",
        "description": "CHT and/or EGT exceeding normal range",
        "subsystem": "THERMAL",
        "initial_severity": "WARNING",
        "parameters": ["cht_c", "egt_c"],
        "inspection": "Check cooling duct for blockage. Verify airspeed is adequate. "
                      "Check fuel mixture (lean mixture causes CHT rise). "
                      "Inspect cooling fins for damage.",
    },
    "VIBRATION_FAULT": {
        "label": "Abnormal Vibration Detected",
        "description": "Engine vibration RMS exceeding normal limits",
        "subsystem": "MECHANICAL",
        "initial_severity": "ADVISORY",
        "parameters": ["vibration_rms_g", "vibration_x_g", "vibration_y_g", "vibration_z_g"],
        "inspection": "Check propeller balance and condition. Inspect engine mounts. "
                      "Check for loose fasteners. Inspect crankshaft and bearing condition. "
                      "Perform frequency spectrum analysis if equipment available.",
    },
    "COMBUSTION_INSTABILITY": {
        "label": "Combustion Instability Suspected",
        "description": "Irregular combustion events detected from parameter signatures",
        "subsystem": "COMBUSTION",
        "initial_severity": "ADVISORY",
        "parameters": ["egt_c", "rpm", "fuel_flow_lph"],
        "inspection": "Check spark plugs for fouling or wear. Inspect ignition system. "
                      "Verify fuel quality. Check injector spray pattern. "
                      "Check compression if cylinder health is suspected.",
    },
    "ELECTRICAL_FAULT": {
        "label": "Electrical System Anomaly",
        "description": "Voltage or current outside normal operating range",
        "subsystem": "ELECTRICAL",
        "initial_severity": "ADVISORY",
        "parameters": ["battery_voltage_v", "alternator_voltage_v", "current_a"],
        "inspection": "Check alternator belt/coupling. Test alternator output. "
                      "Test battery condition. Inspect wiring and connectors. "
                      "Check voltage regulator.",
    },
    "COOLING_DEGRADATION": {
        "label": "Possible Cooling System Degradation",
        "description": "CHT rising trend despite normal ambient temperature",
        "subsystem": "THERMAL",
        "initial_severity": "ADVISORY",
        "parameters": ["cht_c", "ambient_temperature_c"],
        "inspection": "Inspect cooling air inlets for obstruction. Check cooling fins condition. "
                      "Verify baffling is intact and sealed. Check oil cooler.",
    },
    "FUEL_SYSTEM_ANOMALY": {
        "label": "Fuel System Anomaly Suspected",
        "description": "Fuel flow or pressure deviation from expected",
        "subsystem": "FUEL",
        "initial_severity": "ADVISORY",
        "parameters": ["fuel_flow_lph", "fuel_pressure_kpa"],
        "inspection": "Check fuel filter. Inspect fuel lines for restrictions. "
                      "Test fuel pump pressure and flow. Check injectors.",
    },
    "SENSOR_DRIFT": {
        "label": "Possible Sensor Drift Detected",
        "description": "Gradual systematic bias in sensor reading",
        "subsystem": "SENSORS",
        "initial_severity": "INFO",
        "parameters": [],
        "inspection": "Compare sensor reading with secondary measurement if available. "
                      "Inspect sensor mounting and connections. "
                      "Consider sensor calibration check.",
    },
    "SENSOR_FAILURE": {
        "label": "Possible Sensor Failure",
        "description": "Sensor reading appears frozen, missing, or erratic",
        "subsystem": "SENSORS",
        "initial_severity": "WARNING",
        "parameters": [],
        "inspection": "Check sensor wiring and connector. Test sensor resistance/output. "
                      "Check ECU/DAQ input channel. Replace sensor if confirmed failed.",
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# Detection Rules
# ─────────────────────────────────────────────────────────────────────────────

class FaultDetector:
    """
    Rule-based fault detector.
    
    Rules are based on engineering principles from public sources.
    All rules produce probabilistic assessments, not definitive diagnoses.
    
    DEMONSTRATION SYSTEM — Not validated for operational fault diagnosis.
    """

    def __init__(self):
        self._active_faults: Dict[str, Dict] = {}
        self._history_buffer: List[Dict] = []  # Recent records for trend analysis
        self._buffer_size = 60  # Keep last 60 records (~60s at 1Hz)

    def update_buffer(self, record: Dict):
        """Add record to history buffer."""
        self._history_buffer.append(record)
        if len(self._history_buffer) > self._buffer_size:
            self._history_buffer.pop(0)

    def _get_history_values(self, param: str, n: int = 20) -> List[float]:
        """Get last N values of a parameter from history."""
        values = []
        for r in self._history_buffer[-n:]:
            v = r.get(param)
            if v is not None:
                values.append(float(v))
        return values

    def _trend(self, values: List[float]) -> float:
        """Linear trend slope (positive = increasing)."""
        if len(values) < 3:
            return 0.0
        x = np.arange(len(values), dtype=float)
        return float(np.polyfit(x, values, 1)[0])

    def detect_injector_degradation(self, record: Dict, anomaly_score: float = 0.0) -> Optional[Dict]:
        """
        Detect injector degradation.
        
        Evidence:
        - Fuel flow deviation from expected (given RPM and throttle)
        - EGT variance (combustion imbalance from uneven fuelling)
        - RPM fluctuation (uneven power delivery)
        
        Physical basis: Clogged injectors → uneven fuel delivery →
          EGT imbalance between cylinders → average EGT may rise or fall →
          RPM fluctuation from uneven power strokes.
          
        [See parameter_reference.md — Fuel Flow, EGT sections]
        """
        egt_values = self._get_history_values("egt_c", 20)
        rpm_values = self._get_history_values("rpm", 20)
        fuel_values = self._get_history_values("fuel_flow_lph", 20)

        evidence = []
        confidence = 0.0

        # EGT instability
        if len(egt_values) >= 5:
            egt_std = np.std(egt_values)
            if egt_std > 15:  # [SIMULATED threshold]
                confidence += 0.25
                evidence.append({
                    "parameter": "egt_c",
                    "observation": f"EGT standard deviation: {egt_std:.1f}°C (elevated)",
                    "value": record.get("egt_c"),
                    "threshold": "STD < 15°C for normal combustion [SIMULATED]",
                })

        # RPM instability
        if len(rpm_values) >= 5:
            rpm_std = np.std(rpm_values)
            if rpm_std > 50:  # [SIMULATED threshold]
                confidence += 0.20
                evidence.append({
                    "parameter": "rpm",
                    "observation": f"RPM instability detected: {rpm_std:.0f} RPM std",
                    "value": record.get("rpm"),
                    "threshold": "STD < 50 RPM for normal operation [SIMULATED]",
                })

        # Fuel flow trend
        if len(fuel_values) >= 5:
            fuel_trend = self._trend(fuel_values)
            if fuel_trend > 0.01:  # Increasing unexpectedly
                confidence += 0.20
                evidence.append({
                    "parameter": "fuel_flow_lph",
                    "observation": f"Fuel flow increasing trend: +{fuel_trend:.3f} L/h per step",
                    "value": record.get("fuel_flow_lph"),
                    "threshold": "Stable or decreasing with load [SIMULATED]",
                })

        # ML anomaly contribution
        if anomaly_score > 0.5:
            confidence += 0.15
            evidence.append({
                "parameter": "anomaly_score",
                "observation": f"ML anomaly score elevated: {anomaly_score:.3f}",
                "value": anomaly_score,
                "threshold": "> 0.5 [DEMONSTRATION MODEL]",
            })

        if confidence >= 0.25 and evidence:
            severity = "CRITICAL" if confidence > 0.7 else "WARNING" if confidence > 0.45 else "ADVISORY"
            return {
                "fault_type": "INJECTOR_DEGRADATION",
                "confidence": min(0.95, confidence),
                "severity": severity,
                "evidence": evidence,
            }
        return None

    def detect_lubrication_issue(self, record: Dict) -> Optional[Dict]:
        """Detect lubrication system issues from oil pressure and temperature."""
        oil_p = record.get("oil_pressure_kpa")
        oil_t = record.get("oil_temperature_c")
        rpm = record.get("rpm", 0)

        if oil_p is None or rpm is None:
            return None

        # At cruise RPM, oil pressure should be in normal range
        if rpm < 1000:
            return None  # Idle — low pressure is normal at idle

        evidence = []
        confidence = 0.0

        if oil_p < 200:  # Below normal min [SIMULATED/CONFIGURABLE]
            confidence += 0.5
            evidence.append({
                "parameter": "oil_pressure_kpa",
                "observation": f"Oil pressure low: {oil_p:.0f} kPa",
                "value": oil_p,
                "threshold": "Normal min: 200 kPa at cruise [SIMULATED/CONFIGURABLE]",
            })
        elif oil_p < 250:
            confidence += 0.25
            evidence.append({
                "parameter": "oil_pressure_kpa",
                "observation": f"Oil pressure below normal: {oil_p:.0f} kPa",
                "value": oil_p,
                "threshold": "Normal: 200-550 kPa [SIMULATED/CONFIGURABLE]",
            })

        if oil_t and oil_t > 110:  # Above normal max [SIMULATED/CONFIGURABLE]
            confidence += 0.3
            evidence.append({
                "parameter": "oil_temperature_c",
                "observation": f"Oil temperature elevated: {oil_t:.1f}°C",
                "value": oil_t,
                "threshold": "Normal max: 110°C [SIMULATED/CONFIGURABLE]",
            })

        if confidence >= 0.25:
            severity = "CRITICAL" if confidence > 0.6 else "WARNING" if oil_p < 200 else "ADVISORY"
            return {
                "fault_type": "LUBRICATION_ISSUE",
                "confidence": min(0.95, confidence),
                "severity": severity,
                "evidence": evidence,
            }
        return None

    def detect_overheating(self, record: Dict) -> Optional[Dict]:
        """Detect overheating from CHT and EGT."""
        cht = record.get("cht_c")
        egt = record.get("egt_c")

        evidence = []
        confidence = 0.0

        if cht:
            if cht > 240:  # Critical [SIMULATED/CONFIGURABLE]
                confidence += 0.6
                evidence.append({
                    "parameter": "cht_c",
                    "observation": f"CHT CRITICAL: {cht:.1f}°C",
                    "value": cht,
                    "threshold": "Critical: >240°C [SIMULATED/CONFIGURABLE]",
                })
            elif cht > 220:  # Warning
                confidence += 0.4
                evidence.append({
                    "parameter": "cht_c",
                    "observation": f"CHT WARNING: {cht:.1f}°C",
                    "value": cht,
                    "threshold": "Warning: >220°C [SIMULATED/CONFIGURABLE]",
                })
            elif cht > 200:  # Advisory
                confidence += 0.2
                evidence.append({
                    "parameter": "cht_c",
                    "observation": f"CHT elevated: {cht:.1f}°C",
                    "value": cht,
                    "threshold": "Normal max: 200°C [SIMULATED/CONFIGURABLE]",
                })

        if egt:
            if egt > 800:
                confidence += 0.4
                evidence.append({
                    "parameter": "egt_c",
                    "observation": f"EGT CRITICAL: {egt:.1f}°C",
                    "value": egt,
                    "threshold": "Critical: >800°C [SIMULATED/CONFIGURABLE]",
                })
            elif egt > 750:
                confidence += 0.25
                evidence.append({
                    "parameter": "egt_c",
                    "observation": f"EGT WARNING: {egt:.1f}°C",
                    "value": egt,
                    "threshold": "Warning: >750°C [SIMULATED/CONFIGURABLE]",
                })

        if confidence >= 0.2 and evidence:
            severity = "CRITICAL" if confidence > 0.6 else "WARNING" if confidence > 0.35 else "ADVISORY"
            return {
                "fault_type": "OVERHEATING",
                "confidence": min(0.95, confidence),
                "severity": severity,
                "evidence": evidence,
            }
        return None

    def detect_vibration_fault(self, record: Dict) -> Optional[Dict]:
        """Detect vibration anomalies."""
        vib = record.get("vibration_rms_g")
        vib_values = self._get_history_values("vibration_rms_g", 15)

        evidence = []
        confidence = 0.0

        if vib:
            if vib > 2.0:  # Critical [SIMULATED/CONFIGURABLE]
                confidence += 0.7
                evidence.append({
                    "parameter": "vibration_rms_g",
                    "observation": f"Vibration CRITICAL: {vib:.3f}g RMS",
                    "value": vib,
                    "threshold": "Critical: >2.0g [SIMULATED/CONFIGURABLE]",
                })
            elif vib > 1.0:  # Warning
                confidence += 0.45
                evidence.append({
                    "parameter": "vibration_rms_g",
                    "observation": f"Vibration WARNING: {vib:.3f}g RMS",
                    "value": vib,
                    "threshold": "Warning: >1.0g [SIMULATED/CONFIGURABLE]",
                })
            elif vib > 0.5:  # Advisory
                confidence += 0.2
                evidence.append({
                    "parameter": "vibration_rms_g",
                    "observation": f"Vibration elevated: {vib:.3f}g RMS",
                    "value": vib,
                    "threshold": "Normal max: 0.5g [SIMULATED/CONFIGURABLE]",
                })

        # Vibration trend — increasing trend also counts
        if len(vib_values) >= 5:
            vib_trend = self._trend(vib_values)
            if vib_trend > 0.005:  # [SIMULATED threshold]
                confidence += 0.2
                evidence.append({
                    "parameter": "vibration_trend",
                    "observation": f"Vibration increasing trend: +{vib_trend:.4f}g/step",
                    "value": vib_trend,
                    "threshold": "Stable expected [SIMULATED]",
                })

        if confidence >= 0.2 and evidence:
            severity = "CRITICAL" if confidence > 0.65 else "WARNING" if confidence > 0.4 else "ADVISORY"
            return {
                "fault_type": "VIBRATION_FAULT",
                "confidence": min(0.95, confidence),
                "severity": severity,
                "evidence": evidence,
            }
        return None

    def detect_electrical_fault(self, record: Dict) -> Optional[Dict]:
        """Detect electrical system anomalies."""
        rpm = record.get("rpm", 0)
        alt_v = record.get("alternator_voltage_v")
        batt_v = record.get("battery_voltage_v")

        if rpm is None or rpm < 1500:
            return None  # Engine not running at charging speed — skip

        evidence = []
        confidence = 0.0

        if alt_v is not None:
            if alt_v < 13.0 and rpm > 1500:  # Alternator not charging [SIMULATED]
                confidence += 0.5
                evidence.append({
                    "parameter": "alternator_voltage_v",
                    "observation": f"Alternator voltage low: {alt_v:.2f}V (not charging)",
                    "value": alt_v,
                    "threshold": "Normal charging: >13.5V [SIMULATED/CONFIGURABLE]",
                })

        if batt_v is not None:
            if batt_v < 11.5:  # Low battery [SIMULATED/CONFIGURABLE]
                confidence += 0.4
                evidence.append({
                    "parameter": "battery_voltage_v",
                    "observation": f"Battery voltage low: {batt_v:.2f}V",
                    "value": batt_v,
                    "threshold": "Normal min: 11.5V [SIMULATED/CONFIGURABLE]",
                })

        if confidence >= 0.3 and evidence:
            severity = "WARNING" if confidence > 0.5 else "ADVISORY"
            return {
                "fault_type": "ELECTRICAL_FAULT",
                "confidence": min(0.9, confidence),
                "severity": severity,
                "evidence": evidence,
            }
        return None

    def detect_faults(self, record: Dict, anomaly_score: float = 0.0) -> List[Dict]:
        """
        Run all fault detectors on a telemetry record.
        
        Returns list of detected faults with evidence and confidence.
        All results labeled as PROBABLE / SUSPECTED — require engineering confirmation.
        """
        self.update_buffer(record)

        detected = []
        detectors = [
            self.detect_injector_degradation,
            self.detect_lubrication_issue,
            self.detect_overheating,
            self.detect_vibration_fault,
            self.detect_electrical_fault,
        ]

        for detector in detectors:
            try:
                if detector == self.detect_injector_degradation:
                    result = detector(record, anomaly_score)
                else:
                    result = detector(record)

                if result:
                    fault_def = FAULT_DEFINITIONS.get(result["fault_type"], {})
                    result.update({
                        "fault_id": f"FLT-{result['fault_type'][:4]}-{uuid.uuid4().hex[:8].upper()}",
                        "label": fault_def.get("label", result["fault_type"]),
                        "description": fault_def.get("description", ""),
                        "subsystem": fault_def.get("subsystem", "UNKNOWN"),
                        "recommended_inspection": fault_def.get("inspection", "Requires engineering inspection."),
                        "detection_timestamp": datetime.utcnow().isoformat(),
                        "disclaimer": "PROBABLE FAULT / DEMONSTRATION DETECTION — Requires engineering confirmation.",
                    })
                    detected.append(result)
            except Exception as e:
                logger.error(f"Fault detector error in {detector.__name__}: {e}")

        return detected


# Singleton
fault_detector = FaultDetector()
