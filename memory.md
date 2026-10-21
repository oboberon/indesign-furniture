# memory.md — บทเรียนและโน้ตของโปรเจกต์ Indesign Furniture

## บทเรียน (อย่าทำผิดซ้ำ)
- (ยังไม่มี)

## การตัดสินใจสำคัญ
- 2026-10-21 ต่อยอดแอปคำนวณต้นทุนเดิม ไม่เริ่มใหม่ — ข้อมูลและสูตรเดิมใช้ต่อ
- 2026-10-21 ย้าย Neon → Supabase และ Vercel → Cloudflare Workers ตาม stack มาตรฐาน (ต้องใช้ Auth + Storage สำหรับบทบาทและรูป)
- 2026-10-21 เพิ่มบทบาทเซลที่ห้ามเห็นต้นทุน → แอปต้องมีล็อกอิน (เดิมเปิดสาธารณะ)

## กับดัก / จุดที่ต้องระวัง
- Next.js 16 บน Cloudflare Workers ต้องใช้ OpenNext adapter (`@opennextjs/cloudflare`) ไม่ใช่ static assets แบบ SPA — ตรวจเอกสารล่าสุดก่อนตั้งค่า
- Drizzle ต่อ DB ฝั่ง server ด้วย connection string = ข้าม RLS → ต้องเช็ก role ใน Server Action เสมอ ห้ามพึ่ง RLS อย่างเดียว
- Excel 4 ใบจาก 66 ใบยอดไม่ตรง เพราะ SUM ใน Excel ข้ามแถว "เอจปิดขอบ PVC 28" — แอปถูก อย่า "แก้" ให้ตรง Excel
- โฟลเดอร์ `./resources` (ไฟล์ Excel ภายใน) ห้าม commit
- `next dev` เขียนบรรทัด `@AGENTS.md` ลง CLAUDE.md ใหม่เสมอ — เก็บไว้บนสุดของไฟล์

## โน้ตย่อย
- สูตรต้นทุนอยู่ที่ `src/lib/calc.ts` มี test เทียบยอด Excel จริง
- Neon project เดิมชื่อ "indesign-furniture" · Vercel ใช้ region sin1

## สรุปย่อของเก่า
- (ยังไม่มี)

---
- 2026-10-21 สร้าง CLAUDE.md / project.md / memory.md จาก /start-project
