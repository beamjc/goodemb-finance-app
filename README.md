# สมุดบัญชีโรงปัก — Good Embroidery Finance Tracker

เว็บแอปจดรายรับ–รายจ่ายของโรงปัก ใช้ Supabase เป็นฐานข้อมูล + auth และ deploy เป็น static site บน Cloudflare Pages

สแต็ก: Vite + React + Tailwind CSS + Supabase (auth + Postgres + RLS)

---

## ขั้นที่ 1 — สร้าง Supabase project

1. ไปที่ https://supabase.com → New project
2. ตั้งชื่อ เช่น `good-embroidery-finance`, เลือก region ใกล้ๆ (Singapore)
3. รอ project สร้างเสร็จ (1-2 นาที)
4. ไปที่ **SQL Editor** → วางเนื้อหาทั้งหมดจากไฟล์ `supabase/schema.sql` → กด Run
   - จะได้ตาราง `expenses`, `income`, `targets` พร้อม Row Level Security ที่ผูกกับบัญชี login เลย
5. ไปที่ **Project Settings → API** → คัดลอกค่า 2 ตัว:
   - `Project URL`
   - `anon public` key

## ขั้นที่ 2 — สร้างบัญชีผู้ใช้ (ไม่เปิดให้สมัครเอง)

1. ไปที่ **Authentication → Users → Add user**
2. ใส่อีเมล + รหัสผ่านที่จะใช้ login (เช่น อีเมลของพี่ และของคนอื่นที่ต้องใช้)
3. ติ๊ก "Auto confirm user" เพื่อไม่ต้องยืนยันอีเมล
4. ทำซ้ำสำหรับทุกคนที่ต้องการให้เข้าถึงได้ (เว็บนี้ไม่มีหน้าสมัครสมาชิกสาธารณะ — ปลอดภัยกว่า)

## ขั้นที่ 3 — รันบนเครื่องเพื่อทดสอบ (ถ้าต้องการ)

```bash
cd finance-app
npm install
cp .env.local.example .env.local
# แก้ .env.local ใส่ Project URL และ anon key จากขั้นที่ 1
npm run dev
```

เปิด http://localhost:5173 แล้ว login ด้วยบัญชีที่สร้างไว้

## ขั้นที่ 4 — Deploy ขึ้น Cloudflare Pages

**แบบเชื่อม GitHub (แนะนำ — อัปเดตง่ายในอนาคต)**

1. Push โฟลเดอร์นี้ขึ้น GitHub repo ใหม่
2. ไปที่ Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
3. เลือก repo นี้ ตั้งค่า build:
   - Build command: `npm run build`
   - Build output directory: `dist`
4. ใส่ Environment variables (สำคัญมาก ไม่งั้น login ไม่ได้):
   - `VITE_SUPABASE_URL` = Project URL จากขั้นที่ 1
   - `VITE_SUPABASE_ANON_KEY` = anon key จากขั้นที่ 1
5. กด Save and Deploy

**แบบอัปโหลดตรง (เร็วกว่าถ้าไม่อยากตั้ง repo)**

```bash
npm run build
npx wrangler pages deploy dist --project-name=good-embroidery-finance
```

ต้องตั้ง environment variables ใน Cloudflare Pages dashboard เหมือนแบบ GitHub ด้วย เพราะตอน build ต้องอ่านค่าจาก `import.meta.env`

## ขั้นที่ 5 — ผูกโดเมน finance.goodemb.com (ฟรี เพราะ goodemb.com อยู่บน Cloudflare อยู่แล้ว)

1. ใน Pages project → **Custom domains → Set up a custom domain**
2. พิมพ์ `finance.goodemb.com` → Cloudflare จะสร้าง CNAME record ให้อัตโนมัติเพราะ DNS ของ goodemb.com อยู่ใน Cloudflare zone เดียวกัน
3. รอ DNS propagate ไม่กี่นาที ก็เข้าผ่าน `https://finance.goodemb.com` ได้เลย พร้อม SSL ฟรี

---

## หมายเหตุเรื่องความปลอดภัย

- ไม่มีหน้าสมัครสมาชิกสาธารณะ — เพิ่ม user ได้จาก Supabase Dashboard เท่านั้น
- ข้อมูลทุกตารางมี Row Level Security ผูกกับ `auth.uid()` ของบัญชีที่ login แม้จะรู้ URL ก็เข้าไม่ได้ถ้าไม่ login
- `anon public` key ใส่ใน frontend ได้ปกติ (เป็นคีย์ที่ออกแบบมาให้ public แต่ทำงานร่วมกับ RLS) — **ห้าม** ใช้ `service_role` key ในโค้ด frontend เด็ดขาด

## โครงสร้างไฟล์

```
finance-app/
  src/
    components/
      Login.jsx       — หน้า login
      MainApp.jsx      — แดชบอร์ด, รายจ่าย, รายรับ ทั้งหมด
    App.jsx            — จัดการ session/auth state
    supabaseClient.js   — เชื่อมต่อ Supabase
    index.css
    main.jsx
  supabase/
    schema.sql          — รันใน Supabase SQL Editor
  .env.local.example
```
# goodemb-finance-app
