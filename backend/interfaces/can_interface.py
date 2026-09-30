"""
CAN Bus / Socket CAN Interface Module

Provides a hardware abstraction layer for CAN bus data acquisition from
ECU/FADEC systems typical in MALE UAV propulsion systems.

IMPLEMENTATION STATUS:
  - CAN frame parser:       IMPLEMENTED (handles SAE J1939 / custom PGN mapping)
  - SocketCAN driver:       IMPLEMENTED (uses python-can library)
  - Simulator adapter:      IMPLEMENTED (replaces CAN with simulated data)
  - Hardware integration:   ARCHITECTURE DEFINED — requires physical CAN hardware

HARDWARE SETUP FOR REAL DEPLOYMENT:
  1. Install CAN USB adapter (e.g., Peak PCAN-USB, Kvaser, CANable)
  2. modprobe can_raw
  3. ip link set can0 type can bitrate 500000
  4. ip link set up can0
  For virtual CAN testing:
  5. modprobe vcan && ip link add dev vcan0 type vcan && ip link set up vcan0

REFERENCES:
  - SAE J1939 — CAN protocol standard (public standard)
  - ISO 11898-1:2015 — CAN bus data link layer (public standard)
  - python-can documentation (MIT-licensed: github.com/hardbyte/python-can)
  - Linux SocketCAN documentation (kernel.org, public)

NOT FOR OPERATIONAL USE — DEMONSTRATION/RESEARCH PROTOTYPE ONLY
"""

import logging
import struct
import time
from dataclasses import dataclass, field
from typing import Dict, Optional, List, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CAN PGN → Telemetry Field Mapping  [CONFIGURABLE]
# Replace with actual ECU protocol documentation for your engine.
# ─────────────────────────────────────────────────────────────────────────────

PGN_MAP: Dict[int, Dict] = {
    0x0F004: {"name": "RPM",              "field": "rpm",                   "scale": 0.125, "offset": 0,       "unit": "RPM"},
    0x0F005: {"name": "CHT",              "field": "cht_c",                 "scale": 0.1,   "offset": -273.15, "unit": "°C"},
    0x0F006: {"name": "EGT",              "field": "egt_c",                 "scale": 0.1,   "offset": -273.15, "unit": "°C"},
    0x0F007: {"name": "OIL_PRESSURE",     "field": "oil_pressure_kpa",      "scale": 0.5,   "offset": 0,       "unit": "kPa"},
    0x0F008: {"name": "OIL_TEMP",         "field": "oil_temperature_c",     "scale": 0.1,   "offset": -273.15, "unit": "°C"},
    0x0F009: {"name": "FUEL_FLOW",        "field": "fuel_flow_lph",         "scale": 0.05,  "offset": 0,       "unit": "L/h"},
    0x0F00A: {"name": "FUEL_PRESSURE",    "field": "fuel_pressure_kpa",     "scale": 0.5,   "offset": 0,       "unit": "kPa"},
    0x0F00B: {"name": "THROTTLE_POS",     "field": "throttle_pct",          "scale": 0.4,   "offset": 0,       "unit": "%"},
    0x0F00C: {"name": "ENGINE_LOAD",      "field": "engine_load_pct",       "scale": 0.4,   "offset": 0,       "unit": "%"},
    0x0F00D: {"name": "BATTERY_VOLT",     "field": "battery_voltage_v",     "scale": 0.05,  "offset": 0,       "unit": "V"},
    0x0F00E: {"name": "ALT_VOLT",         "field": "alternator_voltage_v",  "scale": 0.05,  "offset": 0,       "unit": "V"},
    0x0F00F: {"name": "VIBRATION_RMS",    "field": "vibration_rms_g",       "scale": 0.001, "offset": 0,       "unit": "g"},
    0x0F010: {"name": "MANIFOLD_PRESS",   "field": "manifold_pressure_kpa", "scale": 0.5,   "offset": 0,       "unit": "kPa"},
    0x0F011: {"name": "INJ_TIMING",       "field": "injection_timing_deg",  "scale": 0.1,   "offset": -30,     "unit": "°BTDC"},
    0x0F012: {"name": "TORQUE",           "field": "torque_nm",             "scale": 0.1,   "offset": 0,       "unit": "N·m"},
    0x0F013: {"name": "INTAKE_TEMP",      "field": "intake_temperature_c",  "scale": 0.1,   "offset": -273.15, "unit": "°C"},
    0x0F014: {"name": "ALTITUDE",         "field": "altitude_m",            "scale": 1.0,   "offset": 0,       "unit": "m"},
    0x0F015: {"name": "AMBIENT_TEMP",     "field": "ambient_temperature_c", "scale": 0.1,   "offset": -273.15, "unit": "°C"},
    0x0F016: {"name": "FUEL_QTY",         "field": "fuel_quantity_l",       "scale": 0.05,  "offset": 0,       "unit": "L"},
    0x0F017: {"name": "ENGINE_STATE",     "field": "engine_state",          "scale": 1,     "offset": 0,       "unit": "enum"},
}

ENGINE_STATE_MAP = {0: "OFF", 1: "STARTING", 2: "IDLE", 3: "RUNNING", 4: "SHUTDOWN"}


@dataclass
class CANFrame:
    """Parsed CAN frame representation."""
    arbitration_id: int
    data: bytes
    timestamp: float = field(default_factory=time.time)
    is_extended_id: bool = True
    is_error_frame: bool = False


