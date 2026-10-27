/* eslint-disable @next/next/no-img-element */
import { BatteryCharging, Flag, Navigation, Plus, Zap } from 'lucide-react'

// ภาพประกอบโทนชมพู/ม่วงแบบ template (ภาพของ template เป็นเรื่องอีเมล จึงวาดใหม่ให้เป็นเรื่อง EV)

const MARKERS = [
  { logo: '/logos/ptt.webp', x: '24%', y: '30%' },
  { logo: '/logos/ea.webp', x: '70%', y: '24%' },
  { logo: '/logos/elex.webp', x: '42%', y: '56%' },
  { logo: '/logos/sharge.webp', x: '76%', y: '62%' },
  { logo: '/logos/mg.webp', x: '18%', y: '74%' },
]

function MiniMap({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg viewBox="0 0 300 420" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="300" height="420" fill="#f6f6fa" />
        <path d="M0 300 C 60 280, 100 340, 170 320 S 270 340, 300 310 L300 420 L0 420Z" fill="#e7defd" />
        <ellipse cx="240" cy="120" rx="45" ry="30" fill="#ffe1eb" />
        <g stroke="#ffffff" strokeLinecap="round" fill="none">
          <path d="M-10 110 L310 150" strokeWidth="13" />
          <path d="M90 -10 L140 430" strokeWidth="11" />
          <path d="M-10 250 L310 230" strokeWidth="9" />
          <path d="M220 -10 L190 430" strokeWidth="9" />
          <path d="M-10 370 L310 385" strokeWidth="6" />
        </g>
        <path d="M50 350 L120 240 L135 165 L200 150 L250 85" stroke="#fff" strokeWidth="11" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50 350 L120 240 L135 165 L200 150 L250 85" stroke="#6610f2" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {MARKERS.map((m) => (
        <img
          key={m.logo}
          src={m.logo}
          alt=""
          className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-[9px] border-2 border-white shadow-md"
          style={{ left: m.x, top: m.y }}
        />
      ))}
      <span className="absolute left-[16.5%] top-[83%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-secondary border-[3px] border-white shadow-[0_0_0_6px_rgba(102,16,242,.2)]" />
      <span className="absolute left-[83%] top-[20%] -translate-x-1/2 -translate-y-full w-7 h-7 rounded-full rounded-bl-none -rotate-45 bg-primary border-2 border-white shadow-md flex items-center justify-center">
        <Flag className="w-3 h-3 text-white rotate-45" fill="currentColor" />
      </span>
    </div>
  )
}

export default function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] aspect-[1.15]" aria-hidden="true">
      {/* วงกลมตกแต่ง */}
      <span className="absolute left-[8%] top-[6%] w-24 h-24 rounded-full bg-primary/10" />
      <span className="absolute right-[4%] bottom-[10%] w-36 h-36 rounded-full border-[14px] border-secondary/10" />
      <span className="absolute right-[18%] top-[2%] w-5 h-5 rounded-full bg-secondary/30" />

      {/* โทรศัพท์ */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[46%] aspect-[0.5] rounded-[34px] bg-dark p-[7px] shadow-[0_30px_60px_rgba(53,63,79,.25)] rotate-[-6deg]">
        <div className="relative w-full h-full rounded-[28px] overflow-hidden bg-white">
          <div className="absolute inset-0">
            <MiniMap className="h-full" />
          </div>
          <span className="absolute left-1/2 top-2 -translate-x-1/2 w-16 h-4 rounded-full bg-dark" />
          <div className="absolute inset-x-2 bottom-2 rounded-[12px] bg-white shadow-lg p-2 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" fill="currentColor" />
            </span>
            <span className="text-[10px] leading-tight text-dark">
              <b className="block font-medium">8 นาที · 5.1 กม.</b>
              แวะชาร์จ 1 จุด
            </span>
          </div>
        </div>
      </div>

      {/* การ์ดลอย: คำสั่งนำทาง */}
      <div className="absolute left-0 top-[16%] bg-white rounded-[10px] shadow-[0_0_45px_rgba(0,0,0,.1)] px-3.5 py-2.5 flex items-center gap-2.5 animate-[float_6s_ease-in-out_infinite]">
        <span className="w-9 h-9 rounded-full bg-secondary text-white flex items-center justify-center">
          <Navigation className="w-4 h-4" fill="currentColor" />
        </span>
        <span className="leading-tight">
          <span className="block text-[11px] text-body">อีก 350 ม.</span>
          <span className="block text-sm font-medium text-dark">เลี้ยวขวา เข้าถนนพระราม 4</span>
        </span>
      </div>

      {/* การ์ดลอย: สถานีระหว่างทาง */}
      <div className="absolute right-0 top-[52%] bg-white rounded-[10px] shadow-[0_0_45px_rgba(0,0,0,.1)] p-3 w-[210px] animate-[float_7s_ease-in-out_infinite_1s]">
        <p className="text-[11px] text-body mb-2">สถานีระหว่างทาง · 12 แห่ง</p>
        <div className="flex items-center gap-2.5">
          <img src="/logos/ea.webp" alt="" className="w-9 h-9 rounded-lg border border-gray-200" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-medium text-dark truncate">EA Anywhere</p>
            <p className="text-[11px] text-body">กม. 42.3</p>
          </div>
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* ป้ายแบตเตอรี่ */}
      <div className="absolute left-[6%] bottom-[8%] bg-white rounded-full shadow-[0_0_45px_rgba(0,0,0,.1)] pl-1.5 pr-4 py-1.5 flex items-center gap-2 animate-[float_8s_ease-in-out_infinite_2s]">
        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <BatteryCharging className="w-4 h-4" />
        </span>
        <span className="text-sm text-dark font-medium">CCS2 · 150 kW</span>
      </div>
    </div>
  )
}

