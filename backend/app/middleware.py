import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


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
