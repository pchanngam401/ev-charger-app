'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import '@/lib/leaflet-global'
import 'leaflet-rotate'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import type { Station, NearbyResponse } from '@/types/station'
import { getProviderBrand, type ProviderBrand } from '@/lib/providers'
import StationList, { formatDistance, type StationWithDistance } from '@/components/StationList'
import NavigationPanel from '@/components/NavigationPanel'
import { bearingDegrees, fetchRoute, haversineMeters, locateOnRoute, type LatLng, type Route } from '@/lib/routing'

// เรียกผ่าน Next.js proxy (/api -> FastAPI) จึงไม่ติด CORS
const API_BASE = '/api'
const RADIUS_METERS = 10000
const RADIUS_KM = RADIUS_METERS / 1000
const DEFAULT_POSITION: [number, number] = [13.7563, 100.5018] // กรุงเทพฯ
const OFF_ROUTE_METERS = 60 // ออกนอกเส้นทางเกินนี้ → คำนวณเส้นทางใหม่
const REROUTE_COOLDOWN_MS = 15000
const ARRIVE_METERS = 40
const HEADING_MIN_MOVE_METERS = 8 // ต้องขยับอย่างน้อยเท่านี้จึงคำนวณทิศจากการเคลื่อนที่
const HEADING_MIN_SPEED = 1 // m/s — ต่ำกว่านี้ไม่เชื่อค่า heading จาก GPS
const NAV_ZOOM = 17
// เลื่อนตำแหน่งรถลงไปด้านล่างจอ (สัดส่วนความสูง) เพื่อให้เห็นถนนข้างหน้ามากขึ้น
const LOOK_AHEAD_RATIO = 0.22

const MARKER_SIZE = 34

// หมุดสำรองสำหรับสถานีที่ไม่รู้จัก provider
const defaultIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:30px;height:30px;background:#059669;border:3px solid #fff;border-radius:50%;
    box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;
    font-size:15px;line-height:1;">⚡</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -18],
})

// หมุดโลโก้จริงของแต่ละ provider (สร้างครั้งเดียวแล้ว cache ไว้ต่อแบรนด์)
const iconCache: Record<string, L.DivIcon> = {}
function getMarkerIcon(brand: ProviderBrand | null): L.DivIcon {
  if (!brand) return defaultIcon
  if (!iconCache[brand.key]) {
    iconCache[brand.key] = L.divIcon({
      className: '',
      html: `<div style="
        width:${MARKER_SIZE}px;height:${MARKER_SIZE}px;border-radius:10px;overflow:hidden;
        background:#fff;border:2.5px solid ${brand.color};box-shadow:0 2px 8px rgba(0,0,0,.35);">
        <img src="${brand.logo}" alt="${brand.name}" width="${MARKER_SIZE}" height="${MARKER_SIZE}"
          style="width:100%;height:100%;object-fit:cover;display:block;" draggable="false" />
      </div>`,
      iconSize: [MARKER_SIZE, MARKER_SIZE],
      iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
      popupAnchor: [0, -MARKER_SIZE / 2 - 4],
    })
  }
  return iconCache[brand.key]
}

// หมุดตำแหน่งผู้ใช้ (ใช้ Marker เพื่อให้อยู่เหนือเส้นทางเสมอ)
const userDotIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#2563eb;border:3px solid #fff;
    box-shadow:0 0 0 6px rgba(37,99,235,.25),0 2px 6px rgba(0,0,0,.35);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
})

