# Validation Report

วันที่ตรวจ: 2026-08-27 UTC
Branch: `feature/top-100-update-modes`

## ผ่าน

- Extension Manifest V3 รุ่น `1.2.5` และ JavaScript syntax ผ่าน
- Connector regression tests ผ่าน 10 รายการ; XTRA fixture test ยัง skipped 1 รายการ
- Top 100 target selector ผ่านการทดสอบขายดี, มาแรง และสินค้าใหม่ยืนยัน
- Installer ตรวจว่ารวม `scan-targets.js` แล้ว
- Tab resolver ผ่าน 4 สถานการณ์
- Safety 500 และ Smart Incremental source guards ผ่าน
- Dashboard lint ผ่านด้วย 0 errors; มี 3 warnings ที่ตรวจแล้ว
- GitHub Pages static build ผ่าน
- GitHub Pages content acceptance tests ผ่าน 3 รายการ
- Sites/vinext production build ผ่าน และสร้าง route `/` กับ `/api/sync` สำเร็จ
- Commission แยกเป็นค่าที่หน้าแสดง, Base, Extra, Total และ XTRA badge-only
- Dashboard ไม่สร้างเปอร์เซ็นต์ Extra เมื่อไม่มีตัวเลขแยก
- Product analysis แสดงเหตุผล ข้อควรระวัง และข้อความว่าไม่รับประกันยอดขาย

## ยังไม่ผ่าน / ยังไม่ทดสอบ

- XTRA regression จาก Diagnostic JSON จริง: `SKIPPED — FIXTURE NOT RECEIVED`
- Visual screenshot QA: `BLOCKED — Chromium runtime download timed out`
- User-side Extension install/version confirmation: `PENDING`
- End-to-end scan → Connector bridge → GitHub Pages: `PENDING`
- Sites server-render test ด้วย Node ปกติยังไม่รองรับ `cloudflare:` URL scheme

## Quality Gate ก่อน merge เข้า `main`

1. เพิ่ม Diagnostic JSON fixture และทำ XTRA regression ให้ผ่าน
2. รัน CI ให้ผ่านครบ
3. ตรวจภาพ Desktop/Mobile ของ GitHub Pages
4. ตรวจ Full Backup ก่อนการติดตั้งแบบทำลายข้อมูลหรือ Replace
5. ให้ผู้ใช้ยืนยัน Extension version และการสแกนจริง

แพ็กเกจ `v1.2.5` ใช้สำหรับติดตั้งทดสอบจาก feature branch เท่านั้น ห้าม merge เข้า Production หรือเรียกว่า Release Ready จนกว่ารายการด้านบนจะผ่าน
