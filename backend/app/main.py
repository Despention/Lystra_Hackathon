import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import init_db
from app.middleware import RateLimitMiddleware, RequestIDFilter, RequestIDMiddleware
from app.schemas import ErrorResponse

logger = logging.getLogger(__name__)

# Install a logging filter so every log line gets a request_id field.
# Format: `HH:MM:SS LEVEL [request_id=abc123] logger.name: message`
_root_logger = logging.getLogger()
if not any(isinstance(f, RequestIDFilter) for f in _root_logger.filters):
    _root_logger.addFilter(RequestIDFilter())
    # Only reconfigure the handler format if we haven't already (avoid duplicate
    # formatting when uvicorn sets its own handlers).
    if not _root_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(
            "%(asctime)s %(levelname)s [rid=%(request_id)s] %(name)s: %(message)s",
            datefmt="%H:%M:%S",
        ))
        _root_logger.addHandler(handler)
        _root_logger.setLevel(logging.INFO)


async def _cleanup_stale_analyses():
    """On startup, mark analyses that were mid-flight as failed.

    If the server crashed during analysis, the row sits in `processing` forever.
    This sweeps them so users see the failure in history instead of a hang.
    """
    from sqlalchemy import update

    from app.database import Analysis, async_session

    try:
        async with async_session() as db:
            result = await db.execute(
                update(Analysis)
                .where(Analysis.status.in_(("pending", "processing")))
                .values(
                    status="failed",
                    not_ready="Server restart during analysis",
                )
                .returning(Analysis.id)
            )
            ids = [row[0] for row in result.all()]
            await db.commit()
            if ids:
                logger.warning("Marked %d stale analyses as failed: %s", len(ids), ids)
    except Exception as e:
        logger.warning("Stale-analysis cleanup skipped: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.upload_dir, exist_ok=True)
    await init_db()
    await _cleanup_stale_analyses()
    yield


app = FastAPI(
    title="TZ Analyzer",
    description="AI-powered technical specification analyzer",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# RequestIDMiddleware must run BEFORE RateLimitMiddleware so rate-limit
# rejections already carry a correlation ID in logs.
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=10, window_seconds=60)


# --- Structured error handlers ---
# Give every failure the same shape so clients don't need to branch on
# which middleware/layer raised.

def _code_for_status(status: int) -> str:
    return {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        413: "payload_too_large",
        422: "validation_error",
        429: "rate_limited",
    }.get(status, "error")


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    # Preserve the raw detail as message when it's a plain string; otherwise
    # pack it into `detail` so clients can still introspect it.
    if isinstance(exc.detail, str):
        message, detail = exc.detail, None
    else:
        message, detail = "Request failed", {"raw": exc.detail}

    body = ErrorResponse(
        code=_code_for_status(exc.status_code),
        message=message,
        detail=detail,
    )
    return JSONResponse(status_code=exc.status_code, content=body.model_dump())


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = ErrorResponse(
        code="validation_error",
        message="Invalid request payload",
        detail={"errors": exc.errors()},
    )
    return JSONResponse(status_code=422, content=body.model_dump())


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    body = ErrorResponse(
        code="internal_error",
        message="Internal server error",
        detail={"type": type(exc).__name__},
    )
    return JSONResponse(status_code=500, content=body.model_dump())


from app.api.router import router  # noqa: E402

app.include_router(router)
