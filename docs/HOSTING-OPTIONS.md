# Hosting Options

## แนวทางแนะนำ

ใช้ GitHub Private Repository เป็นศูนย์กลาง Source และประวัติรุ่น แล้ว Deploy ไป Cloudflare Workers/Pages พร้อม D1 และ R2

- GitHub — Source, Version Control และการส่งต่อเจ้าของ
- Cloudflare Workers/Pages — เว็บและ API
- Cloudflare D1 — metadata, ผู้ใช้, Watchlist และสถานะ Sync
- Cloudflare R2 — Full Product Intelligence JSON
- Independent Auth — Email OTP, Google Login หรือระบบสมาชิกที่เลือก

Source ปัจจุบันมี Worker, D1 schema และพื้นที่เชื่อม R2 อยู่แล้ว จึงเป็นเส้นทางที่แก้น้อยที่สุด

## GitHub Pages อย่างเดียว

เหมาะเฉพาะ Dashboard แบบ Static หรือเก็บข้อมูลใน Browser ไม่เหมาะกับ Login, API Sync และฐานข้อมูลกลาง หากใช้ GitHub Pages ต้องมี Backend เช่น Supabase เพิ่มต่างหาก

## ทางเลือก Supabase

ใช้ GitHub เก็บ Source และใช้ Supabase สำหรับ Login, PostgreSQL และ Storage เหมาะเมื่อให้หลายอีเมลใช้งาน แต่ต้องแปลงชั้น D1/R2 และตรวจ Row Level Security

## ความปลอดภัย

- Repository ต้องเป็น Private จนกว่าจะตรวจ Secret ครบ
- ห้าม commit `.env`, Token, Cookie, OTP หรือ Credential
- เปิด MFA และกำหนด Owner/Editor/Viewer
- แยกข้อมูลด้วย User ID และนโยบายสิทธิ์ฝั่งฐานข้อมูล
- ต้องมี Export, Import, Delete Account และ Audit Log

