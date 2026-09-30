"""WebSocket connection manager for real-time telemetry broadcasting."""

import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self._clients: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket) -> str:
        await websocket.accept()
        client_id = str(uuid.uuid4())[:8]
        self._clients[client_id] = websocket
        # Send welcome message
        await self._send_to(client_id, {
            "type": "connected",
            "data": {"client_id": client_id, "message": "Digital Twin WebSocket connected"},
            "timestamp": datetime.utcnow().isoformat(),
        })
        return client_id

    def disconnect(self, client_id: str):
        self._clients.pop(client_id, None)

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients."""
        if not self._clients:
            return
        payload = json.dumps(message)
        dead = []
        for cid, ws in self._clients.items():
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(cid)
        for cid in dead:
            self.disconnect(cid)

    async def _send_to(self, client_id: str, message: dict):
        ws = self._clients.get(client_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                self.disconnect(client_id)

    async def handle_client_message(self, client_id: str, data: str):
        """Handle messages from WebSocket clients (e.g., commands)."""
        try:
            msg = json.loads(data)
            msg_type = msg.get("type", "")
            if msg_type == "ping":
                await self._send_to(client_id, {"type": "pong", "timestamp": datetime.utcnow().isoformat()})
        except Exception as e:
            logger.debug(f"WS message error: {e}")

    @property
    def client_count(self) -> int:
        return len(self._clients)


ws_manager = WebSocketManager()
