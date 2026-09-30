"""
FastAPI Backend — Main Application Entry Point

AI-Enabled Digital Twin System for MALE UAV Aero Piston Engines
DEMONSTRATION / RESEARCH PROTOTYPE
"""

import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure project root is in path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.database.connection import init_db
from backend.database.models import Engine as EngineModel, UAV, Mission
from backend.api.routers import (
    engines_router, telemetry_router, health_router, faults_router,
    rul_router, missions_router, maintenance_router, sensors_router,
    models_router, fleet_router, alerts_router, demo_router, simulation_router,
    pinn_router, xai_router, edge_router,
)
from backend.telemetry.websocket_manager import ws_manager
from backend.telemetry import stream as _stream_module
from backend.telemetry.stream import TelemetryStream
from backend.services.seed_service import seed_if_empty

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Global stream instance — registered in stream module for API access
# ─────────────────────────────────────────────────────────────────────────────
telemetry_stream = TelemetryStream()
_stream_module._stream_instance = telemetry_stream  # expose via get_stream()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    logger.info("=== Digital Twin UAV Engine System Starting ===")
    logger.info("DEMONSTRATION / RESEARCH PROTOTYPE — Not for operational use")

    # Initialise database
    logger.info("Initialising database...")
    init_db()

    # Seed demo data if database is empty
    logger.info("Checking for demo data...")
    await seed_if_empty()

    # Train ML models
    logger.info("Initialising ML engine...")
    try:
        from backend.services.ml_service import ml_service
        await ml_service.initialize()
    except Exception as e:
        logger.warning(f"ML initialisation partial: {e}")

    # Start real-time telemetry stream as background task
    logger.info("Starting telemetry stream...")
    stream_task = asyncio.create_task(telemetry_stream.run())

    logger.info("=== System Ready ===")
    logger.info("API docs: http://localhost:8000/docs")
    logger.info("WebSocket: ws://localhost:8000/ws")

    yield

    # Shutdown
    logger.info("Shutting down telemetry stream...")
    telemetry_stream.stop()
    stream_task.cancel()
    try:
        await stream_task
    except asyncio.CancelledError:
        pass
    logger.info("=== System Shutdown Complete ===")


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI Application
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI-Enabled Digital Twin — MALE UAV Aero Piston Engine",
    description=(
        "DEMONSTRATION / RESEARCH PROTOTYPE. "
        "AI-enabled real-time digital twin system for health monitoring, "
        "fault prediction and mission reliability of aero piston engines used in MALE UAVs. "
        "All values are SIMULATED/CONFIGURABLE. Not for operational use."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# API Routers
# ─────────────────────────────────────────────────────────────────────────────

app.include_router(engines_router, prefix="/api/engines", tags=["Engines"])
app.include_router(telemetry_router, prefix="/api/telemetry", tags=["Telemetry"])
app.include_router(health_router, prefix="/api/health", tags=["Health"])
app.include_router(faults_router, prefix="/api/faults", tags=["Faults"])
app.include_router(rul_router, prefix="/api/rul", tags=["RUL"])
app.include_router(missions_router, prefix="/api/missions", tags=["Missions"])
app.include_router(maintenance_router, prefix="/api/maintenance", tags=["Maintenance"])
app.include_router(sensors_router, prefix="/api/sensors", tags=["Sensors"])
app.include_router(models_router, prefix="/api/models", tags=["ML Models"])
app.include_router(fleet_router, prefix="/api/fleet", tags=["Fleet"])
app.include_router(alerts_router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(demo_router, prefix="/api/demo", tags=["Demo"])
app.include_router(simulation_router, prefix="/api/simulation", tags=["Simulation"])
app.include_router(pinn_router)   # prefix already set: /api/ml
app.include_router(xai_router)    # prefix already set: /api/xai
app.include_router(edge_router)   # prefix already set: /api/edge


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time telemetry streaming.
    
    Messages follow the schema:
    {
      "type": "telemetry" | "health" | "fault" | "alert" | "rul" | "digital_twin",
      "data": { ... },
      "timestamp": "ISO8601"
    }
    """
    client_id = await ws_manager.connect(websocket)
    logger.info(f"WebSocket client connected: {client_id}")
    try:
        while True:
            # Keep connection alive; receive any client messages
            data = await websocket.receive_text()
            # Handle client commands (e.g., subscribe/unsubscribe)
            await ws_manager.handle_client_message(client_id, data)
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
        logger.info(f"WebSocket client disconnected: {client_id}")


# ─────────────────────────────────────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    """System health check endpoint."""
    return {
        "status": "operational",
        "system": "Digital Twin UAV Engine — DEMONSTRATION",
        "timestamp": datetime.utcnow().isoformat(),
        "websocket_clients": ws_manager.client_count,
        "stream_running": telemetry_stream.is_running,
        "disclaimer": "DEMONSTRATION / RESEARCH PROTOTYPE",
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "system": "AI-Enabled Digital Twin for MALE UAV Aero Piston Engines",
        "version": "1.0.0",
        "status": "DEMONSTRATION / RESEARCH PROTOTYPE",
        "docs": "/docs",
        "websocket": "/ws",
        "disclaimer": "All values SIMULATED/CONFIGURABLE. Not for operational use.",
    }
