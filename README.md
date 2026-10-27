# My EV — ค้นหาสถานีชาร์จรถยนต์ไฟฟ้า

เว็บแอปค้นหาสถานีชาร์จ EV มี 2 เมนู

- **📍 ใกล้ฉัน** — สถานีรอบตัวเรียงตามระยะทาง พร้อมโลโก้ผู้ให้บริการ กดนำทางได้ทันที
- **🧭 ค้นหาเส้นทาง** — ค้นหาปลายทาง แสดงสถานีชาร์จตลอดเส้นทางเรียงตามลำดับที่จะผ่าน กด "+ แวะพัก" เพื่อเพิ่มเป็นจุดแวะ แล้วเริ่มนำทาง

การนำทางในแอปหมุนแผนที่ตามทิศรถ บอกทางเลี้ยวเป็นภาษาไทย และคำนวณเส้นทางใหม่เมื่อออกนอกเส้นทาง

| โฟลเดอร์ | คืออะไร | เทคโนโลยี |
|---|---|---|
| `my-ev-web/` | หน้าเว็บ + แผนที่ + นำทาง | Next.js, MapLibre GL (แผนที่ OpenFreeMap Liberty), Tailwind CSS |
| `my-ev-api/` | API ค้นหาสถานีใกล้ฉัน | Python FastAPI + Supabase (PostGIS) |

```
เบราว์เซอร์ ──/api/*──▶ Next.js (proxy ฝั่ง server) ──▶ FastAPI ──▶ Supabase
     ├────────────── เส้นทางนำทาง ──────────────▶ OSRM
     └────────────── ค้นหาสถานที่ ──────────────▶ Photon (OpenStreetMap)
```

## หน้าเว็บ

| URL | หน้า |
|---|---|
| `/` | หน้าแรก (hero, ฟีเจอร์, ผู้ให้บริการ, วิธีใช้งาน) |
| `/map` | แผนที่ — เมนูใกล้ฉัน |
| `/map?mode=route` | แผนที่ — เมนูค้นหาเส้นทาง |

