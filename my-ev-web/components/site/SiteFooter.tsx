import Link from 'next/link'
import { Copyright, Database, MapPin, Route, Search } from 'lucide-react'

// footer แบบ template: พื้นม่วงจาง 4 คอลัมน์ + แถบลิขสิทธิ์สีเข้ม
export default function SiteFooter() {
  return (
    <footer>
      <div className="footer">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 grid gap-10 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col">
            <h4 className="text-2xl mb-5">My EV</h4>
            <Link className="footer-link" href="/#about">ทำไมต้อง My EV?</Link>
            <Link className="footer-link" href="/#services">บริการของเรา</Link>
            <Link className="footer-link" href="/#features">ฟีเจอร์</Link>
            <Link className="footer-link" href="/#faq">คำถามที่พบบ่อย</Link>
          </div>
          <div className="flex flex-col">
            <h4 className="text-2xl mb-5">เมนูลัด</h4>
            <Link className="footer-link" href="/map">ค้นหาสถานีใกล้ฉัน</Link>
            <Link className="footer-link" href="/map?mode=route">วางแผนเส้นทาง</Link>
            <Link className="footer-link" href="/#providers">ผู้ให้บริการที่รองรับ</Link>
            <Link className="footer-link" href="/">หน้าแรก</Link>
          </div>
          <div className="flex flex-col">
            <h4 className="text-2xl mb-5">บริการ</h4>
            <Link className="footer-link" href="/map">สถานีชาร์จใกล้ตัว</Link>
            <Link className="footer-link" href="/map?mode=route">สถานีระหว่างทาง</Link>
            <Link className="footer-link" href="/map?mode=route">จุดแวะชาร์จ</Link>
            <Link className="footer-link" href="/map">นำทางในแอป</Link>
          </div>
          <div className="flex flex-col">
            <h4 className="text-2xl mb-5">แหล่งข้อมูล</h4>
            <p className="leading-[35px] flex items-center gap-2 text-dark"><MapPin className="w-4 h-4 text-secondary" />แผนที่ © OpenStreetMap</p>
            <p className="leading-[35px] flex items-center gap-2 text-dark"><Route className="w-4 h-4 text-secondary" />เส้นทางโดย OSRM</p>
            <p className="leading-[35px] flex items-center gap-2 text-dark"><Search className="w-4 h-4 text-secondary" />ค้นหาสถานที่โดย Photon</p>
            <p className="leading-[35px] flex items-center gap-2 text-dark"><Database className="w-4 h-4 text-secondary" />ข้อมูลสถานีบน Supabase</p>
          </div>
        </div>
      </div>

      <div className="bg-dark py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-2 items-center justify-between text-sm text-white">
          <p className="flex items-center gap-2">
            <Copyright className="w-4 h-4 text-light" />
            <span>
              <Link href="/" className="text-primary">My EV</Link>, สงวนลิขสิทธิ์ {new Date().getFullYear()}
            </span>
          </p>
          {/* ตามสัญญาอนุญาตของ template ต้องคงลิงก์เครดิตผู้ออกแบบไว้ */}
          <p>
            Designed By{' '}
            <a className="border-b border-white/50 text-primary" href="https://htmlcodex.com" target="_blank" rel="noopener">
              HTML Codex
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