// ภาพประกอบส่วนเกี่ยวกับเรา: ตัวอย่างรายการสถานี
export function StationListPreview() {
  const rows = [
    { logo: '/logos/ptt.webp', name: 'PTT Station พระราม 9', brand: 'EV Station PluZ', d: '650 ม.', p: '120 kW' },
    { logo: '/logos/ea.webp', name: 'EA Anywhere เซ็นทรัล', brand: 'EA Anywhere', d: '1.2 กม.', p: '150 kW' },
    { logo: '/logos/tesla.webp', name: 'Tesla Supercharger', brand: 'Tesla', d: '2.8 กม.', p: '250 kW' },
    { logo: '/logos/elex.webp', name: 'EleX by EGAT สาขาบางกรวย', brand: 'EleX by EGAT', d: '4.1 กม.', p: '120 kW' },
  ]
  return (
    <div className="relative max-w-lg mx-auto" aria-hidden="true">
      <div className="absolute inset-[-6%] feature-blob" />
      <div className="relative bg-white rounded-[10px] shadow-[0_0_45px_rgba(0,0,0,.1)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-heading font-semibold text-dark">พบ 48 สถานี</p>
            <p className="text-xs text-body">เรียงจากใกล้สุด · รัศมี 10 กม.</p>
          </div>
          <span className="btn btn-primary px-3 py-1 text-xs">ใกล้ฉัน</span>
        </div>
        {rows.map((s, i) => (
          <div key={s.name} className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-0">
            <div className="relative shrink-0">
              <img src={s.logo} alt="" className="w-10 h-10 rounded-lg border border-gray-200" />
              <span className="absolute -top-1.5 -left-1.5 w-[18px] h-[18px] rounded-full bg-secondary text-white text-[10px] font-medium flex items-center justify-center">{i + 1}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-dark truncate">{s.name}</p>
              <p className="text-xs text-body truncate">{s.brand} · {s.p}</p>
            </div>
            <span className="text-xs font-medium text-primary">{s.d}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ภาพประกอบส่วนฟีเจอร์: แผนที่เส้นทางพร้อมจุดแวะในกรอบรูปทรงอิสระ
export function RoutePreview() {
  return (
    <div className="relative feature-blob p-8 sm:p-12 h-full flex items-center" aria-hidden="true">
      <div className="relative w-full rounded-[10px] overflow-hidden shadow-[0_0_45px_rgba(0,0,0,.1)] bg-white">
        <MiniMap className="aspect-[1.35]" />
        <div className="absolute left-3 right-3 bottom-3 bg-white rounded-[10px] shadow-lg p-3 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-secondary text-white flex items-center justify-center shrink-0 font-medium">1</span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-medium text-dark truncate">จุดแวะ: EleX by EGAT</p>
            <p className="text-xs text-body">กม. 18.6 · ติดเส้นทาง</p>
          </div>
          <span className="btn btn-primary px-3 py-1.5 text-xs">เริ่มนำทาง</span>
        </div>
      </div>
    </div>
  )
}

// ภาพประกอบส่วนคำถามที่พบบ่อย: ตัวอย่างหน้านำทาง
export function NavigationPreview() {
  const steps = [
    { icon: '↱', text: 'เลี้ยวขวา เข้าสู่ถนนพระราม 4', d: '350 ม.', current: true },
    { icon: '↑', text: 'ตรงไปตามถนนสุขุมวิท', d: '2.4 กม.' },
    { icon: '⚡', text: 'ถึงจุดแวะที่ 1 อยู่ทางซ้ายมือ', d: '' },
    { icon: '🏁', text: 'ถึงที่หมาย', d: '' },
  ]
  return (
    <div className="relative max-w-md mx-auto" aria-hidden="true">
      <div className="absolute inset-[-8%] feature-blob bg-white/70" />
      <div className="relative bg-white rounded-[10px] shadow-[0_0_45px_rgba(0,0,0,.1)] overflow-hidden">
        <div className="bg-secondary text-white px-5 py-4">
          <p className="font-heading text-2xl font-semibold">12 นาที <span className="text-sm font-normal opacity-80">· 6.8 กม.</span></p>
          <p className="text-xs opacity-80 mt-0.5">ถึงประมาณ 14:35 น.</p>
          <div className="mt-3 flex items-center gap-2.5 bg-white/15 rounded-[10px] px-3 py-2 text-sm">
            <span className="text-lg">↱</span> เลี้ยวขวา เข้าสู่ถนนพระราม 4
          </div>
        </div>
        {steps.map((s) => (
          <div key={s.text} className={`flex items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-0 ${s.current ? 'bg-primary/5' : ''}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${s.current ? 'bg-primary text-white' : 'bg-light text-dark'}`}>{s.icon}</span>
            <span className="flex-1 text-sm text-dark">{s.text}</span>
            <span className="text-xs text-body">{s.d}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
