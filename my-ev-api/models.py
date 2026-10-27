from pydantic import BaseModel, Field


class AlongRouteRequest(BaseModel):
    # พิกัดเส้นทาง [[lat, lng], ...] — หน้าเว็บลดจำนวนจุดให้ไม่เกิน ~1,500 จุดก่อนส่ง
    coords: list[tuple[float, float]] = Field(..., min_length=2, max_length=2000)
    buffer_m: float = Field(3000, gt=0, le=20000, description="ระยะห่างสูงสุดจากเส้นทาง (เมตร)")


# หมายเหตุ: API เช็กอิน (POST /stations/{id}/checkin) ถูกปิดไว้จนกว่าจะมีระบบล็อกอิน
# ดูโค้ดเดิมได้ใน git history — ตอนเปิดใหม่ต้องตรวจ token ของผู้ใช้ฝั่ง server และจำกัดค่า status
