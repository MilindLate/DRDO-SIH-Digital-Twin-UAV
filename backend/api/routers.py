"""All FastAPI API routers."""

import uuid
import math
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import (
    Engine as EngineModel, UAV, Mission, TelemetryRecord, HealthRecord,
    FaultEvent, RULEstimate, MaintenanceRecord, AlertRecord, MLModel,
    FaultStatus, MaintenancePriority, MaintenanceStatus
)
from backend.models.schemas import (
    EngineOut, TelemetryOut, HealthOut, FaultOut, RULOut, MissionOut,
    MaintenanceOut, AlertOut, FleetEngineCard, MLModelOut
)
from backend.services.health_service import compute_engine_health, get_health_category
from backend.services.fault_service import FAULT_DEFINITIONS

# ─── Engines ─────────────────────────────────────────────────────────────────
engines_router = APIRouter()

@engines_router.get("/", response_model=List[EngineOut])
def list_engines(db: Session = Depends(get_db)):
    return db.query(EngineModel).all()

@engines_router.get("/{engine_id}", response_model=EngineOut)
def get_engine(engine_id: str, db: Session = Depends(get_db)):
    eng = db.query(EngineModel).filter(
        (EngineModel.engine_id == engine_id) | (EngineModel.id == engine_id)
    ).first()
    if not eng:
        raise HTTPException(404, "Engine not found")
    return eng


# ─── Telemetry ────────────────────────────────────────────────────────────────
telemetry_router = APIRouter()

@telemetry_router.get("/latest")
def get_latest_telemetry(
    engine_id: str = "ENG-001",
    db: Session = Depends(get_db)
):
    eng = db.query(EngineModel).filter(EngineModel.engine_id == engine_id).first()
    if not eng:
        # Return demo data
        return _demo_telemetry()
    rec = (db.query(TelemetryRecord)
           .filter(TelemetryRecord.engine_id_fk == eng.id)
           .order_by(TelemetryRecord.timestamp.desc())
           .first())
    if not rec:
        return _demo_telemetry()
    return _telemetry_to_dict(rec)

@telemetry_router.get("/history")
def get_telemetry_history(
    engine_id: str = "ENG-001",
    limit: int = Query(300, le=3000),
    minutes: int = Query(60, le=1440),
    db: Session = Depends(get_db)
):
    eng = db.query(EngineModel).filter(EngineModel.engine_id == engine_id).first()
    if not eng:
        return []
    since = datetime.utcnow() - timedelta(minutes=minutes)
    recs = (db.query(TelemetryRecord)
            .filter(
                TelemetryRecord.engine_id_fk == eng.id,
                TelemetryRecord.timestamp >= since
            )
            .order_by(TelemetryRecord.timestamp.desc())
            .limit(limit)
            .all())
    return [_telemetry_to_dict(r) for r in reversed(recs)]

