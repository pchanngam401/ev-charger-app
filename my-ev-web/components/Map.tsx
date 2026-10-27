'use client'

import MapGL, { Marker, Popup, Source, Layer, type MarkerEvent } from 'react-map-gl/maplibre'
import { getVersion, setWorkerUrl, type ExpressionSpecification, type Map as MLMap } from 'maplibre-gl'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import type { Station, NearbyResponse } from '@/types/station'
import { getProviderBrand, type ProviderBrand } from '@/lib/providers'
import StationList, { formatDistance, type StationWithDistance } from '@/components/StationList'
import NavigationPanel, { type NavTarget } from '@/components/NavigationPanel'
import RoutePlanner, { type PickField, type StationAlongRoute } from '@/components/RoutePlanner'
import type { PlanPoint } from '@/components/PlaceInput'
import { reversePlace } from '@/lib/geocode'
import {
  bearingDegrees, fetchRoute, formatMeters, haversineMeters, locateOnRoute, thinCoords, type LatLng, type Route,
} from '@/lib/routing'

// เรียกผ่าน Next.js proxy (/api -> FastAPI) จึงไม่ติด CORS
const API_BASE = '/api'
const RADIUS_METERS = 10000
const RADIUS_KM = RADIUS_METERS / 1000
const DEFAULT_POSITION: [number, number] = [13.7563, 100.5018] // กรุงเทพฯ
const OFF_ROUTE_METERS = 60 // ออกนอกเส้นทางเกินนี้ → คำนวณเส้นทางใหม่
const REROUTE_COOLDOWN_MS = 15000
const ARRIVE_METERS = 40
const STOP_ARRIVE_METERS = 80 // เข้าใกล้จุดแวะเท่านี้ถือว่าผ่านจุดแวะแล้ว
const DEFAULT_BUFFER_KM = 3
const HEADING_MIN_MOVE_METERS = 8 // ต้องขยับอย่างน้อยเท่านี้จึงคำนวณทิศจากการเคลื่อนที่
const HEADING_MIN_SPEED = 1 // m/s — ต่ำกว่านี้ไม่เชื่อค่า heading จาก GPS
const NAV_ZOOM = 16.5 // MapLibre ใช้ tile 512px → zoom น้อยกว่า Leaflet ประมาณ 1 ระดับ
// เลื่อนตำแหน่งรถลงไปด้านล่างจอ (สัดส่วนความสูง) เพื่อให้เห็นถนนข้างหน้ามากขึ้น
const LOOK_AHEAD_RATIO = 0.22

const MARKER_SIZE = 34

// MapLibre 6 โหลด web worker จากไฟล์แยก — คัดลอกไว้ใน public/ ตอน npm install (ดู postinstall ใน package.json)
setWorkerUrl(`/maplibre-gl-worker.mjs?v=${getVersion()}`)
const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE || 'https://tiles.openfreemap.org/styles/liberty'
const NAV_PITCH = 45 // เอียงแผนที่ตอนนำทางแบบหมุนตามรถ (เห็นตึก 3D)
const THAI_NAME: ExpressionSpecification = ['coalesce', ['get', 'name:th'], ['get', 'name'], ['get', 'name:latin']]

// ใช้ชื่อภาษาไทยในป้ายชื่อทุกชั้น (ยกเว้นป้ายเลขทางหลวง/บ้านเลขที่ ที่ไม่ได้ใช้ชื่อ)
function applyThaiLabels(m: MLMap): string | undefined {
  let firstSymbol: string | undefined
  for (const layer of m.getStyle().layers) {
    if (layer.type !== 'symbol') continue
    firstSymbol ??= layer.id
    const field = m.getLayoutProperty(layer.id, 'text-field')
    if (field && JSON.stringify(field).includes('name')) m.setLayoutProperty(layer.id, 'text-field', THAI_NAME)
  }
  return firstSymbol
}

// หมุดสำรองสำหรับสถานีที่ไม่รู้จัก provider
function DefaultPin() {
  return (
    <div style={{
      width: 30, height: 30, background: '#f74780', border: '3px solid #fff', borderRadius: '50%',
      boxShadow: '0 2px 8px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, lineHeight: 1,
    }}>⚡</div>
  )
}

// หมุดโลโก้จริงของแต่ละ provider
function StationPin({ brand }: { brand: ProviderBrand | null }) {
  if (!brand) return <DefaultPin />
  return (
    <div style={{
      width: MARKER_SIZE, height: MARKER_SIZE, borderRadius: 10, overflow: 'hidden', background: '#fff',
      border: `2.5px solid ${brand.color}`, boxShadow: '0 2px 8px rgba(0,0,0,.35)', cursor: 'pointer',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brand.logo} alt={brand.name} width={MARKER_SIZE} height={MARKER_SIZE} draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
}

// หมุดตำแหน่งผู้ใช้
function UserDot() {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%', background: '#2563eb', border: '3px solid #fff',
      boxShadow: '0 0 0 6px rgba(37,99,235,.25),0 2px 6px rgba(0,0,0,.35)',
    }} />
  )
}

