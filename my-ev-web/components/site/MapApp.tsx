'use client'

import dynamic from 'next/dynamic'

// แผนที่ใช้ window/Leaflet จึงโหลดเฉพาะฝั่งเบราว์เซอร์
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-light text-body gap-3">
      <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">กำลังโหลดแผนที่...</span>
    </div>
  ),
})

export default function MapApp() {
  return <Map />
}
