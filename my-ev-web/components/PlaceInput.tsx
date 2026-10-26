'use client'

import { useEffect, useRef, useState } from 'react'
import { searchPlaces, type Place } from '@/lib/geocode'
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
  const [searching, setSearching] = useState(false)
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
    if (q.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    timer.current = setTimeout(async () => {
      const ctrl = new AbortController()
      abort.current = ctrl
      try {
        setResults(await searchPlaces(q, near, ctrl.signal))
        setError('')
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError('ค้นหาสถานที่ไม่ได้ ลองใหม่อีกครั้ง')
      } finally {
        if (abort.current === ctrl) setSearching(false)
      }
    }, 350)
  }

  const choose = (p: PlanPoint | null) => {
    onChange(p)
    setEditing(false)
    setText('')
    setResults([])
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
            if (e.key === 'Enter' && results[0]) choose({ name: results[0].name, pos: results[0].pos })
            if (e.key === 'Escape') setEditing(false)
          }}
          placeholder={picking ? 'แตะบนแผนที่เพื่อเลือกจุด...' : placeholder}
          className="flex-1 min-w-0 bg-transparent text-sm text-secondary placeholder:text-gray-400 outline-none"
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
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 text-blue-700 font-medium"
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
          {!searching && text.trim().length >= 2 && results.length === 0 && !error && (
            <p className="px-3 py-2.5 text-xs text-gray-400 border-t border-gray-100">ไม่พบสถานที่</p>
          )}
          {results.length > 0 && (
            <ul className="max-h-60 overflow-y-auto border-t border-gray-100">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => choose({ name: r.name, pos: r.pos })}
                    className="w-full text-left px-3 py-2 hover:bg-primary/5"
                  >
                    <span className="block text-sm text-secondary truncate">{r.name}</span>
                    {r.detail && <span className="block text-[11px] text-gray-500 truncate">{r.detail}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="px-3 py-1.5 text-[10px] text-gray-400 bg-gray-50 border-t border-gray-100">ค้นหาโดย Photon · ข้อมูล © OpenStreetMap</p>
        </div>
      )}
    </div>
  )
}
