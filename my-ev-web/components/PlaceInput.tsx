'use client'

import { useEffect, useRef, useState } from 'react'
import {
  formatDistanceShort, searchPlaces, searchPlacesDetailed, searchStations, type Place, type StationResult,
} from '@/lib/geocode'
import { getProviderBrand } from '@/lib/providers'
import type { LatLng } from '@/lib/routing'

export interface PlanPoint {
  name: string
  pos: LatLng | null // null = ใช้ตำแหน่งปัจจุบันของผู้ใช้
}

interface Props {
  label: string
  dotClass: string // สีจุดหน้าช่อง เช่น bg-primary/50
  value: PlanPoint | null
  placeholder: string
  allowMyLocation?: boolean
  picking: boolean // กำลังรอให้แตะแผนที่เลือกจุดนี้
  near: LatLng | null // ใช้จัดลำดับผลค้นหาให้ใกล้ตำแหน่งนี้ก่อน
  onChange: (p: PlanPoint | null) => void
  onPickOnMap: () => void
}

// ช่องค้นหาสถานที่ + รายการแนะนำ (พิมพ์แล้วค้นหาอัตโนมัติ)
export default function PlaceInput({
  label, dotClass, value, placeholder, allowMyLocation, picking, near, onChange, onPickOnMap,
}: Props) {
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(false)
  const [results, setResults] = useState<Place[]>([])
  const [stations, setStations] = useState<StationResult[]>([])
  const [searching, setSearching] = useState(false)
  const [detailed, setDetailed] = useState(false) // ผลปัจจุบันมาจากการค้นหาแบบละเอียด (Nominatim)
  const [detailedLoading, setDetailedLoading] = useState(false)
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abort = useRef<AbortController | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  // ปิดรายการแนะนำเมื่อคลิกนอกช่อง
  useEffect(() => {
    if (!editing) return
    const onDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setEditing(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [editing])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
    abort.current?.abort()
  }, [])

  const runSearch = (q: string) => {
    if (timer.current) clearTimeout(timer.current)
    abort.current?.abort()
    setDetailed(false)
    setDetailedLoading(false)
    if (q.trim().length < 2) {
      setResults([])
      setStations([])
      setSearching(false)
      return
    }
    setSearching(true)
    timer.current = setTimeout(async () => {
      const ctrl = new AbortController()
      abort.current = ctrl
      // ค้นสถานที่ (Photon) และสถานีชาร์จ (ฐานข้อมูลของเรา) พร้อมกัน — อันไหนล่มก็ยังแสดงอีกอันได้
      const [places, sts] = await Promise.allSettled([
        searchPlaces(q, near, ctrl.signal),
        searchStations(q, near, ctrl.signal),
      ])
      if (ctrl.signal.aborted) return
      setResults(places.status === 'fulfilled' ? places.value : [])
      setStations(sts.status === 'fulfilled' ? sts.value : [])
      setError(places.status === 'rejected' && sts.status === 'rejected' ? 'ค้นหาไม่ได้ ลองใหม่อีกครั้ง' : '')
      setSearching(false)
    }, 350)
  }

  // ค้นหาแบบละเอียด: ชื่อภาษาไทย ซอย ที่อยู่ (ผู้ใช้กดเองเท่านั้น)
  const runDetailed = async () => {
    const q = text.trim()
    if (q.length < 2 || detailedLoading) return
    if (timer.current) clearTimeout(timer.current)
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setSearching(false)
    setDetailedLoading(true)
    try {
      const found = await searchPlacesDetailed(q, near, ctrl.signal)
      setResults(found)
      setDetailed(true)
      setError('')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError('ค้นหาแบบละเอียดไม่ได้ ลองใหม่อีกครั้ง')
    } finally {
      if (abort.current === ctrl) setDetailedLoading(false)
    }
  }

  const choose = (p: PlanPoint | null) => {
    onChange(p)
    setEditing(false)
    setText('')
    setResults([])
    setStations([])
    setDetailed(false)
  }

  const display = value ? (value.pos === null ? '📍 ตำแหน่งของฉัน' : value.name) : ''

  return (
    <div ref={boxRef} className="relative">
      <label className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} aria-hidden="true" />
        <span className="sr-only">{label}</span>
        <input
          value={editing ? text : display}
          onChange={(e) => {
            setText(e.target.value)
            runSearch(e.target.value)
          }}
          onFocus={() => {
            setEditing(true)
            setText('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (stations[0]) choose({ name: stations[0].Name, pos: [Number(stations[0].Latitude), Number(stations[0].Longitude)] })
              else if (results[0]) choose({ name: results[0].name, pos: results[0].pos })
              else if (!searching) runDetailed()
            }
            if (e.key === 'Escape') setEditing(false)
          }}
          placeholder={picking ? 'แตะบนแผนที่เพื่อเลือกจุด...' : placeholder}
          className="flex-1 min-w-0 bg-transparent text-sm text-dark placeholder:text-gray-400 outline-none"
          aria-label={label}
        />
        {value && !editing && (
          <button
            type="button"
            onClick={() => choose(null)}
            className="shrink-0 text-gray-400 hover:text-gray-700 text-base leading-none"
            aria-label={`ล้าง${label}`}
          >
            ×
          </button>
        )}
      </label>

      {editing && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[1100] bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden">
          {allowMyLocation && (
            <button
              type="button"
              onClick={() => choose({ name: 'ตำแหน่งของฉัน', pos: null })}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 text-secondary font-medium"
            >
              📍 ตำแหน่งของฉัน
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEditing(false)
              onPickOnMap()
            }}
            className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-t border-gray-100"
          >
            🗺️ เลือกจุดบนแผนที่
          </button>
          {searching && <p className="px-3 py-2.5 text-xs text-gray-400 border-t border-gray-100">กำลังค้นหา...</p>}
          {error && <p className="px-3 py-2.5 text-xs text-amber-700 border-t border-gray-100">{error}</p>}

          {(stations.length > 0 || results.length > 0) && (
            <div className="max-h-72 overflow-y-auto border-t border-gray-100">
              {stations.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">⚡ สถานีชาร์จ</p>
                  <ul>
                    {stations.map((st) => {
                      const brand = getProviderBrand(st)
                      return (
                        <li key={`st-${st.Name}-${st.Latitude}-${st.Longitude}`}>
                          <button
                            type="button"
                            onClick={() => choose({ name: st.Name, pos: [Number(st.Latitude), Number(st.Longitude)] })}
                            className="w-full text-left px-3 py-2 hover:bg-primary/5 flex items-center gap-2.5"
                          >
                            {brand ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={brand.logo} alt="" width={24} height={24} className="w-6 h-6 rounded-md shrink-0 border border-gray-100" />
                            ) : (
                              <span className="w-6 h-6 rounded-md shrink-0 bg-primary text-white text-xs flex items-center justify-center">⚡</span>
                            )}
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm text-dark truncate">{st.Name}</span>
                              <span className="block text-[11px] text-gray-500 truncate">
                                {[brand?.name ?? st.Provider, st.Power].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                            {st.distance_m !== null && (
                              <span className="shrink-0 text-[11px] font-semibold text-primary">{formatDistanceShort(st.distance_m)}</span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
              {results.length > 0 && (
                <>
                  <p className={`px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 ${stations.length > 0 ? 'border-t border-gray-100' : ''}`}>
                    📍 สถานที่{detailed ? ' (ค้นหาแบบละเอียด)' : ''}
                  </p>
                  <ul>
                    {results.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => choose({ name: r.name, pos: r.pos })}
                          className="w-full text-left px-3 py-2 hover:bg-primary/5 flex items-center gap-2"
                        >
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-dark truncate">{r.name}</span>
                            {r.detail && <span className="block text-[11px] text-gray-500 truncate">{r.detail}</span>}
                          </span>
                          {r.distanceM !== null && (
                            <span className="shrink-0 text-[11px] text-gray-500">{formatDistanceShort(r.distanceM)}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {!searching && text.trim().length >= 2 && results.length === 0 && stations.length === 0 && !error && !detailedLoading && (
            <p className="px-3 py-2.5 text-xs text-gray-400 border-t border-gray-100">
              {detailed ? 'ไม่พบสถานที่ — ลองพิมพ์ชื่ออื่น หรือเลือกจุดบนแผนที่' : 'ไม่พบในการค้นหาแบบเร็ว'}
            </p>
          )}

          {/* ค้นหาแบบละเอียด (Nominatim) — ชื่อไทย ซอย ที่อยู่ */}
          {!searching && text.trim().length >= 2 && !detailed && (
            <button
              type="button"
              onClick={runDetailed}
              disabled={detailedLoading}
              className="w-full text-left px-3 py-2.5 text-sm border-t border-gray-100 text-secondary font-medium hover:bg-secondary/5 disabled:text-gray-400 flex items-center gap-2"
            >
              🔎 {detailedLoading ? 'กำลังค้นหาแบบละเอียด...' : `ค้นหาแบบละเอียด “${text.trim()}” (ชื่อไทย ซอย ที่อยู่)`}
            </button>
          )}

          <p className="px-3 py-1.5 text-[10px] text-gray-400 bg-gray-50 border-t border-gray-100">
            ค้นหาโดย {detailed ? 'Nominatim' : 'Photon'} · ข้อมูล © OpenStreetMap · สถานีจาก My EV
          </p>
        </div>
      )}
    </div>
  )
}
