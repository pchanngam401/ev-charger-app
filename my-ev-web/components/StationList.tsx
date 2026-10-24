'use client'

import { useEffect, useRef } from 'react'
import type { Station } from '@/types/station'
import { getProviderBrand } from '@/lib/providers'

export interface StationWithDistance extends Station {
  key: string
  distanceKm: number
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} ม.` : `${km.toFixed(1)} กม.`
}

interface Props {
  stations: StationWithDistance[]
  selectedKey: string | null
  onSelect: (station: StationWithDistance) => void
  onNavigate: (station: StationWithDistance) => void
  originLabel: string
  radiusKm: number
}

// กล่องรายการสถานีด้านขวา เรียงจากใกล้สุด เลื่อนดูได้
export default function StationList({ stations, selectedKey, onSelect, onNavigate, originLabel, radiusKm }: Props) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // เมื่อเลือกสถานีจากหมุดบนแผนที่ ให้เลื่อนรายการไปหาสถานีนั้น
  useEffect(() => {
    if (selectedKey) itemRefs.current[selectedKey]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedKey])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <h2 className="font-bold text-gray-900 text-sm">
          พบ {stations.length} สถานี
          <span className="font-normal text-gray-500"> · รัศมี {radiusKm} กม.</span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">เรียงจากใกล้สุด · วัดจาก{originLabel}</p>
      </div>

      {stations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400 px-6 text-center">
          ยังไม่มีสถานีในพื้นที่นี้
        </div>
      ) : (
        <ol className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-gray-100">
          {stations.map((s, i) => {
            const brand = getProviderBrand(s)
            const selected = s.key === selectedKey
            return (
              <li key={s.key} className={`relative ${selected ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                <button
                  ref={(el) => { itemRefs.current[s.key] = el }}
                  onClick={() => onSelect(s)}
                  className="w-full text-left pl-4 pr-4 pt-3 pb-12 flex gap-3 items-start transition-colors focus:outline-none focus-visible:bg-emerald-100/60"
                >
                  <div className="relative shrink-0">
                    {brand ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-lg border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-lg">⚡</div>
                    )}
                    <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gray-900 text-white text-[10px] font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm font-semibold leading-snug line-clamp-2 ${selected ? 'text-emerald-800' : 'text-gray-900'}`}>
                        {s.Name}
                      </h3>
                      <span className="shrink-0 text-xs font-semibold text-emerald-700 tabular-nums mt-0.5">
                        {formatDistance(s.distanceKm)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{brand?.name ?? s.Provider ?? 'ไม่ระบุผู้ให้บริการ'}</p>
                    {(s.Power || s.description) && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.Power && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-1.5 py-0.5 rounded">{s.Power}</span>
                        )}
                        {s.description && (
                          <span className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded truncate max-w-full">
                            {s.description.split('\n')[0]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
                {/* ปุ่มนำทาง (แยกจากปุ่มเลือกรายการ) */}
                <button
                  onClick={() => onNavigate(s)}
                  className="absolute left-[68px] bottom-3 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold pl-2.5 pr-3 py-1.5 rounded-full shadow-sm transition-colors"
                  aria-label={`นำทางไป ${s.Name}`}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
                    <path d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z" />
                  </svg>
                  นำทาง
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