@telemetry_router.get("/mission/{mission_id}")
def get_mission_telemetry(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(404, "Mission not found")
    recs = (db.query(TelemetryRecord)
            .filter(TelemetryRecord.mission_id_fk == mission.id)
            .order_by(TelemetryRecord.timestamp.asc())
            .all())
    return [_telemetry_to_dict(r) for r in recs]


def _telemetry_to_dict(r: TelemetryRecord) -> dict:
    return {
        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        "rpm": r.rpm, "cht_c": r.cht_c, "egt_c": r.egt_c,
        "oil_pressure_kpa": r.oil_pressure_kpa, "oil_temperature_c": r.oil_temperature_c,
        "fuel_flow_lph": r.fuel_flow_lph, "vibration_rms_g": r.vibration_rms_g,
        "battery_voltage_v": r.battery_voltage_v, "alternator_voltage_v": r.alternator_voltage_v,
        "throttle_pct": r.throttle_pct, "altitude_m": r.altitude_m,
        "ambient_temperature_c": r.ambient_temperature_c, "engine_load_pct": r.engine_load_pct,
        "torque_nm": r.torque_nm, "engine_state": r.engine_state,
        "mission_phase": r.mission_phase, "data_source": r.data_source,
        "vibration_x_g": r.vibration_x_g, "vibration_y_g": r.vibration_y_g,
        "vibration_z_g": r.vibration_z_g,
        "vibration_dominant_freq_hz": r.vibration_dominant_freq_hz,
        "injection_timing_deg": r.injection_timing_deg,
        "manifold_pressure_kpa": r.manifold_pressure_kpa,
        "fuel_pressure_kpa": r.fuel_pressure_kpa,
        "intake_temperature_c": r.intake_temperature_c,
        "current_a": r.current_a, "electrical_load_pct": r.electrical_load_pct,
        "fuel_quantity_l": r.fuel_quantity_l,
        "quality_flag": r.quality_flag,
    }


def _demo_telemetry() -> dict:
    """Fallback demo telemetry when no DB records exist."""
    import math, random
    t = datetime.utcnow()
    rpm = 4100 + random.uniform(-50, 50)
    load = 68 + random.uniform(-2, 2)
    return {
        "timestamp": t.isoformat(), "engine_state": "CRUISE", "mission_phase": "CRUISE",
        "data_source": "SIMULATOR",
        "rpm": round(rpm, 1), "torque_nm": round(85 + random.uniform(-2, 2), 2),
        "engine_load_pct": round(load, 1), "throttle_pct": 68.0,
        "fuel_flow_lph": round(10.5 + random.uniform(-0.2, 0.2), 3),
        "fuel_pressure_kpa": round(310 + random.uniform(-5, 5), 1),
        "injection_timing_deg": 27.0, "manifold_pressure_kpa": 71.2,
        "cht_c": round(168 + random.uniform(-3, 3), 1),
        "egt_c": round(620 + random.uniform(-10, 10), 1),
        "oil_temperature_c": round(88 + random.uniform(-1, 1), 1),
        "intake_temperature_c": round(32 + random.uniform(-1, 1), 1),
        "ambient_temperature_c": 8.0,
        "oil_pressure_kpa": round(342 + random.uniform(-5, 5), 1),
        "oil_flow_lpm": round(4.2 + random.uniform(-0.1, 0.1), 2),
        "battery_voltage_v": round(12.62 + random.uniform(-0.02, 0.02), 3),
        "alternator_voltage_v": round(14.18 + random.uniform(-0.05, 0.05), 3),
        "current_a": round(18.5 + random.uniform(-0.5, 0.5), 2),
        "electrical_load_pct": 42.0,
        "vibration_rms_g": round(0.18 + random.uniform(-0.01, 0.01), 4),
        "vibration_x_g": round(0.06 + random.uniform(-0.005, 0.005), 4),
        "vibration_y_g": round(0.08 + random.uniform(-0.005, 0.005), 4),
        "vibration_z_g": round(0.12 + random.uniform(-0.005, 0.005), 4),
        "vibration_dominant_freq_hz": round(rpm * 4 / 120, 1),
        "altitude_m": 2000.0, "humidity_pct": 58.0,
        "air_density_kgm3": 1.007, "fuel_quantity_l": 52.4,
        "quality_flag": 100,
    }


# ─── Health ───────────────────────────────────────────────────────────────────
health_router = APIRouter()

@health_router.get("/latest")
def get_latest_health(engine_id: str = "ENG-001", db: Session = Depends(get_db)):
    eng = db.query(EngineModel).filter(EngineModel.engine_id == engine_id).first()
    if not eng:
        return _demo_health()
    h = (db.query(HealthRecord)
         .filter(HealthRecord.engine_id_fk == eng.id)
         .order_by(HealthRecord.timestamp.desc())
         .first())
    if not h:
        return _demo_health()
    return _health_to_dict(h)

@health_router.get("/history")
def get_health_history(
    engine_id: str = "ENG-001",
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db)
):
    eng = db.query(EngineModel).filter(EngineModel.engine_id == engine_id).first()
    if not eng:
        return []
    recs = (db.query(HealthRecord)
            .filter(HealthRecord.engine_id_fk == eng.id)
            .order_by(HealthRecord.timestamp.desc())
            .limit(limit)
            .all())
    return [_health_to_dict(r) for r in reversed(recs)]


def _health_to_dict(h: HealthRecord) -> dict:
    return {
        "timestamp": h.timestamp.isoformat() if h.timestamp else None,
        "overall_health": h.overall_health,
        "mechanical_health": h.mechanical_health,
        "thermal_health": h.thermal_health,
        "lubrication_health": h.lubrication_health,
        "combustion_health": h.combustion_health,
        "fuel_system_health": h.fuel_system_health,
        "electrical_health": h.electrical_health,
        "sensor_health": h.sensor_health,
        "vibration_health": h.vibration_health,
        "degradation_rate": h.degradation_rate,
        "health_confidence": h.health_confidence,
        "major_contributors": h.major_contributors,
        "disclaimer": "DEMONSTRATION MODEL",
    }


