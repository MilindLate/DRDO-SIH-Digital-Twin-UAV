"""
Realistic engine telemetry simulator / synthetic data generator.

Generates labeled telemetry datasets for:
  1. Normal operation
  2. Injector degradation fault
  3. Lubrication degradation
  4. Cooling degradation / overheating
  5. Misfire / combustion instability
  6. Vibration anomaly (mechanical wear)
  7. Sensor drift
  8. Sensor failure (frozen / erratic)
  9. Combined faults

All generated data is:
  - SYNTHETIC / SIMULATED
  - Clearly labeled with fault_type and scenario
  - Suitable for ML training/testing demonstration

IMPORTANT: This is not real engine data. Do not use for engineering decisions.
"""

import numpy as np
import json
import uuid
from datetime import datetime, timedelta
from dataclasses import asdict
from typing import Generator, List, Dict, Optional, Any
import math

from .physics_model import EnginePysicsModel, EngineConfig, EngineState


# ─────────────────────────────────────────────────────────────────────────────
# Mission Profile Definitions
# ─────────────────────────────────────────────────────────────────────────────

class MissionPhaseConfig:
    """Configuration for a single mission phase."""
    def __init__(self, name: str, duration_s: float,
                 rpm_target: float, throttle_pct: float,
                 altitude_m: float, ambient_temp_c: float = 15.0,
                 humidity_pct: float = 60.0,
                 electrical_load_pct: float = 40.0):
        self.name = name
        self.duration_s = duration_s
        self.rpm_target = rpm_target
        self.throttle_pct = throttle_pct
        self.altitude_m = altitude_m
        self.ambient_temp_c = ambient_temp_c
        self.humidity_pct = humidity_pct
        self.electrical_load_pct = electrical_load_pct


# Standard mission profiles
ISR_ENDURANCE_PROFILE = [
    MissionPhaseConfig("ENGINE_START", 120, 900, 10, 0, 15, 60, 20),
    MissionPhaseConfig("IDLE/TAXI", 300, 1200, 20, 0, 15, 60, 30),
    MissionPhaseConfig("TAKEOFF", 120, 5200, 95, 50, 15, 60, 60),
    MissionPhaseConfig("CLIMB", 600, 4800, 85, 500, 10, 60, 50),
    MissionPhaseConfig("CRUISE", 3600, 4200, 70, 2000, 5, 60, 45),
    MissionPhaseConfig("LOITER", 7200, 3800, 60, 2000, 5, 60, 40),
    MissionPhaseConfig("DESCENT", 600, 3500, 40, 200, 12, 60, 35),
    MissionPhaseConfig("LANDING", 180, 2000, 25, 0, 15, 60, 30),
    MissionPhaseConfig("SHUTDOWN", 120, 1000, 10, 0, 15, 60, 20),
]

HOT_WEATHER_PROFILE = [p.__class__(
    p.name, p.duration_s, p.rpm_target, p.throttle_pct,
    p.altitude_m, 38.0, 75.0, p.electrical_load_pct
) for p in ISR_ENDURANCE_PROFILE]

HIGH_ALTITUDE_PROFILE = [p.__class__(
    p.name, p.duration_s, p.rpm_target, p.throttle_pct,
    max(p.altitude_m, 1000) if p.name not in ("ENGINE_START", "IDLE/TAXI") else p.altitude_m,
    p.ambient_temp_c, p.humidity_pct, p.electrical_load_pct
) for p in ISR_ENDURANCE_PROFILE]


# ─────────────────────────────────────────────────────────────────────────────
# Telemetry Record Builder
# ─────────────────────────────────────────────────────────────────────────────

