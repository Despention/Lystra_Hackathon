from fastapi import APIRouter, WebSocket

from app.api.analyze import router as analyze_router
from app.api.chat import router as chat_router
from app.api.export import router as export_router
from app.api.folders import router as folders_router
from app.api.generate import router as generate_router
from app.api.health import router as health_router
from app.api.metrics import router as metrics_router
from app.api.results import router as results_router
from app.api.settings import router as settings_router
from app.api.websocket import websocket_endpoint

router = APIRouter()
router.include_router(analyze_router, tags=["analyze"])
router.include_router(results_router, tags=["results"])
router.include_router(export_router, tags=["export"])
router.include_router(chat_router, tags=["chat"])
router.include_router(generate_router, tags=["generate"])
router.include_router(folders_router, tags=["folders"])
router.include_router(health_router, tags=["health"])
router.include_router(settings_router, tags=["settings"])
router.include_router(metrics_router, tags=["metrics"])


@router.websocket("/ws/{analysis_id}")
async def ws_route(websocket: WebSocket, analysis_id: str):
    await websocket_endpoint(websocket, analysis_id)
