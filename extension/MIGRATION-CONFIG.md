# เปลี่ยนโดเมน Dashboard ภายหลัง

รุ่น v1.1.0 รวมค่า Backend หลักไว้ที่ `config.js` เพื่อลดจุดที่ต้องแก้เมื่อย้ายจากโฮสต์เดิม

เมื่อมีโดเมนใหม่ ให้แก้และทดสอบพร้อมกัน 3 จุด:

1. `config.js` — ค่า `dashboardUrl`
2. `manifest.json` → `host_permissions`
3. `manifest.json` → `content_scripts.matches`

หลังเปลี่ยน:

1. เพิ่มเลขรุ่น Extension
2. รันตัวติดตั้ง
3. กด Reload
4. เปิด Dashboard ใหม่
5. ตรวจ Pull, Sync, Full Backup Export และ Full Backup Import

ห้ามใส่ Token, Cookie, Password, OTP หรือ Secret ลงใน `config.js` หรือ `manifest.json`
