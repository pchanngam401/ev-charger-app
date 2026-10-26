/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import {
  ArrowRight, BatteryCharging, Check, Compass, Gift, MapPin, MapPinned, Navigation, Plug, Route, Search, Smartphone, Zap,
} from 'lucide-react'
import SiteNavbar from '@/components/site/SiteNavbar'
import SiteFooter from '@/components/site/SiteFooter'
import HeroIllustration from '@/components/site/HeroIllustration'
import { PROVIDERS } from '@/lib/providers'

const STATS = [
  { icon: MapPin, value: '2,600+', label: 'สถานีชาร์จทั่วประเทศ' },
  { icon: Plug, value: `${Object.keys(PROVIDERS).length}`, label: 'ผู้ให้บริการ' },
  { icon: Navigation, value: 'ภาษาไทย', label: 'นำทางทีละขั้น' },
  { icon: Gift, value: 'ฟรี', label: 'ไม่ต้องสมัครสมาชิก' },
]

const FEATURES = [
  {
    icon: MapPin,
    title: 'ค้นหาใกล้ฉัน',
    text: 'กดปุ่มเดียวก็เห็นสถานีชาร์จรอบตัวในรัศมี 10 กม. เรียงจากใกล้สุด พร้อมโลโก้ผู้ให้บริการบนแผนที่',
    href: '/map',
    cta: 'ค้นหาสถานี',
  },
  {
    icon: Route,
    title: 'วางแผนเส้นทาง',
    text: 'ค้นหาปลายทางด้วยชื่อสถานที่ แล้วดูสถานีชาร์จตลอดเส้นทาง เรียงตามกิโลเมตรที่จะผ่าน',
    href: '/map?mode=route',
    cta: 'วางแผนทริป',
  },
  {
    icon: BatteryCharging,
    title: 'เพิ่มจุดแวะชาร์จ',
    text: 'กด "+ แวะพัก" ที่สถานีระหว่างทาง ระบบจะคำนวณเส้นทางใหม่ให้ผ่านจุดแวะตามลำดับ',
    href: '/map?mode=route',
    cta: 'ลองเพิ่มจุดแวะ',
  },
  {
    icon: Navigation,
    title: 'นำทางในแอป',
    text: 'บอกทางเลี้ยวเป็นภาษาไทย อัปเดตระยะทางและเวลาถึงแบบสด และคำนวณเส้นทางใหม่เมื่อออกนอกเส้นทาง',
    href: '/map',
    cta: 'เริ่มนำทาง',
  },
  {
    icon: Compass,
    title: 'แผนที่หมุนตามรถ',
    text: 'ถนนข้างหน้าชี้ขึ้นบนจอเสมอ มีเข็มทิศสลับเป็นทิศเหนือขึ้นได้ทุกเมื่อ',
    href: '/map',
    cta: 'ดูแผนที่',
  },
  {
    icon: Plug,
    title: 'ข้อมูลหัวชาร์จ',
    text: 'ดูประเภทหัวชาร์จ (CCS2, Type 2) กำลังไฟ และที่อยู่ของแต่ละสถานีก่อนออกเดินทาง',
    href: '/map',
    cta: 'ดูสถานี',
  },
]

const STEPS = [
  { icon: Search, title: 'ค้นหา', text: 'กด "ค้นหาใกล้ฉัน" หรือพิมพ์ชื่อปลายทางในเมนูค้นหาเส้นทาง' },
  { icon: MapPinned, title: 'เลือกสถานี', text: 'ดูสถานีที่อยู่ใกล้หรือระหว่างทาง แล้วเลือกสถานีหรือเพิ่มเป็นจุดแวะ' },
  { icon: Smartphone, title: 'ออกเดินทาง', text: 'กด "นำทาง" แล้วขับตามคำสั่งเลี้ยวบนจอได้เลย' },
]

