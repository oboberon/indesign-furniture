# Indesign Furniture — ระบบคำนวณต้นทุนสินค้านอกแบบ

Web app that replaces the Excel cost sheets used by Indesign Furniture & Decoration for custom-order furniture
(เก้าอี้ / โซฟา / งานโต๊ะ โรงไม้).

## Cost formula (same as the Excel sheets)

| Step | Formula |
|---|---|
| Raw material line (วัตถุดิบหลัก) | `ราคาซื้อ ÷ ชิ้นที่ได้ × จำนวนใช้/ตัว` |
| + ค่าแรง | `Σ raw × 40%` |
| Accessory line (อะไหล่ / ฟิตติ้ง / ค่าบริการ) | `ราคา × จำนวน` |
| + ค่าดำเนินการ | `Σ accessory × 15%` |
| + ค่าความเสียหาย | `(raw + labor + accessory + overhead) × 3%` |
| = รวมต้นทุนทั้งหมด / ตัว | |
| ราคาขาย | `total × (1 + markup%)`, × quantity |

The rates are defaults in **ตั้งค่า** and can be overridden per sheet. The engine lives in `src/lib/calc.ts` and is tested against real Excel totals (`pnpm test`).

## Stack

Next.js 16 (App Router, Server Actions) · Tailwind v4 · shadcn/ui · Drizzle ORM · Neon Postgres · Vercel.

## Development

```bash
pnpm install
# .env.local → DATABASE_URL=postgresql://…  (Neon project "indesign-furniture")
pnpm dev
pnpm test          # calculation engine
pnpm db:generate   # after editing src/db/schema.ts
pnpm db:migrate
```

### One-time Excel import

`scripts/import-excel.ts` reads the legacy workbooks in `./resources` (git-ignored, internal data). It creates the material catalog and imports every sheet as a template. It also prints a report comparing each total with Excel's cached value.

```bash
pnpm db:import --dry-run
pnpm db:import
```

Out of 66 sheets, 4 differ from Excel. In each case Excel's `SUM` range skips the last edging row ("เอจปิดขอบ PVC 28"), and the app includes it.

## Access

The app is public with no login (single user). Pages send `noindex` headers and `robots.txt` disallows crawling.
