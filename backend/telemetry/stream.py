"""Real-time telemetry streaming background task."""

import asyncio
import logging
import sys, os
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.telemetry.websocket_manager import ws_manager
from backend.services.health_service import compute_engine_health
from backend.services.fault_service import fault_detector
from backend.database.connection import db_session
from backend.database.models import TelemetryRecord, HealthRecord, FaultEvent, AlertRecord, DigitalTwinState
from simulator.engine_model.simulator import RealtimeSimulator

logger = logging.getLogger(__name__)

# In-memory rolling state for analytics
_health_history: list = []
_rpm_history: list = []
_egt_history: list = []
_operating_hours: float = 0.0
_fault_count: int = 0


class TelemetryStream:
    def __init__(self, update_rate_hz: float = 1.0):
        self._rate = update_rate_hz
        self._running = False
        self._demo_mode = False
        self._engine_id = "ENG-001"
        self._mission_id = "MIS-LIVE-001"
        self._simulator = RealtimeSimulator(uav_id="UAV-001", engine_id="ENG-001")
        self._simulator.state.fuel_quantity_l = 80.0

    @property
    def is_running(self) -> bool:
        return self._running

    def start_demo(self):
        self._demo_mode = True
        self._simulator.start_demo()
        logger.info("Demo mode started")

    def stop(self):
        self._running = False

    async def run(self):
        global _operating_hours, _fault_count
        self._running = True
        interval = 1.0 / self._rate
        logger.info(f"Telemetry stream running at {self._rate} Hz")

        # Default running state
        self._simulator.set_inputs(
            rpm=3800.0, throttle_pct=65.0, altitude_m=1500.0,
            ambient_temperature_c=18.0, humidity_pct=60.0,
            engine_state="CRUISE", mission_phase="CRUISE",
            electrical_load_pct=40.0,
        )

        while self._running:
            try:
                loop_start = asyncio.get_event_loop().time()

                # Generate telemetry (next() handles both demo and freerun)
                record = self._simulator.next()

                _operating_hours += interval / 3600.0

                # Update rolling histories
                if record.get("rpm"):
                    _rpm_history.append(record["rpm"])
                    if len(_rpm_history) > 300:
                        _rpm_history.pop(0)
                if record.get("egt_c"):
                    _egt_history.append(record["egt_c"])
                    if len(_egt_history) > 300:
                        _egt_history.pop(0)

                # Compute health
                health = compute_engine_health(record, _rpm_history, _egt_history)
                _health_history.append(health["overall_health"])
                if len(_health_history) > 3600:
                    _health_history.pop(0)

                # Fault detection
                faults = fault_detector.detect_faults(record, 0.0)
                _fault_count = len([f for f in faults if f.get("severity") in ("WARNING", "CRITICAL")])

                # Persist to DB (non-blocking, best-effort)
                asyncio.create_task(self._persist(record, health, faults))

                # Build WebSocket message
                ws_payload = {
                    "type": "telemetry",
                    "timestamp": datetime.utcnow().isoformat(),
                    "data": {
                        "telemetry": record,
                        "health": health,
                        "faults": faults,
                        "operating_hours": round(_operating_hours, 4),
                        "demo_mode": self._demo_mode,
                    }
                }
                await ws_manager.broadcast(ws_payload)

                # Sleep for remainder of interval
                elapsed = asyncio.get_event_loop().time() - loop_start
                sleep_time = max(0.0, interval - elapsed)
                await asyncio.sleep(sleep_time)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Stream error: {e}", exc_info=True)
                await asyncio.sleep(1.0)

        self._running = False
        logger.info("Telemetry stream stopped")

    async def _persist(self, record: dict, health: dict, faults: list):
        """Persist telemetry, health, and fault records to database."""
        try:
            with db_session() as db:
                # Find engine
                eng = db.query(__import__(
                    "backend.database.models", fromlist=["Engine"]
                ).Engine).filter_by(engine_id=self._engine_id).first()
                if not eng:
                    return

                ts = datetime.fromisoformat(record["timestamp"]) if "timestamp" in record else datetime.utcnow()

                # Save telemetry
                t = TelemetryRecord(
                    timestamp=ts,
                    engine_id_fk=eng.id,
                    rpm=record.get("rpm"),
                    cht_c=record.get("cht_c"),
                    egt_c=record.get("egt_c"),
                    oil_pressure_kpa=record.get("oil_pressure_kpa"),
                    oil_temperature_c=record.get("oil_temperature_c"),
                    fuel_flow_lph=record.get("fuel_flow_lph"),
                    vibration_rms_g=record.get("vibration_rms_g"),
                    battery_voltage_v=record.get("battery_voltage_v"),
                    alternator_voltage_v=record.get("alternator_voltage_v"),
                    throttle_pct=record.get("throttle_pct"),
                    altitude_m=record.get("altitude_m"),
                    ambient_temperature_c=record.get("ambient_temperature_c"),
                    engine_load_pct=record.get("engine_load_pct"),
                    torque_nm=record.get("torque_nm"),
                    engine_state=record.get("engine_state"),
                    mission_phase=record.get("mission_phase"),
                    data_source="SIMULATOR",
                )
                db.add(t)

                # Save health every 10s (every 10th record)
                import time
                if int(time.time()) % 10 == 0:
                    h = HealthRecord(
                        timestamp=ts,
                        engine_id_fk=eng.id,
                        overall_health=health.get("overall_health"),
                        mechanical_health=health.get("mechanical_health"),
                        thermal_health=health.get("thermal_health"),
                        lubrication_health=health.get("lubrication_health"),
                        combustion_health=health.get("combustion_health"),
                        fuel_system_health=health.get("fuel_system_health"),
                        electrical_health=health.get("electrical_health"),
                        sensor_health=health.get("sensor_health"),
                        vibration_health=health.get("vibration_health"),
                        health_confidence=health.get("health_confidence"),
                        major_contributors=health.get("major_contributors"),
                        health_weights=health.get("health_weights"),
                    )
                    db.add(h)
        except Exception as e:
            logger.debug(f"Persist error (non-critical): {e}")


# Global stream reference for demo API
_stream_instance: TelemetryStream = None


def get_stream() -> TelemetryStream:
    return _stream_instance