// ลูกศรชี้ทิศรถ (ปลายลูกศรชี้ทิศเหนือ แล้วหมุนตาม heading)
function UserArrow() {
  return (
    <div style={{
      width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '50%', background: 'rgba(37,99,235,.18)',
    }}>
      <svg viewBox="0 0 24 24" width="30" height="30" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))' }}>
        <path d="M12 2 4 21l8-4.2 8 4.2z" fill="#2563eb" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// หมุดจุดเริ่ม (A) / ปลายทาง (B) ของเมนูค้นหาเส้นทาง (ปลายหมุดอยู่ด้านล่าง → anchor="bottom")
function EndpointPin({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: color,
      border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', marginBottom: 6, cursor: 'pointer',
    }}>
      <span style={{ transform: 'rotate(45deg)', color: '#fff', font: '700 13px/1 system-ui,sans-serif' }}>{label}</span>
    </div>
  )
}

// หมุดจุดแวะ: โลโก้ + กรอบม่วง + เลขลำดับ
function StopPin({ brand, n }: { brand: ProviderBrand | null; n: number }) {
  return (
    <div style={{
      position: 'relative', width: 40, height: 40, borderRadius: 11, background: '#fff', border: '3px solid #6610f2',
      boxShadow: '0 2px 10px rgba(102,16,242,.45)', padding: 1, cursor: 'pointer',
    }}>
      {brand ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logo} alt="" draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 7 }} />
      ) : (
        <div style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f74780', color: '#fff', borderRadius: 7,
        }}>⚡</div>
      )}
      <span style={{
        position: 'absolute', top: -9, right: -9, minWidth: 20, height: 20, padding: '0 4px', borderRadius: 10,
        background: '#6610f2', color: '#fff', font: '700 11px/16px system-ui,sans-serif', textAlign: 'center',
        border: '2px solid #fff',
      }}>{n}</span>
    </div>
  )
}

// กรอบพิกัดของเส้นทาง สำหรับ fitBounds ([lng,lat])
function routeBounds(coords: LatLng[]): [[number, number], [number, number]] {
  let minLat = 90, minLng = 180, maxLat = -90, maxLng = -180
  for (const [lat, lng] of coords) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }
  return [[minLng, minLat], [maxLng, maxLat]]
}

function fitRoute(m: MLMap | null, coords: LatLng[]) {
  if (!m || coords.length < 2) return
  m.fitBounds(routeBounds(coords), { padding: 40, bearing: 0, pitch: 0, duration: 600 })
}

function routeGeoJSON(coords: LatLng[]): GeoJSON.Feature<GeoJSON.LineString> {
  return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords.map(([lat, lng]) => [lng, lat]) } }
}

// หยุดไม่ให้คลิกหมุดไปเป็นการคลิกแผนที่ (เช่น ปิด popup / เลือกจุด)
function stop(e: MarkerEvent<MouseEvent>) {
  e.originalEvent.stopPropagation()
}

function stationKey(s: Station): string {
  return `${s.Name}|${s.Latitude}|${s.Longitude}`
}

function stationPos(s: Station): LatLng {
  return [Number(s.Latitude), Number(s.Longitude)]
}

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

type Mode = 'nearby' | 'route'

// ดึงตำแหน่งปัจจุบันครั้งเดียว
function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'ต้องอนุญาตการเข้าถึงตำแหน่งก่อน'
              : 'ไม่สามารถดึงตำแหน่งของคุณได้'
          )
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

function StationPopup({ station, brand, extra, actions }: {
  station: Station
  brand: ProviderBrand | null
  extra?: React.ReactNode
  actions: React.ReactNode
}) {
  return (
    <div className="min-w-[200px] max-w-[260px]">
      <div className="flex flex-wrap items-center gap-1.5 mb-1">
        {brand ? (
          <span className="flex items-center gap-1.5 whitespace-nowrap bg-gray-100 text-gray-800 text-[10px] font-semibold pl-0.5 pr-1.5 py-0.5 rounded">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logo} alt="" width={18} height={18} className="w-[18px] h-[18px] rounded-[4px]" />
            {brand.name}
          </span>
        ) : (
          <span className="bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide">
            {station.Provider || 'EV'}
          </span>
        )}
        {extra}
        {station.Power && (
          <span className="whitespace-nowrap bg-amber-100 text-amber-800 text-[10px] font-semibold px-1.5 py-0.5 rounded">
            {station.Power}
          </span>
        )}
      </div>
      <h3 className="font-bold text-sm text-dark">{station.Name}</h3>
      {station.Address && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{station.Address}</p>}
      {station.description && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">หัวชาร์จ</span>
          <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-line">{station.description}</p>
        </div>
      )}
      {actions}
    </div>
  )
}

