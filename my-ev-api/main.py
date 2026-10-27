# main.py
import hmac
import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from rate_limit import RateLimiter, client_ip
from routers import stations

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("my-ev-api")

IS_PRODUCTION = bool(os.getenv("VERCEL")) or os.getenv("ENV") == "production"

# เปิดหน้า /docs เฉพาะตอน dev (หรือตั้ง ENABLE_DOCS=1)
SHOW_DOCS = not IS_PRODUCTION or os.getenv("ENABLE_DOCS") == "1"

app = FastAPI(
    title="My EV API",
    description="API สำหรับค้นหาและเช็กสถานะสถานีชาร์จรถยนต์ไฟฟ้า",
    version="1.1.0",
    redirect_slashes=True,
    docs_url="/docs" if SHOW_DOCS else None,
    redoc_url="/redoc" if SHOW_DOCS else None,
    openapi_url="/openapi.json" if SHOW_DOCS else None,
)

# ── CORS ──
# Production: หน้าเว็บเรียก API ผ่าน Next.js (ฝั่ง server) จึงไม่ต้องเปิด CORS เลย
# ถ้าต้องให้เบราว์เซอร์/แอปเรียก API ตรง ให้ตั้ง CORS_ORIGINS เช่น "https://my-ev.vercel.app,capacitor://localhost"
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    # localhost / LAN อนุญาตเฉพาะตอน dev
    allow_origin_regex=None if IS_PRODUCTION else r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=False,  # API ไม่ใช้ cookie
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ── กุญแจลับร่วมกับหน้าเว็บ ──
# ตั้ง API_SHARED_SECRET (ค่าเดียวกันทั้งโปรเจกต์ API และเว็บ) → API จะรับเฉพาะคำขอที่ส่งผ่านหน้าเว็บของเรา
API_SHARED_SECRET = os.getenv("API_SHARED_SECRET", "")
OPEN_PATHS = {"/"}  # health check

# ── จำกัดจำนวนคำขอต่อ IP (กันยิงรัวจนโควตาหมด) ──
# หมายเหตุ: นับแยกต่อ instance ของ serverless — เป็นด่านสำรอง ด่านหลักอยู่ที่หน้าเว็บ/Vercel Firewall
limiter = RateLimiter(
    limit=int(os.getenv("RATE_LIMIT_PER_MIN", "120")),
    window_s=60,
)
heavy_limiter = RateLimiter(limit=int(os.getenv("RATE_LIMIT_HEAVY_PER_MIN", "20")), window_s=60)
HEAVY_PATHS = {"/stations/along-route"}


@app.middleware("http")
async def guard(request: Request, call_next):
    path = request.url.path.rstrip("/") or "/"
    if request.method != "OPTIONS" and path not in OPEN_PATHS:
        if API_SHARED_SECRET:
            sent = request.headers.get("x-myev-key", "")
            if not hmac.compare_digest(sent, API_SHARED_SECRET):
                return JSONResponse({"detail": "forbidden"}, status_code=403)
        ip = client_ip(request)
        if not limiter.allow(ip) or (path in HEAVY_PATHS and not heavy_limiter.allow(ip)):
            return JSONResponse(
                {"detail": "มีการเรียกใช้งานถี่เกินไป กรุณาลองใหม่ในอีกสักครู่"},
                status_code=429,
                headers={"Retry-After": "60"},
            )
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = response.headers.get("Cache-Control", "no-store")
    return response


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    # เก็บรายละเอียดไว้ใน log เท่านั้น ไม่ส่งให้ผู้ใช้
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse({"detail": "เกิดข้อผิดพลาดภายในระบบ"}, status_code=500)


app.include_router(stations.router)


@app.get("/")
def root():
    return {"message": "Welcome to My EV API"}