def _demo_health() -> dict:
    import random
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "overall_health": round(82 + random.uniform(-2, 2), 2),
        "mechanical_health": round(88 + random.uniform(-2, 2), 2),
        "thermal_health": round(85 + random.uniform(-2, 2), 2),
        "lubrication_health": round(90 + random.uniform(-2, 2), 2),
        "combustion_health": round(83 + random.uniform(-2, 2), 2),
        "fuel_system_health": round(87 + random.uniform(-2, 2), 2),
        "electrical_health": round(95 + random.uniform(-1, 1), 2),
        "sensor_health": round(98 + random.uniform(-1, 1), 2),
        "vibration_health": round(91 + random.uniform(-2, 2), 2),
        "health_category": "HEALTHY",
        "degradation_rate": 0.012,
        "health_confidence": 0.91,
        "major_contributors": [],
        "disclaimer": "DEMONSTRATION MODEL",
    }


# ─── Faults ───────────────────────────────────────────────────────────────────
faults_router = APIRouter()

@faults_router.get("/")
def list_faults(
    engine_id: str = "ENG-001",
    status: Optional[str] = None,
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db)
):
    eng = db.query(EngineModel).filter(EngineModel.engine_id == engine_id).first()
    if not eng:
        return []
    q = db.query(FaultEvent).filter(FaultEvent.engine_id_fk == eng.id)
    if status:
        q = q.filter(FaultEvent.status == status)
    faults = q.order_by(FaultEvent.detection_timestamp.desc()).limit(limit).all()
    return [_fault_to_dict(f) for f in faults]

@faults_router.put("/{fault_id}/acknowledge")
def acknowledge_fault(fault_id: str, db: Session = Depends(get_db)):
    fault = db.query(FaultEvent).filter(FaultEvent.fault_id == fault_id).first()
    if not fault:
        raise HTTPException(404, "Fault not found")
    fault.status = FaultStatus.ACKNOWLEDGED
    fault.acknowledged_timestamp = datetime.utcnow()
    db.commit()
    return {"status": "acknowledged", "fault_id": fault_id}


def _fault_to_dict(f: FaultEvent) -> dict:
    return {
        "fault_id": f.fault_id, "fault_type": f.fault_type,
        "label": f.fault_label, "severity": f.severity,
        "status": f.status, "confidence": f.confidence,
        "affected_subsystem": f.affected_subsystem,
        "detection_timestamp": f.detection_timestamp.isoformat() if f.detection_timestamp else None,
        "evidence": f.evidence, "recommended_inspection": f.recommended_inspection,
        "disclaimer": "PROBABLE FAULT — Requires engineering confirmation",
    }


# ─── RUL ──────────────────────────────────────────────────────────────────────
rul_router = APIRouter()

@rul_router.get("/latest")
def get_latest_rul(engine_id: str = "ENG-001", db: Session = Depends(get_db)):
    eng = db.query(EngineModel).filter(EngineModel.engine_id == engine_id).first()
    if not eng:
        return _demo_rul()
    r = (db.query(RULEstimate)
         .filter(RULEstimate.engine_id_fk == eng.id)
         .order_by(RULEstimate.timestamp.desc())
         .first())
    if not r:
        return _demo_rul(eng.total_operating_hours)
    return {
        "rul_hours": r.rul_hours, "rul_lower_ci_hours": r.rul_lower_ci_hours,
        "rul_upper_ci_hours": r.rul_upper_ci_hours,
        "confidence_level": r.confidence_level, "model_confidence": r.model_confidence,
        "degradation_rate": r.degradation_rate,
        "estimated_hours_to_threshold": r.estimated_hours_to_threshold,
        "maintenance_threshold_pct": r.maintenance_threshold_pct,
        "rul_contributors": r.rul_contributors,
        "disclaimer": "SIMULATION-BASED ESTIMATE",
    }

@rul_router.get("/history")
def get_rul_history(engine_id: str = "ENG-001", limit: int = 100, db: Session = Depends(get_db)):
    eng = db.query(EngineModel).filter(EngineModel.engine_id == engine_id).first()
    if not eng:
        return []
    recs = (db.query(RULEstimate)
            .filter(RULEstimate.engine_id_fk == eng.id)
            .order_by(RULEstimate.timestamp.desc())
            .limit(limit).all())
    return [{"timestamp": r.timestamp.isoformat(), "rul_hours": r.rul_hours,
             "rul_lower": r.rul_lower_ci_hours, "rul_upper": r.rul_upper_ci_hours,
             "model_confidence": r.model_confidence} for r in reversed(recs)]


