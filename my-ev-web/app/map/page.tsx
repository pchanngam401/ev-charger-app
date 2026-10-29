import type { Metadata } from 'next'
import MapShell from '@/components/site/MapShell'

export const metadata: Metadata = {
  title: 'แผนที่สถานีชาร์จ',
  description: 'ค้นหาสถานีชาร์จใกล้คุณ วางแผนเส้นทางพร้อมจุดแวะชาร์จ และนำทางในแอป',
}

export default function MapPage() {
  return <MapShell />
}
