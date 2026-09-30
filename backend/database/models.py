"""
SQLAlchemy ORM models for the AI-Enabled Digital Twin UAV Engine System.

Schema designed for compatibility with TimescaleDB hypertables (for future migration).
Currently using SQLite for portability in the demonstrator.

NOTE: All simulated values are clearly labelled. These do not represent
certified aerospace limits, validated RUL estimates, or production safety thresholds.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, Text, JSON,
    ForeignKey, Enum as SAEnum, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum

Base = declarative_base()


def generate_uuid():
    return str(uuid.uuid4())


# ─────────────────────────────────────────────────────────────────────────────
# Enumerations
# ─────────────────────────────────────────────────────────────────────────────

class EngineState(str, enum.Enum):
    OFF = "OFF"
    STARTING = "STARTING"
    IDLE = "IDLE"
    TAKEOFF = "TAKEOFF"
    CLIMB = "CLIMB"
    CRUISE = "CRUISE"
    LOITER = "LOITER"
    HIGH_LOAD = "HIGH_LOAD"
    DESCENT = "DESCENT"
    LANDING = "LANDING"
    SHUTDOWN = "SHUTDOWN"
    FAULT = "FAULT"
    MAINTENANCE = "MAINTENANCE"


class MissionPhase(str, enum.Enum):
    PRE_FLIGHT = "PRE_FLIGHT"
    ENGINE_START = "ENGINE_START"
    TAXI = "TAXI"
    TAKEOFF = "TAKEOFF"
    CLIMB = "CLIMB"
    CRUISE = "CRUISE"
    LOITER = "LOITER"
    DESCENT = "DESCENT"
    LANDING = "LANDING"
    POST_FLIGHT = "POST_FLIGHT"
    COMPLETE = "COMPLETE"
    ABORTED = "ABORTED"


class FaultSeverity(str, enum.Enum):
    INFO = "INFO"
    ADVISORY = "ADVISORY"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class FaultStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


class MaintenanceStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    DEFERRED = "DEFERRED"


class MaintenancePriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class UAVStatus(str, enum.Enum):
    OPERATIONAL = "OPERATIONAL"
    MAINTENANCE = "MAINTENANCE"
    GROUNDED = "GROUNDED"
    MISSION = "MISSION"
    STANDBY = "STANDBY"


# ─────────────────────────────────────────────────────────────────────────────
# Core entities
# ─────────────────────────────────────────────────────────────────────────────

class UAV(Base):
    """Represents a UAV airframe."""
    __tablename__ = "uavs"

    id = Column(String, primary_key=True, default=generate_uuid)
    uav_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100))
    model = Column(String(100), default="Generic MALE UAV")
    status = Column(SAEnum(UAVStatus), default=UAVStatus.STANDBY)
    max_endurance_hours = Column(Float, default=24.0)  # SIMULATED/CONFIGURABLE
    max_altitude_m = Column(Float, default=6000.0)     # SIMULATED/CONFIGURABLE
    payload_capacity_kg = Column(Float, default=150.0) # SIMULATED/CONFIGURABLE
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    engines = relationship("Engine", back_populates="uav")
    missions = relationship("Mission", back_populates="uav")


class Engine(Base):
    """
    Represents a physical piston aero engine.
    All parameter limits are SIMULATION/CONFIGURABLE values.
    Do NOT interpret as certified aerospace limits.
    """
    __tablename__ = "engines"

    id = Column(String, primary_key=True, default=generate_uuid)
    engine_id = Column(String(50), unique=True, nullable=False, index=True)
    uav_id_fk = Column(String, ForeignKey("uavs.id"), nullable=True)
    model = Column(String(100), default="Generic Aero Piston Engine (Simulated)")
    displacement_cc = Column(Float, default=2000.0)   # SIMULATED
    cylinders = Column(Integer, default=4)             # SIMULATED
    max_rpm_rated = Column(Float, default=5800.0)      # SIMULATED/CONFIGURABLE
    max_power_kw = Column(Float, default=75.0)         # SIMULATED/CONFIGURABLE
    compression_ratio = Column(Float, default=8.5)     # SIMULATED/CONFIGURABLE
    total_operating_hours = Column(Float, default=0.0)
    mission_count = Column(Integer, default=0)
    engine_cycles = Column(Integer, default=0)
    tbo_hours = Column(Float, default=1500.0)          # SIMULATED/CONFIGURABLE — TBO = Time Between Overhaul
    last_overhaul_hours = Column(Float, default=0.0)
    manufacture_date = Column(DateTime)
    installation_date = Column(DateTime)
    current_state = Column(SAEnum(EngineState), default=EngineState.OFF)
    notes = Column(Text)
    config = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    uav = relationship("UAV", back_populates="engines")
    telemetry_records = relationship("TelemetryRecord", back_populates="engine")
    health_records = relationship("HealthRecord", back_populates="engine")
    fault_events = relationship("FaultEvent", back_populates="engine")
    missions = relationship("Mission", back_populates="engine")
    maintenance_records = relationship("MaintenanceRecord", back_populates="engine")
    rul_estimates = relationship("RULEstimate", back_populates="engine")


# ─────────────────────────────────────────────────────────────────────────────
# Telemetry — time-series data (designed for TimescaleDB hypertable on `timestamp`)
# ─────────────────────────────────────────────────────────────────────────────

class TelemetryRecord(Base):
    """
    Standardised telemetry schema.
    Every field includes engineering unit in the column name suffix.
    Sources: Simulated | Sensor | CAN/ECU (future)
    """
    __tablename__ = "telemetry"

    id = Column(String, primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, nullable=False, index=True)
    engine_id_fk = Column(String, ForeignKey("engines.id"), nullable=False, index=True)
    mission_id_fk = Column(String, ForeignKey("missions.id"), nullable=True, index=True)

    # Engine performance
    rpm = Column(Float)                         # Revolutions per minute
    torque_nm = Column(Float)                   # Newton-metres [SIMULATED]
    engine_load_pct = Column(Float)             # Percentage 0–100
    throttle_pct = Column(Float)                # Throttle position 0–100%
    fuel_flow_lph = Column(Float)               # Litres per hour
    fuel_pressure_kpa = Column(Float)           # kPa
    injection_timing_deg = Column(Float)        # Degrees BTDC
    manifold_pressure_kpa = Column(Float)       # kPa
    air_mass_flow_kgs = Column(Float)           # kg/s [SIMULATED]

    # Thermal parameters
    cht_c = Column(Float)                       # Cylinder Head Temperature °C
    egt_c = Column(Float)                       # Exhaust Gas Temperature °C
    oil_temperature_c = Column(Float)           # °C
    intake_temperature_c = Column(Float)        # °C
    ambient_temperature_c = Column(Float)       # °C
    coolant_temperature_c = Column(Float)       # °C (if applicable)

    # Lubrication
    oil_pressure_kpa = Column(Float)            # kPa
    oil_flow_lpm = Column(Float)                # Litres per minute [SIMULATED]
    oil_level_pct = Column(Float)               # Percentage

    # Electrical
    battery_voltage_v = Column(Float)           # Volts
    alternator_voltage_v = Column(Float)        # Volts
    current_a = Column(Float)                   # Amperes
    electrical_load_pct = Column(Float)         # Percentage

    # Vibration
    vibration_rms_g = Column(Float)             # RMS acceleration (g)
    vibration_x_g = Column(Float)               # X-axis (g)
    vibration_y_g = Column(Float)               # Y-axis (g)
    vibration_z_g = Column(Float)               # Z-axis (g)
    vibration_dominant_freq_hz = Column(Float)  # Hz

    # Environmental / flight
    altitude_m = Column(Float)                  # Metres MSL
    airspeed_ms = Column(Float)                 # m/s
    humidity_pct = Column(Float)                # %RH
    barometric_pressure_hpa = Column(Float)     # hPa
    air_density_kgm3 = Column(Float)            # kg/m³ [COMPUTED]

    # Fuel
    fuel_quantity_l = Column(Float)             # Litres remaining

    # Metadata
    data_source = Column(String(50), default="SIMULATOR")  # SIMULATOR | CAN | ECU | SERIAL | UDP
    engine_state = Column(String(50))
    mission_phase = Column(String(50))
    quality_flag = Column(Integer, default=100)  # 0–100 data quality score

    engine = relationship("Engine", back_populates="telemetry_records")
    mission = relationship("Mission", back_populates="telemetry_records")

    __table_args__ = (
        Index("ix_telemetry_engine_timestamp", "engine_id_fk", "timestamp"),
        Index("ix_telemetry_mission_timestamp", "mission_id_fk", "timestamp"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Health Assessment
# ─────────────────────────────────────────────────────────────────────────────

class HealthRecord(Base):
    """
    Engine health assessment record.
    Health indices are DEMONSTRATION/RESEARCH MODELS — not validated certification metrics.
    Scale: 0–100 (100 = nominal, 0 = critical/failed)
    """
    __tablename__ = "health_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, nullable=False, index=True)
    engine_id_fk = Column(String, ForeignKey("engines.id"), nullable=False, index=True)
    mission_id_fk = Column(String, ForeignKey("missions.id"), nullable=True)

    # Composite health index (weighted sum of subsystem indices)
    overall_health = Column(Float)          # 0–100 DEMONSTRATION MODEL
    mechanical_health = Column(Float)       # 0–100
    thermal_health = Column(Float)          # 0–100
    lubrication_health = Column(Float)      # 0–100
    combustion_health = Column(Float)       # 0–100
    fuel_system_health = Column(Float)      # 0–100
    electrical_health = Column(Float)       # 0–100
    sensor_health = Column(Float)           # 0–100
    vibration_health = Column(Float)        # 0–100

    # Degradation metrics
    degradation_rate = Column(Float)        # %/hour SIMULATED
    health_confidence = Column(Float)       # 0–1 model confidence

    # Contributing factors (JSON)
    major_contributors = Column(JSON)       # List of {factor, impact, direction}
    health_weights = Column(JSON)           # Weights used for calculation

    engine = relationship("Engine", back_populates="health_records")
    mission = relationship("Mission", back_populates="health_records")

    __table_args__ = (
        Index("ix_health_engine_timestamp", "engine_id_fk", "timestamp"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Fault Detection & Diagnosis
# ─────────────────────────────────────────────────────────────────────────────

class FaultEvent(Base):
    """
    Fault detection event record.
    All diagnoses are probabilistic — NOT certified fault determinations.
    Confidence values represent model probability, not physical certainty.
    """
    __tablename__ = "fault_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    fault_id = Column(String(50), unique=True, nullable=False)
    engine_id_fk = Column(String, ForeignKey("engines.id"), nullable=False, index=True)
    mission_id_fk = Column(String, ForeignKey("missions.id"), nullable=True)

    fault_type = Column(String(100), nullable=False)    # e.g. "INJECTOR_DEGRADATION"
    fault_label = Column(String(200))                   # Human-readable label
    severity = Column(SAEnum(FaultSeverity), nullable=False)
    status = Column(SAEnum(FaultStatus), default=FaultStatus.ACTIVE)

    detection_timestamp = Column(DateTime, nullable=False)
    first_detected_timestamp = Column(DateTime)
    acknowledged_timestamp = Column(DateTime)
    resolved_timestamp = Column(DateTime)

    confidence = Column(Float)                          # 0.0–1.0 model probability
    affected_subsystem = Column(String(100))

    # Evidence — parameter deviations that triggered detection
    evidence = Column(JSON)                             # List of {parameter, value, expected, deviation}
    supporting_parameters = Column(JSON)                # List of parameter names
    recommended_inspection = Column(Text)

    # ML model info
    detection_model = Column(String(100))               # Model that detected this fault
    model_version = Column(String(50))

    notes = Column(Text)

    engine = relationship("Engine", back_populates="fault_events")
    mission = relationship("Mission", back_populates="fault_events")

    __table_args__ = (
        Index("ix_fault_engine_timestamp", "engine_id_fk", "detection_timestamp"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Anomaly Detection
# ─────────────────────────────────────────────────────────────────────────────

class AnomalyRecord(Base):
    """
    Anomaly detection record from unsupervised ML models.
    Anomaly = statistical deviation from normal operating envelope.
    Does NOT imply a confirmed fault.
    """
    __tablename__ = "anomaly_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, nullable=False, index=True)
    engine_id_fk = Column(String, ForeignKey("engines.id"), nullable=False, index=True)
    mission_id_fk = Column(String, ForeignKey("missions.id"), nullable=True)

    anomaly_score = Column(Float)               # 0.0 (normal) – 1.0 (highly anomalous)
    is_anomaly = Column(Boolean, default=False)
    detection_model = Column(String(100))
    contributing_features = Column(JSON)        # SHAP-style feature contributions
    feature_values = Column(JSON)               # Actual feature values

    __table_args__ = (
        Index("ix_anomaly_engine_timestamp", "engine_id_fk", "timestamp"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# RUL (Remaining Useful Life)
# ─────────────────────────────────────────────────────────────────────────────

class RULEstimate(Base):
    """
    Remaining Useful Life estimate.
    DEMONSTRATION MODEL / SIMULATION-BASED ESTIMATE.
    NOT validated against real engine failure data.
    Confidence intervals represent model uncertainty, not certified safety margins.
    """
    __tablename__ = "rul_estimates"

    id = Column(String, primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, nullable=False, index=True)
    engine_id_fk = Column(String, ForeignKey("engines.id"), nullable=False, index=True)
    mission_id_fk = Column(String, ForeignKey("missions.id"), nullable=True)

    rul_hours = Column(Float)                           # Point estimate [SIMULATED]
    rul_lower_ci_hours = Column(Float)                  # Lower confidence bound
    rul_upper_ci_hours = Column(Float)                  # Upper confidence bound
    confidence_level = Column(Float, default=0.80)      # CI level (e.g. 0.80 = 80%)
    model_confidence = Column(Float)                    # 0–1

    degradation_rate = Column(Float)                    # %/hour
    predicted_failure_timestamp = Column(DateTime)
    maintenance_threshold_pct = Column(Float, default=30.0)  # Health % at which maintenance recommended
    estimated_hours_to_threshold = Column(Float)

    # Contributing factors
    rul_contributors = Column(JSON)                     # {factor: weight}
    model_name = Column(String(100))
    model_version = Column(String(50))
    disclaimer = Column(String(500), default="SIMULATION-BASED ESTIMATE. NOT validated against real failure data.")

    engine = relationship("Engine", back_populates="rul_estimates")

    __table_args__ = (
        Index("ix_rul_engine_timestamp", "engine_id_fk", "timestamp"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Mission
# ─────────────────────────────────────────────────────────────────────────────

class Mission(Base):
    """Mission record."""
    __tablename__ = "missions"

    id = Column(String, primary_key=True, default=generate_uuid)
    mission_id = Column(String(50), unique=True, nullable=False, index=True)
    uav_id_fk = Column(String, ForeignKey("uavs.id"), nullable=True)
    engine_id_fk = Column(String, ForeignKey("engines.id"), nullable=True)

    mission_type = Column(String(100), default="ISR_ENDURANCE")
    description = Column(Text)
    status = Column(String(50), default="PLANNED")  # PLANNED | ACTIVE | COMPLETE | ABORTED

    # Configuration
    planned_duration_hours = Column(Float)
    planned_altitude_m = Column(Float)
    ambient_temperature_c = Column(Float)
    humidity_pct = Column(Float)
    payload_kg = Column(Float)
    fuel_quantity_l = Column(Float)
    wind_speed_ms = Column(Float)

    # Actuals
    start_timestamp = Column(DateTime)
    end_timestamp = Column(DateTime)
    actual_duration_hours = Column(Float)
    total_fuel_consumed_l = Column(Float)
    distance_km = Column(Float)

    # Summary statistics (populated post-flight)
    max_cht_c = Column(Float)
    max_egt_c = Column(Float)
    min_oil_pressure_kpa = Column(Float)
    max_vibration_rms_g = Column(Float)
    max_engine_load_pct = Column(Float)
    avg_rpm = Column(Float)
    fault_count = Column(Integer, default=0)
    anomaly_count = Column(Integer, default=0)
    warning_count = Column(Integer, default=0)

    # Profile (for simulation)
    mission_profile = Column(JSON)  # List of phase configs
    is_simulation = Column(Boolean, default=False)
    is_demo = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    uav = relationship("UAV", back_populates="missions")
    engine = relationship("Engine", back_populates="missions")
    telemetry_records = relationship("TelemetryRecord", back_populates="mission")
    health_records = relationship("HealthRecord", back_populates="mission")
    fault_events = relationship("FaultEvent", back_populates="mission")


# ─────────────────────────────────────────────────────────────────────────────
# Maintenance
# ─────────────────────────────────────────────────────────────────────────────

class MaintenanceRecord(Base):
    """
    Predictive maintenance recommendation.
    DEMONSTRATION / RESEARCH MODEL.
    NOT a certified maintenance instruction or airworthiness directive.
    """
    __tablename__ = "maintenance_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    engine_id_fk = Column(String, ForeignKey("engines.id"), nullable=False, index=True)
    mission_id_fk = Column(String, ForeignKey("missions.id"), nullable=True)

    recommendation_type = Column(String(100))   # e.g. INSPECT_INJECTOR, CHECK_OIL
    title = Column(String(200))
    description = Column(Text)
    priority = Column(SAEnum(MaintenancePriority), default=MaintenancePriority.MEDIUM)
    status = Column(SAEnum(MaintenanceStatus), default=MaintenanceStatus.PENDING)

    reason = Column(Text)
    affected_subsystem = Column(String(100))
    evidence = Column(JSON)                     # Supporting parameter deviations
    estimated_remaining_hours = Column(Float)   # Before recommended action

    created_timestamp = Column(DateTime, default=datetime.utcnow)
    due_timestamp = Column(DateTime)
    completed_timestamp = Column(DateTime)
    completed_by = Column(String(100))
    completion_notes = Column(Text)

    disclaimer = Column(String(500), default="DEMONSTRATION/RESEARCH MODEL. Not a certified maintenance instruction.")

    engine = relationship("Engine", back_populates="maintenance_records")


# ─────────────────────────────────────────────────────────────────────────────
# Sensor Status
# ─────────────────────────────────────────────────────────────────────────────

class SensorStatus(Base):
    """Current sensor health and data quality."""
    __tablename__ = "sensor_status"

    id = Column(String, primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, nullable=False, index=True)
    engine_id_fk = Column(String, ForeignKey("engines.id"), nullable=False, index=True)

    sensor_id = Column(String(100))
    sensor_name = Column(String(100))
    parameter = Column(String(100))
    current_value = Column(Float)
    unit = Column(String(20))

    quality_score = Column(Float)               # 0–100
    data_rate_hz = Column(Float)
    last_update_timestamp = Column(DateTime)
    status = Column(String(50))                 # OK | DEGRADED | FAILED | FROZEN | DRIFTING
    confidence = Column(Float)                  # 0–1

    # Anomaly detection
    is_outlier = Column(Boolean, default=False)
    is_frozen = Column(Boolean, default=False)
    is_drifting = Column(Boolean, default=False)
    drift_rate = Column(Float)
    noise_level = Column(Float)

    __table_args__ = (
        Index("ix_sensor_engine_timestamp", "engine_id_fk", "timestamp"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# ML Model Registry
# ─────────────────────────────────────────────────────────────────────────────

class MLModel(Base):
    """Machine learning model registry."""
    __tablename__ = "ml_models"

    id = Column(String, primary_key=True, default=generate_uuid)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    model_type = Column(String(100))            # ANOMALY_DETECTION | FAULT_CLASSIFICATION | RUL
    algorithm = Column(String(100))             # e.g. IsolationForest, RandomForest
    description = Column(Text)

    training_dataset = Column(String(200))
    dataset_version = Column(String(50))
    training_timestamp = Column(DateTime)
    features = Column(JSON)                     # List of feature names

    # Performance metrics
    accuracy = Column(Float)
    precision_score = Column(Float)
    recall_score = Column(Float)
    f1_score = Column(Float)
    auc_roc = Column(Float)
    validation_notes = Column(Text)

    is_active = Column(Boolean, default=True)
    deployment_status = Column(String(50), default="DEPLOYED")
    model_path = Column(String(500))

    disclaimer = Column(String(500), default="DEMONSTRATION MODEL. Trained on synthetic data. Not validated for production use.")
    created_at = Column(DateTime, default=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# Alert / Alarm History
# ─────────────────────────────────────────────────────────────────────────────

class AlertRecord(Base):
    """Alert and alarm history."""
    __tablename__ = "alert_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, nullable=False, index=True, default=datetime.utcnow)
    engine_id_fk = Column(String, ForeignKey("engines.id"), nullable=True)
    mission_id_fk = Column(String, ForeignKey("missions.id"), nullable=True)

    alert_type = Column(String(50))             # INFO | ADVISORY | WARNING | CRITICAL
    parameter = Column(String(100))
    message = Column(Text)
    current_value = Column(Float)
    expected_range_min = Column(Float)
    expected_range_max = Column(Float)
    affected_subsystem = Column(String(100))
    recommended_action = Column(Text)

    acknowledged = Column(Boolean, default=False)
    acknowledged_timestamp = Column(DateTime)
    acknowledged_by = Column(String(100))

    __table_args__ = (
        Index("ix_alert_engine_timestamp", "engine_id_fk", "timestamp"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Digital Twin State Snapshot
# ─────────────────────────────────────────────────────────────────────────────

class DigitalTwinState(Base):
    """
    Periodic snapshot of the Digital Twin state.
    Includes derived/latent variables computed by the physics + ML hybrid model.
    """
    __tablename__ = "digital_twin_states"

    id = Column(String, primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, nullable=False, index=True)
    engine_id_fk = Column(String, ForeignKey("engines.id"), nullable=False, index=True)
    mission_id_fk = Column(String, ForeignKey("missions.id"), nullable=True)

    engine_state = Column(String(50))
    mission_phase = Column(String(50))

    # Latent variables (not directly measurable — computed by model)
    combustion_efficiency_pct = Column(Float)   # SIMULATED/ESTIMATED
    mechanical_efficiency_pct = Column(Float)   # SIMULATED/ESTIMATED
    thermal_stress_index = Column(Float)        # 0–1 SIMULATED
    lubrication_effectiveness = Column(Float)   # 0–1 SIMULATED
    fuel_quality_index = Column(Float)          # 0–1 SIMULATED
    volumetric_efficiency_pct = Column(Float)   # SIMULATED

    # Subsystem states
    subsystem_states = Column(JSON)             # {subsystem: state_dict}

    # Sync status
    sync_lag_ms = Column(Float, default=0.0)
    sync_quality = Column(Float, default=1.0)

    __table_args__ = (
        Index("ix_dts_engine_timestamp", "engine_id_fk", "timestamp"),
    )
