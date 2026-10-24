'use client'

import dynamic from 'next/dynamic'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 gap-3">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">กำลังโหลดแผนที่...</span>
    </div>
  ),
})

export default function HomePage() {
  return (
    <div className="w-full h-full">
      <Map />
    </div>
  )
}