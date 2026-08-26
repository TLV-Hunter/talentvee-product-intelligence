# Validation Report

วันที่ตรวจ: 2026-08-26 UTC

## ผ่าน

- Website production build สำเร็จ
- Website Production version 8 เผยแพร่สำเร็จ
- Route `/` และ API `/api/sync` ถูก Build
- Extension Manifest V3 รุ่น 1.1.0 ตรวจผ่าน
- Extension JavaScript ตรวจ syntax ผ่าน
- ZIP Extension ตรวจความสมบูรณ์ผ่าน
- Full Backup มี schema version และ SHA-256 checksum
- Import รองรับ Merge/Replace และ Replace สำรองข้อมูลเดิมก่อน
- Migration Pack ไม่มี Git history, `node_modules`, build cache หรือ Hosting credential

## ข้อจำกัดที่ทราบ

ชุดทดสอบ `tests/rendered-html.test.mjs` ไม่สามารถรันด้วย Node runtime ปกติโดยตรง เพราะ Source ใช้โมดูล `cloudflare:workers` ซึ่ง Node ESM loader ไม่รองรับ Production build ผ่านแล้ว แต่ก่อนย้าย Hosting ต้องเพิ่ม Cloudflare-compatible integration test หรือ mock runtime สำหรับ API และ database bindings

## Quality Gate ก่อน Migration จริง

- Login ใหม่ต้องผ่าน
- D1/R2 หรือ Backend ใหม่ต้องผ่าน
- Extension Sync ไปโดเมนใหม่ต้องผ่าน
- Restore บนเครื่องหรือ Chrome Profile ใหม่ต้องผ่าน
- จำนวนสินค้า Watchlist หมวด และประวัติต้องตรงกับต้นฉบับ

