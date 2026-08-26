# TalentVee Product Intelligence

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

