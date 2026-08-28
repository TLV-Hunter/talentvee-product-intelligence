# TalentVee Product Intelligence

## เปิดใช้งาน

🌐 **[เปิด TalentVee Product Intelligence](https://tlv-hunter.github.io/talentvee-product-intelligence/)**

> เว็บไซต์ Production ใช้ GitHub Pages แบบฟรีและ Local-first

ระบบวิเคราะห์สินค้า Shopee Affiliate ประกอบด้วย Chrome Extension สำหรับอ่านข้อมูลจาก session ที่ผู้ใช้ล็อกอินเอง และ Dashboard สำหรับจัดอันดับสินค้า ดูประวัติ Watchlist และสำรองข้อมูลข้ามเครื่อง

## โครงสร้าง

- `extension/` — TalentVee Shopee Affiliate Connector
- `dashboard/` — TalentVee Product Intelligence web dashboard และ `/api/sync`
- `docs/` — คู่มือย้ายบัญชี ย้าย Hosting และ Acceptance Test

## ความปลอดภัย

- ใช้เฉพาะข้อมูลที่ `affiliate.shopee.co.th` แสดงให้บัญชีที่ผู้ใช้ล็อกอินเอง
- ห้าม commit Password, OTP, Cookie, Session, Token, `.env` หรือ Hosting credential
- Full Backup ไม่เก็บ Password, OTP, Cookie หรือ Shopee Session
- Repository นี้เป็น Public เพื่อใช้ GitHub Pages ฟรี จึงห้าม commit ข้อมูลสแกนจริงหรือข้อมูลลับทุกชนิด

## สถานะเวอร์ชัน

- Production บน `main`: Extension `1.2.0` และ Dashboard version 8
- Feature candidate บน `feature/top-100-update-modes`: Extension `1.2.5` เพิ่มสินค้าใหม่ยืนยัน/ขายดี/มาแรง Top 100 โดยต่อยอดจาก `release/v1.2.4`
- Full Backup format: `talentvee-full-backup` version `1`
- XTRA regression จาก Diagnostic จริงยังเป็น Quality Gate ที่ต้องผ่านก่อน merge รุ่น `v1.2.5` เข้า Production

เริ่มติดตั้ง Extension ได้จาก `extension/README.md` และเริ่มย้าย Hosting ได้จาก `docs/MIGRATION-CHECKLIST.md`

## GitHub Pages (Production ฟรี)

Static dashboard ที่เก็บข้อมูลแบบ Local-first อยู่ใน `docs/` และ build ใหม่ด้วย
`cd dashboard && npm run build:pages` ได้ทันที เมื่อเปิด GitHub Pages จาก `main /docs`
เว็บจะอยู่ที่ `https://tlv-hunter.github.io/talentvee-product-intelligence/`

รุ่น GitHub Pages ไม่ส่ง Password, OTP, Cookie หรือ Shopee Session ขึ้น GitHub
ข้อมูลสินค้าจริงอยู่ในเบราว์เซอร์ของผู้ใช้ และย้ายเครื่องด้วย Full Backup ที่มี SHA-256 checksum

## Quality gates

- Connector: `node --test extension/tests/connector-regression.test.mjs`
- Dashboard lint: `cd dashboard && npm run lint`
- GitHub Pages: `cd dashboard && npm test`
- Sites reference build: `cd dashboard && npm run build`

ระบบ CI รันรายการข้างต้นเมื่อ push ไปยัง `main`, `release/**` หรือเปิด Pull Request
