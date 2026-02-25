"""Simple in-memory rate limiting for public API (no Redis)."""
import time
from collections import defaultdict
from typing import Callable

from fastapi import Request, HTTPException

# key -> (count, window_start)
_store: dict[str, tuple[int, float]] = defaultdict(lambda: (0, 0.0))
WINDOW_SECONDS = 60
MAX_REQUESTS_PER_WINDOW = 30


def rate_limit_public(request: Request) -> None:
    """Dependency: raise 429 if client exceeds MAX_REQUESTS_PER_WINDOW per WINDOW_SECONDS."""
    client = request.client
    key = (client.host if client else "unknown") + ":" + (request.url.path or "")
    now = time.monotonic()
    count, start = _store[key]
    if now - start >= WINDOW_SECONDS:
        _store[key] = (1, now)
        return
    count += 1
    _store[key] = (count, start)
    if count > MAX_REQUESTS_PER_WINDOW:
        raise HTTPException(status_code=429, detail="Too many requests. Try again later.")