ดีไซน์อิงจาก template [Mailler - SaaS Website Template](https://htmlcodex.com/saas-website-template) โดย HTML Codex (CC BY 4.0) — ต้องคงลิงก์ "Designed By HTML Codex" ไว้ที่ footer ตามสัญญาอนุญาต

## รันบนเครื่อง (dev)

**API**
```bash
cd my-ev-api
cp .env.example .env          # ใส่ SUPABASE_URL / SUPABASE_KEY
pip install -r requirements.txt
uvicorn main:app --reload     # http://127.0.0.1:8000/docs
```

**เว็บ**
```bash
cd my-ev-web
cp .env.example .env.local    # API_URL=http://127.0.0.1:8000
npm install
npm run dev                   # http://localhost:3000
```

## Deploy บน Vercel (2 โปรเจกต์จาก repo เดียวกัน)

ทำ API ก่อน เพราะเว็บต้องรู้ URL ของ API ตอน build

### 1) API — FastAPI
1. Vercel → **Add New… → Project** → Import repo `ev-charger-app`
2. **Root Directory**: `my-ev-api` (Framework จะตรวจเจอ FastAPI เอง)
3. **Environment Variables**
   - `SUPABASE_URL` = URL โปรเจกต์ Supabase
   - `SUPABASE_KEY` = anon key
   - `API_SHARED_SECRET` = กุญแจลับร่วมกับเว็บ (ดูหัวข้อความปลอดภัย)
4. Deploy → ทดสอบ `https://<api>.vercel.app/` (หน้า `/docs` ปิดบน production — เปิดได้ด้วย `ENABLE_DOCS=1`)

### 2) เว็บ — Next.js
1. Import repo เดิมอีกครั้งเป็นโปรเจกต์ใหม่
2. **Root Directory**: `my-ev-web` (Framework: Next.js)
3. **Environment Variables**
   - `API_URL` = `https://<api>.vercel.app` (ไม่มี `/` ท้าย)
   - (ไม่บังคับ) `NEXT_PUBLIC_ROUTING_URL` = เซิร์ฟเวอร์ OSRM ของคุณเอง
   - (ไม่บังคับ) `NEXT_PUBLIC_GEOCODER_URL` = เซิร์ฟเวอร์ Photon ของคุณเอง (ค้นหาแบบเร็ว)
   - (ไม่บังคับ) `NEXT_PUBLIC_NOMINATIM_URL` = เซิร์ฟเวอร์ Nominatim ของคุณเอง (ค้นหาแบบละเอียด)
   - (ไม่บังคับ) `NEXT_PUBLIC_MAP_STYLE` = สไตล์แผนที่ (ค่าเริ่มต้น `https://tiles.openfreemap.org/styles/liberty` — เปลี่ยนเป็น `.../positron` หรือ `.../bright` ได้)
   - `API_SHARED_SECRET` = ค่าเดียวกับของโปรเจกต์ API
4. Deploy

> แก้ Environment Variables ภายหลัง ต้อง **Redeploy** ทุกครั้ง

หลังจากนี้ทุกครั้งที่ push ขึ้น `main` Vercel จะ deploy ให้อัตโนมัติ และทุก branch/PR จะได้ Preview URL แยก

## ความปลอดภัย

- **กุญแจลับร่วม `API_SHARED_SECRET`** — เว็บแนบกุญแจนี้ทุกครั้งที่ส่งต่อคำขอ `/api/*` (ใน `my-ev-web/proxy.ts`) และ API จะปฏิเสธคำขอที่ไม่มีกุญแจ (403) จึงเรียก API ตรงจากภายนอกไม่ได้
  - สร้างค่าสุ่ม: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
  - **ลำดับการตั้ง**: ตั้งที่โปรเจกต์ **เว็บก่อน** → Redeploy → แล้วค่อยตั้งที่โปรเจกต์ **API** → Redeploy (ถ้าตั้งที่ API ก่อน เว็บจะใช้ไม่ได้ช่วงหนึ่ง)
  - ถ้าวันหนึ่งให้แอปมือถือเรียก API ตรง ต้องเปลี่ยนวิธียืนยันตัวตน (เช่น token ของผู้ใช้) เพราะกุญแจที่ฝังในแอปถูกแกะออกได้
- **จำกัดจำนวนคำขอต่อ IP** ทั้งที่เว็บ (`WEB_RATE_LIMIT_*`) และ API (`RATE_LIMIT_*`) — นับแยกต่อ instance ของ serverless จึงเป็นการป้องกันพื้นฐาน ถ้าโดนยิงหนักให้เพิ่มกฎ Rate Limit ใน Vercel Firewall
- **Security headers** (CSP, HSTS, X-Frame-Options ฯลฯ) ตั้งใน `my-ev-web/next.config.ts` — ถ้าเพิ่มบริการภายนอกใหม่ ต้องเพิ่มโดเมนใน CSP ด้วย
- **Supabase**: ใช้ **anon key** เท่านั้น (ห้ามใช้ service_role) และเปิด **Row Level Security** ทุกตาราง — ตาราง `stations` ให้สิทธิ์อ่านอย่างเดียว
- API เช็กอิน (`POST /stations/{id}/checkin`) ปิดไว้จนกว่าจะมีระบบล็อกอิน
- ข้อความ error จากระบบเก็บใน log ของ Vercel เท่านั้น ผู้ใช้เห็นแค่ข้อความทั่วไป

## หมายเหตุ
- ห้าม commit ไฟล์ `.env` / `.env.local` (มีใน `.gitignore` แล้ว) — ใช้ `.env.example` เป็นแม่แบบ
- เส้นทางนำทางใช้เซิร์ฟเวอร์สาธิตฟรีของ [OSRM](https://project-osrm.org) และค้นหาสถานที่ด้วย [Photon](https://photon.komoot.io) เหมาะกับการทดสอบ ถ้าผู้ใช้เยอะควรใช้เซิร์ฟเวอร์ของตัวเอง
- API `POST /stations/along-route` รับพิกัดเส้นทาง `{coords: [[lat,lng],...], buffer_m}` แล้วคืนสถานีที่ห่างเส้นทางไม่เกิน `buffer_m` เรียงตามระยะจากจุดเริ่ม (ใช้ตาราง `stations` เดิม ไม่ต้องสร้าง SQL function เพิ่ม)
- การขอตำแหน่ง (GPS) ต้องเป็น HTTPS — โดเมน `*.vercel.app` เป็น HTTPS อยู่แล้ว
- โลโก้ใน `my-ev-web/public/logos/` เป็นเครื่องหมายการค้าของผู้ให้บริการแต่ละราย ใช้เพื่อระบุสถานีเท่านั้น
