/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import {
  ArrowRight, BatteryCharging, ChevronDown, Compass, MapPin, MonitorSmartphone, Navigation, Plug, Route, Store, Zap,
} from 'lucide-react'
import SiteNavbar from '@/components/site/SiteNavbar'
import SiteFooter from '@/components/site/SiteFooter'
import BackToTop from '@/components/site/BackToTop'
import HeroIllustration, { NavigationPreview, RoutePreview, StationListPreview } from '@/components/site/HeroIllustration'
import { PROVIDERS } from '@/lib/providers'

const PROVIDER_COUNT = Object.keys(PROVIDERS).length

const SERVICES = [
  { icon: MapPin, title: 'ค้นหาใกล้ฉัน', text: 'เห็นสถานีชาร์จรอบตัวในรัศมี 10 กม. เรียงจากใกล้สุด พร้อมโลโก้ผู้ให้บริการ', href: '/map' },
  { icon: Route, title: 'วางแผนเส้นทาง', text: 'ค้นหาปลายทางด้วยชื่อสถานที่ แล้วดูสถานีชาร์จตลอดเส้นทางตามกิโลเมตรที่ผ่าน', href: '/map?mode=route' },
  { icon: BatteryCharging, title: 'จุดแวะชาร์จ', text: 'กด "+ แวะพัก" ที่สถานีระหว่างทาง ระบบคำนวณเส้นทางใหม่ให้ผ่านจุดแวะตามลำดับ', href: '/map?mode=route' },
  { icon: Navigation, title: 'นำทางในแอป', text: 'บอกทางเลี้ยวภาษาไทย อัปเดตระยะทางและเวลาถึงแบบสด คำนวณใหม่เมื่อออกนอกเส้นทาง', href: '/map' },
]

const FEATURES = [
  { icon: Compass, title: 'หมุนตามรถ', text: 'ถนนข้างหน้าชี้ขึ้นบนจอเสมอ และสลับเป็นทิศเหนือขึ้นได้ด้วยเข็มทิศ' },
  { icon: Plug, title: 'ข้อมูลหัวชาร์จ', text: 'ดูประเภทหัวชาร์จ กำลังไฟ และที่อยู่ของแต่ละสถานีก่อนออกเดินทาง' },
  { icon: Store, title: 'หลายผู้ให้บริการ', text: `รวมสถานีจาก ${PROVIDER_COUNT} ผู้ให้บริการไว้บนแผนที่เดียว ไม่ต้องสลับแอป` },
  { icon: MonitorSmartphone, title: 'ใช้ได้ทุกจอ', text: 'เปิดผ่านเบราว์เซอร์ได้ทั้งมือถือและคอมพิวเตอร์ ไม่ต้องติดตั้งแอป' },
]

const FAQS = [
  {
    q: 'ใช้งาน My EV ต้องเสียเงินไหม?',
    a: 'ไม่ต้องเสียเงินและไม่ต้องสมัครสมาชิก เปิดแผนที่ผ่านเบราว์เซอร์แล้วใช้งานได้ทันที',
  },
  {
    q: 'ข้อมูลสถานีชาร์จมาจากไหน?',
    a: `รวบรวมตำแหน่งสถานีจาก ${PROVIDER_COUNT} ผู้ให้บริการในประเทศไทย เช่น PTT, EA Anywhere, SHARGE และ EleX by EGAT เก็บไว้ในฐานข้อมูลของแอป ข้อมูลอาจไม่ตรงกับสถานะล่าสุดของสถานี ควรตรวจสอบกับแอปของผู้ให้บริการก่อนชาร์จ`,
  },
  {
    q: 'ทำไมต้องอนุญาตการเข้าถึงตำแหน่ง?',
    a: 'ใช้เพื่อค้นหาสถานีใกล้คุณและนำทางจากตำแหน่งปัจจุบัน ตำแหน่งใช้ในเบราว์เซอร์ของคุณเพื่อคำนวณเท่านั้น ถ้าไม่อนุญาตก็ยังค้นหารอบกรุงเทพฯ และวางแผนเส้นทางจากสถานที่ที่เลือกได้',
  },
  {
    q: 'เพิ่มจุดแวะชาร์จระหว่างทางยังไง?',
    a: 'ไปที่เมนู "ค้นหาเส้นทาง" ใส่ปลายทาง แล้วกด "+ แวะพัก" ที่สถานีในรายการสถานีระหว่างทาง เพิ่มได้หลายจุด ระบบจะเรียงตามลำดับที่ผ่านให้เอง',
  },
]

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="text-center mx-auto mb-12 max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-5">{title}</h2>
      {children && <p className="leading-relaxed">{children}</p>}
    </div>
  )
}

