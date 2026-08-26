# GitHub Pages Free — TalentVee

ไฟล์เว็บไซต์พร้อมใช้งานอยู่ในโฟลเดอร์ `docs/` บน branch `main` แล้ว

## เปิด Hosting ครั้งแรก

GitHub Pages ฟรีใช้ได้เมื่อ repository เป็น Public:

1. เปิด repository `TLV-Hunter/talentvee-product-intelligence`
2. ไปที่ `Settings` → `General` → `Danger Zone`
3. เลือก `Change repository visibility` → `Make public`
4. ไปที่ `Settings` → `Pages`
5. Source: `Deploy from a branch`
6. Branch: `main`
7. Folder: `/docs`
8. กด `Save`

เว็บไซต์จะอยู่ที่:

`https://tlv-hunter.github.io/talentvee-product-intelligence/`

## รูปแบบข้อมูล

- เว็บไซต์และ source เปิดสาธารณะ แต่ไม่มีข้อมูลสินค้า, Password, OTP, Cookie หรือ Shopee Session อยู่ใน repository
- ข้อมูลสินค้าจริงเก็บใน `localStorage` ของเบราว์เซอร์
- Extension ส่งข้อมูลให้เว็บผ่าน content script บนเครื่องของผู้ใช้
- ก่อนเปลี่ยนเครื่องให้ดาวน์โหลด `TalentVee Full Backup`
- เครื่องใหม่ให้นำเข้าไฟล์ Full Backup หนึ่งครั้ง จึงไม่ต้องสแกนใหม่

## อัปเดตเว็บ

```bash
cd dashboard
npm run build:pages
```

จากนั้น commit และ push ไฟล์ `docs/index.html`, `docs/assets/app.js` และ
`docs/assets/app.css` ขึ้น branch `main` หน้าเว็บจะอัปเดตอัตโนมัติ
