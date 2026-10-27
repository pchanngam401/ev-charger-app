import math
import re

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


SEARCH_COLUMNS = ("Name", "Name_EN", "Address", "Provider", "Operator")
NAME_COLUMNS = ("Name", "Name_EN")
BRAND_COLUMNS = ("Provider", "Operator")


def _distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


@router.get("/search")
def search_stations(
    q: str = Query(..., min_length=1, max_length=80, description="ชื่อสถานี / ผู้ให้บริการ / ที่อยู่"),
    lat: float | None = Query(None, ge=-90, le=90),
    lng: float | None = Query(None, ge=-180, le=180),
    limit: int = Query(8, ge=1, le=30),
):
    """ค้นหาสถานีจากชื่อ (ไทย/อังกฤษ) ผู้ให้บริการ หรือที่อยู่ — ชื่อหรือผู้ให้บริการที่ตรงเรียงจากใกล้ตำแหน่งผู้ใช้ ตรงแค่ที่อยู่ไว้ท้าย"""
    # ตัดอักขระที่มีความหมายพิเศษใน filter ของ PostgREST
    term = re.sub(r"\s+", " ", re.sub(r'[,()"*%\\]', " ", q)).strip()
    if len(term) < 2:
        return {"count": 0, "data": []}
    flt = ",".join(f"{c}.ilike.*{term}*" for c in SEARCH_COLUMNS)
    has_pos = lat is not None and lng is not None

    def fetch(box: float | None) -> list[dict]:
        query = supabase.table("stations").select("*").or_(flt)
        if box is not None and has_pos:
            query = query.gte("Latitude", lat - box).lte("Latitude", lat + box).gte("Longitude", lng - box).lte("Longitude", lng + box)
        return query.limit(500).execute().data

    try:
        rows = fetch(0.5) if has_pos else []  # ~55 กม. รอบผู้ใช้ก่อน
        if len(rows) < limit:
            rows += fetch(None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    needle = term.casefold()
    seen: set[str] = set()
    out: list[dict] = []
    for row in rows:
        try:
            s_lat, s_lng = float(row["Latitude"]), float(row["Longitude"])
        except (TypeError, ValueError, KeyError):
            continue
        key = f"{row.get('Name')}|{s_lat:.6f}|{s_lng:.6f}"
        if key in seen:
            continue
        seen.add(key)
        row.pop("location", None)
        names = [str(row.get(c) or "").casefold() for c in NAME_COLUMNS]
        brands = [str(row.get(c) or "").casefold() for c in BRAND_COLUMNS]
        row["match"] = (
            "name" if any(needle in n for n in names)
            else "provider" if any(needle in n for n in brands)
            else "address"
        )
        row["distance_m"] = round(_distance_m(lat, lng, s_lat, s_lng)) if has_pos else None
        # ชื่อสถานี/ผู้ให้บริการตรง → เรียงจากใกล้สุดรวมกัน, ตรงแค่ที่อยู่ → ไว้ท้าย
        row["_rank"] = (1 if row["match"] == "address" else 0, row["distance_m"] or 0)
        out.append(row)
    out.sort(key=lambda r: r["_rank"])
    data = out[:limit]
    for r in data:
        r.pop("_rank", None)
    return {"count": len(data), "data": data}


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
