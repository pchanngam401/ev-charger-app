import type { LatLng } from '@/lib/routing'

// ค้นหาสถานที่ด้วย Photon (OpenStreetMap) — ฟรี รองรับการพิมพ์ค้นหาแบบ autocomplete
// เปลี่ยนเซิร์ฟเวอร์ได้ด้วย NEXT_PUBLIC_GEOCODER_URL
const GEOCODER_URL = process.env.NEXT_PUBLIC_GEOCODER_URL || 'https://photon.komoot.io'
const THAILAND_BBOX = '97.3,5.6,105.7,20.5'

export interface Place {
  id: string
  name: string
  detail: string // อำเภอ/จังหวัด
  pos: LatLng
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
  const params = new URLSearchParams({ q, limit: '7', lang: 'default', bbox: THAILAND_BBOX })
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
    out.push({ id: `${p.osm_type ?? ''}${p.osm_id ?? key}`, name, detail, pos })
  }
  return out
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
