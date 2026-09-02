# YouthNews — เว็บไซต์ข่าวพร้อมหลังบ้าน

## จุดเด่น
- หน้าเว็บข่าว responsive สำหรับมือถือ/แท็บเล็ต/เดสก์ท็อป
- หน้าแรก: ข่าวเด่น, Breaking, ข่าวล่าสุด, หมวดข่าว, เรื่องน่าสนใจ
- หน้าอ่านข่าวแยกเรื่อง พร้อมยอดอ่าน
- หลังบ้าน `/admin` สำหรับเพิ่ม/แก้ไข/ลบ/ร่าง/เผยแพร่ข่าว
- อัปโหลดภาพปกจากหลังบ้าน
- ตั้งค่าชื่อเว็บ, tagline, Breaking, อีเมล และ social links
- SQLite เก็บข้อมูลใน `data/youthnews.db` ทำให้แก้ไข/สำรองข้อมูลย้อนหลังได้
- ใช้ environment variables เปลี่ยนบัญชี admin และ session secret
- พร้อมต่อยอดเป็นระบบสมาชิก, workflow กองบรรณาธิการ, SEO, sitemap และ analytics

## วิธีรัน
ต้องมี Node.js 18+ (แนะนำ 20+)

```bash
npm install
npm start
```

เปิด:
- เว็บไซต์: http://localhost:3000
- หลังบ้าน: http://localhost:3000/admin

ค่าเริ่มต้น:
- username: `admin`
- password: `change-me-now`

ก่อนใช้งานจริงให้ตั้ง:
- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `PORT` (ถ้าต้องการ)

ตัวอย่าง:
```bash
ADMIN_USER=editor ADMIN_PASSWORD='รหัสผ่านที่แข็งแรง' SESSION_SECRET='สุ่มยาวๆ' npm start
```

## Backup
สำรองไฟล์ `data/youthnews.db` และโฟลเดอร์ `public/uploads/` เป็นระยะ ๆ

## หมายเหตุ
โปรเจกต์นี้เป็นเว็บจริงที่มี server + database + admin CRUD ไม่ใช่แค่ mockup. สามารถนำขึ้น VPS/Render/Railway/Fly.io หรือบริการ Node.js ที่รองรับ persistent storage ได้ โดยควรใช้ HTTPS และตั้ง secure session cookie ก่อน production.
