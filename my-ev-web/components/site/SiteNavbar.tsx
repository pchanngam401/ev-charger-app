'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, Zap } from 'lucide-react'

const LINKS = [
  { href: '/', label: 'หน้าแรก' },
  { href: '/#features', label: 'ฟีเจอร์' },
  { href: '/#providers', label: 'ผู้ให้บริการ' },
  { href: '/#how', label: 'วิธีใช้งาน' },
  { href: '/map', label: 'แผนที่' },
]

export function Brand({ light = true }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`w-9 h-9 rounded-[3px] flex items-center justify-center ${light ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
        <Zap className="w-5 h-5" fill="currentColor" strokeWidth={1.5} />
      </span>
      <span className={`font-heading font-bold text-[28px] leading-none tracking-tight ${light ? 'text-white' : 'text-secondary'}`}>My EV</span>
    </span>
  )
}

// แถบเมนูแบบ template: พื้นแดง, ลิงก์สีกรมท่า (เมนูที่เปิดอยู่เป็นสีขาว), ปุ่มสีกรมท่าด้านขวา
export default function SiteNavbar({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className={`${overlay ? 'absolute inset-x-0 top-0' : 'relative bg-primary shadow-sm'} z-[1200]`}>
      <nav className={`mx-auto max-w-7xl px-4 sm:px-6 ${overlay ? 'h-16 lg:h-20' : 'h-16'} flex items-center justify-between gap-4`} aria-label="เมนูหลัก">
        <Link href="/" onClick={() => setOpen(false)} aria-label="My EV หน้าแรก">
          <Brand />
        </Link>

        <div className="hidden lg:flex items-center gap-8 font-sans text-lg">
          {LINKS.map((l) => {
            const active = l.href === pathname
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`transition-colors ${active ? 'text-white' : 'text-secondary hover:text-white'}`}
                aria-current={active ? 'page' : undefined}
              >
                {l.label}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          {pathname !== '/map' && (
            <Link href="/map" className="btn btn-secondary px-4 py-2 text-sm hidden sm:inline-flex">
              เปิดแผนที่
            </Link>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden w-10 h-10 rounded-[3px] border border-white/40 text-white flex items-center justify-center"
            aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="lg:hidden bg-primary border-t border-white/15 px-4 pb-4 shadow-lg">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block py-2.5 text-base ${l.href === pathname ? 'text-white font-medium' : 'text-secondary'}`}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/map" onClick={() => setOpen(false)} className="btn btn-secondary w-full py-2.5 mt-2">
            เปิดแผนที่
          </Link>
        </div>
      )}
    </header>
  )
}