@dataclass
class CANInterfaceConfig:
    """CAN interface configuration. [CONFIGURABLE]"""
    channel: str = "can0"          # SocketCAN interface name
    bustype: str = "socketcan"     # python-can bustype
    bitrate: int = 500000          # 500 kbit/s standard
    data_rate: float = 10.0        # Expected message rate Hz
    timeout_s: float = 1.0         # Receive timeout
    use_simulator: bool = True     # True = simulator, False = real hardware


class CANFrameParser:
    """Decode raw CAN frames into telemetry field dictionaries via PGN map."""

    def parse(self, frame: CANFrame) -> Optional[Dict[str, Any]]:
        pgn = frame.arbitration_id & 0x3FFFF  # Extract PGN from J1939 29-bit ID
        mapping = PGN_MAP.get(pgn)
        if not mapping:
            return None
        try:
            if len(frame.data) < 2:
                return None
            raw = struct.unpack_from('<H', frame.data, 0)[0]
            if mapping["field"] == "engine_state":
                value = ENGINE_STATE_MAP.get(raw, "UNKNOWN")
            else:
                value = raw * mapping["scale"] + mapping["offset"]
            return {
                "field": mapping["field"],
                "value": value,
                "unit": mapping["unit"],
                "pgn": pgn,
                "timestamp": frame.timestamp,
            }
        except Exception as e:
            logger.debug(f"Parse error PGN 0x{pgn:05X}: {e}")
            return None


class SocketCANAdapter:
    """
    Real CAN hardware adapter via python-can / SocketCAN.
    
    Requires:
      pip install python-can
      Linux kernel with SocketCAN support (can_raw module)
      Physical CAN adapter (e.g., Peak PCAN-USB, Kvaser, CANable USB-to-CAN)
    """
    def __init__(self, config: CANInterfaceConfig):
        self.config = config
        self._bus = None
        self._connected = False

    def connect(self) -> bool:
        try:
            import can
            self._bus = can.Bus(
                channel=self.config.channel,
                bustype=self.config.bustype,
                bitrate=self.config.bitrate,
            )
            self._connected = True
            logger.info(f"CAN connected: {self.config.channel} @ {self.config.bitrate} bps")
            return True
        except ImportError:
            logger.warning("python-can not installed (pip install python-can)")
            return False
        except Exception as e:
            logger.warning(f"CAN hardware unavailable ({e}) — falling back to simulator")
            return False

    def disconnect(self):
        if self._bus:
            try:
                self._bus.shutdown()
            except Exception:
                pass
            self._connected = False

    def receive(self, timeout: float = 1.0) -> Optional[CANFrame]:
        if not self._connected or not self._bus:
            return None
        try:
            msg = self._bus.recv(timeout=timeout)
            if msg is None:
                return None
            return CANFrame(
                arbitration_id=msg.arbitration_id,
                data=bytes(msg.data),
                timestamp=msg.timestamp,
                is_extended_id=msg.is_extended_id,
                is_error_frame=msg.is_error_frame,
            )
        except Exception as e:
            logger.error(f"CAN receive error: {e}")
            return None

    @property
    def is_connected(self) -> bool:
        return self._connected


class CANDataAcquisitionLayer:
    """
    Main CAN data acquisition layer — hardware abstraction.

    Auto-selects between real CAN hardware or simulator adapter.

    Architecture:
      ECU/FADEC ──[CAN bus]──> USB CAN adapter ──[SocketCAN]──> CANFrameParser
                                                                        │
                                                               Telemetry dict
                                                                        │
                                                               Backend API / WS
    """
    def __init__(self, config: Optional[CANInterfaceConfig] = None):
        self.config = config or CANInterfaceConfig()
        self.parser = CANFrameParser()
        self._socket_adapter = SocketCANAdapter(self.config)
        self._use_hardware = False
        self._telemetry_buffer: Dict[str, Any] = {}
        self._message_count = 0
        self._error_count = 0
        self._last_update: Optional[datetime] = None

    def initialize(self) -> str:
        """Initialize CAN DAL. Returns 'hardware' or 'simulator'."""
        if not self.config.use_simulator:
            if self._socket_adapter.connect():
                self._use_hardware = True
                logger.info("CAN DAL initialized — HARDWARE mode")
                return "hardware"
        logger.info("CAN DAL initialized — SIMULATOR mode")
        return "simulator"

    def inject_simulated_telemetry(self, telemetry: Dict[str, Any]):
        """Inject from engine simulator (simulator mode only)."""
        self._telemetry_buffer = telemetry.copy()
        self._last_update = datetime.utcnow()
        self._message_count += 1

    def get_latest_telemetry(self) -> Dict[str, Any]:
        return self._telemetry_buffer.copy()

    def get_status(self) -> Dict[str, Any]:
        return {
            "mode": "hardware" if self._use_hardware else "simulator",
            "channel": self.config.channel,
            "bitrate_bps": self.config.bitrate,
            "protocol": "SAE J1939 / Custom PGN",
            "connected": self._socket_adapter.is_connected if self._use_hardware else True,
            "message_count": self._message_count,
            "error_count": self._error_count,
            "last_update": self._last_update.isoformat() if self._last_update else None,
            "pgn_definitions": len(PGN_MAP),
            "note": "Hardware CAN requires physical adapter + ECU. Simulator active by default.",
        }


# Module-level singleton
can_dal = CANDataAcquisitionLayer()
