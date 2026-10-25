'use client'

import { useEffect, useRef } from 'react'
import type { Station } from '@/types/station'
import { getProviderBrand } from '@/lib/providers'
import { formatDuration, formatMeters, type LatLng, type Route } from '@/lib/routing'
import PlaceInput, { type PlanPoint } from '@/components/PlaceInput'

export interface StationAlongRoute extends Station {
  key: string
  distance_from_route_m: number // ระยะออกจากเส้นทาง
  distance_along_route_m: number // ระยะจากจุดเริ่มตามเส้นทาง
}

export type PickField = 'origin' | 'destination'

export const BUFFER_OPTIONS_KM = [1, 3, 5, 10]

interface Props {
  origin: PlanPoint | null
  destination: PlanPoint | null
  pickField: PickField | null
  near: LatLng | null
  onOrigin: (p: PlanPoint | null) => void
  onDestination: (p: PlanPoint | null) => void
  onPick: (f: PickField) => void
  onSwap: () => void

  route: Route | null
  routeLoading: boolean
  routeError: string

  stations: StationAlongRoute[]
  stationsLoading: boolean
  stationsError: string
  bufferKm: number
  onBufferChange: (km: number) => void

  stops: StationAlongRoute[]
  onAddStop: (s: StationAlongRoute) => void
  onRemoveStop: (s: StationAlongRoute) => void

  selectedKey: string | null
  onSelectStation: (s: StationAlongRoute) => void
  onStart: () => void
}

