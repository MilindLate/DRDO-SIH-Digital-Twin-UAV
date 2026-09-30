"""Pydantic schemas for API requests and responses."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class HealthCategory(str, Enum):
    EXCELLENT = "EXCELLENT"
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    POOR = "POOR"
    CRITICAL = "CRITICAL"


class FaultSeverity(str, Enum):
    INFO = "INFO"
    ADVISORY = "ADVISORY"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class TelemetryOut(BaseModel):
    timestamp: str
    uav_id: Optional[str] = None
    engine_id: Optional[str] = None
    mission_id: Optional[str] = None
    rpm: Optional[float] = None
    torque_nm: Optional[float] = None
    engine_load_pct: Optional[float] = None
    throttle_pct: Optional[float] = None
    fuel_flow_lph: Optional[float] = None
    fuel_pressure_kpa: Optional[float] = None
    injection_timing_deg: Optional[float] = None
    manifold_pressure_kpa: Optional[float] = None
    cht_c: Optional[float] = None
    egt_c: Optional[float] = None
    oil_temperature_c: Optional[float] = None
    intake_temperature_c: Optional[float] = None
    ambient_temperature_c: Optional[float] = None
    oil_pressure_kpa: Optional[float] = None
    oil_flow_lpm: Optional[float] = None
    battery_voltage_v: Optional[float] = None
    alternator_voltage_v: Optional[float] = None
    current_a: Optional[float] = None
    electrical_load_pct: Optional[float] = None
    vibration_rms_g: Optional[float] = None
    vibration_x_g: Optional[float] = None
    vibration_y_g: Optional[float] = None
    vibration_z_g: Optional[float] = None
    vibration_dominant_freq_hz: Optional[float] = None
    altitude_m: Optional[float] = None
    humidity_pct: Optional[float] = None
    air_density_kgm3: Optional[float] = None
    fuel_quantity_l: Optional[float] = None
    engine_state: Optional[str] = None
    mission_phase: Optional[str] = None
    data_source: Optional[str] = "SIMULATOR"
    quality_flag: Optional[int] = 100
    fault_type: Optional[str] = "NORMAL"

    class Config:
        from_attributes = True


class HealthOut(BaseModel):
    timestamp: Optional[str] = None
    overall_health: Optional[float] = None
    mechanical_health: Optional[float] = None
    thermal_health: Optional[float] = None
    lubrication_health: Optional[float] = None
    combustion_health: Optional[float] = None
    fuel_system_health: Optional[float] = None
    electrical_health: Optional[float] = None
    sensor_health: Optional[float] = None
    vibration_health: Optional[float] = None
    health_category: Optional[str] = None
    degradation_rate: Optional[float] = None
    health_confidence: Optional[float] = None
    major_contributors: Optional[List[Dict]] = None
    disclaimer: str = "DEMONSTRATION MODEL"

    class Config:
        from_attributes = True


class FaultOut(BaseModel):
    fault_id: Optional[str] = None
    fault_type: str
    label: Optional[str] = None
    severity: str
    status: Optional[str] = "ACTIVE"
    confidence: Optional[float] = None
    affected_subsystem: Optional[str] = None
    detection_timestamp: Optional[str] = None
    evidence: Optional[List[Dict]] = None
    recommended_inspection: Optional[str] = None
    disclaimer: str = "PROBABLE FAULT — Requires engineering confirmation"

    class Config:
        from_attributes = True


class RULOut(BaseModel):
    rul_hours: Optional[float] = None
    rul_lower_ci_hours: Optional[float] = None
    rul_upper_ci_hours: Optional[float] = None
    confidence_level: float = 0.80
    model_confidence: Optional[float] = None
    degradation_rate_pct_per_h: Optional[float] = None
    estimated_hours_to_threshold: Optional[float] = None
    maintenance_threshold_pct: float = 30.0
    factors: Optional[Dict] = None
    disclaimer: str = "SIMULATION-BASED ESTIMATE — Not validated against real failure data"

    class Config:
        from_attributes = True


class MissionOut(BaseModel):
    id: str
    mission_id: str
    mission_type: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_timestamp: Optional[datetime] = None
    end_timestamp: Optional[datetime] = None
    actual_duration_hours: Optional[float] = None
    total_fuel_consumed_l: Optional[float] = None
    fault_count: Optional[int] = 0
    anomaly_count: Optional[int] = 0
    max_cht_c: Optional[float] = None
    max_egt_c: Optional[float] = None
    min_oil_pressure_kpa: Optional[float] = None
    max_vibration_rms_g: Optional[float] = None

    class Config:
        from_attributes = True


class MaintenanceOut(BaseModel):
    id: str
    recommendation_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    reason: Optional[str] = None
    affected_subsystem: Optional[str] = None
    evidence: Optional[List[Dict]] = None
    estimated_remaining_hours: Optional[float] = None
    created_timestamp: Optional[datetime] = None
    disclaimer: str = "DEMONSTRATION MODEL — Not a certified maintenance instruction"

    class Config:
        from_attributes = True


class EngineOut(BaseModel):
    id: str
    engine_id: str
    model: Optional[str] = None
    cylinders: Optional[int] = None
    displacement_cc: Optional[float] = None
    total_operating_hours: Optional[float] = None
    mission_count: Optional[int] = None
    tbo_hours: Optional[float] = None
    current_state: Optional[str] = None

    class Config:
        from_attributes = True


class UAVOut(BaseModel):
    id: str
    uav_id: str
    name: Optional[str] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: str
    timestamp: Optional[datetime] = None
    alert_type: Optional[str] = None
    parameter: Optional[str] = None
    message: Optional[str] = None
    current_value: Optional[float] = None
    expected_range_min: Optional[float] = None
    expected_range_max: Optional[float] = None
    affected_subsystem: Optional[str] = None
    recommended_action: Optional[str] = None
    acknowledged: bool = False

    class Config:
        from_attributes = True


class FleetEngineCard(BaseModel):
    uav_id: str
    engine_id: str
    uav_status: Optional[str] = None
    engine_state: Optional[str] = None
    overall_health: Optional[float] = None
    rul_hours: Optional[float] = None
    active_fault_count: int = 0
    last_telemetry: Optional[str] = None
    total_operating_hours: Optional[float] = None
    maintenance_pending: bool = False


class MLModelOut(BaseModel):
    model_name: str
    model_version: str
    model_type: Optional[str] = None
    algorithm: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    training_samples: Optional[int] = None
    training_timestamp: Optional[str] = None
    features: Optional[List[str]] = None
    metrics: Optional[Dict] = None
    disclaimer: str = "DEMONSTRATION MODEL"

    class Config:
        from_attributes = True


class WebSocketMessage(BaseModel):
    type: str
    timestamp: str
    data: Dict[str, Any]


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    pages: int
