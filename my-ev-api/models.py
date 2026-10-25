from pydantic import BaseModel, Field

class CheckInRequest(BaseModel):
    user_id: str
    status: str  # เช่น 'available', 'charging', 'out_of_order'

class AlongRouteRequest(BaseModel):
    # พิกัดเส้นทาง [[lat, lng], ...] (ควรลดจำนวนจุดก่อนส่ง เช่น ห่างกันจุดละ ~200 ม.)
    coords: list[tuple[float, float]] = Field(..., min_length=2, max_length=10000)
    buffer_m: float = Field(3000, gt=0, le=20000, description="ระยะห่างสูงสุดจากเส้นทาง (เมตร)")