// เมนูค้นหาเส้นทาง: จุดเริ่ม/ปลายทาง, สรุปเส้นทาง, จุดแวะ, สถานีชาร์จระหว่างทาง
export default function RoutePlanner(props: Props) {
  const {
    origin, destination, pickField, near, onOrigin, onDestination, onPick, onSwap,
    route, routeLoading, routeError, stations, stationsLoading, stationsError, bufferKm, onBufferChange,
    stops, onAddStop, onRemoveStop, selectedKey, onSelectStation, onStart,
  } = props
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const stopKeys = new Set(stops.map((s) => s.key))

  useEffect(() => {
    if (selectedKey) itemRefs.current[selectedKey]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedKey])

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
      {/* ── จุดเริ่ม / ปลายทาง ── */}
      <div className="px-4 pt-3 pb-3 border-b border-gray-100 space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            <PlaceInput
              label="จุดเริ่มต้น"
              dotClass="bg-emerald-500"
              value={origin}
              placeholder="จุดเริ่มต้น"
              allowMyLocation
              picking={pickField === 'origin'}
              near={near}
              onChange={onOrigin}
              onPickOnMap={() => onPick('origin')}
            />
            <PlaceInput
              label="ปลายทาง"
              dotClass="bg-red-500"
              value={destination}
              placeholder="จะไปที่ไหน? ค้นหาสถานที่"
              allowMyLocation
              picking={pickField === 'destination'}
              near={near}
              onChange={onDestination}
              onPickOnMap={() => onPick('destination')}
            />
          </div>
          <button
            type="button"
            onClick={onSwap}
            className="self-center shrink-0 w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            aria-label="สลับจุดเริ่มต้นกับปลายทาง"
            title="สลับจุดเริ่มต้นกับปลายทาง"
          >
            ⇅
          </button>
        </div>
        {pickField && (
          <p className="text-xs text-blue-700 bg-blue-50 rounded-md px-2.5 py-1.5">
            🗺️ แตะบนแผนที่เพื่อเลือก{pickField === 'origin' ? 'จุดเริ่มต้น' : 'ปลายทาง'}
          </p>
        )}
      </div>

      {/* ── สรุปเส้นทาง ── */}
      {routeLoading && (
        <div className="px-4 py-4 flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          กำลังคำนวณเส้นทาง...
        </div>
      )}
      {routeError && !routeLoading && <p className="px-4 py-3 text-sm text-amber-700">⚠️ {routeError}</p>}
      {!route && !routeLoading && !routeError && (
        <div className="px-6 py-8 text-center text-sm text-gray-400">
          ใส่ปลายทางเพื่อดูเส้นทาง
          <br />
          และสถานีชาร์จที่อยู่ระหว่างทาง
        </div>
      )}

      {route && !routeLoading && (
        <>
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-bold text-gray-900 tabular-nums">{formatDuration(route.duration)}</p>
                <p className="text-xs text-gray-500 tabular-nums">
                  {formatMeters(route.distance)}
                  {stops.length > 0 && ` · แวะ ${stops.length} จุด`}
                </p>
              </div>
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                  <path d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z" />
                </svg>
                เริ่มนำทาง
              </button>
            </div>

            {/* จุดแวะที่เลือก */}
            {stops.length > 0 && (
              <ol className="mt-3 space-y-1.5">
                {stops.map((s, i) => {
                  const brand = getProviderBrand(s)
                  return (
                    <li key={s.key} className="flex items-center gap-2 bg-blue-50 rounded-lg pl-1.5 pr-2 py-1.5">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      {brand && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brand.logo} alt="" width={20} height={20} className="w-5 h-5 rounded shrink-0" />
                      )}
                      <button type="button" onClick={() => onSelectStation(s)} className="flex-1 min-w-0 text-left text-xs font-medium text-gray-800 truncate hover:underline">
                        {s.Name}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveStop(s)}
                        className="shrink-0 text-gray-400 hover:text-red-600 text-base leading-none"
                        aria-label={`เอา ${s.Name} ออกจากจุดแวะ`}
                      >
                        ×
                      </button>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          {/* ── สถานีระหว่างทาง ── */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2 bg-gray-50/60">
            <h2 className="text-sm font-bold text-gray-900">
              สถานีระหว่างทาง
              {!stationsLoading && <span className="font-normal text-gray-500"> · {stations.length} แห่ง</span>}
            </h2>
            <label className="flex items-center gap-1 text-xs text-gray-500">
              ห่างทางไม่เกิน
              <select
                value={bufferKm}
                onChange={(e) => onBufferChange(Number(e.target.value))}
                className="border border-gray-200 rounded-md px-1.5 py-0.5 text-xs text-gray-800 bg-white"
              >
                {BUFFER_OPTIONS_KM.map((km) => (
                  <option key={km} value={km}>{km} กม.</option>
                ))}
              </select>
            </label>
          </div>

          {stationsLoading && (
            <div className="px-4 py-4 flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              กำลังค้นหาสถานีตลอดเส้นทาง...
            </div>
          )}
          {stationsError && !stationsLoading && <p className="px-4 py-3 text-sm text-amber-700">⚠️ {stationsError}</p>}
          {!stationsLoading && !stationsError && stations.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-400">ไม่พบสถานีชาร์จในระยะ {bufferKm} กม. จากเส้นทาง</p>
          )}

          {!stationsLoading && stations.length > 0 && (
            <ol className="divide-y divide-gray-100">
              {stations.map((s) => {
                const brand = getProviderBrand(s)
                const isStop = stopKeys.has(s.key)
                const selected = s.key === selectedKey
                return (
                  <li
                    key={s.key}
                    ref={(el) => { itemRefs.current[s.key] = el }}
                    className={`flex gap-3 px-4 py-3 ${selected ? 'bg-emerald-50' : isStop ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                  >
                    <button type="button" onClick={() => onSelectStation(s)} className="shrink-0 self-start" aria-label={`ดู ${s.Name} บนแผนที่`}>
                      {brand ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brand.logo} alt={brand.name} width={40} height={40} className="w-10 h-10 rounded-lg border border-gray-200 object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-lg">⚡</div>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => onSelectStation(s)} className="block w-full text-left">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`text-sm font-semibold leading-snug line-clamp-2 ${selected ? 'text-emerald-800' : 'text-gray-900'}`}>{s.Name}</h3>
                          <span className="shrink-0 text-xs font-semibold text-emerald-700 tabular-nums mt-0.5" title="ระยะจากจุดเริ่มตามเส้นทาง">
                            กม. {(s.distance_along_route_m / 1000).toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {brand?.name ?? s.Provider ?? 'ไม่ระบุผู้ให้บริการ'}
                          {' · '}
                          {s.distance_from_route_m < 150 ? 'ติดเส้นทาง' : `ห่างทาง ${formatMeters(s.distance_from_route_m)}`}
                        </p>
                      </button>
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        {s.Power && <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-1.5 py-0.5 rounded">{s.Power}</span>}
                        {s.description && (
                          <span className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded truncate max-w-[9rem]">{s.description.split('\n')[0]}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => (isStop ? onRemoveStop(s) : onAddStop(s))}
                          className={`ml-auto inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                            isStop
                              ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                              : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'
                          }`}
                          aria-label={isStop ? `เอา ${s.Name} ออกจากจุดแวะ` : `เพิ่ม ${s.Name} เป็นจุดแวะ`}
                        >
                          {isStop ? '✓ จุดแวะ' : '+ แวะพัก'}
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </>
      )}
    </div>
  )
}
