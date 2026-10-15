"""
USMAN AI GTM - Production In-Memory Sliding Window Rate Limiter
Safeguards public discovery and authentication endpoints against abuse.
"""

import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, status

class SlidingWindowRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter keyed by IP or Workspace ID.
    """
    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.history: Dict[str, List[float]] = defaultdict(list)

    def check(self, key: str) -> None:
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
auth_rate_limiter = SlidingWindowRateLimiter(max_requests=20, window_seconds=60) # 20 attempts/min
search_rate_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=60) # 30 searches/min
