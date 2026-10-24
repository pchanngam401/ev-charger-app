import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "My EV — ค้นหาสถานีชาร์จรถยนต์ไฟฟ้า",
  description: "ค้นหาสถานีชาร์จ EV ใกล้คุณ พร้อมข้อมูลประเภทหัวชาร์จและสถานะ",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" className="h-full">
      <body className="h-full antialiased bg-gray-50 text-gray-900 font-sans">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-[999] bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h1 className="text-lg font-bold text-emerald-600">My EV</h1>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="hidden sm:inline">ค้นหาสถานีชาร์จใกล้คุณ</span>
              <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs text-emerald-600">
                EV
              </span>
            </div>
          </div>
        </header>

        {/* Main content (offset for fixed header) */}
        <main className="h-full pt-14">{children}</main>
      </body>
    </html>
  )
}