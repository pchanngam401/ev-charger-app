import type { NextConfig } from "next";

// /api/* ถูกส่งต่อไปยัง FastAPI ใน proxy.ts (ฝั่ง server) — ต้องตั้ง API_URL บน Vercel
if (process.env.VERCEL && !process.env.API_URL) {
  console.warn("⚠️  API_URL is not set — /api/* will point to 127.0.0.1 and fail on Vercel.");
}

const isDev = process.env.NODE_ENV !== "production";

function origin(url: string | undefined, fallback: string): string {
  try {
    return new URL(url || fallback).origin;
  } catch {
    return new URL(fallback).origin;
  }
}

// บริการภายนอกที่หน้าเว็บเรียกได้ (เปลี่ยนเซิร์ฟเวอร์ผ่าน env แล้ว CSP ตามให้อัตโนมัติ)
const MAP_ORIGIN = origin(process.env.NEXT_PUBLIC_MAP_STYLE, "https://tiles.openfreemap.org");
const EXTERNAL_CONNECT = [
  MAP_ORIGIN,
  origin(process.env.NEXT_PUBLIC_ROUTING_URL, "https://router.project-osrm.org"),
  origin(process.env.NEXT_PUBLIC_GEOCODER_URL, "https://photon.komoot.io"),
  origin(process.env.NEXT_PUBLIC_NOMINATIM_URL, "https://nominatim.openstreetmap.org"),
];

const csp = [
  "default-src 'self'",
  // Next.js ใส่ inline script สำหรับ hydration · dev ต้องใช้ eval
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${MAP_ORIGIN}`,
  "font-src 'self' data:",
  `connect-src 'self' ${[...new Set(EXTERNAL_CONNECT)].join(" ")}${isDev ? " ws: http://localhost:* http://127.0.0.1:*" : ""}`,
  // MapLibre สร้าง web worker จาก blob:
  "worker-src 'self' blob:",
  "child-src blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // บังคับ https เฉพาะบน Vercel (รัน next start บนเครื่องเป็น http)
  ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // ใช้ตำแหน่งได้เฉพาะหน้าเว็บนี้ · ปิดกล้อง ไมค์ และอื่นๆ ที่ไม่ได้ใช้
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
