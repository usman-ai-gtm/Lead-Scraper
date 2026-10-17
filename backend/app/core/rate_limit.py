"""
USMAN AI GTM - Production Rate Limiter (SEC-009)
Safeguards public discovery, password recovery, and authentication endpoints against abuse.
Supports distributed Redis rate limiting when REDIS_URL is configured,
with graceful fallback to in-memory sliding window when running without external Redis.
"""

import os
import time
import logging
from collections import defaultdict
from typing import Dict, List, Optional
from fastapi import HTTPException, status

logger = logging.getLogger("usman_gtm.rate_limiter")

class SlidingWindowRateLimiter:
    """
    Sliding window rate limiter supporting distributed Redis backend
    when configured, or local in-memory fallback.
    """
    def __init__(self, max_requests: int = 30, window_seconds: int = 60, prefix: str = "rl"):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.prefix = prefix
        self.history: Dict[str, List[float]] = defaultdict(list)
        self._redis_client = None
        self._init_redis()

    def _init_redis(self):
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                import redis
                self._redis_client = redis.Redis.from_url(redis_url, socket_timeout=1.0)
                # Test ping
                self._redis_client.ping()
                logger.info(f"Distributed rate limiting connected via Redis: {self.prefix}")
            except Exception as e:
                logger.warning(f"Redis rate limiting unavailable ({e}); falling back to local sliding window")
                self._redis_client = None

    def check(self, key: str) -> None:
        """
        Enforces rate limit. Raises HTTP 429 if threshold exceeded.
        """
        # 1. Distributed Redis mode if available
        if self._redis_client:
            try:
                redis_key = f"{self.prefix}:{key}"
                current = self._redis_client.incr(redis_key)
                if current == 1:
                    self._redis_client.expire(redis_key, self.window_seconds)
                if current > self.max_requests:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded: maximum {self.max_requests} requests per {self.window_seconds}s. Please retry shortly."
                    )
                return
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"Redis rate limit check error ({e}); falling back to in-memory window")

        # 2. In-memory sliding window fallback
        now = time.time()
        window_start = now - self.window_seconds
        
        # Purge expired timestamps
        self.history[key] = [t for t in self.history[key] if t > window_start]
        
        if len(self.history[key]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: maximum {self.max_requests} requests per {self.window_seconds}s. Please retry shortly."
            )
        
        self.history[key].append(now)

# Pre-configured limiters
auth_rate_limiter = SlidingWindowRateLimiter(max_requests=20, window_seconds=60, prefix="auth") # 20 attempts/min
search_rate_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=60, prefix="search") # 30 searches/min