def _demo_rul(operating_hours: float = 350.0) -> dict:
    rul = max(0, 1500 - operating_hours) * 0.88
    return {
        "rul_hours": round(rul, 1),
        "rul_lower_ci_hours": round(rul * 0.85, 1),
        "rul_upper_ci_hours": round(rul * 1.15, 1),
        "confidence_level": 0.80, "model_confidence": 0.78,
        "degradation_rate": 0.012,
        "estimated_hours_to_threshold": round(rul * 0.65, 1),
        "maintenance_threshold_pct": 30.0,
        "rul_contributors": {"operating_hours": 0.5, "health_factor": 0.3, "thermal": 0.1, "vibration": 0.1},
        "disclaimer": "SIMULATION-BASED ESTIMATE — Not validated against real failure data",
    }


# ─── Missions ─────────────────────────────────────────────────────────────────
missions_router = APIRouter()

@missions_router.get("/")
def list_missions(limit: int = 20, db: Session = Depends(get_db)):
    missions = db.query(Mission).order_by(Mission.created_at.desc()).limit(limit).all()
    return [_mission_to_dict(m) for m in missions]

@missions_router.get("/{mission_id}")
def get_mission(mission_id: str, db: Session = Depends(get_db)):
    m = db.query(Mission).filter(
        (Mission.mission_id == mission_id) | (Mission.id == mission_id)
    ).first()
    if not m:
        raise HTTPException(404, "Mission not found")
    return _mission_to_dict(m)

@missions_router.get("/{mission_id}/replay")
def get_mission_replay(mission_id: str, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.mission_id == mission_id).first()
    if not mission:
        raise HTTPException(404, "Mission not found")
    recs = (db.query(TelemetryRecord)
            .filter(TelemetryRecord.mission_id_fk == mission.id)
            .order_by(TelemetryRecord.timestamp.asc()).all())
    faults = (db.query(FaultEvent)
              .filter(FaultEvent.mission_id_fk == mission.id)
              .order_by(FaultEvent.detection_timestamp.asc()).all())
    return {
        "mission": _mission_to_dict(mission),
        "telemetry": [_telemetry_to_dict(r) for r in recs],
        "fault_events": [_fault_to_dict(f) for f in faults],
        "total_records": len(recs),
    }


def _mission_to_dict(m: Mission) -> dict:
    return {
        "id": m.id, "mission_id": m.mission_id, "mission_type": m.mission_type,
        "description": m.description, "status": m.status,
        "start_timestamp": m.start_timestamp.isoformat() if m.start_timestamp else None,
        "end_timestamp": m.end_timestamp.isoformat() if m.end_timestamp else None,
        "actual_duration_hours": m.actual_duration_hours,
        "total_fuel_consumed_l": m.total_fuel_consumed_l,
        "fault_count": m.fault_count, "anomaly_count": m.anomaly_count,
        "warning_count": m.warning_count,
        "max_cht_c": m.max_cht_c, "max_egt_c": m.max_egt_c,
        "min_oil_pressure_kpa": m.min_oil_pressure_kpa,
        "max_vibration_rms_g": m.max_vibration_rms_g,
        "avg_rpm": m.avg_rpm, "distance_km": m.distance_km,
        "planned_altitude_m": m.planned_altitude_m,
        "ambient_temperature_c": m.ambient_temperature_c,
        "is_simulation": m.is_simulation, "is_demo": m.is_demo,
    }


# ─── Maintenance ──────────────────────────────────────────────────────────────
maintenance_router = APIRouter()

@maintenance_router.get("/")
def list_maintenance(engine_id: str = "ENG-001", db: Session = Depends(get_db)):
    eng = db.query(EngineModel).filter(EngineModel.engine_id == engine_id).first()
    if not eng:
        return []
    recs = (db.query(MaintenanceRecord)
            .filter(MaintenanceRecord.engine_id_fk == eng.id)
            .order_by(MaintenanceRecord.created_timestamp.desc())
            .limit(50).all())
    return [_maint_to_dict(r) for r in recs]