export default function HomePage() {
  return (
    <>
      <SiteNavbar overlay />

      {/* ── Hero ── */}
      <section className="header">
        <span className="ring-float left-[8%] top-[20%] w-12 h-12 border-[5px] border-primary/10 animate-[drift_14s_ease-in-out_infinite]" aria-hidden="true" />
        <span className="ring-float left-[38%] bottom-[12%] w-72 h-72 border-[30px] border-secondary/5 animate-[drift_20s_ease-in-out_infinite]" aria-hidden="true" />
        <img src="/img/sty-1.png" alt="" aria-hidden="true" className="hidden lg:block absolute left-[30%] top-[22%] w-12 opacity-80 -z-10 animate-[drift_18s_ease-in-out_infinite]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 lg:pt-40 pb-20 lg:pb-28 grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.2] mb-6">ค้นหาสถานีชาร์จ EV ได้ทุกที่ที่คุณไป</h1>
            <p className="text-lg sm:text-xl leading-relaxed mb-8">
              รวมกว่า 2,600 สถานีจาก {PROVIDER_COUNT} ผู้ให้บริการทั่วไทย ค้นหาที่ชาร์จใกล้ตัว วางแผนทริปพร้อมจุดแวะ และนำทางได้ในแอปเดียว
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/map" className="btn btn-primary px-8 py-3.5">
                เริ่มต้นใช้งาน
              </Link>
              <Link href="/map?mode=route" className="btn btn-outline px-7 py-3.5">
                วางแผนเส้นทาง
              </Link>
            </div>
          </div>
          <HeroIllustration />
        </div>
      </section>

      {/* ── เกี่ยวกับ ── */}
      <section id="about" className="py-20 overflow-hidden scroll-mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-14 lg:grid-cols-2 items-center">
          <div className="lg:animate-[moveLeft_10s_linear_infinite]">
            <StationListPreview />
          </div>
          <div>
            <p className="eyebrow">เกี่ยวกับเรา</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-6">หาที่ชาร์จง่าย ๆ ไม่ต้องสลับหลายแอป</h2>
            <p className="leading-relaxed mb-4">
              My EV รวมข้อมูลสถานีชาร์จจากผู้ให้บริการหลักในประเทศไทยไว้บนแผนที่เดียว เห็นโลโก้ผู้ให้บริการ ระยะทาง กำลังไฟ และหัวชาร์จในที่เดียว
            </p>
            <p className="leading-relaxed mb-8">
              จะหาที่ชาร์จใกล้ตัวตอนนี้ หรือวางแผนเดินทางไกลพร้อมจุดแวะชาร์จ ก็ทำได้ในไม่กี่ขั้นตอน
            </p>
            <Link href="/map" className="btn btn-primary px-8 py-3.5">
              เปิดแผนที่
            </Link>
          </div>
        </div>
      </section>

      {/* ── บริการ ── */}
      <section id="services" className="py-20 scroll-mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="บริการของเรา" title="My EV ช่วยอะไรคุณได้บ้าง">
            ตั้งแต่หาที่ชาร์จใกล้ตัว ไปจนถึงวางแผนทริปข้ามจังหวัดพร้อมจุดแวะชาร์จ
          </SectionHeading>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {SERVICES.map(({ icon: Icon, title, text, href }) => (
              <div key={title} className="service-item text-center p-6 flex flex-col items-center">
                <span className="service-icon inline-flex rounded-[10px] bg-light p-6 mb-6">
                  <Icon className="w-16 h-16 text-secondary" strokeWidth={1.5} />
                </span>
                <h3 className="text-xl mb-4">{title}</h3>
                <p className="mb-6 leading-relaxed flex-1">{text}</p>
                <Link href={href} className="btn btn-light px-6 py-2">
                  ดูเพิ่มเติม
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ฟีเจอร์ ── */}
      <section id="features" className="py-20 overflow-hidden scroll-mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="ฟีเจอร์" title="ฟีเจอร์สำหรับคนใช้รถไฟฟ้า">
            ออกแบบมาให้ใช้ระหว่างขับรถได้สะดวก อ่านง่าย และกดน้อยที่สุด
          </SectionHeading>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 text-center">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="p-4">
                <span className="inline-flex rounded-[10px] bg-light p-6 mb-6">
                  <Icon className="w-16 h-16 text-secondary" strokeWidth={1.5} />
                </span>
                <Link href="/map" className="flex items-center justify-center gap-2 font-heading text-xl font-medium text-dark hover:text-primary transition-colors">
                  {title} <ArrowRight className="w-5 h-5" />
                </Link>
                <p className="mt-4 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/map" className="btn btn-primary px-8 py-3.5">ลองใช้งานเลย</Link>
          </div>

          <div className="grid gap-12 lg:grid-cols-2 items-center mt-24">
            <div className="lg:animate-[moveLeft_10s_linear_infinite]">
              <RoutePreview />
            </div>
            <div>
              <p className="eyebrow">วางแผนทริป</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-6">เดินทางไกลอย่างมั่นใจ แบตไม่หมดกลางทาง</h2>
              <p className="leading-relaxed mb-8">
                ใส่ปลายทางแล้วดูสถานีชาร์จทั้งหมดที่อยู่ไม่เกิน 1–10 กม. จากเส้นทาง เรียงตามกิโลเมตรที่จะผ่าน เลือกเป็นจุดแวะได้หลายจุด แล้วเริ่มนำทางได้ทันที
              </p>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <MapPin className="w-14 h-14 text-secondary shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="font-heading text-3xl font-bold text-dark leading-none">2,600+</p>
                    <p className="text-sm text-dark mt-1">สถานีชาร์จ</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Zap className="w-14 h-14 text-secondary shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="font-heading text-3xl font-bold text-dark leading-none">{PROVIDER_COUNT}</p>
                    <p className="text-sm text-dark mt-1">ผู้ให้บริการ</p>
                  </div>
                </div>
              </div>
              <Link href="/map?mode=route" className="btn btn-primary px-8 py-3.5">วางแผนเส้นทาง</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── คำถามที่พบบ่อย ── */}
      <section id="faq" className="py-20 bg-light overflow-hidden scroll-mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <p className="eyebrow">คำถามที่พบบ่อย</p>
            <h2 className="text-3xl sm:text-4xl mb-8">สงสัยอะไร ถามได้เลย</h2>
            <div className="space-y-4">
              {FAQS.map((f, i) => (
                <details key={f.q} open={i === 0} className="group bg-white rounded-[10px] overflow-hidden">
                  <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none font-heading font-medium text-dark group-open:text-primary group-open:bg-primary/5 [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-5 py-4 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="lg:animate-[moveLeft_10s_linear_infinite_reverse]">
            <NavigationPreview />
          </div>
        </div>
      </section>

      {/* ── ผู้ให้บริการ ── */}
      <section id="providers" className="py-20 scroll-mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="ผู้ให้บริการ" title={`รองรับสถานีจาก ${PROVIDER_COUNT} ผู้ให้บริการ`}>
            ค้นหาสถานีของผู้ให้บริการหลักในประเทศไทยได้ในแผนที่เดียว
          </SectionHeading>
          <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
            {Object.values(PROVIDERS).map((p) => (
              <div
                key={p.key}
                className="relative overflow-hidden bg-light rounded-[10px] p-5 text-center transition-all duration-500 hover:bg-white hover:shadow-[0_0_45px_rgba(0,0,0,.2)]"
              >
                {p.key === 'ptt' && (
                  <span className="absolute -right-9 top-3 rotate-45 bg-primary text-white text-[10px] px-9 py-0.5">มากที่สุด</span>
                )}
                <img src={p.logo} alt={p.name} className="w-16 h-16 mx-auto rounded-xl border border-gray-100 mb-3 bg-white" loading="lazy" />
                <p className="font-heading font-medium text-dark text-sm leading-snug">{p.name}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-body/70 mt-8">โลโก้เป็นเครื่องหมายการค้าของผู้ให้บริการแต่ละราย ใช้เพื่อระบุสถานีเท่านั้น</p>
        </div>
      </section>

      {/* ── ชวนเริ่มใช้งาน ── */}
      <section className="relative overflow-hidden py-20 isolate">
        <span className="ring-float -left-16 top-6 w-96 h-96 border-[60px] border-secondary/5 animate-[drift_30s_ease-in-out_infinite]" aria-hidden="true" />
        <span className="ring-float -right-16 bottom-0 w-96 h-96 border-[60px] border-secondary/5 animate-[drift_26s_ease-in-out_infinite_reverse]" aria-hidden="true" />
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="eyebrow">พร้อมแล้วหรือยัง</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-5">ออกเดินทางกับ My EV วันนี้</h2>
          <p className="text-lg leading-relaxed mb-8">เปิดแผนที่แล้วหาที่ชาร์จใกล้คุณได้ทันที ใช้งานฟรีบนมือถือและคอมพิวเตอร์</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/map" className="btn btn-primary px-8 py-3.5">ค้นหาใกล้ฉัน</Link>
            <Link href="/map?mode=route" className="btn btn-outline px-7 py-3.5">วางแผนเส้นทาง</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
      <BackToTop />
    </>
  )
}
