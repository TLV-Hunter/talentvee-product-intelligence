# Migration Checklist

## A. สำรองก่อนย้าย

- [ ] เปิด Connector v1.1.0 และกด `สร้าง Full Backup`
- [ ] เก็บ Full Backup อย่างน้อย 2 แห่ง
- [ ] บันทึกจำนวนสินค้า Watchlist หมวด และเวลาสแกนล่าสุด
- [ ] เก็บตัวติดตั้ง Extension และ Migration Pack รุ่นล่าสุด
- [ ] ตรวจว่าแพ็กไม่มี Password, OTP, Cookie, Session, Token หรือ Secret

## B. เตรียมเจ้าของและระบบใหม่

- [ ] สร้าง GitHub Private Repository
- [ ] เพิ่มเจ้าของใหม่และผู้พัฒนาที่ต้องทำงานต่อ
- [ ] เปิด MFA สำหรับ GitHub และ Hosting
- [ ] เลือก Login ใหม่ที่ไม่ผูกกับ ChatGPT Account
- [ ] สร้างฐานข้อมูลและ Object Storage ใหม่
- [ ] ตั้งค่า Environment Variables ใน Hosting เท่านั้น

## C. ย้ายเว็บไซต์

- [ ] นำ `website-source` ขึ้น GitHub
- [ ] เปลี่ยน Sign in with ChatGPT เป็นระบบ Login ใหม่
- [ ] สร้างตารางจาก `website-source/drizzle`
- [ ] ตั้งค่า Object Storage สำหรับฐานข้อมูลสินค้า
- [ ] ตั้ง CORS ให้รับเฉพาะโดเมนเว็บและ Extension ที่อนุญาต
- [ ] Deploy เว็บใหม่และตรวจ `/api/sync`

## D. ย้าย Extension

- [ ] แก้ `extension/source/extension/config.js` เป็น Dashboard URL ใหม่
- [ ] แก้ `host_permissions` และ `content_scripts.matches` ใน `manifest.json`
- [ ] เพิ่มเลขเวอร์ชันและแพ็ก Extension ใหม่
- [ ] Import Full Backup แบบ Merge ก่อน
- [ ] ตรวจจำนวนสินค้า Watchlist และประวัติ
- [ ] ทดสอบ Scan, Sync, Restore และ Export

## E. Acceptance Test

- [ ] Login ด้วยอีเมลใหม่ได้
- [ ] Extension เชื่อมเว็บใหม่ได้
- [ ] ข้อมูลครบและจำนวนตรงกัน
- [ ] Top 10/ขายดี/โตไว/มาใหม่ แสดงได้
- [ ] Watchlist ซิงก์ไป-กลับได้
- [ ] เปลี่ยนเครื่องแล้ว Restore ได้
- [ ] ปิดระบบเดิมชั่วคราวแล้วเว็บใหม่ยังทำงานได้

ห้ามปิดระบบเดิมจนกว่าทุกข้อใน Acceptance Test จะผ่าน

