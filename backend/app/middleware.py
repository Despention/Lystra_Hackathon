import contextvars
import logging
import time
import uuid
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


# Request-scoped context var for log correlation. Every log record emitted
# while a request is in-flight gets this ID automatically via RequestIDFilter.
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Assign every request a correlation ID.

    Reads X-Request-ID from the client if provided (useful for tying logs
    to caller-side traces), otherwise generates a short UUID. The ID is
    stored in a contextvar so logging filters pick it up, and echoed back
    to the client in the X-Request-ID response header.
    """

    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get("X-Request-ID")
        rid = incoming if incoming else uuid.uuid4().hex[:12]
        token = request_id_var.set(rid)
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = rid
            return response
        finally:
            request_id_var.reset(token)


class RequestIDFilter(logging.Filter):
    """Logging filter that injects the current request ID into every record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter.

    Limits POST requests to /api/analyze to a configurable number of
    requests per minute per IP address.
    """

    def __init__(self, app, max_requests: int = 10, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # {ip_address: [timestamp1, timestamp2, ...]}
        self._requests: dict[str, list[float]] = defaultdict(list)

    def _cleanup_old(self, ip: str, now: float):
        """Remove timestamps older than the rate-limit window."""
        cutoff = now - self.window_seconds
        self._requests[ip] = [t for t in self._requests[ip] if t > cutoff]

    async def dispatch(self, request: Request, call_next):
        # Only rate-limit POST /api/analyze
        if request.method == "POST" and request.url.path == "/api/analyze":
            ip = request.client.host if request.client else "unknown"
            now = time.time()
            self._cleanup_old(ip, now)

            if len(self._requests[ip]) >= self.max_requests:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please try again later.",
                    },
                )

            self._requests[ip].append(now)

        return await call_next(request)
