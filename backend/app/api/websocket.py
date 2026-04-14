import asyncio
import logging

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, analysis_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(analysis_id, []).append(websocket)
        logger.info("WS connected: %s (total: %d)", analysis_id, len(self.active[analysis_id]))

    def disconnect(self, analysis_id: str, websocket: WebSocket):
        conns = self.active.get(analysis_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active.pop(analysis_id, None)

    async def broadcast(self, analysis_id: str, message: dict):
        for ws in list(self.active.get(analysis_id, [])):
            try:
                await ws.send_json(message)
                await asyncio.sleep(0)
            except Exception:
                self.disconnect(analysis_id, ws)

    async def broadcast_error(self, analysis_id: str, error: str, agent_name: str | None = None):
        """Broadcast an error event to all connections for an analysis."""
        event = {
            "type": "agent_error",
            "message": error,
        }
        if agent_name:
            event["agent"] = agent_name
        await self.broadcast(analysis_id, event)

    async def cleanup_dead_connections(self):
        """Remove dead WebSocket connections from all active analysis rooms."""
        for analysis_id in list(self.active.keys()):
            for ws in list(self.active.get(analysis_id, [])):
                try:
                    await ws.send_json({"type": "ping"})
                except Exception:
                    logger.info("Removing dead WS connection for %s", analysis_id)
                    self.disconnect(analysis_id, ws)


manager = ConnectionManager()


async def _heartbeat_loop(websocket: WebSocket, analysis_id: str):
    """Send ping frames every 30 seconds to keep the connection alive."""
    try:
        while True:
            await asyncio.sleep(30)
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break
    except asyncio.CancelledError:
        pass


async def websocket_endpoint(websocket: WebSocket, analysis_id: str):
    await manager.connect(analysis_id, websocket)
    heartbeat_task = asyncio.create_task(_heartbeat_loop(websocket, analysis_id))
    try:
        while True:
            data = await websocket.receive_text()
            # Handle pong responses from clients (keep-alive acknowledgement)
            if data == "pong":
                continue
    except WebSocketDisconnect:
        pass
    finally:
        heartbeat_task.cancel()
        manager.disconnect(analysis_id, websocket)
