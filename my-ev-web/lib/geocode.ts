import { haversineMeters, type LatLng } from '@/lib/routing'
import type { Station } from '@/types/station'

// ค้นหาสถานที่ด้วย Photon (OpenStreetMap) — ฟรี รองรับการพิมพ์ค้นหาแบบ autocomplete
// เปลี่ยนเซิร์ฟเวอร์ได้ด้วย NEXT_PUBLIC_GEOCODER_URL
const GEOCODER_URL = process.env.NEXT_PUBLIC_GEOCODER_URL || 'https://photon.komoot.io'
// ค้นหาเพิ่มเติมด้วย Nominatim (รู้จักชื่อภาษาไทย/ซอย/บ้านเลขที่ดีกว่า) — ใช้เมื่อผู้ใช้กดค้นหาเท่านั้น ตามนโยบายห้าม autocomplete
const NOMINATIM_URL = process.env.NEXT_PUBLIC_NOMINATIM_URL || 'https://nominatim.openstreetmap.org'
const THAILAND_BBOX = '97.3,5.6,105.7,20.5'
const PHOTON_FETCH = 15 // ดึงมาเผื่อแล้วจัดลำดับใหม่ตามระยะทาง
const PLACE_SHOW = 7

export interface Place {
  id: string
  name: string
  detail: string // อำเภอ/จังหวัด
  pos: LatLng
  distanceM: number | null // ระยะจากตำแหน่งผู้ใช้
}

export type StationResult = Station & { match: 'name' | 'provider' | 'address'; distance_m: number | null }

// ระยะทางมีผลต่อลำดับแบบลอการิทึม: ใกล้กว่าขึ้นก่อน แต่ชื่อที่ตรงมากของ Photon ยังไม่หลุดลงไปไกล
function rerankByDistance(list: Place[]): Place[] {
  return list
    .map((p, i) => ({ p, score: i + (p.distanceM === null ? 0 : 3 * Math.log10(1 + p.distanceM / 1000)) }))
    .sort((a, b) => a.score - b.score)
    .map((x) => x.p)
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    osm_id?: number
    osm_type?: string
    name?: string
    street?: string
    housenumber?: string
    district?: string
    city?: string
    county?: string
    state?: string
  }
}

export async function searchPlaces(query: string, near?: LatLng | null, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const params = new URLSearchParams({ q, limit: String(PHOTON_FETCH), lang: 'default', bbox: THAILAND_BBOX })
  if (near) {
    params.set('lat', near[0].toFixed(4))
    params.set('lon', near[1].toFixed(4))
  }
  const res = await fetch(`${GEOCODER_URL}/api/?${params}`, { signal })
  if (!res.ok) throw new Error(`ค้นหาสถานที่ไม่สำเร็จ (${res.status})`)
  const json: { features: PhotonFeature[] } = await res.json()

  const seen = new Set<string>()
  const out: Place[] = []
  for (const f of json.features ?? []) {
    const p = f.properties
    const name = p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || p.city || p.state
    if (!name) continue
    const pos: LatLng = [f.geometry.coordinates[1], f.geometry.coordinates[0]]
    const key = `${name}|${pos[0].toFixed(3)}|${pos[1].toFixed(3)}`
    if (seen.has(key)) continue
    seen.add(key)
    const detail = [p.district, p.city ?? p.county, p.state].filter((x, i, a) => x && x !== name && a.indexOf(x) === i).join(' · ')
    out.push({ id: `${p.osm_type ?? ''}${p.osm_id ?? key}`, name, detail, pos, distanceM: near ? haversineMeters(near, pos) : null })
  }
  return rerankByDistance(out).slice(0, PLACE_SHOW)
}

interface NominatimResult {
  place_id: number
  lat: string
  lon: string
  name?: string
  display_name: string
}

// ค้นหาแบบละเอียด (ชื่อไทย ซอย ที่อยู่) — เรียกเมื่อผู้ใช้กดค้นหาเพิ่มเติม/Enter เท่านั้น
export async function searchPlacesDetailed(query: string, near?: LatLng | null, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const params = new URLSearchParams({ q, format: 'jsonv2', limit: '10', countrycodes: 'th', 'accept-language': 'th' })
  if (near) {
    // ให้น้ำหนักพื้นที่รอบผู้ใช้ (~50 กม.) แต่ยังค้นนอกกรอบได้
    params.set('viewbox', [near[1] - 0.5, near[0] + 0.5, near[1] + 0.5, near[0] - 0.5].map((x) => x.toFixed(4)).join(','))
  }
  const res = await fetch(`${NOMINATIM_URL}/search?${params}`, { signal })
  if (!res.ok) throw new Error(`ค้นหาสถานที่ไม่สำเร็จ (${res.status})`)
  const json: NominatimResult[] = await res.json()
  const seen = new Set<string>()
  const out: Place[] = []
  for (const r of json) {
    const parts = r.display_name.split(',').map((x) => x.trim()).filter(Boolean)
    const name = r.name || parts[0]
    if (!name) continue
    const pos: LatLng = [Number(r.lat), Number(r.lon)]
    const key = `${name}|${pos[0].toFixed(3)}|${pos[1].toFixed(3)}`
    if (seen.has(key)) continue
    seen.add(key)
    // ตัดชื่อซ้ำ รหัสไปรษณีย์ และประเทศออกจากรายละเอียด
    const detail = parts.filter((x) => x !== name && !/^\d{5}$/.test(x) && x !== 'ประเทศไทย').slice(-3).join(' · ')
    out.push({ id: `nom-${r.place_id}`, name, detail, pos, distanceM: near ? haversineMeters(near, pos) : null })
  }
  return rerankByDistance(out).slice(0, PLACE_SHOW)
}

// ค้นหาสถานีชาร์จในฐานข้อมูลของเรา (ชื่อ/ผู้ให้บริการ/ที่อยู่) เรียงจากใกล้ตำแหน่งผู้ใช้
export async function searchStations(query: string, near?: LatLng | null, signal?: AbortSignal): Promise<StationResult[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const params = new URLSearchParams({ q, limit: '5' })
  if (near) {
    params.set('lat', near[0].toFixed(5))
    params.set('lng', near[1].toFixed(5))
  }
  const res = await fetch(`/api/stations/search?${params}`, { signal })
  if (!res.ok) throw new Error(`ค้นหาสถานีไม่สำเร็จ (${res.status})`)
  const json: { data: StationResult[] } = await res.json()
  return json.data ?? []
}

export function formatDistanceShort(m: number | null): string {
  if (m === null) return ''
  return m < 1000 ? `${Math.round(m / 10) * 10} ม.` : m < 100000 ? `${(m / 1000).toFixed(1)} กม.` : `${Math.round(m / 1000)} กม.`
}

// หาชื่อสถานที่จากพิกัด (ใช้ตอนแตะเลือกจุดบนแผนที่)
export async function reversePlace(pos: LatLng, signal?: AbortSignal): Promise<string | null> {
  try {
    const params = new URLSearchParams({ lat: pos[0].toFixed(6), lon: pos[1].toFixed(6), lang: 'default', limit: '1' })
    const res = await fetch(`${GEOCODER_URL}/reverse?${params}`, { signal })
    if (!res.ok) return null
    const json: { features: PhotonFeature[] } = await res.json()
    const p = json.features?.[0]?.properties
    if (!p) return null
    return p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || p.district || p.city || p.state || null
  } catch {
    return null
  }
}
