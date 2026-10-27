'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

// ปุ่มกลับขึ้นด้านบนแบบ template (วงกลมสีชมพูมุมขวาล่าง)
export default function BackToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed right-6 bottom-6 z-[1100] w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center transition-all duration-500 hover:bg-white hover:text-primary border border-primary ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      aria-label="กลับขึ้นด้านบน"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  )
}