function SectionTitle({ highlight, children }: { highlight: string; children: React.ReactNode }) {
  return (
    <h2 className="text-3xl sm:text-4xl text-center mb-12">
      <span className="highlight mr-2">{highlight}</span>
      {children}
    </h2>
  )
}

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="hero-header pb-16 lg:pb-24">
        <SiteNavbar overlay />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-28 lg:pt-36 grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-[1.15] mb-6">
              ค้นหา<span className="text-white">สถานีชาร์จ EV</span> ใกล้คุณ และวางแผนทริปได้ในที่เดียว
            </h1>
            <p className="inline-block rounded-[3px] bg-white/10 text-white text-lg py-3 px-5 mb-8 backdrop-blur-[2px]">
              รวมกว่า 2,600 สถานี จาก {Object.keys(PROVIDERS).length} ผู้ให้บริการทั่วประเทศไทย
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/map" className="btn btn-secondary px-6 py-3 text-base">
                <MapPin className="w-5 h-5" /> ค้นหาใกล้ฉัน
              </Link>
              <Link href="/map?mode=route" className="btn btn-outline-light px-6 py-2.5 text-base">
                <Route className="w-5 h-5" /> วางแผนเส้นทาง
              </Link>
            </div>
          </div>
          <HeroIllustration />
        </div>
      </section>

      {/* ── About ── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 grid gap-12 lg:grid-cols-2 items-center">
          <div className="order-2 lg:order-1">
            <div className="relative max-w-md mx-auto">
              <div className="absolute -inset-4 bg-primary/10" style={{ borderRadius: '58% 42% 38% 62% / 45% 55% 45% 55%' }} />
              <div className="relative bg-white rounded-[3px] shadow-[0_0_45px_rgba(0,0,0,.08)] overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-heading font-bold text-secondary">พบ 48 สถานี · รัศมี 10 กม.</p>
                  <p className="text-xs text-body">เรียงจากใกล้สุด</p>
                </div>
                {[
                  { logo: '/logos/ptt.webp', name: 'PTT Station พระราม 9', brand: 'EV Station PluZ (PTT)', d: '650 ม.', p: '120 kW' },
                  { logo: '/logos/ea.webp', name: 'EA Anywhere เซ็นทรัล', brand: 'EA Anywhere', d: '1.2 กม.', p: '150 kW' },
                  { logo: '/logos/tesla.webp', name: 'Tesla Supercharger', brand: 'Tesla Supercharger', d: '2.8 กม.', p: '250 kW' },
                ].map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                    <div className="relative shrink-0">
                      <img src={s.logo} alt="" className="w-10 h-10 rounded-lg border border-gray-200" />
                      <span className="absolute -top-1.5 -left-1.5 w-[18px] h-[18px] rounded-full bg-secondary text-white text-[10px] font-semibold flex items-center justify-center">{i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-secondary truncate">{s.name}</p>
                      <p className="text-xs text-body truncate">{s.brand} · {s.p}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">{s.d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <h2 className="text-3xl sm:text-4xl mb-6">
              <span className="highlight mr-2">เกี่ยวกับ</span>
              My EV ผู้ช่วยหาที่ชาร์จสำหรับคนใช้รถไฟฟ้า
            </h2>
            <p className="mb-4 leading-relaxed">
              My EV รวมข้อมูลสถานีชาร์จจากผู้ให้บริการหลักในประเทศไทยไว้บนแผนที่เดียว ไม่ต้องสลับแอปหลายตัวเพื่อหาที่ชาร์จ
            </p>
            <p className="mb-8 leading-relaxed">
              จะหาที่ชาร์จใกล้ตัวตอนนี้ หรือวางแผนเดินทางไกลพร้อมจุดแวะชาร์จระหว่างทาง ก็ทำได้ในไม่กี่ขั้นตอน
            </p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-8">
              {['รวมหลายผู้ให้บริการ', 'สถานีระหว่างทาง', 'นำทางภาษาไทย', 'ใช้ฟรีบนมือถือ'].map((t) => (
                <p key={t} className="flex items-center gap-2 font-heading font-semibold text-secondary">
                  <Check className="w-5 h-5 text-primary" strokeWidth={3} />
                  {t}
                </p>
              ))}
            </div>
            <Link href="/map" className="btn btn-primary px-6 py-3">
              เปิดแผนที่ <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── แถบตัวเลข (พื้นแดง) ── */}
      <section className="hero-header py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-4">
              <span className="w-14 h-14 shrink-0 rounded-full bg-secondary text-white flex items-center justify-center">
                <Icon className="w-6 h-6" />
              </span>
              <div>
                <p className="font-heading font-bold text-2xl text-white leading-tight">{value}</p>
                <p className="text-white/85 text-sm">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ฟีเจอร์ ── */}
      <section id="features" className="py-20 scroll-mt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle highlight="ฟีเจอร์">ทำอะไรได้บ้าง</SectionTitle>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {FEATURES.map(({ icon: Icon, title, text, href, cta }) => (
              <div key={title} className="service-item h-full p-8 pt-0 flex flex-col">
                <div className="flex items-center -ml-8 mb-6">
                  <span className="service-icon shrink-0 mr-5">
                    <Icon className="w-10 h-10" />
                  </span>
                  <h3 className="text-xl">{title}</h3>
                </div>
                <p className="mb-6 leading-relaxed flex-1">{text}</p>
                <Link href={href} className="btn btn-secondary px-4 py-2 text-sm self-start">
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ผู้ให้บริการ ── */}
      <section id="providers" className="py-20 bg-light scroll-mt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle highlight="ผู้ให้บริการ">ที่รองรับ</SectionTitle>
          <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
            {Object.values(PROVIDERS).map((p) => (
              <div key={p.key} className="bg-white rounded-[3px] shadow-[0_0_30px_rgba(0,0,0,.05)] p-5 text-center hover:-translate-y-1 transition-transform">
                <img src={p.logo} alt={p.name} className="w-16 h-16 mx-auto rounded-xl border border-gray-100 mb-3" loading="lazy" />
                <p className="font-heading font-semibold text-secondary text-sm leading-snug">{p.name}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-body/70 mt-8">โลโก้เป็นเครื่องหมายการค้าของผู้ให้บริการแต่ละราย ใช้เพื่อระบุสถานีเท่านั้น</p>
        </div>
      </section>

      {/* ── วิธีใช้งาน ── */}
      <section id="how" className="py-20 scroll-mt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle highlight="วิธีใช้งาน">ง่ายใน 3 ขั้นตอน</SectionTitle>
          <div className="grid gap-10 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <span className="absolute inset-0 rounded-full bg-primary/10" />
                  <span className="absolute inset-3 rounded-full bg-primary text-white flex items-center justify-center">
                    <Icon className="w-8 h-8" />
                  </span>
                  <span className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-secondary text-white font-heading font-bold flex items-center justify-center border-4 border-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-2xl mb-3">{title}</h3>
                <p className="leading-relaxed max-w-xs mx-auto">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA (พื้นแดง) ── */}
      <section className="hero-header py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <Zap className="w-12 h-12 mx-auto mb-4 text-white" fill="currentColor" strokeWidth={1} />
          <h2 className="text-3xl sm:text-4xl text-white mb-4">พร้อมออกเดินทางแล้วหรือยัง?</h2>
          <p className="text-white/85 text-lg mb-8">เปิดแผนที่แล้วหาที่ชาร์จใกล้คุณได้ทันที ใช้งานฟรีบนมือถือและคอมพิวเตอร์</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/map" className="btn btn-secondary px-6 py-3">
              <MapPin className="w-5 h-5" /> ค้นหาใกล้ฉัน
            </Link>
            <Link href="/map?mode=route" className="btn btn-outline-light px-6 py-2.5">
              <Route className="w-5 h-5" /> วางแผนเส้นทาง
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  )
}
