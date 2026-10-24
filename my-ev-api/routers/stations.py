from fastapi import APIRouter, HTTPException, Query
from database import supabase
from models import CheckInRequest

router = APIRouter(prefix="/stations", tags=["Stations"])


@router.get("")
@router.get("/", include_in_schema=False)
def get_all_stations(limit: int = Query(50, ge=1, le=1000)):
    try:
        response = supabase.table("stations").select("*").limit(limit).execute()
        return {"count": len(response.data), "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nearby")
def get_nearby_stations(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lng: float = Query(..., ge=-180, le=180, description="Longitude"),
    radius: float = Query(5000, gt=0, le=50000, description="Radius in meters"),
):
    try:
        response = supabase.rpc(
            "get_nearby_stations",
            {"user_lat": lat, "user_lng": lng, "radius_meters": radius},
        ).execute()
        return {"count": len(response.data), "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{station_id}/checkin")
def check_in_station(station_id: int, payload: CheckInRequest):
    try:
        checkin_data = {
            "station_id": station_id,
            "user_id": payload.user_id,
            "status": payload.status,
        }
        # บันทึกลงตาราง check_ins (ต้องสร้างตารางนี้ใน Supabase ใน Phase 4)
        response = supabase.table("check_ins").insert(checkin_data).execute()
        return {"message": "Check-in successful", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
