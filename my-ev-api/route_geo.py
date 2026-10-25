"""คำนวณสถานีที่อยู่ใกล้เส้นทาง (ไม่ต้องพึ่ง PostGIS function เพิ่ม)

แนวคิด: ดึงสถานีในกรอบสี่เหลี่ยมครอบเส้นทางจาก Supabase แล้วคำนวณระยะจากสถานีถึงเส้นทาง
ด้วยการฉายพิกัดแบบ equirectangular (แม่นพอสำหรับระยะไม่กี่กิโลเมตร)
"""
from __future__ import annotations

import math
from collections import defaultdict

EARTH_R = 6371000.0
M_PER_DEG_LAT = 111320.0


def _haversine(a: tuple[float, float], b: tuple[float, float]) -> float:
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(h))


def bbox_with_buffer(coords: list[tuple[float, float]], buffer_m: float) -> tuple[float, float, float, float]:
    lats = [c[0] for c in coords]
    lngs = [c[1] for c in coords]
    mid_lat = (min(lats) + max(lats)) / 2
    dlat = buffer_m / M_PER_DEG_LAT
    dlng = buffer_m / (M_PER_DEG_LAT * max(math.cos(math.radians(mid_lat)), 0.01))
    return min(lats) - dlat, max(lats) + dlat, min(lngs) - dlng, max(lngs) + dlng


def stations_near_route(
    coords: list[tuple[float, float]],
    stations: list[dict],
    buffer_m: float,
) -> list[dict]:
    """คืนสถานีที่ห่างเส้นทางไม่เกิน buffer_m พร้อม
    distance_from_route_m (ระยะออกจากเส้นทาง) และ distance_along_route_m (ระยะจากจุดเริ่มตามเส้นทาง)
    เรียงตามลำดับที่จะผ่านบนเส้นทาง"""
    if len(coords) < 2:
        return []

    lat0 = math.radians(sum(c[0] for c in coords) / len(coords))
    kx = M_PER_DEG_LAT * math.cos(lat0)  # เมตรต่อองศาลองจิจูด
    ky = M_PER_DEG_LAT

    def xy(lat: float, lng: float) -> tuple[float, float]:
        return lng * kx, lat * ky

    pts = [xy(*c) for c in coords]
    cum = [0.0]
    for i in range(1, len(coords)):
        cum.append(cum[-1] + _haversine(coords[i - 1], coords[i]))

    # ดัชนีกริด: แบ่งสถานีเป็นช่อง ช่องละ ~buffer เมตร เพื่อเทียบเฉพาะสถานีที่อยู่ใกล้แต่ละช่วงถนน
    cell = max(buffer_m, 1000.0)
    grid: dict[tuple[int, int], list[int]] = defaultdict(list)
    sxy: list[tuple[float, float]] = []
    for idx, s in enumerate(stations):
        try:
            p = xy(float(s["Latitude"]), float(s["Longitude"]))
        except (KeyError, TypeError, ValueError):
            p = (math.nan, math.nan)
        sxy.append(p)
        if not math.isnan(p[0]):
            grid[(int(p[0] // cell), int(p[1] // cell))].append(idx)

    best: dict[int, tuple[float, float]] = {}  # idx -> (dist_from_route, dist_along)
    for i in range(len(pts) - 1):
        (x1, y1), (x2, y2) = pts[i], pts[i + 1]
        seg_dx, seg_dy = x2 - x1, y2 - y1
        seg_len2 = seg_dx * seg_dx + seg_dy * seg_dy
        seg_real = cum[i + 1] - cum[i]
        cx0, cx1 = int((min(x1, x2) - buffer_m) // cell), int((max(x1, x2) + buffer_m) // cell)
        cy0, cy1 = int((min(y1, y2) - buffer_m) // cell), int((max(y1, y2) + buffer_m) // cell)
        for cx in range(cx0, cx1 + 1):
            for cy in range(cy0, cy1 + 1):
                for idx in grid.get((cx, cy), ()):
                    px, py = sxy[idx]
                    t = 0.0 if seg_len2 == 0 else max(0.0, min(1.0, ((px - x1) * seg_dx + (py - y1) * seg_dy) / seg_len2))
                    qx, qy = x1 + t * seg_dx, y1 + t * seg_dy
                    d = math.hypot(px - qx, py - qy)
                    if d <= buffer_m and (idx not in best or d < best[idx][0]):
                        best[idx] = (d, cum[i] + t * seg_real)

    out = []
    seen: set[str] = set()
    for idx, (d, along) in sorted(best.items(), key=lambda kv: kv[1][1]):
        s = stations[idx]
        key = f"{s.get('Name')}|{float(s['Latitude']):.6f}|{float(s['Longitude']):.6f}"
        if key in seen:  # ข้อมูลมีแถวซ้ำ (ชื่อ+พิกัดเดียวกัน)
            continue
        seen.add(key)
        row = {k: v for k, v in s.items() if k != "location"}
        row["distance_from_route_m"] = round(d, 1)
        row["distance_along_route_m"] = round(along, 1)
        out.append(row)
    return out
