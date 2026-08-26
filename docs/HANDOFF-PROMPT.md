# คำสั่งสำหรับบัญชีหรือผู้พัฒนารายใหม่

```text
อ่านไฟล์ทั้งหมดใน TalentVee Product Intelligence Migration Pack ก่อนดำเนินการ

เป้าหมายคือรับช่วงพัฒนา TalentVee Product Intelligence และ TalentVee Shopee Affiliate Connector ต่อ โดยรักษาความสามารถเดิม และทำให้ย้ายบัญชี ย้ายเครื่อง และย้าย Hosting ได้โดยไม่สูญเสียข้อมูล

ข้อกำหนด:
1. ห้ามใส่ Password, OTP, Cookie, Session หรือ Secret ลง Source, Log หรือ GitHub
2. ใช้เฉพาะข้อมูลที่ affiliate.shopee.co.th แสดงแก่บัญชีที่ผู้ใช้ล็อกอินเอง
3. ห้ามประมาณค่าคอม ราคา สิทธิ์ SKU หรือสิทธิ์ Shopee Video
4. รักษาสถานะ AUTHENTICATED / PUBLIC-ONLY / NOT CONNECTED / FIELD_NOT_AVAILABLE
5. รักษารูปแบบ Full Backup และตรวจ version/checksum ก่อน Import
6. แยกข้อมูลของผู้ใช้แต่ละรายด้วย User ID
7. สำรองก่อน migration และทำ Acceptance Test หลัง migration
8. Source หลักควรอยู่ใน GitHub Private Repository
9. ก่อนเปลี่ยน URL ของ Extension ต้องทดสอบ Login, Scan, Sync, Restore และ Watchlist
10. ห้ามปิดระบบเดิมจนกว่าระบบใหม่ผ่าน Acceptance Test

เริ่มจากตรวจ Source, schema, Full Backup และรายงาน Current State จากนั้นเสนอแผน Migration แบบย้อนกลับได้
```

