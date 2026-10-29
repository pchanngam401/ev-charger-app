'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronUp, Menu, X, Zap } from 'lucide-react'

const LINKS = [
  { href: '/', label: 'หน้าแรก' },
  { href: '/#services', label: 'บริการ' },
  { href: '/#features', label: 'ฟีเจอร์' },
  { href: '/#providers', label: 'ผู้ให้บริการ' },
  { href: '/#faq', label: 'คำถามที่พบบ่อย' },
]

export function Brand() {
  return (
    <span className="flex items-center gap-2.5 text-primary">
      <Zap className="w-8 h-8" fill="currentColor" strokeWidth={1.25} />
      <span className="font-heading font-bold text-[30px] leading-none tracking-tight">My EV</span>
    </span>
  )
}

// แถบเมนูแบบ template: พื้นโปร่ง (ติดด้านบนแล้วเป็นสีม่วงอ่อน), ลิงก์สีเข้ม → ชมพูเมื่อ hover, ปุ่มแคปซูล 2 ปุ่ม
// onCollapse: มีปุ่มหุบแถบเมนู (ใช้ในหน้าแผนที่)
export default function SiteNavbar({ overlay = false, onCollapse }: { overlay?: boolean; onCollapse?: () => void }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!overlay) return
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overlay])

  const solid = !overlay || scrolled || open
  return (
    <header
      className={`${overlay ? 'fixed inset-x-0 top-0' : 'relative'} z-[1200] transition-colors duration-500 ${
        solid ? 'bg-light shadow-[0_2px_20px_rgba(0,0,0,.06)]' : 'bg-transparent'
      }`}
    >
      <nav
        className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 transition-[height] duration-500 ${
          overlay && !scrolled ? 'h-20 lg:h-24' : 'h-16'
        }`}
        aria-label="เมนูหลัก"
      >
        <Link href="/" onClick={() => setOpen(false)} aria-label="My EV หน้าแรก">
          <Brand />
        </Link>

        <div className="hidden lg:flex items-center gap-7 ml-auto mr-4">
          {LINKS.map((l) => {
            const active = l.href === pathname
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`transition-colors duration-500 ${active ? 'text-primary' : 'text-dark hover:text-primary'}`}
                aria-current={active ? 'page' : undefined}
              >
                {l.label}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* หน้าแผนที่มีแท็บสลับเมนูในแผงด้านขวาอยู่แล้ว จึงไม่แสดงปุ่มซ้ำ */}
          {pathname !== '/map' && (
            <>
              <Link href="/map" className="btn btn-outline px-5 py-2 text-sm hidden sm:inline-flex">
                ใกล้ฉัน
              </Link>
              <Link href="/map?mode=route" className="btn btn-primary px-5 py-2 text-sm hidden sm:inline-flex">
                วางแผนเส้นทาง
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden h-10 px-4 rounded-[10px] border border-primary text-primary flex items-center justify-center"
            aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {onCollapse && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onCollapse()
              }}
              className="h-10 w-10 rounded-[10px] border border-gray-300 text-dark hover:border-primary hover:text-primary transition-colors flex items-center justify-center"
              aria-label="ซ่อนแถบเมนู ขยายแผนที่"
              title="ซ่อนแถบเมนู"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          )}
        </div>
      </nav>

      {open && (
        <div className="lg:hidden bg-light border-t border-gray-200 px-4 pb-5 shadow-lg">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block py-2.5 ${l.href === pathname ? 'text-primary' : 'text-dark'}`}
            >
              {l.label}
            </Link>
          ))}
          {pathname !== '/map' && <div className="grid grid-cols-2 gap-2 mt-3">
            <Link href="/map" onClick={() => setOpen(false)} className="btn btn-outline py-2.5">ใกล้ฉัน</Link>
            <Link href="/map?mode=route" onClick={() => setOpen(false)} className="btn btn-primary py-2.5">วางแผนเส้นทาง</Link>
          </div>}
        </div>
      )}
    </header>
  )
}
