import Link from 'next/link'
import { Database, MapPin, Route, Search } from 'lucide-react'
import { Brand } from '@/components/site/SiteNavbar'

// footer แบบ template: พื้นกรมท่า 4 คอลัมน์ + แถบลิขสิทธิ์
export default function SiteFooter() {
  return (
    <footer className="bg-secondary text-white/55">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="inline-block mb-4" aria-label="My EV หน้าแรก">
            <Brand />
          </Link>
          <p className="leading-relaxed">
            ค้นหาสถานีชาร์จรถยนต์ไฟฟ้าทั่วประเทศไทย วางแผนเส้นทางพร้อมจุดแวะชาร์จ และนำทางได้ในแอปเดียว
          </p>
        </div>

        <div>
          <h4 className="text-white text-xl mb-5">เมนู</h4>
          <Link className="footer-link" href="/">หน้าแรก</Link>
          <Link className="footer-link" href="/#features">ฟีเจอร์</Link>
          <Link className="footer-link" href="/#providers">ผู้ให้บริการ</Link>
          <Link className="footer-link" href="/#how">วิธีใช้งาน</Link>
          <Link className="footer-link" href="/map">แผนที่สถานีชาร์จ</Link>
        </div>

        <div>
          <h4 className="text-white text-xl mb-5">ข้อมูลและบริการ</h4>
          <p className="flex items-center gap-3 mb-3"><MapPin className="w-4 h-4 shrink-0" />แผนที่ © OpenStreetMap</p>
          <p className="flex items-center gap-3 mb-3"><Route className="w-4 h-4 shrink-0" />เส้นทางโดย OSRM</p>
          <p className="flex items-center gap-3 mb-3"><Search className="w-4 h-4 shrink-0" />ค้นหาสถานที่โดย Photon</p>
          <p className="flex items-center gap-3"><Database className="w-4 h-4 shrink-0" />ข้อมูลสถานีบน Supabase</p>
        </div>

        <div>
          <h4 className="text-white text-xl mb-5">เริ่มใช้งาน</h4>
          <p className="mb-4">เปิดแผนที่แล้วกด &quot;ค้นหาใกล้ฉัน&quot; หรือวางแผนทริปพร้อมจุดแวะชาร์จได้ทันที ไม่ต้องสมัครสมาชิก</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/map" className="btn btn-primary px-4 py-2 text-sm">ใกล้ฉัน</Link>
            <Link href="/map?mode=route" className="btn btn-outline-light px-4 py-1.5 text-sm">ค้นหาเส้นทาง</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="border-t border-white/10 py-6 flex flex-col md:flex-row gap-3 items-center justify-between text-sm">
          <p className="text-center md:text-left">
            &copy; {new Date().getFullYear()} <Link href="/" className="border-b border-white/30 hover:text-white">My EV</Link>, สงวนลิขสิทธิ์
            {/* ตามสัญญาอนุญาตของ template ต้องคงลิงก์เครดิตผู้ออกแบบไว้ */}
            {' · '}Designed By{' '}
            <a className="border-b border-white/30 hover:text-white" href="https://htmlcodex.com" target="_blank" rel="noopener">
              HTML Codex
            </a>
          </p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white">หน้าแรก</Link>
            <span className="text-white/20">|</span>
            <Link href="/map" className="hover:text-white">แผนที่</Link>
            <span className="text-white/20">|</span>
            <Link href="/map?mode=route" className="hover:text-white">วางแผนเส้นทาง</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