@maintenance_router.put("/{rec_id}/complete")
def complete_maintenance(rec_id: str, db: Session = Depends(get_db)):
    r = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == rec_id).first()
    if not r:
        raise HTTPException(404, "Record not found")
    r.status = MaintenanceStatus.COMPLETED
    r.completed_timestamp = datetime.utcnow()
    db.commit()
    return {"status": "completed"}


def _maint_to_dict(r: MaintenanceRecord) -> dict:
    return {
        "id": r.id, "recommendation_type": r.recommendation_type,
        "title": r.title, "description": r.description,
        "priority": r.priority, "status": r.status,
        "reason": r.reason, "affected_subsystem": r.affected_subsystem,
        "evidence": r.evidence,
        "estimated_remaining_hours": r.estimated_remaining_hours,
        "created_timestamp": r.created_timestamp.isoformat() if r.created_timestamp else None,
        "completed_timestamp": r.completed_timestamp.isoformat() if r.completed_timestamp else None,
        "disclaimer": "DEMONSTRATION MODEL — Not a certified maintenance instruction",
    }


# ─── Sensors ──────────────────────────────────────────────────────────────────
sensors_router = APIRouter()

@sensors_router.get("/status")
def get_sensor_status(engine_id: str = "ENG-001", db: Session = Depends(get_db)):
    """Return current sensor status (computed from latest telemetry)."""
    eng = db.query(EngineModel).filter(EngineModel.engine_id == engine_id).first()
    rec = None
    if eng:
        rec = (db.query(TelemetryRecord)
               .filter(TelemetryRecord.engine_id_fk == eng.id)
               .order_by(TelemetryRecord.timestamp.desc())
               .first())
    if not rec:
        rec_dict = _demo_telemetry()
    else:
        rec_dict = _telemetry_to_dict(rec)

    SENSOR_DEFS = [
        ("RPM_SENSOR", "rpm", "RPM", "rpm"),
        ("CHT_SENSOR", "cht_c", "CHT", "°C"),
        ("EGT_SENSOR", "egt_c", "EGT", "°C"),
        ("OIL_PRESSURE", "oil_pressure_kpa", "Oil Pressure", "kPa"),
        ("OIL_TEMP", "oil_temperature_c", "Oil Temperature", "°C"),
        ("FUEL_FLOW", "fuel_flow_lph", "Fuel Flow", "L/hr"),
        ("VIB_SENSOR", "vibration_rms_g", "Vibration RMS", "g"),
        ("BATT_VOLT", "battery_voltage_v", "Battery Voltage", "V"),
        ("ALT_VOLT", "alternator_voltage_v", "Alternator Voltage", "V"),
        ("ALT_SENSOR", "altitude_m", "Altitude", "m"),
        ("AMBIENT_TEMP", "ambient_temperature_c", "Ambient Temperature", "°C"),
        ("THROTTLE_POS", "throttle_pct", "Throttle Position", "%"),
    ]

    import random, math
    ts = datetime.utcnow().isoformat()
    sensors = []
    for sid, param, name, unit in SENSOR_DEFS:
        val = rec_dict.get(param)
        sensors.append({
            "sensor_id": sid, "sensor_name": name, "parameter": param,
            "current_value": val, "unit": unit,
            "quality_score": round(random.uniform(96, 100), 1),
            "data_rate_hz": 1.0,
            "last_update": ts,
            "status": "OK",
            "confidence": round(random.uniform(0.95, 1.0), 3),
            "is_outlier": False, "is_frozen": False, "is_drifting": False,
        })
    return sensors


# ─── ML Models ────────────────────────────────────────────────────────────────
models_router = APIRouter()

@models_router.get("/")
def list_ml_models(db: Session = Depends(get_db)):
    from backend.services.ml_service import ml_service
    return ml_service.get_registry()


# ─── Fleet ────────────────────────────────────────────────────────────────────
fleet_router = APIRouter()

