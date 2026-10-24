// คำนวณเส้นทางขับรถด้วย OSRM (ฟรี ไม่ต้องใช้ API key)
// เปลี่ยนเซิร์ฟเวอร์ได้ด้วย NEXT_PUBLIC_ROUTING_URL เช่น OSRM ที่ host เอง
const ROUTING_URL = process.env.NEXT_PUBLIC_ROUTING_URL || 'https://router.project-osrm.org'

export type LatLng = [number, number]

export interface RouteStep {
  text: string
  icon: string
  distance: number // เมตร
  location: LatLng
}

export interface Route {
  distance: number // เมตร
  duration: number // วินาที
  coords: LatLng[]
  cumulative: number[] // ระยะสะสมจากจุดเริ่มถึงแต่ละจุดบนเส้นทาง (เมตร)
  steps: RouteStep[]
}

interface OsrmStep {
  distance: number
  name: string
  ref?: string
  maneuver: { type: string; modifier?: string; location: [number, number]; exit?: number }
}

const MODIFIER_TEXT: Record<string, string> = {
  left: 'เลี้ยวซ้าย',
  right: 'เลี้ยวขวา',
  'slight left': 'เบี่ยงซ้าย',
  'slight right': 'เบี่ยงขวา',
  'sharp left': 'เลี้ยวซ้ายหักศอก',
  'sharp right': 'เลี้ยวขวาหักศอก',
  straight: 'ตรงไป',
  uturn: 'กลับรถ',
}

const MODIFIER_ICON: Record<string, string> = {
  left: '↰',
  right: '↱',
  'slight left': '↖',
  'slight right': '↗',
  'sharp left': '↰',
  'sharp right': '↱',
  straight: '↑',
  uturn: '↶',
}

// แปลง maneuver ของ OSRM เป็นคำสั่งภาษาไทย
function instruction(step: OsrmStep): { text: string; icon: string } {
  const { type, modifier, exit } = step.maneuver
  const road = step.name || step.ref || ''
  const onto = road ? ` เข้าสู่${road}` : ''
  const mod = modifier ? MODIFIER_TEXT[modifier] ?? 'ไปต่อ' : 'ไปต่อ'
  const icon = modifier ? MODIFIER_ICON[modifier] ?? '↑' : '↑'
  const side = modifier?.includes('left') ? 'ซ้าย' : modifier?.includes('right') ? 'ขวา' : ''

  switch (type) {
    case 'depart':
      return { text: road ? `ออกเดินทางตาม${road}` : 'ออกเดินทาง', icon: '🚗' }
    case 'arrive':
      return { text: side ? `ถึงที่หมาย อยู่ทาง${side}มือ` : 'ถึงที่หมาย', icon: '🏁' }
    case 'new name':
      return { text: road ? `ตรงไปตาม${road}` : 'ตรงไป', icon: '↑' }
    case 'continue':
      return { text: modifier === 'straight' || !modifier ? `ตรงไป${onto}` : `${mod}${onto}`, icon }
    case 'fork':
      return { text: `ชิด${side || 'ตรง'}ที่ทางแยก${onto}`, icon }
    case 'merge':
      return { text: `เบี่ยง${side}เข้าทางหลัก${onto}`, icon }
    case 'on ramp':
      return { text: `ขึ้นทางลาด${side ? 'ด้าน' + side : ''}${onto}`, icon }
    case 'off ramp':
      return { text: `ลงทางลาด${side ? 'ด้าน' + side : ''}${onto}`, icon }
    case 'roundabout':
    case 'rotary':
      return { text: exit ? `เข้าวงเวียน แล้วออกทางออกที่ ${exit}${onto}` : `เข้าวงเวียน${onto}`, icon: '⟳' }
    case 'exit roundabout':
    case 'exit rotary':
      return { text: `ออกจากวงเวียน${onto}`, icon: '⟳' }
    case 'end of road':
      return { text: `สุดทาง${mod}${onto}`, icon }
    default:
      return { text: `${mod}${onto}`, icon }
  }
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export async function fetchRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<Route> {
  const url = `${ROUTING_URL}/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`คำนวณเส้นทางไม่สำเร็จ (${res.status})`)
  const json = await res.json()
  if (json.code !== 'Ok' || !json.routes?.length) throw new Error('ไม่พบเส้นทางไปยังสถานีนี้')

  const r = json.routes[0]
  const coords: LatLng[] = r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]])
  const cumulative = [0]
  for (let i = 1; i < coords.length; i++) cumulative.push(cumulative[i - 1] + haversineMeters(coords[i - 1], coords[i]))

  const steps: RouteStep[] = r.legs.flatMap((leg: { steps: OsrmStep[] }) =>
    leg.steps.map((s) => ({
      ...instruction(s),
      distance: s.distance,
      location: [s.maneuver.location[1], s.maneuver.location[0]] as LatLng,
    }))
  )
  return { distance: r.distance, duration: r.duration, coords, cumulative, steps }
}

// หาจุดบนเส้นทางที่ใกล้ตำแหน่งปัจจุบันที่สุด → ใช้คำนวณระยะที่เหลือและตรวจว่าออกนอกเส้นทางหรือไม่
export function locateOnRoute(route: Route, pos: LatLng): { index: number; offRouteMeters: number; remaining: number } {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < route.coords.length; i++) {
    const d = haversineMeters(pos, route.coords[i])
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  const total = route.cumulative[route.cumulative.length - 1] || 1
  return { index: best, offRouteMeters: bestDist, remaining: Math.max(0, total - route.cumulative[best]) }
}

export function formatMeters(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} ม.` : `${(m / 1000).toFixed(1)} กม.`
}

export function formatDuration(sec: number): string {
  const min = Math.max(1, Math.round(sec / 60))
  if (min < 60) return `${min} นาที`
  const h = Math.floor(min / 60)
  return `${h} ชม. ${min % 60} นาที`
}
