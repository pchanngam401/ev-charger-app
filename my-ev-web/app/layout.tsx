import type { Metadata, Viewport } from 'next'
// ฟอนต์ตาม template (Barlow หัวข้อ / Ubuntu เนื้อหา) + ฟอนต์ไทยที่เข้ากัน (Kanit / Sarabun)
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/700.css'
import '@fontsource/ubuntu/400.css'
import '@fontsource/ubuntu/500.css'
import '@fontsource/kanit/500.css'
import '@fontsource/kanit/600.css'
import '@fontsource/sarabun/400.css'
import '@fontsource/sarabun/500.css'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'My EV — ค้นหาสถานีชาร์จรถยนต์ไฟฟ้า',
    template: '%s · My EV',
  },
  description: 'ค้นหาสถานีชาร์จ EV ใกล้คุณ วางแผนเส้นทางพร้อมจุดแวะชาร์จ และนำทางในแอป รวมสถานีจากผู้ให้บริการทั่วประเทศไทย',
}

export const viewport: Viewport = {
  themeColor: '#d81324',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="antialiased bg-white">{children}</body>
    </html>
  )
}