// ลูกศรชี้ทิศรถ (ปลายลูกศรชี้ขึ้น = ทิศเหนือ แล้วหมุนตาม heading)
const userArrowIcon = L.divIcon({
  className: '',
  html: `<div style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;
    border-radius:50%;background:rgba(37,99,235,.18);">
    <svg viewBox="0 0 24 24" width="30" height="30" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
      <path d="M12 2 4 21l8-4.2 8 4.2z" fill="#2563eb" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
    </svg></div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -20],
})

// ตัดสถานีซ้ำ (ข้อมูลมีแถวซ้ำชื่อ+พิกัดเดียวกัน) และพิกัดที่ไม่ถูกต้อง
function cleanStations(list: Station[]): Station[] {
  const seen = new Set<string>()
  return list.filter((s) => {
    const lat = Number(s.Latitude)
    const lng = Number(s.Longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
    const key = `${s.Name}|${lat.toFixed(6)}|${lng.toFixed(6)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}


// ระยะทางเส้นตรงระหว่าง 2 พิกัด (กม.) — สูตร Haversine
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function NavIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
      <path d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z" />
    </svg>
  )
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 13, { animate: true })
  }, [lat, lng, map])
  return null
}

export default function Map() {
  const [position, setPosition] = useState<[number, number]>(DEFAULT_POSITION) // จุดศูนย์กลางการค้นหา
  const [userLocated, setUserLocated] = useState(false)
  const [userPos, setUserPos] = useState<LatLng | null>(null) // ตำแหน่งจริงของผู้ใช้ (อัปเดตสดขณะนำทาง)
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [map, setMap] = useState<L.Map | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const markerRefs = useRef<Record<string, L.Marker | null>>({})

  // ── สถานะการนำทาง ──
  const [navStation, setNavStation] = useState<StationWithDistance | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [navLoading, setNavLoading] = useState(false)
  const [navError, setNavError] = useState('')
  const [following, setFollowing] = useState(true)
  const [heading, setHeading] = useState<number | null>(null) // ทิศที่รถมุ่งหน้า (องศา)
  const [headingUp, setHeadingUp] = useState(true) // true = หมุนแผนที่ตามรถ, false = ทิศเหนืออยู่บน
  const [mapBearing, setMapBearing] = useState(0)
  const headingRef = useRef<number | null>(null)
  const headingUpRef = useRef(true)
  const lastHeadingPosRef = useRef<LatLng | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const routeRef = useRef<Route | null>(null)
  const navStationRef = useRef<StationWithDistance | null>(null)
  const followingRef = useRef(true)
  const lastRerouteRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const watchIdRef = useRef<number | null>(null)

  // เพิ่มระยะทางจากจุดค้นหา แล้วเรียงจากใกล้สุด
  const sortedStations = useMemo<StationWithDistance[]>(
    () =>
      stations
        .map((s) => ({
          ...s,
          key: `${s.Name}|${s.Latitude}|${s.Longitude}`,
          distanceKm: distanceKm(position[0], position[1], Number(s.Latitude), Number(s.Longitude)),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [stations, position]
  )

  // กดรายการด้านขวา → เลื่อนแผนที่ไปที่สถานีแล้วเปิด popup
  const handleSelect = useCallback(
    (s: StationWithDistance) => {
      setSelectedKey(s.key)
      if (!map) return
      const marker = markerRefs.current[s.key]
      map.closePopup()
      map.flyTo([Number(s.Latitude), Number(s.Longitude)], Math.max(map.getZoom(), 15), { duration: 0.6 })
      map.once('moveend', () => marker?.openPopup())
    },
    [map]
  )

  // ── การนำทาง ──
  const requestRoute = useCallback(
    async (from: LatLng, station: StationWithDistance, fit: boolean) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      lastRerouteRef.current = Date.now()
      setNavLoading(true)
      setNavError('')
      try {
        const r = await fetchRoute(from, [Number(station.Latitude), Number(station.Longitude)], ctrl.signal)
        if (navStationRef.current?.key !== station.key) return // ผู้ใช้ยกเลิก/เปลี่ยนปลายทางไปแล้ว
        routeRef.current = r
        setRoute(r)
        if (fit && map) map.fitBounds(L.latLngBounds(r.coords), { padding: [40, 40] })
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setNavError(err instanceof TypeError ? 'เชื่อมต่อบริการคำนวณเส้นทางไม่ได้' : (err as Error).message)
      } finally {
        if (abortRef.current === ctrl) setNavLoading(false)
      }
    },
    [map]
  )

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    watchIdRef.current = null
  }, [])

  // หมุนแผนที่: heading-up → ทิศที่รถวิ่งชี้ขึ้นบนจอ, ไม่งั้นทิศเหนืออยู่บน
  const applyBearing = useCallback(() => {
    if (!map) return
    const h = headingRef.current
    const target = navStationRef.current && followingRef.current && headingUpRef.current && h !== null ? -h : 0
    map.setBearing(target)
    setMapBearing(target)
  }, [map])

  // เลื่อนแผนที่ให้รถอยู่ค่อนไปทางล่างของจอ (มองเห็นถนนข้างหน้า)
  const followUser = useCallback(
    (here: LatLng, animate: boolean) => {
      if (!map) return
      applyBearing()
      const size = map.getSize()
      const userPt = map.latLngToContainerPoint(here)
      const centerPt = map.getSize().divideBy(2)
      // จุดกึ่งกลางใหม่ = ตำแหน่งรถ ขยับขึ้นไปบนจอ LOOK_AHEAD_RATIO ของความสูง
      const desired = userPt.subtract(L.point(0, size.y * LOOK_AHEAD_RATIO))
      const target = map.containerPointToLatLng(desired)
      if (userPt.distanceTo(centerPt) > size.y || !animate) map.setView(target, map.getZoom(), { animate })
      else map.panTo(target, { animate, duration: 0.8 })
    },
    [map, applyBearing]
  )

  // ทิศของรถ: ใช้ heading จาก GPS เมื่อวิ่งเร็วพอ ไม่งั้นคำนวณจากการเคลื่อนที่ หรือทิศของเส้นทางข้างหน้า
  const updateHeading = useCallback((here: LatLng, coords?: GeolocationCoordinates) => {
    let h: number | null = null
    if (coords && coords.heading !== null && !Number.isNaN(coords.heading) && (coords.speed ?? 0) >= HEADING_MIN_SPEED) {
      h = coords.heading
    } else if (lastHeadingPosRef.current && haversineMeters(lastHeadingPosRef.current, here) >= HEADING_MIN_MOVE_METERS) {
      h = bearingDegrees(lastHeadingPosRef.current, here)
    } else if (headingRef.current === null && routeRef.current) {
      const r = routeRef.current
      const { index } = locateOnRoute(r, here)
      const ahead = r.coords[Math.min(index + 3, r.coords.length - 1)]
      if (haversineMeters(here, ahead) > 3) h = bearingDegrees(here, ahead)
    }
    if (!lastHeadingPosRef.current || haversineMeters(lastHeadingPosRef.current, here) >= HEADING_MIN_MOVE_METERS) {
      lastHeadingPosRef.current = here
    }
    if (h === null) return
    headingRef.current = h
    setHeading(h)
    userMarkerRef.current?.setRotation((h * Math.PI) / 180)
  }, [])

  // ติดตามตำแหน่งสด: อัปเดตหมุดผู้ใช้, เลื่อนแผนที่ตาม, คำนวณเส้นทางใหม่เมื่อออกนอกเส้นทาง
  const startWatching = useCallback(() => {
    stopWatching()
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const here: LatLng = [pos.coords.latitude, pos.coords.longitude]
        setUserPos(here)
        const r = routeRef.current
        const station = navStationRef.current
        updateHeading(here, pos.coords)
        if (followingRef.current) followUser(here, true)
        if (!r || !station) return
        const { offRouteMeters } = locateOnRoute(r, here)
        if (offRouteMeters > OFF_ROUTE_METERS && Date.now() - lastRerouteRef.current > REROUTE_COOLDOWN_MS) {
          requestRoute(here, station, false)
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    )
  }, [requestRoute, stopWatching, updateHeading, followUser])

  const startNavigation = useCallback(
    (s: StationWithDistance) => {
      map?.closePopup()
      setSelectedKey(s.key)
      setNavStation(s)
      navStationRef.current = s
      setRoute(null)
      routeRef.current = null
      setNavError('')
      setFollowing(false)
      followingRef.current = false

      if (!navigator.geolocation) {
        setNavError('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง')
        return
      }
      setNavLoading(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const here: LatLng = [pos.coords.latitude, pos.coords.longitude]
          setUserPos(here)
          setUserLocated(true)
          requestRoute(here, s, true)
          startWatching()
        },
        (err) => {
          setNavLoading(false)
          setNavError(
            err.code === err.PERMISSION_DENIED
              ? 'ต้องอนุญาตการเข้าถึงตำแหน่งก่อนจึงจะนำทางได้'
              : 'ไม่สามารถดึงตำแหน่งของคุณได้'
          )
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    },
    [map, requestRoute, startWatching]
  )

  const cancelNavigation = useCallback(() => {
    abortRef.current?.abort()
    stopWatching()
    setNavStation(null)
    navStationRef.current = null
    setRoute(null)
    routeRef.current = null
    setNavLoading(false)
    setNavError('')
    headingRef.current = null
    lastHeadingPosRef.current = null
    setHeading(null)
    map?.setBearing(0)
    setMapBearing(0)
  }, [stopWatching, map])

  const recenterOnUser = useCallback(() => {
    setFollowing(true)
    followingRef.current = true
    if (!userPos || !map) return
    if (headingRef.current === null) updateHeading(userPos)
    map.setZoom(Math.max(map.getZoom(), NAV_ZOOM), { animate: false })
    followUser(userPos, false)
  }, [map, userPos, updateHeading, followUser])

  // ปุ่มเข็มทิศ: สลับ หมุนตามรถ ↔ ทิศเหนืออยู่บน
  const toggleHeadingUp = useCallback(() => {
    const next = !headingUpRef.current
    headingUpRef.current = next
    setHeadingUp(next)
    if (next && userPos) {
      setFollowing(true)
      followingRef.current = true
      if (headingRef.current === null) updateHeading(userPos)
      followUser(userPos, false)
    } else {
      applyBearing()
    }
  }, [userPos, updateHeading, followUser, applyBearing])

  // ผู้ใช้ลากแผนที่เอง → หยุดเลื่อนตามตำแหน่ง
  useEffect(() => {
    if (!map) return
    const onDrag = () => {
      setFollowing(false)
      followingRef.current = false
    }
    map.on('dragstart', onDrag)
    return () => {
      map.off('dragstart', onDrag)
    }
  }, [map])

  // หยุดติดตามตำแหน่งเมื่อออกจากหน้า
  useEffect(() => stopWatching, [stopWatching])

  // ความคืบหน้า: ระยะที่เหลือ, ขั้นตอนถัดไป, ถึงที่หมายหรือยัง
  const stepIndices = useMemo(
    () => (route ? route.steps.map((st) => locateOnRoute(route, st.location).index) : []),
    [route]
  )
  const progress = useMemo(() => {
    if (!route || !userPos || !navStation) return null
    const loc = locateOnRoute(route, userPos)
    let next = stepIndices.findIndex((idx, i) => i > 0 && idx > loc.index)
    if (next === -1) next = route.steps.length - 1
    const toDest = haversineMeters(userPos, [Number(navStation.Latitude), Number(navStation.Longitude)])
    return { remaining: loc.remaining, next, arrived: toDest < ARRIVE_METERS }
  }, [route, userPos, navStation, stepIndices])

  const fetchNearbyStations = useCallback(async (lat: number, lng: number) => {
    setLoading(true)
    setError('')
    setSelectedKey(null)
    try {
      const res = await fetch(
        `${API_BASE}/stations/nearby?lat=${lat}&lng=${lng}&radius=${RADIUS_METERS}`
      )
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail ? `API ${res.status}: ${String(body.detail).slice(0, 120)}` : `API error: ${res.status}`)
      }
      const result: NearbyResponse = await res.json()
      const cleaned = cleanStations(result.data || [])
      setStations(cleaned)
      if (cleaned.length === 0) setError(`ไม่พบสถานีชาร์จในรัศมี ${RADIUS_KM} กม.`)
    } catch (err) {
      setStations([])
      setError(
        err instanceof TypeError
          ? 'เชื่อมต่อ Backend ไม่ได้ — ตรวจสอบว่า FastAPI รันอยู่ที่พอร์ต 8000'
          : err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setPosition([latitude, longitude])
        setUserPos([latitude, longitude])
        setUserLocated(true)
        fetchNearbyStations(latitude, longitude)
      },
      (err) => {
        setLoading(false)
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'กรุณาอนุญาตการเข้าถึงตำแหน่ง'
            : 'ไม่สามารถดึงตำแหน่งของคุณได้'
        )
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [fetchNearbyStations])

  useEffect(() => {
    fetchNearbyStations(DEFAULT_POSITION[0], DEFAULT_POSITION[1])
  }, [fetchNearbyStations])

  const navigating = navStation !== null
  // ระหว่างนำทาง แสดงเฉพาะหมุดสถานีปลายทาง
  const visibleStations = navigating ? sortedStations.filter((s) => s.key === navStation.key) : sortedStations

  return (
    <div className="w-full h-full flex flex-col md:flex-row">
      {/* ── แผนที่ ── */}
      <div className="relative flex-1 min-h-0 min-w-0">
        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm text-emerald-700 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            กำลังค้นหาสถานีใกล้คุณ...
          </div>
        )}

        {error && !loading && !navigating && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm text-amber-700 flex items-center gap-2 max-w-[90%]">
            <span>⚠️</span>
            <span className="truncate">{error}</span>
            <button
              onClick={() => fetchNearbyStations(position[0], position[1])}
              className="ml-1 text-emerald-700 font-semibold hover:underline shrink-0"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {!navigating && (
          <button
            onClick={handleGetLocation}
            disabled={loading}
            className="absolute bottom-6 right-4 z-[1000] bg-emerald-600 text-white font-semibold px-5 py-3 rounded-full shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-60 flex items-center gap-2 text-sm"
          >
            <span>🎯</span>
            {loading ? 'กำลังค้นหา...' : 'ค้นหาใกล้ฉัน'}
          </button>
        )}

        {navigating && route && (
          <button
            onClick={toggleHeadingUp}
            title={headingUp ? 'กำลังหมุนแผนที่ตามรถ — กดเพื่อให้ทิศเหนืออยู่บน' : 'ทิศเหนืออยู่บน — กดเพื่อหมุนแผนที่ตามรถ'}
            aria-label={headingUp ? 'สลับเป็นทิศเหนืออยู่บน' : 'หมุนแผนที่ตามรถ'}
            className="absolute top-4 right-4 z-[1000] bg-white rounded-full shadow-lg hover:bg-gray-50 flex items-center gap-2 pl-1.5 pr-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            <span className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 transition-transform duration-500"
                style={{ transform: `rotate(${mapBearing}deg)` }}
                aria-hidden="true"
              >
                <path d="M12 2 8 12h8z" fill="#dc2626" />
                <path d="M12 22 8 12h8z" fill="#9ca3af" />
                <text x="12" y="8.6" textAnchor="middle" fontSize="4.5" fontWeight="700" fill="#fff">N</text>
              </svg>
            </span>
            {headingUp ? 'หมุนตามรถ' : 'ทิศเหนือขึ้น'}
          </button>
        )}

        {navigating && route && !following && (
          <button
            onClick={recenterOnUser}
            className="absolute bottom-6 right-4 z-[1000] bg-white text-emerald-700 font-semibold px-4 py-2.5 rounded-full shadow-lg hover:bg-emerald-50 flex items-center gap-2 text-sm"
          >
            📍 ตำแหน่งฉัน
          </button>
        )}

        <MapContainer
          ref={setMap}
          center={DEFAULT_POSITION}
          zoom={12}
          scrollWheelZoom
          rotate
          bearing={0}
          rotateControl={false}
          touchRotate={false}
          shiftKeyRotate={false}
          compassBearing={false}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · เส้นทาง &copy; <a href="https://project-osrm.org">OSRM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RecenterMap lat={position[0]} lng={position[1]} />

          {route && (
            <>
              <Polyline positions={route.coords} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
              <Polyline positions={route.coords} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.95 }} />
            </>
          )}

          {userLocated && userPos && (
            <Marker
              ref={userMarkerRef}
              position={userPos}
              icon={navigating && heading !== null ? userArrowIcon : userDotIcon}
              rotation={navigating && heading !== null ? (heading * Math.PI) / 180 : 0}
              rotateWithView
              zIndexOffset={2000}
            >
              <Popup>ตำแหน่งของคุณ</Popup>
            </Marker>
          )}

          {visibleStations.map((station) => {
            const brand = getProviderBrand(station)
            return (
            <Marker
              key={station.key}
              ref={(m) => { markerRefs.current[station.key] = m }}
              position={[Number(station.Latitude), Number(station.Longitude)]}
              icon={getMarkerIcon(brand)}
              zIndexOffset={station.key === selectedKey ? 1000 : 0}
              eventHandlers={{ click: () => setSelectedKey(station.key) }}
            >
              <Popup>
                <div className="min-w-[200px] max-w-[260px]">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {brand ? (
                      <span className="flex items-center gap-1.5 whitespace-nowrap bg-gray-100 text-gray-800 text-[10px] font-semibold pl-0.5 pr-1.5 py-0.5 rounded">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={brand.logo} alt="" width={18} height={18} className="w-[18px] h-[18px] rounded-[4px]" />
                        {brand.name}
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide">
                        {station.Provider || 'EV'}
                      </span>
                    )}
                    <span className="whitespace-nowrap text-[10px] font-semibold text-emerald-700">{formatDistance(station.distanceKm)}</span>
                  {station.Power && (
                      <span className="whitespace-nowrap bg-amber-100 text-amber-800 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                        {station.Power}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-gray-900">{station.Name}</h3>
                  {station.Address && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{station.Address}</p>
                  )}
                  {station.description && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">หัวชาร์จ</span>
                      <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-line">{station.description}</p>
                    </div>
                  )}
                  <button
                    onClick={() => startNavigation(station)}
                    className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg"
                  >
                    <NavIcon /> นำทาง
                  </button>
                </div>
              </Popup>
            </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* ── แผงขวามือ: รายการสถานี หรือ การนำทาง ── */}
      <aside className="h-[42%] md:h-full md:w-[340px] shrink-0 bg-white border-t md:border-t-0 md:border-l border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,.06)] md:shadow-none z-[500]">
        {navStation ? (
          <NavigationPanel
            station={navStation}
            route={route}
            loading={navLoading}
            error={navError}
            remaining={progress?.remaining ?? null}
            nextStepIndex={progress?.next ?? 1}
            arrived={progress?.arrived ?? false}
            following={following}
            onCancel={cancelNavigation}
            onRetry={() => startNavigation(navStation)}
            onRecenter={recenterOnUser}
            onStepClick={(loc) => {
              setFollowing(false)
              followingRef.current = false
              map?.flyTo(loc, 17, { duration: 0.5 })
            }}
          />
        ) : (
          <StationList
            stations={sortedStations}
            selectedKey={selectedKey}
            onSelect={handleSelect}
            onNavigate={startNavigation}
            originLabel={userLocated ? 'ตำแหน่งของคุณ' : 'ใจกลางกรุงเทพฯ'}
            radiusKm={RADIUS_KM}
          />
        )}
      </aside>
    </div>
  )
}
