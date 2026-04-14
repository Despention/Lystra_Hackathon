"""Expose in-process metrics in Prometheus text format at /api/metrics.

Deliberately unauthenticated — the service is local-first. When auth is
added (P2.5) this endpoint should require the admin key.
"""
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from app.services import metrics as metrics_mod

router = APIRouter()


@router.get("/api/metrics", response_class=PlainTextResponse)
async def get_metrics():
    return metrics_mod.render()
