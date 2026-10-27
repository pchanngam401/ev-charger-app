"""จำกัดจำนวนคำขอต่อ IP แบบหน้าต่างเลื่อน (sliding window) เก็บในหน่วยความจำ"""
import threading
import time
from collections import deque

from fastapi import Request

MAX_TRACKED_IPS = 10000


class RateLimiter:
    def __init__(self, limit: int, window_s: float):
        self.limit = limit
        self.window = window_s
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        if self.limit <= 0:
            return True
        now = time.monotonic()
        cutoff = now - self.window
        with self._lock:
            if len(self._hits) > MAX_TRACKED_IPS:
                # ล้าง IP ที่ไม่มีคำขอในช่วงเวลานี้ กันหน่วยความจำโต
                for k in [k for k, q in self._hits.items() if not q or q[-1] < cutoff]:
                    del self._hits[k]
            q = self._hits.setdefault(key, deque())
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= self.limit:
                return False
            q.append(now)
            return True


def client_ip(request: Request) -> str:
    """IP จริงของผู้ใช้
    - คำขอที่ส่งผ่านหน้าเว็บ (Next.js) → ใช้ x-myev-client-ip ที่หน้าเว็บส่งต่อมา
      (เมื่อตั้ง API_SHARED_SECRET แล้ว คำขอที่ไม่มีกุญแจถูกต้องจะถูกปฏิเสธก่อนถึงตรงนี้ จึงปลอม header นี้ไม่ได้)
    - คำขอตรง → ใช้ x-real-ip / x-forwarded-for ที่ Vercel ใส่ให้
    """
    for header in ("x-myev-client-ip", "x-real-ip"):
        value = request.headers.get(header, "").strip()
        if value:
            return value[:64]
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()[:64]
    return request.client.host if request.client else "unknown"
