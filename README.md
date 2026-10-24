# My EV — ค้นหาสถานีชาร์จรถยนต์ไฟฟ้า

เว็บแอปค้นหาสถานีชาร์จ EV ใกล้คุณ แสดงบนแผนที่พร้อมโลโก้ผู้ให้บริการ รายการสถานีเรียงตามระยะทาง และนำทางในแอป

| โฟลเดอร์ | คืออะไร | เทคโนโลยี |
|---|---|---|
| `my-ev-web/` | หน้าเว็บ + แผนที่ + นำทาง | Next.js, React Leaflet, Tailwind CSS |
| `my-ev-api/` | API ค้นหาสถานีใกล้ฉัน | Python FastAPI + Supabase (PostGIS) |

```
เบราว์เซอร์ ──/api/*──▶ Next.js (proxy ฝั่ง server) ──▶ FastAPI ──▶ Supabase
     └────────────── เส้นทางนำทาง ──────────────▶ OSRM
```

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
4. Deploy → ทดสอบ `https://<api>.vercel.app/docs` และ `/stations/nearby?lat=13.7563&lng=100.5018&radius=5000`

### 2) เว็บ — Next.js
1. Import repo เดิมอีกครั้งเป็นโปรเจกต์ใหม่
2. **Root Directory**: `my-ev-web` (Framework: Next.js)
3. **Environment Variables**
   - `API_URL` = `https://<api>.vercel.app` (ไม่มี `/` ท้าย)
   - (ไม่บังคับ) `NEXT_PUBLIC_ROUTING_URL` = เซิร์ฟเวอร์ OSRM ของคุณเอง
4. Deploy

> ถ้าแก้ `API_URL` ภายหลัง ต้อง **Redeploy** เว็บ เพราะค่า proxy ถูกกำหนดตอน build

หลังจากนี้ทุกครั้งที่ push ขึ้น `main` Vercel จะ deploy ให้อัตโนมัติ และทุก branch/PR จะได้ Preview URL แยก

## หมายเหตุ
- ห้าม commit ไฟล์ `.env` / `.env.local` (มีใน `.gitignore` แล้ว) — ใช้ `.env.example` เป็นแม่แบบ
- เส้นทางนำทางใช้เซิร์ฟเวอร์สาธิตฟรีของ [OSRM](https://project-osrm.org) เหมาะกับการทดสอบ ถ้าผู้ใช้เยอะควรใช้เซิร์ฟเวอร์ของตัวเอง
- การขอตำแหน่ง (GPS) ต้องเป็น HTTPS — โดเมน `*.vercel.app` เป็น HTTPS อยู่แล้ว
- โลโก้ใน `my-ev-web/public/logos/` เป็นเครื่องหมายการค้าของผู้ให้บริการแต่ละราย ใช้เพื่อระบุสถานีเท่านั้น
