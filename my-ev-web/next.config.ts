import type { NextConfig } from "next";

// Backend FastAPI URL (server-side only — browser never calls it directly)
const API_URL = process.env.API_URL || "http://127.0.0.1:8000";

// บน Vercel ต้องตั้ง API_URL ก่อน build (rewrites ถูกกำหนดตอน build)
if (process.env.VERCEL && !process.env.API_URL) {
  console.warn("⚠️  API_URL is not set — /api/* will point to 127.0.0.1 and fail on Vercel.");
}

const nextConfig: NextConfig = {
  // Proxy /api/* -> FastAPI เพื่อเลี่ยงปัญหา CORS ทั้งหมด
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