export default function Map() {
  // เปิดเมนูตามลิงก์ เช่น /map?mode=route (คอมโพเนนต์นี้โหลดเฉพาะฝั่งเบราว์เซอร์)
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(window.location.search).get('mode') === 'route' ? 'route' : 'nearby'
  )
  const [position, setPosition] = useState<[number, number]>(DEFAULT_POSITION) // จุดศูนย์กลางการค้นหาใกล้ฉัน
  const [userLocated, setUserLocated] = useState(false)
  const [userPos, setUserPos] = useState<LatLng | null>(null) // ตำแหน่งจริงของผู้ใช้ (อัปเดตสดขณะนำทาง)
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [map, setMap] = useState<MLMap | null>(null)
  const [routeBeforeId, setRouteBeforeId] = useState<string | undefined>(undefined) // วางเส้นทางใต้ป้ายชื่อถนน
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [popupKey, setPopupKey] = useState<string | null>(null) // หมุดที่เปิด popup อยู่ (ทีละอัน)
  const closePopup = useCallback(() => setPopupKey(null), [])
  // ปิดเฉพาะเมื่อยังเป็น popup เดิม (กันกรณีเปิด popup ใหม่แล้วอันเก่าถูกถอดออก)
  const closePopupIf = useCallback((key: string) => setPopupKey((k) => (k === key ? null : k)), [])

  // ── สถานะเมนูค้นหาเส้นทาง ──
  const [origin, setOrigin] = useState<PlanPoint | null>({ name: 'ตำแหน่งของฉัน', pos: null })
  const [destination, setDestination] = useState<PlanPoint | null>(null)
  const [originPos, setOriginPos] = useState<LatLng | null>(null) // พิกัดจุดเริ่มที่ใช้คำนวณจริง
  const [destinationPos, setDestinationPos] = useState<LatLng | null>(null)
  const [stops, setStops] = useState<StationAlongRoute[]>([])
  const [planRoute, setPlanRoute] = useState<Route | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [alongStations, setAlongStations] = useState<StationAlongRoute[]>([])
  const [alongLoading, setAlongLoading] = useState(false)
  const [alongError, setAlongError] = useState('')
  const [bufferKm, setBufferKm] = useState(DEFAULT_BUFFER_KM)
  const [pickField, setPickField] = useState<PickField | null>(null)
  const planAbortRef = useRef<AbortController | null>(null)
  const alongAbortRef = useRef<AbortController | null>(null)

  // ── สถานะการนำทาง ──
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null)
  const [navStationKeys, setNavStationKeys] = useState<string[]>([]) // หมุดสถานีที่แสดงระหว่างนำทาง
  const [reachedStops, setReachedStops] = useState(0)
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
  const routeRef = useRef<Route | null>(null)
  const navTargetRef = useRef<NavTarget | null>(null)
  const reachedRef = useRef(0)
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
          key: stationKey(s),
          distanceKm: distanceKm(position[0], position[1], Number(s.Latitude), Number(s.Longitude)),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [stations, position]
  )

  // กดรายการด้านขวา → เลื่อนแผนที่ไปที่สถานีแล้วเปิด popup
  const flyToStation = useCallback(
    (s: Station & { key: string }) => {
      setSelectedKey(s.key)
      setPopupKey(s.key)
      if (!map) return
      const [lat, lng] = stationPos(s)
      map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14), duration: 600 })
    },
    [map]
  )

  // ════════════════ เมนูค้นหาเส้นทาง ════════════════

  // สถานีตลอดเส้นทาง (เรียงตามระยะจากจุดเริ่ม)
  const fetchAlong = useCallback(async (r: Route, km: number) => {
    alongAbortRef.current?.abort()
    const ctrl = new AbortController()
    alongAbortRef.current = ctrl
    setAlongLoading(true)
    setAlongError('')
    try {
      const res = await fetch(`${API_BASE}/stations/along-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ระยะห่างจุดอย่างน้อย 200 ม. และไม่เกิน ~1,500 จุด (API รับได้สูงสุด 2,000)
        body: JSON.stringify({ coords: thinCoords(r.coords, Math.max(200, r.distance / 1500)), buffer_m: km * 1000 }),
        signal: ctrl.signal,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail ? `API ${res.status}: ${String(body.detail).slice(0, 120)}` : `API error: ${res.status}`)
      }
      const json: { data: Omit<StationAlongRoute, 'key'>[] } = await res.json()
      setAlongStations(json.data.map((s) => ({ ...s, key: stationKey(s) })))
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setAlongStations([])
      setAlongError(err instanceof TypeError ? 'เชื่อมต่อ Backend ไม่ได้' : (err as Error).message)
    } finally {
      if (alongAbortRef.current === ctrl) setAlongLoading(false)
    }
  }, [])

  // คำนวณเส้นทาง จุดเริ่ม → จุดแวะ → ปลายทาง แล้วค้นหาสถานีตลอดเส้นทาง
  const computePlan = useCallback(
    async (o: PlanPoint | null, d: PlanPoint | null, stopList: StationAlongRoute[], km: number) => {
      planAbortRef.current?.abort()
      alongAbortRef.current?.abort()
      if (!o || !d) {
        setPlanRoute(null)
        setAlongStations([])
        setPlanError('')
        setPlanLoading(false)
        setAlongLoading(false)
        setOriginPos(o?.pos ?? null)
        setDestinationPos(d?.pos ?? null)
        return
      }
      const ctrl = new AbortController()
      planAbortRef.current = ctrl
      setPlanLoading(true)
      setPlanError('')
      try {
        let here: LatLng | null = null
        if (o.pos === null || d.pos === null) {
          here = await getCurrentPosition()
          setUserPos(here)
          setUserLocated(true)
        }
        const from = o.pos ?? here!
        const to = d.pos ?? here!
        if (ctrl.signal.aborted) return
        setOriginPos(from)
        setDestinationPos(to)
        if (haversineMeters(from, to) < 50 && stopList.length === 0) throw new Error('จุดเริ่มต้นกับปลายทางเป็นที่เดียวกัน')
        const r = await fetchRoute([from, ...stopList.map(stationPos), to], ctrl.signal)
        if (ctrl.signal.aborted) return
        setPlanRoute(r)
        setPlanLoading(false)
        fitRoute(map, r.coords)
        fetchAlong(r, km)
      } catch (err) {
        if ((err as Error).name === 'AbortError' || ctrl.signal.aborted) return
        setPlanRoute(null)
        setAlongStations([])
        setPlanError(err instanceof TypeError ? 'เชื่อมต่อบริการคำนวณเส้นทางไม่ได้' : (err as Error).message)
        setPlanLoading(false)
      }
    },
    [map, fetchAlong]
  )

  const handleOrigin = useCallback(
    (p: PlanPoint | null) => {
      setOrigin(p)
      setStops([])
      setPickField(null)
      computePlan(p, destination, [], bufferKm)
    },
    [destination, bufferKm, computePlan]
  )

  const handleDestination = useCallback(
    (p: PlanPoint | null) => {
      setDestination(p)
      setStops([])
      setPickField(null)
      computePlan(origin, p, [], bufferKm)
    },
    [origin, bufferKm, computePlan]
  )

  const handleSwap = useCallback(() => {
    const reversed = [...stops].reverse()
    setOrigin(destination)
    setDestination(origin)
    setStops(reversed)
    computePlan(destination, origin, reversed, bufferKm)
  }, [origin, destination, stops, bufferKm, computePlan])

  const handleBuffer = useCallback(
    (km: number) => {
      setBufferKm(km)
      if (planRoute) fetchAlong(planRoute, km)
    },
    [planRoute, fetchAlong]
  )

  const addStop = useCallback(
    (s: StationAlongRoute) => {
      if (stops.some((x) => x.key === s.key)) return
      // จุดแวะเรียงตามลำดับที่จะผ่านบนเส้นทางปัจจุบัน
      const along = (x: StationAlongRoute) => alongStations.find((a) => a.key === x.key)?.distance_along_route_m ?? x.distance_along_route_m
      const next = [...stops, s].sort((a, b) => along(a) - along(b))
      setStops(next)
      closePopup()
      computePlan(origin, destination, next, bufferKm)
    },
    [stops, alongStations, origin, destination, bufferKm, computePlan, closePopup]
  )

  const removeStop = useCallback(
    (s: StationAlongRoute) => {
      const next = stops.filter((x) => x.key !== s.key)
      setStops(next)
      closePopup()
      computePlan(origin, destination, next, bufferKm)
    },
    [stops, origin, destination, bufferKm, computePlan, closePopup]
  )

  // แตะแผนที่เพื่อเลือกจุดเริ่ม/ปลายทาง
  const handleMapClick = useCallback(
    async (pos: LatLng) => {
      if (!pickField) return
      const field = pickField
      setPickField(null)
      const fallback = `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`
      const name = (await reversePlace(pos)) ?? fallback
      const p: PlanPoint = { name, pos }
      if (field === 'origin') handleOrigin(p)
      else handleDestination(p)
    },
    [pickField, handleOrigin, handleDestination]
  )

  // ════════════════ การนำทาง ════════════════

  const requestRoute = useCallback(
    async (from: LatLng, target: NavTarget, fit: boolean) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      lastRerouteRef.current = Date.now()
      setNavLoading(true)
      setNavError('')
      try {
        const remainingPoints = target.points.slice(reachedRef.current)
        const r = await fetchRoute([from, ...remainingPoints], ctrl.signal)
        if (navTargetRef.current !== target) return // ผู้ใช้ยกเลิก/เปลี่ยนปลายทางไปแล้ว
        routeRef.current = r
        setRoute(r)
        if (fit) fitRoute(map, r.coords)
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

  // มุมกล้อง: heading-up → ทิศที่รถวิ่งชี้ขึ้นบนจอ (เอียงเห็นตึก 3D), ไม่งั้นทิศเหนืออยู่บน
  const cameraAngle = useCallback(() => {
    const h = headingRef.current
    const up = navTargetRef.current && followingRef.current && headingUpRef.current && h !== null
    return up ? { bearing: h, pitch: NAV_PITCH } : { bearing: 0, pitch: 0 }
  }, [])

  const applyBearing = useCallback(() => {
    if (!map) return
    const cam = cameraAngle()
    map.easeTo({ ...cam, duration: 500 })
    setMapBearing(-cam.bearing)
  }, [map, cameraAngle])

  // เลื่อนแผนที่ให้รถอยู่ค่อนไปทางล่างของจอ (มองเห็นถนนข้างหน้า)
  const followUser = useCallback(
    (here: LatLng, animate: boolean, zoom?: number) => {
      if (!map) return
      const cam = cameraAngle()
      setMapBearing(-cam.bearing)
      map.easeTo({
        center: [here[1], here[0]],
        offset: [0, map.getContainer().clientHeight * LOOK_AHEAD_RATIO],
        ...cam,
        ...(zoom !== undefined && { zoom }),
        duration: animate ? 800 : 0,
      })
    },
    [map, cameraAngle]
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
  }, [])

  // ติดตามตำแหน่งสด: อัปเดตหมุดผู้ใช้, ผ่านจุดแวะ, เลื่อนแผนที่ตาม, คำนวณเส้นทางใหม่เมื่อออกนอกเส้นทาง
  const startWatching = useCallback(() => {
    stopWatching()
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const here: LatLng = [pos.coords.latitude, pos.coords.longitude]
        setUserPos(here)
        const target = navTargetRef.current
        updateHeading(here, pos.coords)
        if (followingRef.current) followUser(here, true)
        if (!target) return
        // ถึงจุดแวะ → นับว่าผ่านแล้ว (เส้นทางใหม่จะไม่พากลับไปจุดนั้นอีก)
        while (
          reachedRef.current < target.points.length - 1 &&
          haversineMeters(here, target.points[reachedRef.current]) < STOP_ARRIVE_METERS
        ) {
          reachedRef.current += 1
          setReachedStops(reachedRef.current)
        }
        const r = routeRef.current
        if (!r) return
        const { offRouteMeters } = locateOnRoute(r, here)
        if (offRouteMeters > OFF_ROUTE_METERS && Date.now() - lastRerouteRef.current > REROUTE_COOLDOWN_MS) {
          requestRoute(here, target, false)
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    )
  }, [requestRoute, stopWatching, updateHeading, followUser])

  const beginNavigation = useCallback(
    (target: NavTarget, stationKeys: string[]) => {
      closePopup()
      setPickField(null)
      setNavTarget(target)
      navTargetRef.current = target
      setNavStationKeys(stationKeys)
      reachedRef.current = 0
      setReachedStops(0)
      setRoute(null)
      routeRef.current = null
      setNavError('')
      setFollowing(false)
      followingRef.current = false
      setNavLoading(true)
      getCurrentPosition()
        .then((here) => {
          if (navTargetRef.current !== target) return
          setUserPos(here)
          setUserLocated(true)
          requestRoute(here, target, true)
          startWatching()
        })
        .catch((err: Error) => {
          setNavLoading(false)
          setNavError(err.message.startsWith('ต้องอนุญาต') ? 'ต้องอนุญาตการเข้าถึงตำแหน่งก่อนจึงจะนำทางได้' : err.message)
        })
    },
    [closePopup, requestRoute, startWatching]
  )

  // นำทางตรงไปยังสถานีเดียว (เมนูใกล้ฉัน)
  const startNavigation = useCallback(
    (s: StationWithDistance) => {
      setSelectedKey(s.key)
      beginNavigation(
        { title: s.Name, logo: getProviderBrand(s)?.logo ?? null, points: [stationPos(s)], stopNames: [] },
        [s.key]
      )
    },
    [beginNavigation]
  )

  // นำทางตามเส้นทางที่วางแผนไว้ (ผ่านจุดแวะ)
  const startPlanNavigation = useCallback(() => {
    if (!destinationPos || !destination) return
    beginNavigation(
      {
        title: destination.pos === null ? 'ตำแหน่งของฉัน' : destination.name,
        logo: null,
        points: [...stops.map(stationPos), destinationPos],
        stopNames: stops.map((s) => s.Name),
      },
      stops.map((s) => s.key)
    )
  }, [beginNavigation, destination, destinationPos, stops])

  const cancelNavigation = useCallback(() => {
    abortRef.current?.abort()
    stopWatching()
    setNavTarget(null)
    navTargetRef.current = null
    setNavStationKeys([])
    setRoute(null)
    routeRef.current = null
    setNavLoading(false)
    setNavError('')
    headingRef.current = null
    lastHeadingPosRef.current = null
    setHeading(null)
    setMapBearing(0)
    if (mode === 'route' && planRoute) fitRoute(map, planRoute.coords)
    else map?.easeTo({ bearing: 0, pitch: 0, duration: 500 })
  }, [stopWatching, map, mode, planRoute])

  const recenterOnUser = useCallback(() => {
    setFollowing(true)
    followingRef.current = true
    if (!userPos || !map) return
    if (headingRef.current === null) updateHeading(userPos)
    followUser(userPos, false, Math.max(map.getZoom(), NAV_ZOOM))
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

  // ได้ตำแหน่งใหม่ในเมนูใกล้ฉัน → เลื่อนแผนที่ไปที่นั่น
  useEffect(() => {
    if (!map || (position[0] === DEFAULT_POSITION[0] && position[1] === DEFAULT_POSITION[1])) return
    map.flyTo({ center: [position[1], position[0]], zoom: 12, duration: 800 })
  }, [map, position])

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
    if (!route || !userPos || !navTarget) return null
    const loc = locateOnRoute(route, userPos)
    let next = stepIndices.findIndex((idx, i) => i > 0 && idx > loc.index)
    if (next === -1) next = route.steps.length - 1
    const toDest = haversineMeters(userPos, navTarget.points[navTarget.points.length - 1])
    return { remaining: loc.remaining, next, arrived: toDest < ARRIVE_METERS }
  }, [route, userPos, navTarget, stepIndices])

  // ════════════════ เมนูใกล้ฉัน ════════════════

  const fetchNearbyStations = useCallback(async (lat: number, lng: number) => {
    setLoading(true)
    setError('')
    setSelectedKey(null)
    try {
      const res = await fetch(`${API_BASE}/stations/nearby?lat=${lat}&lng=${lng}&radius=${RADIUS_METERS}`)
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
    setLoading(true)
    getCurrentPosition()
      .then(([latitude, longitude]) => {
        setPosition([latitude, longitude])
        setUserPos([latitude, longitude])
        setUserLocated(true)
        fetchNearbyStations(latitude, longitude)
      })
      .catch((err: Error) => {
        setLoading(false)
        setError(err.message.startsWith('ต้องอนุญาต') ? 'กรุณาอนุญาตการเข้าถึงตำแหน่ง' : err.message)
      })
  }, [fetchNearbyStations])

  // โหลดสถานีรอบกรุงเทพฯ ตอนเปิดหน้า (เลื่อนไป tick ถัดไปเพื่อไม่ setState ระหว่าง render effect)
  useEffect(() => {
    const id = setTimeout(() => fetchNearbyStations(DEFAULT_POSITION[0], DEFAULT_POSITION[1]), 0)
    return () => clearTimeout(id)
  }, [fetchNearbyStations])

  const switchMode = useCallback(
    (m: Mode) => {
      if (m === mode) return
      setMode(m)
      setSelectedKey(null)
      setPickField(null)
      closePopup()
      if (!map) return
      if (m === 'route' && planRoute) fitRoute(map, planRoute.coords)
      if (m === 'nearby') map.flyTo({ center: [position[1], position[0]], zoom: 12, duration: 600 })
    },
    [mode, map, planRoute, position, closePopup]
  )

  // ════════════════ สิ่งที่แสดงบนแผนที่ ════════════════

  const navigating = navTarget !== null
  // ระหว่างนำทาง แสดงเฉพาะหมุดสถานีที่เป็นจุดแวะ/ปลายทาง
  const navStations: (Station & { key: string })[] = navigating
    ? [...sortedStations, ...alongStations, ...stops].filter(
        (s, i, arr) => navStationKeys.includes(s.key) && arr.findIndex((x) => x.key === s.key) === i
      )
    : []
  const shownRoute = navigating ? route : mode === 'route' ? planRoute : null

  const destMarkerPos: LatLng | null =
    !navigating && mode === 'route' && destinationPos
      ? destinationPos
      : navigating && navTarget.stopNames.length === navStationKeys.length
        ? navTarget.points[navTarget.points.length - 1]
        : null

  // เนื้อหา popup ของหมุดที่เลือก
  const popup = ((): { pos: LatLng; offset: number; content: React.ReactNode } | null => {
    if (!popupKey) return null
    if (popupKey === 'user') return userPos ? { pos: userPos, offset: 16, content: 'ตำแหน่งของคุณ' } : null
    if (popupKey === 'origin') {
      return !navigating && mode === 'route' && originPos
        ? { pos: originPos, offset: 40, content: <>จุดเริ่มต้น: {origin?.pos === null ? 'ตำแหน่งของฉัน' : origin?.name}</> }
        : null
    }
    if (popupKey === 'destination') {
      return destMarkerPos
        ? {
            pos: destMarkerPos,
            offset: 40,
            content: <>ปลายทาง: {navigating ? navTarget.title : destination?.pos === null ? 'ตำแหน่งของฉัน' : destination?.name}</>,
          }
        : null
    }
    if (navigating) {
      const s = navStations.find((x) => `nav-${x.key}` === popupKey)
      return s ? { pos: stationPos(s), offset: 22, content: <StationPopup station={s} brand={getProviderBrand(s)} actions={null} /> } : null
    }
    if (mode === 'nearby') {
      const s = sortedStations.find((x) => x.key === popupKey)
      if (!s) return null
      return {
        pos: stationPos(s),
        offset: MARKER_SIZE / 2 + 4,
        content: (
          <StationPopup
            station={s}
            brand={getProviderBrand(s)}
            extra={<span className="whitespace-nowrap text-[10px] font-semibold text-primary">{formatDistance(s.distanceKm)}</span>}
            actions={
              <button
                onClick={() => startNavigation(s)}
                className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-2 rounded-lg"
              >
                <NavIcon /> นำทาง
              </button>
            }
          />
        ),
      }
    }
    const s = alongStations.find((x) => x.key === popupKey)
    if (!s) return null
    const stopNo = stops.findIndex((x) => x.key === s.key) + 1
    const isStop = stopNo > 0
    return {
      pos: stationPos(s),
      offset: isStop ? 24 : MARKER_SIZE / 2 + 4,
      content: (
        <StationPopup
          station={s}
          brand={getProviderBrand(s)}
          extra={
            <span className="whitespace-nowrap text-[10px] font-semibold text-primary">
              กม. {(s.distance_along_route_m / 1000).toFixed(1)}
              {s.distance_from_route_m >= 150 && ` · ห่างทาง ${formatMeters(s.distance_from_route_m)}`}
            </span>
          }
          actions={
            <button
              onClick={() => (isStop ? removeStop(s) : addStop(s))}
              className={`mt-2.5 w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg ${
                isStop ? 'bg-white border border-secondary/30 text-secondary hover:bg-secondary/10' : 'bg-secondary hover:bg-secondary-light text-white'
              }`}
            >
              {isStop ? `เอาออกจากจุดแวะ (จุดที่ ${stopNo})` : '+ เพิ่มเป็นจุดแวะพัก'}
            </button>
          }
        />
      ),
    }
  })()

  return (
    <div className="w-full h-full flex flex-col md:flex-row">
      {/* ── แผนที่ ── */}
      <div className="relative flex-1 min-h-0 min-w-0">
        {mode === 'nearby' && !navigating && loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm text-primary flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            กำลังค้นหาสถานีใกล้คุณ...
          </div>
        )}

        {mode === 'nearby' && error && !loading && !navigating && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-sm text-amber-700 flex items-center gap-2 max-w-[90%]">
            <span>⚠️</span>
            <span className="truncate">{error}</span>
            <button
              onClick={() => fetchNearbyStations(position[0], position[1])}
              className="ml-1 text-primary font-semibold hover:underline shrink-0"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {pickField && !navigating && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-secondary text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2">
            🗺️ แตะแผนที่เพื่อเลือก{pickField === 'origin' ? 'จุดเริ่มต้น' : 'ปลายทาง'}
            <button onClick={() => setPickField(null)} className="ml-1 font-semibold underline">ยกเลิก</button>
          </div>
        )}

        {mode === 'nearby' && !navigating && (
          <button
            onClick={handleGetLocation}
            disabled={loading}
            className="absolute bottom-6 right-4 z-[1000] bg-primary text-white font-semibold px-5 py-3 rounded-full shadow-lg hover:bg-primary-dark transition-all disabled:opacity-60 flex items-center gap-2 text-sm"
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
            className="absolute bottom-6 right-4 z-[1000] bg-white text-primary font-semibold px-4 py-2.5 rounded-full shadow-lg hover:bg-primary/5 flex items-center gap-2 text-sm"
          >
            📍 ตำแหน่งฉัน
          </button>
        )}

        <MapGL
          initialViewState={{ longitude: DEFAULT_POSITION[1], latitude: DEFAULT_POSITION[0], zoom: 11 }}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
          cursor={pickField && !navigating ? 'crosshair' : undefined}
          attributionControl={{ compact: true, customAttribution: 'เส้นทาง © <a href="https://project-osrm.org" target="_blank">OSRM</a>' }}
          onLoad={(e) => {
            const m = e.target
            m.touchZoomRotate.disableRotation()
            // MapLibre 6 บางครั้งไม่วาดใหม่หลังโหลด tile เสร็จ (แผนที่ว่างจนกว่าจะขยับ) → สั่งวาดเมื่อ tile โหลดเสร็จ
            let repaintQueued = false
            m.on('sourcedata', (ev) => {
              if (!ev.tile || repaintQueued) return
              repaintQueued = true
              requestAnimationFrame(() => {
                repaintQueued = false
                m.triggerRepaint()
              })
            })
            m.once('idle', () => m.triggerRepaint())
            setRouteBeforeId(applyThaiLabels(m))
            setMap(m)
          }}
          onClick={(e) => {
            if (pickField && !navigating) handleMapClick([e.lngLat.lat, e.lngLat.lng])
          }}
        >
          {shownRoute && (
            <Source id="route" type="geojson" data={routeGeoJSON(shownRoute.coords)}>
              <Layer id="route-casing" type="line" beforeId={routeBeforeId}
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{ 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.9 }} />
              <Layer id="route-line" type="line" beforeId={routeBeforeId}
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{ 'line-color': '#6610f2', 'line-width': 5, 'line-opacity': 0.9 }} />
            </Source>
          )}

          {/* ── เมนูใกล้ฉัน ── */}
          {!navigating && mode === 'nearby' &&
            sortedStations.map((station) => {
              const brand = getProviderBrand(station)
              const [lat, lng] = stationPos(station)
              return (
                <Marker
                  key={station.key}
                  longitude={lng}
                  latitude={lat}
                  style={{ zIndex: station.key === selectedKey ? 3 : 1 }}
                  onClick={(e) => { stop(e); setSelectedKey(station.key); setPopupKey(station.key) }}
                >
                  <StationPin brand={brand} />
                </Marker>
              )
            })}

          {/* ── เมนูค้นหาเส้นทาง ── */}
          {!navigating && mode === 'route' && originPos && (
            <Marker longitude={originPos[1]} latitude={originPos[0]} anchor="bottom" style={{ zIndex: 5 }}
              onClick={(e) => { stop(e); setPopupKey('origin') }}>
              <EndpointPin label="A" color="#6610f2" />
            </Marker>
          )}
          {/* ปลายทาง (B): ตอนวางแผน หรือระหว่างนำทางตามแผน (ปลายทางไม่ใช่สถานี) */}
          {destMarkerPos && (
            <Marker longitude={destMarkerPos[1]} latitude={destMarkerPos[0]} anchor="bottom" style={{ zIndex: 5 }}
              onClick={(e) => { stop(e); setPopupKey('destination') }}>
              <EndpointPin label="B" color="#f74780" />
            </Marker>
          )}

          {!navigating && mode === 'route' &&
            alongStations.map((station) => {
              const brand = getProviderBrand(station)
              const stopNo = stops.findIndex((s) => s.key === station.key) + 1
              const [lat, lng] = stationPos(station)
              return (
                <Marker
                  key={station.key}
                  longitude={lng}
                  latitude={lat}
                  style={{ zIndex: stopNo > 0 ? 4 : station.key === selectedKey ? 3 : 1 }}
                  onClick={(e) => { stop(e); setSelectedKey(station.key); setPopupKey(station.key) }}
                >
                  {stopNo > 0 ? <StopPin brand={brand} n={stopNo} /> : <StationPin brand={brand} />}
                </Marker>
              )
            })}

          {/* จุดแวะที่ไม่อยู่ในรายการสถานีระหว่างทาง (เช่น กำลังโหลดใหม่) */}
          {!navigating && mode === 'route' &&
            stops
              .filter((s) => !alongStations.some((a) => a.key === s.key))
              .map((s, i) => (
                <Marker key={`stop-${s.key}`} longitude={stationPos(s)[1]} latitude={stationPos(s)[0]} style={{ zIndex: 4 }}>
                  <StopPin brand={getProviderBrand(s)} n={stops.indexOf(s) + 1 || i + 1} />
                </Marker>
              ))}

          {/* ── ระหว่างนำทาง: สถานีปลายทาง/จุดแวะ ── */}
          {navigating &&
            navStations.map((station) => {
              const brand = getProviderBrand(station)
              const stopNo = navTarget.stopNames.length > 0 ? navStationKeys.indexOf(station.key) + 1 : 0
              const [lat, lng] = stationPos(station)
              return (
                <Marker key={`nav-${station.key}`} longitude={lng} latitude={lat} style={{ zIndex: 4 }}
                  onClick={(e) => { stop(e); setPopupKey(`nav-${station.key}`) }}>
                  {stopNo > 0 ? <StopPin brand={brand} n={stopNo} /> : <StationPin brand={brand} />}
                </Marker>
              )
            })}

          {userLocated && userPos && (
            <Marker
              longitude={userPos[1]}
              latitude={userPos[0]}
              rotation={navigating && heading !== null ? heading : 0}
              rotationAlignment="map"
              style={{ zIndex: 10 }}
              onClick={(e) => { stop(e); setPopupKey('user') }}
            >
              {navigating && heading !== null ? <UserArrow /> : <UserDot />}
            </Marker>
          )}

          {/* ── popup (ทีละอัน) ── */}
          {popup && (
            <Popup
              key={popupKey}
              longitude={popup.pos[1]}
              latitude={popup.pos[0]}
              offset={popup.offset}
              maxWidth="290px"
              onClose={() => closePopupIf(popupKey!)}
            >
              {popup.content}
            </Popup>
          )}
        </MapGL>
      </div>

      {/* ── แผงขวามือ ── */}
      <aside className="h-[46%] md:h-full md:w-[360px] shrink-0 bg-white border-t md:border-t-0 md:border-l border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,.06)] md:shadow-none z-[500] flex flex-col min-h-0">
        {navTarget ? (
          <NavigationPanel
            target={navTarget}
            reachedStops={reachedStops}
            route={route}
            loading={navLoading}
            error={navError}
            remaining={progress?.remaining ?? null}
            nextStepIndex={progress?.next ?? 1}
            arrived={progress?.arrived ?? false}
            following={following}
            onCancel={cancelNavigation}
            onRetry={() => beginNavigation(navTarget, navStationKeys)}
            onRecenter={recenterOnUser}
            onStepClick={(loc) => {
              setFollowing(false)
              followingRef.current = false
              map?.flyTo({ center: [loc[1], loc[0]], zoom: 16, duration: 500 })
            }}
          />
        ) : (
          <>
            {/* เมนู */}
            <div role="tablist" aria-label="เมนู" className="shrink-0 grid grid-cols-2 gap-1 p-1 m-3 mb-1 bg-light rounded-full">
              {([
                ['nearby', '📍 ใกล้ฉัน'],
                ['route', '🧭 ค้นหาเส้นทาง'],
              ] as const).map(([m, label]) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  className={`py-2 rounded-full font-heading text-[15px] font-medium transition-colors duration-500 ${
                    mode === m ? 'bg-primary text-white shadow-sm' : 'text-dark hover:text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0">
              {mode === 'nearby' ? (
                <StationList
                  stations={sortedStations}
                  selectedKey={selectedKey}
                  onSelect={flyToStation}
                  onNavigate={startNavigation}
                  originLabel={userLocated ? 'ตำแหน่งของคุณ' : 'ใจกลางกรุงเทพฯ'}
                  radiusKm={RADIUS_KM}
                />
              ) : (
                <RoutePlanner
                  origin={origin}
                  destination={destination}
                  pickField={pickField}
                  near={userPos ?? position}
                  onOrigin={handleOrigin}
                  onDestination={handleDestination}
                  onPick={setPickField}
                  onSwap={handleSwap}
                  route={planRoute}
                  routeLoading={planLoading}
                  routeError={planError}
                  stations={alongStations}
                  stationsLoading={alongLoading}
                  stationsError={alongError}
                  bufferKm={bufferKm}
                  onBufferChange={handleBuffer}
                  stops={stops}
                  onAddStop={addStop}
                  onRemoveStop={removeStop}
                  selectedKey={selectedKey}
                  onSelectStation={flyToStation}
                  onStart={startPlanNavigation}
                />
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