@fleet_router.get("/")
def get_fleet(db: Session = Depends(get_db)):
    uavs = db.query(UAV).all()
    cards = []
    for uav in uavs:
        for eng in uav.engines:
            # Latest health
            h = (db.query(HealthRecord)
                 .filter(HealthRecord.engine_id_fk == eng.id)
                 .order_by(HealthRecord.timestamp.desc()).first())
            overall_health = h.overall_health if h else 85.0

            # Latest RUL
            rul = (db.query(RULEstimate)
                   .filter(RULEstimate.engine_id_fk == eng.id)
                   .order_by(RULEstimate.timestamp.desc()).first())
            rul_hours = rul.rul_hours if rul else max(0, 1500 - eng.total_operating_hours) * 0.88

            # Active faults
            fault_count = db.query(FaultEvent).filter(
                FaultEvent.engine_id_fk == eng.id,
                FaultEvent.status == "ACTIVE"
            ).count()

            # Latest telemetry
            latest_t = (db.query(TelemetryRecord)
                        .filter(TelemetryRecord.engine_id_fk == eng.id)
                        .order_by(TelemetryRecord.timestamp.desc()).first())

            cards.append({
                "uav_id": uav.uav_id, "engine_id": eng.engine_id,
                "uav_status": uav.status, "engine_state": eng.current_state,
                "overall_health": round(overall_health, 1),
                "rul_hours": round(rul_hours, 0),
                "active_fault_count": fault_count,
                "last_telemetry": latest_t.timestamp.isoformat() if latest_t else None,
                "total_operating_hours": round(eng.total_operating_hours, 1),
                "maintenance_pending": db.query(MaintenanceRecord).filter(
                    MaintenanceRecord.engine_id_fk == eng.id,
                    MaintenanceRecord.status == "PENDING"
                ).count() > 0,
            })
    return cards


# ─── Alerts ───────────────────────────────────────────────────────────────────
alerts_router = APIRouter()

@alerts_router.get("/")
def list_alerts(engine_id: str = "ENG-001", limit: int = 50, db: Session = Depends(get_db)):
    eng = db.query(EngineModel).filter(EngineModel.engine_id == engine_id).first()
    if not eng:
        return []
    alerts = (db.query(AlertRecord)
              .filter(AlertRecord.engine_id_fk == eng.id)
              .order_by(AlertRecord.timestamp.desc())
              .limit(limit).all())
    return [_alert_to_dict(a) for a in alerts]

