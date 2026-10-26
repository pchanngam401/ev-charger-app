/* eslint-disable @next/next/no-img-element */
import { Flag, Navigation, Plus } from 'lucide-react'

// ภาพประกอบส่วนหัว: แผนที่จำลองในกรอบรูปทรงอิสระ (แทนรูปบุคคลใน template)
const MARKERS = [
  { logo: '/logos/ptt.webp', x: '22%', y: '30%' },
  { logo: '/logos/ea.webp', x: '68%', y: '22%' },
  { logo: '/logos/elex.webp', x: '40%', y: '58%' },
  { logo: '/logos/sharge.webp', x: '78%', y: '62%' },
  { logo: '/logos/mg.webp', x: '14%', y: '72%' },
]

export default function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[540px] aspect-[1.1]" aria-hidden="true">
      {/* กรอบรูปทรงอิสระสีขาว */}
      <div
        className="absolute inset-0 bg-white shadow-2xl overflow-hidden"
        style={{ borderRadius: '42% 58% 63% 37% / 41% 44% 56% 59%' }}
      >
        <svg viewBox="0 0 400 360" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
          <rect width="400" height="360" fill="#eef1f5" />
          {/* สวน/แม่น้ำ */}
          <path d="M0 250 C 80 230, 120 300, 220 280 S 360 300, 400 270 L400 360 L0 360Z" fill="#cfe3f5" />
          <ellipse cx="320" cy="110" rx="60" ry="38" fill="#d9ecd6" />
          <ellipse cx="90" cy="150" rx="40" ry="26" fill="#d9ecd6" />
          {/* ถนน */}
          <g stroke="#ffffff" strokeLinecap="round" fill="none">
            <path d="M-10 90 L410 130" strokeWidth="14" />
            <path d="M120 -10 L180 370" strokeWidth="12" />
            <path d="M-10 210 L410 190" strokeWidth="10" />
            <path d="M290 -10 L250 370" strokeWidth="10" />
            <path d="M40 -10 L20 370" strokeWidth="6" />
            <path d="M-10 310 L410 330" strokeWidth="6" />
          </g>
          {/* เส้นทาง */}
          <path d="M60 300 L150 200 L180 140 L262 128 L330 70" stroke="#fff" strokeWidth="11" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M60 300 L150 200 L180 140 L262 128 L330 70" stroke="#0b2154" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {MARKERS.map((m) => (
          <img
            key={m.logo}
            src={m.logo}
            alt=""
            className="absolute w-9 h-9 sm:w-10 sm:h-10 -translate-x-1/2 -translate-y-1/2 rounded-[10px] border-[2.5px] border-white shadow-lg"
            style={{ left: m.x, top: m.y }}
          />
        ))}

        {/* จุดเริ่ม / ปลายทาง */}
        <span className="absolute left-[15%] top-[83%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-blue-600 border-[3px] border-white shadow-[0_0_0_6px_rgba(37,99,235,.25)]" />
        <span className="absolute left-[82.5%] top-[19%] -translate-x-1/2 -translate-y-full w-8 h-8 rounded-full rounded-bl-none -rotate-45 bg-primary border-[3px] border-white shadow-lg flex items-center justify-center">
          <Flag className="w-3.5 h-3.5 text-white rotate-45" fill="currentColor" />
        </span>
      </div>

      {/* การ์ดลอย: คำสั่งนำทาง */}
      <div className="absolute -left-2 sm:-left-6 top-[8%] bg-secondary text-white rounded-[3px] shadow-xl px-3.5 py-2.5 flex items-center gap-2.5 animate-[float_6s_ease-in-out_infinite]">
        <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
          <Navigation className="w-4 h-4" fill="currentColor" />
        </span>
        <span className="leading-tight">
          <span className="block text-[11px] text-white/70">อีก 350 ม.</span>
          <span className="block text-sm font-medium">เลี้ยวขวา เข้าถนนพระราม 4</span>
        </span>
      </div>

      {/* การ์ดลอย: สถานีระหว่างทาง */}
      <div className="absolute -right-2 sm:-right-4 bottom-[6%] bg-white rounded-[3px] shadow-xl p-3 w-[230px] animate-[float_7s_ease-in-out_infinite_1s]">
        <p className="text-[11px] font-medium text-body mb-2">สถานีระหว่างทาง · 12 แห่ง</p>
        <div className="flex items-center gap-2.5">
          <img src="/logos/ea.webp" alt="" className="w-9 h-9 rounded-lg border border-gray-200" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-semibold text-secondary truncate">EA Anywhere</p>
            <p className="text-[11px] text-body">กม. 42.3 · ติดเส้นทาง</p>
          </div>
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </span>
        </div>
      </div>
    </div>
  )
}
