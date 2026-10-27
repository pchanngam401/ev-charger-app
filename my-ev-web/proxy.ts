import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ส่งต่อ /api/* ไปยัง FastAPI (ฝั่ง server) พร้อม
// 1) กุญแจลับ API_SHARED_SECRET → API รับเฉพาะคำขอที่มาจากหน้าเว็บนี้
// 2) IP จริงของผู้ใช้ → API จำกัดจำนวนคำขอต่อคนได้ถูกต้อง
// 3) จำกัดจำนวนคำขอต่อ IP อีกชั้น (นับในหน่วยความจำของแต่ละ instance)

const API_URL = (process.env.API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const API_SHARED_SECRET = process.env.API_SHARED_SECRET || ''

const WINDOW_MS = 60_000
const LIMITS = {
  default: Number(process.env.WEB_RATE_LIMIT_PER_MIN || 90),
  heavy: Number(process.env.WEB_RATE_LIMIT_HEAVY_PER_MIN || 15), // คำนวณสถานีตามเส้นทาง (หนัก)
}
const HEAVY_PATHS = new Set(['/api/stations/along-route'])
const MAX_TRACKED = 10_000

const hits = new Map<string, number[]>()

function allow(key: string, limit: number): boolean {
  if (limit <= 0) return true
  const now = Date.now()
  const cutoff = now - WINDOW_MS
  if (hits.size > MAX_TRACKED) {
    for (const [k, list] of hits) if (!list.length || list[list.length - 1] < cutoff) hits.delete(k)
  }
  const list = (hits.get(key) ?? []).filter((t) => t > cutoff)
  if (list.length >= limit) {
    hits.set(key, list)
    return false
  }
  list.push(now)
  hits.set(key, list)
  return true
}

function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim().slice(0, 64)
  return (request.headers.get('x-real-ip') || 'unknown').slice(0, 64)
}

function tooMany() {
  return NextResponse.json(
    { detail: 'มีการเรียกใช้งานถี่เกินไป กรุณาลองใหม่ในอีกสักครู่' },
    { status: 429, headers: { 'Retry-After': '60' } }
  )
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const ip = clientIp(request)

  if (!allow(`all:${ip}`, LIMITS.default)) return tooMany()
  if (HEAVY_PATHS.has(pathname) && !allow(`heavy:${ip}`, LIMITS.heavy)) return tooMany()

  const headers = new Headers(request.headers)
  // ไม่เชื่อ header เหล่านี้จากเบราว์เซอร์ — หน้าเว็บใส่เองเท่านั้น
  headers.delete('x-myev-key')
  headers.delete('x-myev-client-ip')
  headers.delete('cookie') // API ไม่ใช้ cookie ของหน้าเว็บ
  headers.set('x-myev-client-ip', ip)
  if (API_SHARED_SECRET) headers.set('x-myev-key', API_SHARED_SECRET)

  const target = new URL(`${API_URL}${pathname.replace(/^\/api/, '') || '/'}${search}`)
  return NextResponse.rewrite(target, { request: { headers } })
}

export const config = {
  matcher: '/api/:path*',
}
