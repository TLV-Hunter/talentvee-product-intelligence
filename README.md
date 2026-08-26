# TalentVee Product Intelligence

## เปิดใช้งาน

🌐 **[เปิด TalentVee Product Intelligence](https://talentvee-product-intelligence.voxelhavenlofi.chatgpt.site)**

> GitHub Repository นี้เก็บ Source ส่วนเว็บไซต์ Production เปิดจากลิงก์ด้านบน

ระบบวิเคราะห์สินค้า Shopee Affiliate ประกอบด้วย Chrome Extension สำหรับอ่านข้อมูลจาก session ที่ผู้ใช้ล็อกอินเอง และ Dashboard สำหรับจัดอันดับสินค้า ดูประวัติ Watchlist และสำรองข้อมูลข้ามเครื่อง

## โครงสร้าง

- `extension/` — TalentVee Shopee Affiliate Connector v1.1.0
- `dashboard/` — TalentVee Product Intelligence web dashboard และ `/api/sync`
- `docs/` — คู่มือย้ายบัญชี ย้าย Hosting และ Acceptance Test

## ความปลอดภัย

- ใช้เฉพาะข้อมูลที่ `affiliate.shopee.co.th` แสดงให้บัญชีที่ผู้ใช้ล็อกอินเอง
- ห้าม commit Password, OTP, Cookie, Session, Token, `.env` หรือ Hosting credential
- Full Backup ไม่เก็บ Password, OTP, Cookie หรือ Shopee Session
- Repository ควรเป็น Private จนกว่าจะตรวจความปลอดภัยและสิทธิ์ใช้งานครบ

## รุ่นปัจจุบัน

- Extension: `1.1.0`
- Full Backup format: `talentvee-full-backup` version `1`
- Dashboard production source: version 8 checkpoint

เริ่มติดตั้ง Extension ได้จาก `extension/README.md` และเริ่มย้าย Hosting ได้จาก `docs/MIGRATION-CHECKLIST.md`

## GitHub Pages (Free fallback)

Static dashboard ที่เก็บข้อมูลแบบ Local-first อยู่ใน `docs/` และ build ใหม่ด้วย
`cd dashboard && npm run build:pages` ได้ทันที เมื่อเปิด GitHub Pages จาก `main /docs`
เว็บจะอยู่ที่ `https://tlv-hunter.github.io/talentvee-product-intelligence/`

รุ่น GitHub Pages ไม่ส่ง Password, OTP, Cookie หรือ Shopee Session ขึ้น GitHub
ข้อมูลสินค้าจริงอยู่ในเบราว์เซอร์ของผู้ใช้ และย้ายเครื่องด้วย Full Backup ที่มี SHA-256 checksum
