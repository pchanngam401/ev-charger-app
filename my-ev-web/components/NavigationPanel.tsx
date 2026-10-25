'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDuration, formatMeters, type LatLng, type Route } from '@/lib/routing'

export interface NavTarget {
  title: string // ชื่อปลายทาง
  logo: string | null // โลโก้ผู้ให้บริการ (ถ้าปลายทางเป็นสถานี)
  points: LatLng[] // จุดแวะตามลำดับ + ปลายทาง (ตัวสุดท้าย)
  stopNames: string[] // ชื่อจุดแวะ (ไม่รวมปลายทาง)
}

interface Props {
  target: NavTarget
  reachedStops: number // ผ่านจุดแวะไปแล้วกี่จุด
  route: Route | null
  loading: boolean
  error: string
  remaining: number | null // เมตรที่เหลือ (null = ยังไม่มีตำแหน่งสด)
  nextStepIndex: number
  arrived: boolean
  following: boolean
  onCancel: () => void
  onRetry: () => void
  onRecenter: () => void
  onStepClick: (loc: LatLng) => void
}

function googleMapsUrl(t: NavTarget): string {
  const dest = t.points[t.points.length - 1]
  const params = new URLSearchParams({ api: '1', destination: `${dest[0]},${dest[1]}`, travelmode: 'driving' })
  const way = t.points.slice(0, -1)
  if (way.length) params.set('waypoints', way.map((p) => `${p[0]},${p[1]}`).join('|'))
  return `https://www.google.com/maps/dir/?${params}`
}

// แผงนำทางด้านขวา: สรุประยะ/เวลา + คำสั่งเลี้ยวทีละขั้น
export default function NavigationPanel({
  target, reachedStops, route, loading, error, remaining, nextStepIndex, arrived, following,
  onCancel, onRetry, onRecenter, onStepClick,
}: Props) {
  const stepRefs = useRef<(HTMLLIElement | null)[]>([])
  // เวลาปัจจุบันสำหรับคำนวณเวลาถึง (อัปเดตทุก 30 วินาที)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    stepRefs.current[nextStepIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [nextStepIndex])

  const remainingMeters = remaining ?? route?.distance ?? 0
  // ประมาณเวลาที่เหลือตามสัดส่วนระยะทาง
  const remainingSec = route ? route.duration * (remainingMeters / Math.max(route.distance, 1)) : 0
  const eta = new Date(now + remainingSec * 1000).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  const nextStep = route?.steps[nextStepIndex]

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* หัวแผง: ปลายทาง */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex items-center gap-3">
        {target.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={target.logo} alt="" width={36} height={36} className="w-9 h-9 rounded-lg border border-gray-200 shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-red-500 text-white flex items-center justify-center shrink-0">🏁</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-gray-500">
            กำลังนำทางไป
            {target.stopNames.length > 0 && ` · แวะ ${target.stopNames.length} จุด`}
          </p>
          <h2 className="text-sm font-bold text-gray-900 truncate">{target.title}</h2>
        </div>
        <button
          onClick={onCancel}
          className="shrink-0 text-xs font-semibold text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-full px-3 py-1.5"
        >
          ยกเลิก
        </button>
      </div>

      {loading && !route && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-gray-500">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          กำลังคำนวณเส้นทาง...
        </div>
      )}

      {error && !route && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-amber-700">⚠️ {error}</p>
          <button onClick={onRetry} className="text-sm font-semibold text-emerald-700 hover:underline">ลองใหม่</button>
        </div>
      )}

      {route && (
        <>
          {/* สรุป + คำสั่งถัดไป */}
          <div className="px-4 py-3 shrink-0 bg-emerald-600 text-white">
            {arrived ? (
              <p className="text-base font-bold">🏁 ถึงปลายทางแล้ว</p>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">{formatDuration(remainingSec)}</span>
                  <span className="text-sm opacity-90 tabular-nums">· {formatMeters(remainingMeters)}</span>
                </div>
                <p className="text-xs opacity-80 mt-0.5">ถึงประมาณ {eta} น.{loading ? ' · กำลังคำนวณเส้นทางใหม่...' : ''}</p>
                {reachedStops < target.stopNames.length && (
                  <p className="text-xs mt-1.5 truncate">
                    ⚡ จุดแวะถัดไป ({reachedStops + 1}/{target.stopNames.length}): <b>{target.stopNames[reachedStops]}</b>
                  </p>
                )}
                {nextStep && (
                  <div className="mt-2.5 flex items-center gap-2.5 bg-white/15 rounded-lg px-3 py-2">
                    <span className="text-xl leading-none w-6 text-center">{nextStep.icon}</span>
                    <span className="text-sm font-medium leading-snug">{nextStep.text}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ขั้นตอนทั้งหมด */}
          <ol className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-gray-100">
            {route.steps.map((step, i) => {
              const done = i < nextStepIndex
              const current = i === nextStepIndex && !arrived
              return (
                <li key={i} ref={(el) => { stepRefs.current[i] = el }}>
                  <button
                    onClick={() => onStepClick(step.location)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 ${current ? 'bg-emerald-50' : ''} ${done ? 'opacity-45' : ''}`}
                  >
                    <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm ${current ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {step.icon}
                    </span>
                    <span className="flex-1 min-w-0 text-[13px] text-gray-800 leading-snug">{step.text}</span>
                    {step.distance > 0 && (
                      <span className="shrink-0 text-[11px] text-gray-500 tabular-nums">{formatMeters(step.distance)}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="shrink-0 border-t border-gray-100 px-4 py-2.5 flex items-center justify-between gap-2">
            <button
              onClick={onRecenter}
              disabled={following}
              className="text-xs font-semibold text-emerald-700 disabled:text-gray-400 hover:underline disabled:no-underline"
            >
              {following ? '📍 กำลังติดตามตำแหน่ง' : '📍 กลับไปที่ตำแหน่งฉัน'}
            </button>
            <a
              href={googleMapsUrl(target)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-gray-500 hover:text-gray-700 hover:underline"
            >
              เปิดใน Google Maps ↗
            </a>
          </div>
        </>
      )}
    </div>
  )
}
