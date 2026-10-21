@AGENTS.md

# CLAUDE.md — กติกาการทำงานของโปรเจกต์ Indesign Furniture (ระบบคำนวณต้นทุน + ใบเสนอราคา)

@project.md
@memory.md

## เริ่มงานทุก session
1. อ่าน project.md ส่วน "Progress" ก่อน — ทำ "งานต่อไป" ข้อแรก อย่าเริ่มใหม่จากศูนย์
2. อ่าน memory.md — เคารพบทเรียนและการตัดสินใจที่จดไว้ อย่าทำผิดซ้ำ
3. ถ้า requirement ไม่ชัด (โดยเฉพาะข้อที่เขียนว่า "ยังไม่ระบุ") ให้ถามเจ้าของก่อน ห้ามเดาแทน

## ก่อนจบงานทุก session (บังคับ)
1. อัปเดต project.md ส่วน "Progress": ติ๊ก DoD ที่เสร็จ · เขียน "งานล่าสุด" และ "งานต่อไป" ใหม่
2. จดลง memory.md ถ้ามี: บทเรียน / การตัดสินใจ / กับดักที่เจอ / สิ่งที่ยังค้าง
3. commit ทุกไฟล์ที่แก้ พร้อมข้อความบอกว่าทำอะไร

## Stack ของโปรเจกต์นี้ (ห้ามเปลี่ยน)
- ฐานข้อมูล: Supabase (Postgres + Auth + Storage) เท่านั้น — ย้ายมาจาก Neon
- Login: Google Auth ผ่าน Supabase Auth — เจ้าของไม่ได้แจ้งว่าใช้ Microsoft 365 จึงใช้ค่าเริ่มต้น
- Hosting: Cloudflare Workers — เชื่อม repo กับ Cloudflare แล้ว push = deploy (ย้ายมาจาก Vercel)
- โค้ด: GitHub + Claude Code
- แอป: Next.js 16 (App Router, Server Actions) · Tailwind v4 · shadcn/ui · Drizzle ORM · Vitest
  - Next.js เวอร์ชันนี้มี breaking changes — อ่าน `node_modules/next/dist/docs/` ก่อนเขียนโค้ด (ดู AGENTS.md)
  - ใช้ pnpm เท่านั้น

## การทำงานแบบ Orchestrator + Subagent (บังคับใช้)
คุณ (session หลัก) คือ **Orchestrator / Project Manager** ทำงานบน Opus effort medium (ตั้งไว้ใน `.claude/settings.json`) — หน้าที่คือ วางแผน แตกงาน มอบหมาย รวมผล ตัดสินใจ และคุยกับเจ้าของเป็นภาษาไทย
**Orchestrator ไม่เขียนโค้ดเอง** — มอบหมายให้ subagent ตามตารางนี้ (นิยามอยู่ใน `.claude/agents/`):

| งาน | subagent | model |
|---|---|---|
| เขียน/แก้โค้ด ฟีเจอร์ บั๊ก test และ SQL migration | `coder` | Sonnet (effort: high) |
| ค้นข้อมูล อ่านโค้ด/เอกสาร ไล่ต้นเหตุ ตรวจ prod แบบ SELECT เท่านั้น | `researcher` | Sonnet |
| ด่านตรวจก่อน commit สำคัญ · deploy · รัน SQL — หาสิ่งที่ผิด ไม่ใช่ยืนยันว่าโอเค | `auditor` | Sonnet (effort: high) |
| ตรวจความปลอดภัยเชิงลึกทั้งระบบ — **เฉพาะเมื่อเจ้าของสั่ง** | `security-auditor` | Fable (effort: high) |

วงจรต่อ 1 ฟีเจอร์: วางแผน → `coder` สร้าง → `auditor` ตรวจ + รัน test → (มีปัญหา → ส่งกลับ `coder` แก้) → Orchestrator ยืนยันกับเจ้าของ → commit
กติกาเพิ่ม:
- `coder` แตกได้หลายตัว **ขนานกัน** ถ้าไม่แตะไฟล์เดียวกัน
- `researcher` งานที่ไม่ขึ้นต่อกันให้แตก **ขนานกัน** · ตรวจ prod ได้แค่ SELECT ห้ามเขียน/แก้/ลบข้อมูล
- `auditor` ต้องผ่านก่อน commit สำคัญ ก่อน deploy และก่อนรัน SQL บน prod ทุกครั้ง
- `security-auditor` เรียกเมื่อเจ้าของสั่งเท่านั้น — ถ้าเห็นว่าควรตรวจ (เช่น แก้ auth / RLS / การซ่อนต้นทุนจากเซล) ให้ **เสนอ** เจ้าของ ห้ามเรียกเอง
- subagent ตัวไหนติดหรือคำตอบไม่ชัด ให้ Orchestrator ถามเจ้าของ ไม่เดาแทน
- ผลจาก subagent ให้สรุปสั้น ๆ ก่อนตัดสินใจ อย่าเทผลดิบยาว ๆ ใส่บริบทหลัก

## กติกาการเขียนโค้ด (Code of Conduct)
- ทำ MVP ตาม Definition of Done ใน project.md ก่อน อย่าเพิ่มฟีเจอร์เอง
- ทำทีละฟีเจอร์ เสร็จ 1 อย่าง → ทดสอบใน localhost → commit → ค่อยไปต่อ
- **ห้ามเปลี่ยนสูตรคำนวณต้นทุน** (`src/lib/calc.ts`) โดยไม่ถามเจ้าของ · `pnpm test` ต้องผ่านทุกครั้ง
- **ต้นทุนและกำไรต้องไม่หลุดไปถึงเซล** — กันที่ฝั่ง server (ใน query/Server Action) ไม่ใช่แค่ซ่อนบนหน้าจอ
- ห้ามเก็บ key ลับในโค้ด — ใช้ .env และ .env ต้องอยู่ใน .gitignore
- ฝั่งหน้าเว็บใช้ Supabase Publishable key เท่านั้น ห้ามใช้ Secret key
- เปิด Row Level Security ทุกตารางที่มีข้อมูลของหลายคน
- deploy ทำผ่านการ push ขึ้น GitHub (Cloudflare build ให้) — ทดสอบใน localhost ให้ผ่านก่อน push เสมอ · ของที่ยังไม่แน่ใจ push ไป branch อื่นเพื่อได้ preview
- อธิบายสิ่งที่ทำเป็นภาษาไทยสั้น ๆ ทุกครั้ง เพราะเจ้าของโปรเจกต์ไม่ใช่โปรแกรมเมอร์

## สไตล์
- โค้ดอ่านง่าย ตั้งชื่อสื่อความหมาย คอมเมนต์ภาษาไทยตรงจุดที่ซับซ้อน
- หน้าจอเรียบ ใช้งานบนมือถือได้ (เซลใช้ตอนคุยกับลูกค้า)
- ข้อความในแอปเป็นภาษาไทย · ใช้ CI เดิมของ Indesign (น้ำเงิน royal / ทอง ฟอนต์ Kanit)
