"""
Database seeding service — creates demo UAVs, engines, and historical missions.
All seeded data is SYNTHETIC/SIMULATED.
"""

import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)


async def seed_if_empty():
    """Seed DB only if empty."""
    try:
        from backend.database.connection import db_session
        from backend.database.models import UAV
        with db_session() as db:
            if db.query(UAV).count() == 0:
                logger.info("Database empty — seeding demo data...")
                await seed_database()
            else:
                logger.info("Database already contains data — skipping seed")
    except Exception as e:
        logger.error(f"Seed check error: {e}")


async def seed_database():
    """Create full demo dataset."""
    from backend.database.connection import db_session
    from backend.database.models import (
        UAV, Engine as EngineModel, Mission, TelemetryRecord, HealthRecord,
        FaultEvent, RULEstimate, MaintenanceRecord, MLModel,
        UAVStatus, EngineState as DBEngineState, FaultSeverity, FaultStatus,
        MaintenancePriority, MaintenanceStatus
    )
    from simulator.engine_model.simulator import EngineSimulator, ISR_ENDURANCE_PROFILE, DatasetGenerator
    from backend.services.health_service import compute_engine_health

    with db_session() as db:
        # ── UAVs ──────────────────────────────────────────────────────────
        uavs_data = [
            {"uav_id": "UAV-001", "name": "Falcon-Alpha", "status": UAVStatus.OPERATIONAL},
            {"uav_id": "UAV-002", "name": "Falcon-Bravo", "status": UAVStatus.STANDBY},
            {"uav_id": "UAV-003", "name": "Falcon-Charlie", "status": UAVStatus.MAINTENANCE},
        ]
        uav_objs = {}
        for u in uavs_data:
            uav = UAV(id=str(uuid.uuid4()), **u)
            db.add(uav)
            uav_objs[u["uav_id"]] = uav

        # ── Engines ───────────────────────────────────────────────────────
        engines_data = [
            {"engine_id": "ENG-001", "uav_id": "UAV-001", "total_operating_hours": 342.5, "mission_count": 18, "current_state": DBEngineState.IDLE},
            {"engine_id": "ENG-002", "uav_id": "UAV-002", "total_operating_hours": 890.0, "mission_count": 42, "current_state": DBEngineState.OFF},
            {"engine_id": "ENG-003", "uav_id": "UAV-003", "total_operating_hours": 1380.0, "mission_count": 71, "current_state": DBEngineState.MAINTENANCE},
        ]
        engine_objs = {}
        for e in engines_data:
            uav = uav_objs[e.pop("uav_id")]
            eng = EngineModel(
                id=str(uuid.uuid4()),
                uav_id_fk=uav.id,
                model="Generic Aero Piston Engine (Simulated)",
                cylinders=4, displacement_cc=2000.0,
                max_rpm_rated=5800.0, max_power_kw=75.0, tbo_hours=1500.0,
                **e
            )
            db.add(eng)
            engine_objs[eng.engine_id] = eng

        db.flush()

        # ── Historical Missions (fast generation at 30s intervals) ─────────
        scenarios = [
            ("MIS-NRM-001", "ENG-001", "ISR_ENDURANCE", "Normal ISR endurance mission", None),
            ("MIS-HOT-001", "ENG-001", "HOT_WEATHER",   "Hot weather endurance mission", None),
            ("MIS-INJ-001", "ENG-001", "ISR_ENDURANCE", "Injector degradation event",
             {"start_time_s": 3600, "fault_type": "INJECTOR_DEGRADATION", "max_severity": 0.65, "duration_s": 2400}),
            ("MIS-LUB-001", "ENG-002", "ISR_ENDURANCE", "Lubrication system degradation",
             {"start_time_s": 4200, "fault_type": "LUBRICATION_DEGRADATION", "max_severity": 0.55, "duration_s": 2000}),
            ("MIS-VIB-001", "ENG-002", "ISR_ENDURANCE", "Vibration anomaly mission",
             {"start_time_s": 2500, "fault_type": "MECHANICAL_WEAR", "max_severity": 0.7, "duration_s": 3000}),
            ("MIS-NRM-002", "ENG-001", "ISR_ENDURANCE", "Recent normal mission", None),
        ]

        gen = DatasetGenerator()
        for mid, eid, mtype, desc, fault_inj in scenarios:
            eng = engine_objs[eid]
            sim = EngineSimulator(uav_id="UAV-001", engine_id=eid, dt=30.0)
            sim.current_mission_id = mid

            from simulator.engine_model.simulator import ISR_ENDURANCE_PROFILE
            profile = ISR_ENDURANCE_PROFILE

            start_ts = datetime.utcnow() - timedelta(days=len(scenarios) - scenarios.index((mid, eid, mtype, desc, fault_inj)) * 3)

            mission = Mission(
                id=str(uuid.uuid4()), mission_id=mid,
                uav_id_fk=uav_objs["UAV-001"].id,
                engine_id_fk=eng.id,
                mission_type=mtype, description=desc,
                status="COMPLETE", start_timestamp=start_ts,
                ambient_temperature_c=38.0 if "HOT" in mtype else 15.0,
                humidity_pct=65.0, fuel_quantity_l=80.0,
                is_demo=False,
            )
            db.add(mission)
            db.flush()

            max_cht, max_egt, min_oil, max_vib, total_fuel = 0, 0, 9999, 0, 0
            rpm_sum, rpm_count = 0, 0
            records_added = 0
            prev_fuel = 80.0

            health_vals = []

            for i, rec in enumerate(sim.run_mission_profile(profile, fault_inj)):
                ts = start_ts + timedelta(seconds=i * 30)

                # Batch insert every 50 records
                t = TelemetryRecord(
                    id=str(uuid.uuid4()), timestamp=ts,
                    engine_id_fk=eng.id, mission_id_fk=mission.id,
                    rpm=rec.get("rpm"), cht_c=rec.get("cht_c"),
                    egt_c=rec.get("egt_c"), oil_pressure_kpa=rec.get("oil_pressure_kpa"),
                    oil_temperature_c=rec.get("oil_temperature_c"),
                    fuel_flow_lph=rec.get("fuel_flow_lph"),
                    vibration_rms_g=rec.get("vibration_rms_g"),
                    battery_voltage_v=rec.get("battery_voltage_v"),
                    alternator_voltage_v=rec.get("alternator_voltage_v"),
                    throttle_pct=rec.get("throttle_pct"), altitude_m=rec.get("altitude_m"),
                    ambient_temperature_c=rec.get("ambient_temperature_c"),
                    engine_load_pct=rec.get("engine_load_pct"),
                    torque_nm=rec.get("torque_nm"),
                    engine_state=rec.get("engine_state"),
                    mission_phase=rec.get("mission_phase"),
                    data_source="SIMULATOR",
                )
                db.add(t)

                # Track stats
                if rec.get("cht_c"): max_cht = max(max_cht, rec["cht_c"])
                if rec.get("egt_c"): max_egt = max(max_egt, rec["egt_c"])
                if rec.get("oil_pressure_kpa"): min_oil = min(min_oil, rec["oil_pressure_kpa"])
                if rec.get("vibration_rms_g"): max_vib = max(max_vib, rec["vibration_rms_g"])
                if rec.get("rpm"): rpm_sum += rec["rpm"]; rpm_count += 1
                if rec.get("fuel_quantity_l"): total_fuel = prev_fuel - rec["fuel_quantity_l"]

                # Health record every 10th entry
                if i % 10 == 0:
                    h = compute_engine_health(rec)
                    health_vals.append(h["overall_health"])
                    hr = HealthRecord(
                        id=str(uuid.uuid4()), timestamp=ts,
                        engine_id_fk=eng.id, mission_id_fk=mission.id,
                        overall_health=h["overall_health"],
                        mechanical_health=h["mechanical_health"],
                        thermal_health=h["thermal_health"],
                        lubrication_health=h["lubrication_health"],
                        combustion_health=h["combustion_health"],
                        fuel_system_health=h["fuel_system_health"],
                        electrical_health=h["electrical_health"],
                        sensor_health=h["sensor_health"],
                        vibration_health=h["vibration_health"],
                        health_confidence=h["health_confidence"],
                        major_contributors=h["major_contributors"],
                    )
                    db.add(hr)

                records_added += 1
                if records_added % 100 == 0:
                    db.flush()

            # Update mission summary
            mission.end_timestamp = start_ts + timedelta(seconds=records_added * 30)
            mission.actual_duration_hours = round(records_added * 30 / 3600, 2)
            mission.total_fuel_consumed_l = round(total_fuel, 1)
            mission.max_cht_c = round(max_cht, 1)
            mission.max_egt_c = round(max_egt, 1)
            mission.min_oil_pressure_kpa = round(min_oil if min_oil < 9999 else 320, 1)
            mission.max_vibration_rms_g = round(max_vib, 4)
            mission.avg_rpm = round(rpm_sum / max(1, rpm_count), 1)

            # Inject faults for degradation missions
            if fault_inj:
                fault_type = fault_inj["fault_type"]
                fdef = {
                    "INJECTOR_DEGRADATION": ("Possible Injector Degradation", "FUEL", FaultSeverity.WARNING, "Inspect fuel injectors for clogging or electrical faults."),
                    "LUBRICATION_DEGRADATION": ("Possible Lubrication Degradation", "LUBRICATION", FaultSeverity.WARNING, "Check oil level, filter, and pump. Inspect for leaks."),
                    "MECHANICAL_WEAR": ("Abnormal Vibration Detected", "MECHANICAL", FaultSeverity.ADVISORY, "Inspect engine mounts, propeller balance, and bearing condition."),
                }.get(fault_type, (fault_type, "UNKNOWN", FaultSeverity.ADVISORY, "Requires engineering inspection."))

                fe = FaultEvent(
                    id=str(uuid.uuid4()),
                    fault_id=f"FLT-{mission.mission_id}-001",
                    engine_id_fk=eng.id,
                    mission_id_fk=mission.id,
                    fault_type=fault_type,
                    fault_label=fdef[0],
                    severity=fdef[2],
                    status=FaultStatus.ACKNOWLEDGED,
                    detection_timestamp=start_ts + timedelta(seconds=fault_inj["start_time_s"]),
                    first_detected_timestamp=start_ts + timedelta(seconds=fault_inj["start_time_s"]),
                    confidence=0.78,
                    affected_subsystem=fdef[1],
                    evidence=[{"parameter": "anomaly_score", "observation": "Elevated anomaly score during fault period"}],
                    recommended_inspection=fdef[3],
                    detection_model="FaultClassifier",
                    model_version="v1.1",
                )
                db.add(fe)
                mission.fault_count = 1

                # Maintenance recommendation
                mr = MaintenanceRecord(
                    id=str(uuid.uuid4()),
                    engine_id_fk=eng.id,
                    mission_id_fk=mission.id,
                    recommendation_type=fault_type,
                    title=f"Inspect: {fdef[0]}",
                    description=f"Predictive maintenance recommendation based on anomaly detected in mission {mid}",
                    priority=MaintenancePriority.HIGH,
                    status=MaintenanceStatus.PENDING,
                    reason=fdef[0],
                    affected_subsystem=fdef[1],
                    evidence=[{"source": "ML_MODEL", "confidence": 0.78}],
                    estimated_remaining_hours=150.0,
                    disclaimer="DEMONSTRATION MODEL — Not a certified maintenance instruction",
                )
                db.add(mr)

            # RUL estimate at end of mission
            health_avg = sum(health_vals) / max(1, len(health_vals)) if health_vals else 85.0
            rul_val = max(0, 1500 - eng.total_operating_hours) * (health_avg / 100) ** 1.5
            rul_rec = RULEstimate(
                id=str(uuid.uuid4()),
                timestamp=mission.end_timestamp or datetime.utcnow(),
                engine_id_fk=eng.id,
                mission_id_fk=mission.id,
                rul_hours=round(rul_val, 1),
                rul_lower_ci_hours=round(rul_val * 0.85, 1),
                rul_upper_ci_hours=round(rul_val * 1.15, 1),
                confidence_level=0.80,
                model_confidence=0.78,
                degradation_rate=0.012,
                maintenance_threshold_pct=30.0,
                model_name="RULEstimator",
                model_version="v0.3",
            )
            db.add(rul_rec)
            db.flush()

        # ── ML Model Registry ─────────────────────────────────────────────
        for model_data in [
            {"model_name": "AnomalyDetector", "model_version": "v1.0", "model_type": "ANOMALY_DETECTION",
             "algorithm": "IsolationForest", "description": "Unsupervised anomaly detection",
             "training_dataset": "Synthetic — ISR endurance scenarios", "dataset_version": "v1.0",
             "training_timestamp": datetime.utcnow(), "is_active": True,
             "disclaimer": "DEMONSTRATION MODEL — synthetic training data"},
            {"model_name": "FaultClassifier", "model_version": "v1.1", "model_type": "FAULT_CLASSIFICATION",
             "algorithm": "RandomForestClassifier", "description": "Multi-class fault diagnosis",
             "training_dataset": "Synthetic — all fault scenarios", "dataset_version": "v1.0",
             "training_timestamp": datetime.utcnow(), "is_active": True,
             "disclaimer": "DEMONSTRATION MODEL — synthetic training data"},
            {"model_name": "RULEstimator", "model_version": "v0.3", "model_type": "RUL_ESTIMATION",
             "algorithm": "Physics-Informed Degradation Model",
             "description": "RUL estimation from health and exposure metrics",
             "training_dataset": "N/A — physics model", "dataset_version": "v1.0",
             "training_timestamp": datetime.utcnow(), "is_active": True,
             "disclaimer": "SIMULATION-BASED ESTIMATE — Not validated against real failure data"},
        ]:
            m = MLModel(id=str(uuid.uuid4()), **model_data)
            db.add(m)

    logger.info("Database seeded successfully")
