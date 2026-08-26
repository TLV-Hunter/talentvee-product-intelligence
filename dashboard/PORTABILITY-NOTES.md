# Website Portability Notes

- แพ็กนี้ไม่รวม `.git`, `node_modules`, build cache หรือ `.openai/hosting.json` ของโครงการเดิม
- `hosting.example.json` เป็น placeholder เท่านั้น ห้ามนำ Project ID เดิมไปใช้กับบัญชีใหม่
- ก่อน Deploy ให้ติดตั้ง dependencies, สร้าง D1/R2 bindings และตั้งค่า secrets ผ่าน Hosting
- เปลี่ยนระบบ Login ก่อนเปิดให้หลายอีเมลใช้งานจริง
- เมื่อได้โดเมนใหม่ ให้แก้ Extension ตาม `extension/source/MIGRATION-CONFIG.md`
- Import Full Backup และตรวจจำนวนข้อมูลก่อนยกเลิกเว็บเดิม

