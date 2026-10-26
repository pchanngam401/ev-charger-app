import type { Metadata } from 'next'
import SiteNavbar from '@/components/site/SiteNavbar'
import MapApp from '@/components/site/MapApp'

export const metadata: Metadata = {
  title: 'แผนที่สถานีชาร์จ',
  description: 'ค้นหาสถานีชาร์จใกล้คุณ วางแผนเส้นทางพร้อมจุดแวะชาร์จ และนำทางในแอป',
}

export default function MapPage() {
  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <SiteNavbar />
      <main className="flex-1 min-h-0">
        <MapApp />
      </main>
    </div>
  )
}