def build_telemetry_record(
    state: EngineState,
    timestamp: datetime,
    uav_id: str,
    engine_id: str,
    mission_id: str,
    fault_type: str = "NORMAL",
    phase_name: str = "UNKNOWN",
) -> Dict[str, Any]:
    """Convert engine state to standardised telemetry record."""
    return {
        "timestamp": timestamp.isoformat(),
        "uav_id": uav_id,
        "engine_id": engine_id,
        "mission_id": mission_id,
        "data_source": "SIMULATOR",
        "fault_type": fault_type,           # Label for ML training
        "engine_state": state.engine_state,
        "mission_phase": phase_name,
        "quality_flag": 100,

        # Engine performance
        "rpm": round(state.rpm, 1),
        "torque_nm": round(state.torque_nm, 2),
        "engine_load_pct": round(state.engine_load_pct, 1),
        "throttle_pct": round(state.throttle_pct, 1),
        "fuel_flow_lph": round(state.fuel_flow_lph, 3),
        "fuel_pressure_kpa": round(state.fuel_pressure_kpa, 1),
        "injection_timing_deg": round(state.injection_timing_deg, 1),
        "manifold_pressure_kpa": round(state.manifold_pressure_kpa, 2),
        "air_mass_flow_kgs": round(state.air_mass_flow_kgs, 5),
        "volumetric_efficiency_pct": round(state.volumetric_efficiency_pct, 1),

        # Thermal
        "cht_c": round(state.cht_c, 1),
        "egt_c": round(state.egt_c, 1),
        "oil_temperature_c": round(state.oil_temperature_c, 1),
        "intake_temperature_c": round(state.intake_temperature_c, 1),
        "ambient_temperature_c": round(state.ambient_temperature_c, 1),
        "coolant_temperature_c": round(state.coolant_temperature_c, 1),

        # Lubrication
        "oil_pressure_kpa": round(state.oil_pressure_kpa, 1),
        "oil_flow_lpm": round(state.oil_flow_lpm, 2),
        "oil_level_pct": round(state.oil_level_pct, 1),

        # Electrical
        "battery_voltage_v": round(state.battery_voltage_v, 3),
        "alternator_voltage_v": round(state.alternator_voltage_v, 3),
        "current_a": round(state.current_a, 2),
        "electrical_load_pct": round(state.electrical_load_pct, 1),

        # Vibration
        "vibration_rms_g": round(state.vibration_rms_g, 4),
        "vibration_x_g": round(state.vibration_x_g, 4),
        "vibration_y_g": round(state.vibration_y_g, 4),
        "vibration_z_g": round(state.vibration_z_g, 4),
        "vibration_dominant_freq_hz": round(state.vibration_dominant_freq_hz, 1),

        # Environmental
        "altitude_m": round(state.altitude_m, 1),
        "humidity_pct": round(state.humidity_pct, 1),
        "barometric_pressure_hpa": round(state.barometric_pressure_hpa, 2),
        "air_density_kgm3": round(state.air_density_kgm3, 4),

        # Fuel
        "fuel_quantity_l": round(state.fuel_quantity_l, 2),

        # Degradation state (labeled — for supervised learning)
        "_injector_degradation": round(state.injector_degradation, 4),
        "_lubrication_degradation": round(state.lubrication_degradation, 4),
        "_cooling_degradation": round(state.cooling_degradation, 4),
        "_mechanical_wear": round(state.mechanical_wear, 4),
        "_combustion_instability": round(state.combustion_instability, 4),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Simulator Engine
# ─────────────────────────────────────────────────────────────────────────────

class EngineSimulator:
    """
    Real-time engine telemetry simulator.
    
    Generates physically plausible engine telemetry data using the
    physics model with configurable degradation injection.
    
    Data is SYNTHETIC / SIMULATED.
    For ML training purposes only — not suitable for engineering certification.
    """

    def __init__(self, config: Optional[EngineConfig] = None,
                 uav_id: str = "UAV-001",
                 engine_id: str = "ENG-001",
                 dt: float = 1.0):
        self.config = config or EngineConfig()
        self.physics = EnginePysicsModel(self.config)
        self.uav_id = uav_id
        self.engine_id = engine_id
        self.dt = dt

        # Current state
        self.state = EngineState()
        self.state.ambient_temperature_c = 15.0
        self.state.altitude_m = 0.0
        self.state.engine_state = "OFF"
        self.state.fuel_quantity_l = 80.0

        # Mission tracking
        self.current_mission_id = f"MIS-{uuid.uuid4().hex[:8].upper()}"
        self.elapsed_time_s = 0.0
        self.current_timestamp = datetime.utcnow()

        # Current control inputs
        self._inputs: Dict[str, Any] = {
            "rpm": 0.0,
            "throttle_pct": 0.0,
            "altitude_m": 0.0,
            "ambient_temperature_c": 15.0,
            "humidity_pct": 60.0,
            "engine_state": "OFF",
            "mission_phase": "PRE_FLIGHT",
            "electrical_load_pct": 20.0,
        }

        # Degradation schedule (for demo missions)
        self._degradation_schedule: List[Dict] = []
        self._fault_type = "NORMAL"

    def set_inputs(self, **kwargs):
        """Update control inputs."""
        self._inputs.update(kwargs)
        self.state.engine_state = self._inputs.get("engine_state", self.state.engine_state)

    def inject_degradation(self, fault_type: str, severity: float = 0.0):
        """
        Inject a degradation fault.
        severity: 0.0 (none) to 1.0 (fully degraded)
        """
        self._fault_type = fault_type
        if fault_type == "INJECTOR_DEGRADATION":
            self.state.injector_degradation = severity
        elif fault_type == "LUBRICATION_DEGRADATION":
            self.state.lubrication_degradation = severity
        elif fault_type == "COOLING_DEGRADATION":
            self.state.cooling_degradation = severity
        elif fault_type == "MECHANICAL_WEAR":
            self.state.mechanical_wear = severity
        elif fault_type == "COMBUSTION_INSTABILITY":
            self.state.combustion_instability = severity
        elif fault_type == "NORMAL":
            self.state.injector_degradation = 0.0
            self.state.lubrication_degradation = 0.0
            self.state.cooling_degradation = 0.0
            self.state.mechanical_wear = 0.0
            self.state.combustion_instability = 0.0

    def step(self) -> Dict[str, Any]:
        """Advance simulator by one time step and return telemetry record."""
        self.state = self.physics.step(self.state, self._inputs, self.dt)
        record = build_telemetry_record(
            self.state,
            self.current_timestamp,
            self.uav_id,
            self.engine_id,
            self.current_mission_id,
            self._fault_type,
            self._inputs.get("mission_phase", "UNKNOWN"),
        )
        self.current_timestamp += timedelta(seconds=self.dt)
        self.elapsed_time_s += self.dt
        return record

    def run_mission_profile(
        self, profile: List[MissionPhaseConfig],
        fault_injection: Optional[Dict] = None
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Run a complete mission profile and yield telemetry records.
        
        Args:
            profile: List of mission phase configs
            fault_injection: Optional fault injection config:
                {'start_time_s': ..., 'fault_type': ..., 'max_severity': ...}
        """
        fault_start = fault_injection.get("start_time_s", 99999) if fault_injection else 99999
        fault_type = fault_injection.get("fault_type", "NORMAL") if fault_injection else "NORMAL"
        max_severity = fault_injection.get("max_severity", 0.8) if fault_injection else 0.0
        fault_duration = fault_injection.get("duration_s", 3600) if fault_injection else 0

        engine_state_map = {
            "ENGINE_START": "STARTING",
            "IDLE/TAXI": "IDLE",
            "TAKEOFF": "TAKEOFF",
            "CLIMB": "CLIMB",
            "CRUISE": "CRUISE",
            "LOITER": "LOITER",
            "DESCENT": "DESCENT",
            "LANDING": "LANDING",
            "SHUTDOWN": "SHUTDOWN",
        }

        self.elapsed_time_s = 0.0
        self.state = EngineState()
        self.state.fuel_quantity_l = 80.0
        self.state.ambient_temperature_c = profile[0].ambient_temp_c if profile else 15.0
        self.inject_degradation("NORMAL")

        for phase in profile:
            phase_elapsed = 0.0

            while phase_elapsed < phase.duration_s:
                # Ramp RPM smoothly toward target
                rpm_error = phase.rpm_target - self._inputs.get("rpm", 0)
                rpm_rate = 200.0 * self.dt  # RPM/s ramp [SIMULATED]
                new_rpm = self._inputs.get("rpm", 0) + np.sign(rpm_error) * min(abs(rpm_error), rpm_rate)

                self.set_inputs(
                    rpm=new_rpm,
                    throttle_pct=phase.throttle_pct,
                    altitude_m=phase.altitude_m,
                    ambient_temperature_c=phase.ambient_temp_c,
                    humidity_pct=phase.humidity_pct,
                    engine_state=engine_state_map.get(phase.name, "CRUISE"),
                    mission_phase=phase.name,
                    electrical_load_pct=phase.electrical_load_pct,
                )

                # Fault injection
                if fault_injection and fault_start <= self.elapsed_time_s <= (fault_start + fault_duration):
                    time_into_fault = self.elapsed_time_s - fault_start
                    severity = min(max_severity, (time_into_fault / (fault_duration * 0.5)) * max_severity)
                    self.inject_degradation(fault_type, severity)
                elif self.elapsed_time_s > (fault_start + fault_duration) and fault_injection:
                    pass  # Keep at max severity after ramp

                yield self.step()
                phase_elapsed += self.dt


# ─────────────────────────────────────────────────────────────────────────────
# Dataset Generator
# ─────────────────────────────────────────────────────────────────────────────

class DatasetGenerator:
    """
    Generates labeled synthetic datasets for ML training.
    
    Output: List of telemetry records with fault labels.
    These datasets are SYNTHETIC/SIMULATED.
    They demonstrate the ML pipeline but are not derived from real engine tests.
    """

    SCENARIOS = {
        "normal_endurance": {
            "description": "Normal ISR endurance mission — no faults",
            "profile": ISR_ENDURANCE_PROFILE,
            "fault_injection": None,
        },
        "hot_weather_mission": {
            "description": "Hot weather mission (38°C ambient) — increased thermal stress",
            "profile": HOT_WEATHER_PROFILE,
            "fault_injection": None,
        },
        "injector_degradation": {
            "description": "Injector degradation developing during cruise phase",
            "profile": ISR_ENDURANCE_PROFILE,
            "fault_injection": {
                "start_time_s": 4000,
                "fault_type": "INJECTOR_DEGRADATION",
                "max_severity": 0.7,
                "duration_s": 3600,
            },
        },
        "lubrication_degradation": {
            "description": "Gradual lubrication system degradation",
            "profile": ISR_ENDURANCE_PROFILE,
            "fault_injection": {
                "start_time_s": 5000,
                "fault_type": "LUBRICATION_DEGRADATION",
                "max_severity": 0.65,
                "duration_s": 3000,
            },
        },
        "cooling_degradation": {
            "description": "Cooling system degradation — overheating scenario",
            "profile": HOT_WEATHER_PROFILE,
            "fault_injection": {
                "start_time_s": 3500,
                "fault_type": "COOLING_DEGRADATION",
                "max_severity": 0.6,
                "duration_s": 2500,
            },
        },
        "vibration_anomaly": {
            "description": "Increasing mechanical wear → vibration anomaly",
            "profile": ISR_ENDURANCE_PROFILE,
            "fault_injection": {
                "start_time_s": 2000,
                "fault_type": "MECHANICAL_WEAR",
                "max_severity": 0.8,
                "duration_s": 5000,
            },
        },
        "combustion_instability": {
            "description": "Combustion instability — misfire-like behaviour",
            "profile": ISR_ENDURANCE_PROFILE,
            "fault_injection": {
                "start_time_s": 3000,
                "fault_type": "COMBUSTION_INSTABILITY",
                "max_severity": 0.5,
                "duration_s": 2000,
            },
        },
    }

    def generate_scenario(
        self, scenario_name: str,
        uav_id: str = "UAV-001",
        engine_id: str = "ENG-001",
        dt: float = 5.0,  # 5s intervals for dataset generation
    ) -> List[Dict]:
        """Generate a complete scenario dataset."""
        scenario = self.SCENARIOS.get(scenario_name)
        if not scenario:
            raise ValueError(f"Unknown scenario: {scenario_name}. Available: {list(self.SCENARIOS.keys())}")

        sim = EngineSimulator(uav_id=uav_id, engine_id=engine_id, dt=dt)
        records = []
        mission_id = f"MIS-{scenario_name[:6].upper()}-{uuid.uuid4().hex[:6].upper()}"
        sim.current_mission_id = mission_id

        for record in sim.run_mission_profile(
            scenario["profile"],
            scenario.get("fault_injection"),
        ):
            record["scenario"] = scenario_name
            record["scenario_description"] = scenario["description"]
            records.append(record)

        return records

    def generate_all(self, output_dir: str = "ml/models", dt: float = 5.0):
        """Generate all scenarios and save to files."""
        import os
        os.makedirs(output_dir, exist_ok=True)

        all_records = []
        for scenario_name in self.SCENARIOS:
            print(f"  Generating scenario: {scenario_name}...")
            records = self.generate_scenario(scenario_name, dt=dt)
            print(f"    → {len(records)} records")
            all_records.extend(records)

            # Save individual scenario
            path = os.path.join(output_dir, f"scenario_{scenario_name}.jsonl")
            with open(path, "w") as f:
                for r in records:
                    f.write(json.dumps(r) + "\n")

        # Save combined dataset
        combined_path = os.path.join(output_dir, "training_dataset_combined.jsonl")
        with open(combined_path, "w") as f:
            for r in all_records:
                f.write(json.dumps(r) + "\n")

        print(f"\nTotal records: {len(all_records)}")
        print(f"Combined dataset saved to: {combined_path}")
        return all_records


# ─────────────────────────────────────────────────────────────────────────────
# Real-Time Simulator (streaming)
# ─────────────────────────────────────────────────────────────────────────────

class RealtimeSimulator(EngineSimulator):
    """
    Real-time simulator for live dashboard updates.
    Runs the ISR demo mission with controlled fault injection.
    """

    DEMO_SCENARIO = [
        # Phase: Engine start
        MissionPhaseConfig("ENGINE_START", 30, 900, 10, 0, 20, 60, 20),
        # Taxi
        MissionPhaseConfig("IDLE/TAXI", 60, 1400, 20, 0, 20, 60, 30),
        # Takeoff
        MissionPhaseConfig("TAKEOFF", 30, 5200, 95, 30, 20, 60, 60),
        # Climb
        MissionPhaseConfig("CLIMB", 120, 4800, 82, 800, 15, 60, 50),
        # Cruise
        MissionPhaseConfig("CRUISE", 300, 4200, 70, 2000, 8, 60, 45),
        # Loiter — injector fault introduced here
        MissionPhaseConfig("LOITER", 600, 3800, 60, 2000, 8, 60, 40),
        # Descent after fault
        MissionPhaseConfig("DESCENT", 120, 3500, 40, 200, 15, 60, 35),
        # Landing
        MissionPhaseConfig("LANDING", 60, 2200, 25, 0, 20, 60, 30),
        # Shutdown
        MissionPhaseConfig("SHUTDOWN", 30, 1000, 10, 0, 20, 60, 20),
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._demo_generator: Optional[Generator] = None
        self._demo_running = False
        self._total_elapsed = 0.0

    def start_demo(self):
        """Start the demo ISR mission scenario."""
        self._demo_generator = self.run_mission_profile(
            self.DEMO_SCENARIO,
            fault_injection={
                "start_time_s": 550,      # Fault starts during loiter
                "fault_type": "INJECTOR_DEGRADATION",
                "max_severity": 0.65,
                "duration_s": 600,
            }
        )
        self._demo_running = True

    def next(self) -> Optional[Dict[str, Any]]:
        """Get next telemetry record (for real-time streaming)."""
        if not self._demo_running or self._demo_generator is None:
            # Run freeform based on current inputs
            return self.step()

        try:
            return next(self._demo_generator)
        except StopIteration:
            self._demo_running = False
            return self.step()
