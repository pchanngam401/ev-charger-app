from fastapi import APIRouter, HTTPException, Query
from database import supabase
from models import AlongRouteRequest, CheckInRequest
from route_geo import bbox_with_buffer, stations_near_route

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


@router.post("/along-route")
def get_stations_along_route(payload: AlongRouteRequest):
    """สถานีชาร์จตลอดเส้นทาง เรียงตามลำดับที่จะผ่าน (ระยะจากจุดเริ่มตามเส้นทาง)"""
    coords = [(lat, lng) for lat, lng in payload.coords]
    if any(not (-90 <= lat <= 90 and -180 <= lng <= 180) for lat, lng in coords):
        raise HTTPException(status_code=422, detail="พิกัดไม่ถูกต้อง")
    min_lat, max_lat, min_lng, max_lng = bbox_with_buffer(coords, payload.buffer_m)
    try:
        rows: list[dict] = []
        page = 1000  # PostgREST คืนได้สูงสุด 1000 แถวต่อครั้ง
        for start in range(0, 20000, page):
            res = (
                supabase.table("stations")
                .select("*")
                .gte("Latitude", min_lat)
                .lte("Latitude", max_lat)
                .gte("Longitude", min_lng)
                .lte("Longitude", max_lng)
                .range(start, start + page - 1)
                .execute()
            )
            rows.extend(res.data)
            if len(res.data) < page:
                break
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    data = stations_near_route(coords, rows, payload.buffer_m)
    return {"count": len(data), "buffer_m": payload.buffer_m, "data": data}


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
