# main.py
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import stations

app = FastAPI(
    title="My EV API",
    description="API สำหรับค้นหาและเช็กสถานะสถานีชาร์จรถยนต์ไฟฟ้า",
    version="1.0.0",
    redirect_slashes=True,
)

# CORS — อนุญาต Frontend ช่วง dev (localhost / 127.0.0.1 / LAN ทุกพอร์ต)
# Production: หน้าเว็บเรียก API ผ่าน Next.js proxy (/api/*) ฝั่ง server จึงไม่ติด CORS
# ถ้าต้องให้เบราว์เซอร์เรียก API ตรง ให้ตั้ง CORS_ORIGINS เช่น "https://my-ev.vercel.app,https://example.com"
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stations.router)


@app.get("/")
def root():
    return {"message": "Welcome to My EV API"}