@alerts_router.put("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(AlertRecord).filter(AlertRecord.id == alert_id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.acknowledged = True
    alert.acknowledged_timestamp = datetime.utcnow()
    db.commit()
    return {"status": "acknowledged"}


def _alert_to_dict(a: AlertRecord) -> dict:
    return {
        "id": a.id, "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        "alert_type": a.alert_type, "parameter": a.parameter,
        "message": a.message, "current_value": a.current_value,
        "expected_range_min": a.expected_range_min,
        "expected_range_max": a.expected_range_max,
        "affected_subsystem": a.affected_subsystem,
        "recommended_action": a.recommended_action,
        "acknowledged": a.acknowledged,
    }


# ─── Demo ─────────────────────────────────────────────────────────────────────
demo_router = APIRouter()

@demo_router.post("/start")
async def start_demo():
    from backend.telemetry.stream import get_stream
    stream = get_stream()
    if stream:
        stream.start_demo()
        return {"status": "demo_started", "message": "ISR Endurance demo mission started"}
    return {"status": "error", "message": "Stream not initialized"}

@demo_router.get("/status")
def demo_status():
    from backend.telemetry.stream import get_stream
    stream = get_stream()
    return {
        "demo_running": stream._demo_mode if stream else False,
        "stream_running": stream.is_running if stream else False,
    }

@demo_router.post("/stop")
async def stop_demo():
    from backend.telemetry.stream import get_stream
    stream = get_stream()
    if stream:
        stream._demo_mode = False
        if stream._simulator:
            stream._simulator._demo_running = False
    return {"status": "demo_stopped"}


# ─── Simulation ───────────────────────────────────────────────────────────────
simulation_router = APIRouter()

@simulation_router.post("/run")
async def run_simulation(config: dict):
    """Run a mission simulation and return predicted telemetry."""
    from simulator.engine_model.simulator import EngineSimulator, MissionPhaseConfig
    import json

    mission_type = config.get("mission_type", "ISR_ENDURANCE")
    duration_h = config.get("duration_hours", 6.0)
    altitude_m = config.get("altitude_m", 2000.0)
    ambient_temp_c = config.get("ambient_temperature_c", 15.0)
    humidity_pct = config.get("humidity_pct", 60.0)

    # Build simple profile
    profile = [
        MissionPhaseConfig("ENGINE_START", 60, 900, 10, 0, ambient_temp_c, humidity_pct, 20),
        MissionPhaseConfig("CLIMB", 600, 4800, 82, altitude_m * 0.5, ambient_temp_c, humidity_pct, 50),
        MissionPhaseConfig("CRUISE", duration_h * 3600 * 0.7, 4200, 70, altitude_m, ambient_temp_c, humidity_pct, 45),
        MissionPhaseConfig("DESCENT", 600, 3500, 40, altitude_m * 0.1, ambient_temp_c, humidity_pct, 35),
        MissionPhaseConfig("LANDING", 120, 2000, 25, 0, ambient_temp_c, humidity_pct, 30),
    ]

    sim = EngineSimulator(dt=60.0)  # 60s steps for simulation
    records = []
    for rec in sim.run_mission_profile(profile):
        records.append(rec)
        if len(records) > 500:
            break

    # Extract summary stats
    cht_vals = [r["cht_c"] for r in records if r.get("cht_c")]
    egt_vals = [r["egt_c"] for r in records if r.get("egt_c")]
    fuel_vals = [r["fuel_quantity_l"] for r in records if r.get("fuel_quantity_l")]

    return {
        "status": "complete",
        "total_steps": len(records),
        "predicted_max_cht": round(max(cht_vals), 1) if cht_vals else None,
        "predicted_max_egt": round(max(egt_vals), 1) if egt_vals else None,
        "predicted_fuel_consumed": round(
            (fuel_vals[0] - fuel_vals[-1]) if fuel_vals else 0, 1
        ),
        "sample_telemetry": records[::max(1, len(records) // 50)],  # 50 sample points
        "disclaimer": "SIMULATED PREDICTION — Not validated against real engine data",
    }

@simulation_router.get("/status")
def simulation_status():
    from backend.telemetry.stream import telemetry_stream
    return {
        "stream_running": telemetry_stream.is_running,
        "demo_mode": telemetry_stream._demo_mode,
    }

# ─────────────────────────────────────────────────────────────────────────────
# Shared helper: get latest telemetry dict from DB
# ─────────────────────────────────────────────────────────────────────────────
def _get_latest_telemetry_dict(db: Session, engine_id: str = "ENG-001") -> dict:
    """Fetch the most recent telemetry record as a plain dict with only numeric values."""
    NOMINAL_TELEMETRY = {
        "rpm": 4000.0, "cht_c": 160.0, "egt_c": 550.0,
        "oil_pressure_kpa": 340.0, "oil_temperature_c": 85.0,
        "fuel_flow_lph": 12.0, "vibration_rms_g": 0.15,
        "engine_load_pct": 60.0, "throttle_pct": 65.0,
        "battery_voltage_v": 13.8, "alternator_voltage_v": 14.1,
        "altitude_m": 2000.0, "ambient_temperature_c": 15.0,
    }
    try:
        rec = (
            db.query(TelemetryRecord)
            .order_by(TelemetryRecord.timestamp.desc())
            .first()
        )
        if rec:
            result = {}
            for c in TelemetryRecord.__table__.columns:
                val = getattr(rec, c.name, None)
                if val is None:
                    continue
                # Only include numeric values, skip datetime, string, None
                if isinstance(val, (int, float)):
                    result[c.name] = float(val)
                elif isinstance(val, str) and c.name not in ("engine_state", "mission_phase", "data_source", "quality_flag"):
                    pass  # skip non-numeric strings
            # Map FK column names to the names expected by physics model
            result.setdefault("engine_load_pct", result.pop("engine_load_pct", NOMINAL_TELEMETRY["engine_load_pct"]))
            return result
        return NOMINAL_TELEMETRY
    except Exception:
        return NOMINAL_TELEMETRY





# ─────────────────────────────────────────────────────────────────────────────
# PHYSICS-INFORMED AI ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
pinn_router = APIRouter(prefix="/api/ml", tags=["Physics-Informed AI"])

@pinn_router.get("/physics-residuals")
def get_physics_residuals(db: Session = Depends(get_db)):
    """
    Compute physics constraint residuals for current telemetry.
    Returns how much the current engine state violates known physical laws.
    """
    try:
        from ml.pinn.physics_informed_model import physics_constraints
        telemetry = _get_latest_telemetry_dict(db)
        return physics_constraints.compute_all_residuals(telemetry)
    except Exception as e:
        return {"status": "error", "detail": str(e), "violated_laws": [], "composite_residual": 0.0}

@pinn_router.get("/pinn-anomaly")
def get_pinn_anomaly(db: Session = Depends(get_db)):
    """
    Get Physics-Informed anomaly score (ML + physics residuals combined).
    """
    try:
        from ml.pinn.physics_informed_model import pinn_analyzer
        telemetry = _get_latest_telemetry_dict(db)
        ml_score = 0.0
        try:
            from backend.services.ml_service import ml_service
            result = ml_service.analyze(telemetry)
            ml_score = result.get("anomaly_score", 0.0)
        except Exception:
            pass
        return pinn_analyzer.combined_anomaly_score(ml_score, telemetry)
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@pinn_router.get("/physics-rul")
def get_physics_rul(db: Session = Depends(get_db)):
    """
    Get Physics-Informed RUL estimate using Arrhenius thermal aging + Miner's Rule fatigue.
    """
    try:
        from ml.pinn.physics_informed_model import physics_rul
        telemetry = _get_latest_telemetry_dict(db)
        # Try to get operating hours from RUL records, fall back to 500h default
        op_hours = 500.0
        try:
            from backend.database.models import RULRecord
            rul_rec = db.query(RULRecord).order_by(RULRecord.timestamp.desc()).first()
            if rul_rec and hasattr(rul_rec, 'operating_hours'):
                op_hours = float(rul_rec.operating_hours or 500.0)
        except Exception:
            pass
        result = physics_rul.estimate_rul(
            operating_hours=op_hours,
            overall_health=80.0,
            cht_c=float(telemetry.get("cht_c", 150.0)),
            vibration_rms_g=float(telemetry.get("vibration_rms_g", 0.15)),
            rpm=float(telemetry.get("rpm", 4000.0)),
        )
        return result
    except Exception as e:
        return {"status": "error", "detail": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# EXPLAINABLE AI ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
xai_router = APIRouter(prefix="/api/xai", tags=["Explainable AI"])

@xai_router.get("/explain-fault/{fault_type}")
def explain_fault(fault_type: str, confidence: float = 0.75, db: Session = Depends(get_db)):
    """
    Get XAI explanation for a specific fault diagnosis.
    Returns top features, supporting evidence, counterfactual, and maintenance rationale.
    """
    try:
        from ml.xai.fault_explainer import fault_explainer
        telemetry = _get_latest_telemetry_dict(db)
        return fault_explainer.explain_fault(fault_type.upper(), telemetry, confidence)
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@xai_router.get("/explain-anomaly")
def explain_anomaly(anomaly_score: float = 0.5, db: Session = Depends(get_db)):
    """
    Get XAI explanation for anomaly detection result.
    Returns ranked anomalous features and their contributions.
    """
    try:
        from ml.xai.fault_explainer import fault_explainer
        telemetry = _get_latest_telemetry_dict(db)
        return fault_explainer.explain_anomaly(anomaly_score, telemetry)
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@xai_router.get("/maintenance-rationale/{fault_type}")
def get_maintenance_rationale_xai(fault_type: str, confidence: float = 0.75,
                                   db: Session = Depends(get_db)):
    """Get maintenance recommendation rationale with physical explanation."""
    try:
        from ml.xai.fault_explainer import fault_explainer
        telemetry = _get_latest_telemetry_dict(db)
        return fault_explainer.generate_maintenance_rationale(
            fault_type.upper(), confidence, telemetry
        )
    except Exception as e:
        return {"status": "error", "detail": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# EDGE DEPLOYMENT ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
edge_router = APIRouter(prefix="/api/edge", tags=["Edge AI Deployment"])

@edge_router.get("/status")
def get_edge_status():
    """System resource usage and deployment readiness check."""
    try:
        from backend.edge.edge_deployer import edge_manager
        return edge_manager.assess_readiness()
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@edge_router.get("/report")
def get_edge_report():
    """Full edge deployment report including model benchmarks and recommendations."""
    try:
        from backend.edge.edge_deployer import edge_manager
        return edge_manager.generate_deployment_report()
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@edge_router.get("/dockerfile")
def get_dockerfile():
    """Get production-ready Dockerfile for edge deployment."""
    try:
        from backend.edge.edge_deployer import edge_manager
        return {"dockerfile": edge_manager.generate_dockerfile()}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@edge_router.get("/systemd-service")
def get_systemd_service():
    """Get systemd service file for auto-start on embedded Linux GCS hardware."""
    try:
        from backend.edge.edge_deployer import edge_manager
        return {"service_file": edge_manager.generate_systemd_service()}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@edge_router.get("/can-status")
def get_can_status():
    """CAN bus interface status, mode, and message statistics."""
    try:
        from backend.interfaces.can_interface import can_dal
        return can_dal.get_status()
    except Exception as e:
        return {"status": "error", "detail": str(e)}


