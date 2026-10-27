import type { Metadata, Viewport } from 'next'
// ฟอนต์ตาม template (Plus Jakarta Sans หัวข้อ / Rubik เนื้อหา) + ฟอนต์ไทยที่เข้ากัน (Prompt / Sarabun)
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/rubik/400.css'
import '@fontsource/rubik/500.css'
import '@fontsource/prompt/500.css'
import '@fontsource/prompt/600.css'
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
  themeColor: '#f74780',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="antialiased bg-white">{children}</body>
    </html>
  )
}
