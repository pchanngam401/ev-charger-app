'use client'

import { useSyncExternalStore } from 'react'
import { ChevronDown, Zap } from 'lucide-react'
import SiteNavbar from '@/components/site/SiteNavbar'
import MapApp from '@/components/site/MapApp'

// จำว่าผู้ใช้หุบแถบเมนูไว้หรือไม่ (เก็บในเบราว์เซอร์ ถ้าเก็บไม่ได้ก็จำแค่ในหน้านี้)
const KEY = 'myev.headerCollapsed'
const listeners = new Set<() => void>()
let collapsedMemo: boolean | null = null

function getCollapsed(): boolean {
  if (collapsedMemo === null) {
    try {
      collapsedMemo = window.localStorage.getItem(KEY) === '1'
    } catch {
      collapsedMemo = false
    }
  }
  return collapsedMemo
}

function setCollapsed(value: boolean) {
  collapsedMemo = value
  try {
    window.localStorage.setItem(KEY, value ? '1' : '0')
  } catch {
    // โหมดส่วนตัว/บล็อก storage — ใช้ค่าในหน่วยความจำแทน
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// หน้าแผนที่: แถบเมนูหุบได้ เพื่อให้แผนที่ใช้พื้นที่เต็มจอ
export default function MapShell() {
  const collapsed = useSyncExternalStore(subscribe, getCollapsed, () => false)

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* ยุบความสูงแบบนุ่มนวลด้วย grid rows 1fr → 0fr */}
      <div
        className={`grid shrink-0 transition-[grid-template-rows] duration-300 ease-out ${
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        }`}
        inert={collapsed}
      >
        <div className="min-h-0 overflow-hidden">
          <SiteNavbar onCollapse={() => setCollapsed(true)} />
        </div>
      </div>

      <main className="relative flex-1 min-h-0">
        <MapApp />
        {/* มือถือ: มุมซ้ายล่างของแผนที่ (เหนือแผงรายการ 46% · ด้านบนมีป้ายสถานะตรงกลาง) · จอใหญ่: มุมซ้ายบน */}
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="absolute bottom-[calc(46%+1.5rem)] left-4 md:bottom-auto md:top-3 md:left-3 z-[1100] flex items-center gap-1.5 h-11 md:h-10 pl-3 md:pl-2.5 pr-3 rounded-full bg-white/95 backdrop-blur-sm shadow-lg text-primary hover:bg-white transition-colors"
            aria-label="แสดงแถบเมนู"
            title="แสดงแถบเมนู"
          >
            <Zap className="w-5 h-5" fill="currentColor" strokeWidth={1.25} />
            <span className="hidden md:inline font-heading font-bold text-[15px] leading-none">My EV</span>
            <ChevronDown className="w-4 h-4 text-dark rotate-180 md:rotate-0" />
          </button>
        )}
      </main>
    </div>
  )
}
