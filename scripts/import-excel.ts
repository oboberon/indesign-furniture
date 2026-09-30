/**
 * One-time import of the legacy Excel cost sheets in ./resources into Neon.
 *
 *   pnpm db:import --dry-run # parse + print report only
 *   pnpm db:import          # write materials, sheets (as templates) and the chair starter template
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { calculateSheet, type CalcItem } from "../src/lib/calc";
import { guessMaterialGroup } from "../src/lib/constants";
import type { Category, Section } from "../src/db/schema";

const DIR = path.join(process.cwd(), "resources");
const DRY = process.argv.includes("--dry-run");

interface ParsedItem extends CalcItem {
  name: string;
  position: string | null;
  size: string | null;
  excelLine: number | null;
}

interface ParsedSheet {
  file: string;
  sheet: string;
  category: Category;
  name: string;
  dimensions: string | null;
  items: ParsedItem[];
  excelTotal: number | null;
}

const clean = (v: unknown) =>
  v === undefined || v === null ? "" : String(v).replace(/\s+/g, " ").trim();
const asNum = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const isDims = (s: string) => /\d+\s*(\*+|x|X|×)\s*\d+/.test(s);
const normDims = (s: string) =>
  s.replace(/^ขนาด\s*/, "").replace(/\s*(\*+|x|X|×)\s*/g, "*").replace(/\s+/g, "");

// The product name wins over the file name (e.g. a dining chair costed inside "โต๊ะขายาง.xlsx").
function categoryFor(name: string, file: string): Category {
  if (/เก้าอี้/.test(name)) return "chair";
  if (/โซฟา|เบาะ/.test(name)) return "sofa";
  if (/โต๊ะ|ตู้|ชั้น/.test(name)) return "woodwork";
  return /โซฟา|เบาะ/.test(file) ? "sofa" : "woodwork";
}

function parseSheet(file: string, sheetName: string, ws: XLSX.WorkSheet): ParsedSheet | null {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: true });
  const header = rows[0]?.map(clean) ?? [];
  const col = (label: string) => header.findIndex((h) => h.startsWith(label));
  const c = {
    name: col("รายการอะไหล่"),
    position: col("ตำแหน่งชิ้นงาน"),
    size: col("ยาว"),
    yield: col("ชิ้นที่ได้"),
    qty: col("จำนวนใช้"),
    price: col("ราคาซื้อ"),
    unit: col("ราคา/ชิ้น"),
    total: col("รวมเงิน"),
  };
  if (c.name < 0 || c.total < 0 || c.price < 0) return null; // not a cost sheet (e.g. staff list)

  let section: Section | "gap" | "done" = "raw";
  const items: ParsedItem[] = [];
  const itemCodes: string[] = [];
  let excelTotal: number | null = null;

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const labels = row.map(clean);
    const colA = labels[0] ?? "";
    const joined = labels.join(" ");

    if (joined.includes("รวมต้นทุนทั้งหมด")) {
      excelTotal = asNum(row[c.total]);
      continue;
    }
    if (/^รวมค่าวัสดุ|^รวมค่าวัตถุดิบ/.test(colA)) { section = "gap"; continue; }
    if (colA.startsWith("รวมต้นทุน + ค่าแรง")) { section = "accessory"; continue; }
    if (colA.startsWith("ค่าวัสดุ + ค่าแรง")) continue;
    if (colA === "รวมวัสดุ" || colA === "." || colA.startsWith("ราคารวมวัสดุ") || colA.startsWith("รวมต้นทุน + ค่าดำเนินการ")) {
      section = "done";
      continue;
    }

    if (section === "raw" && colA && colA !== "ITEM CODE") itemCodes.push(colA);
    if (section !== "raw" && section !== "accessory") continue;

    const name = clean(row[c.name]);
    const line = asNum(row[c.total]);
    if (!name && line === null) continue;
    if (!name) continue;

    const yieldQty = asNum(row[c.yield]) ?? 1;
    const qty = asNum(row[c.qty]) ?? 1;
    const price = asNum(row[c.price]) ?? 0;

    if (section === "raw") {
      items.push({
        section: "raw",
        name,
        position: clean(row[c.position]) || null,
        // Excel often puts a meaningless "1" in the size column
        size: ["", "1"].includes(clean(row[c.size])) ? null : clean(row[c.size]),
        yieldQty: yieldQty > 0 ? yieldQty : 1,
        qty,
        price,
        excelLine: line,
      });
    } else {
      // Accessory rows in Excel are often hand-typed (ราคา/ชิ้น, รวมเงิน without formulas),
      // so treat รวมเงิน as the truth and derive the per-piece price from it.
      const unitPrice = line !== null && qty > 0 ? line / qty : (asNum(row[c.unit]) ?? price);
      items.push({
        section: "accessory",
        name,
        position: clean(row[c.position]) || null,
        size: clean(row[c.size]) || null,
        yieldQty: 1,
        qty,
        price: unitPrice,
        excelLine: line,
      });
    }
  }

  if (items.length === 0) return null;

  const fileBase = file.replace(/\.xlsx.*$/i, "").trim();
  const nameCode = itemCodes.find((s) => !isDims(s) && !/^(HMR|บานเปิด)$/i.test(s));
  const dimsCode = itemCodes.find(isDims);
  const extras = itemCodes.filter((s) => s !== nameCode && s !== dimsCode);
  let name =
    nameCode ??
    fileBase
      .replace(/\d+\s*(x|X|\*)\s*\d+.*$/, "")
      .replace(/ขนาด\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
  if (extras.length) name = `${name} (${extras.join(", ")})`;

  return {
    file,
    sheet: sheetName,
    category: categoryFor(name, file),
    name: name || fileBase,
    dimensions: dimsCode ? normDims(dimsCode) : null,
    items,
    excelTotal,
  };
}

function mode<T>(values: T[]): T {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

const CHAIR_STARTER: Omit<ParsedItem, "excelLine">[] = [
  { section: "raw", name: "ผ้า", position: "หุ้ม", size: null, yieldQty: 1, qty: 2, price: 150 },
  { section: "raw", name: "ไม้สะเดา", position: "โครง", size: "2 เมตร", yieldQty: 1, qty: 6, price: 34 },
  { section: "raw", name: "ไม้เอ็มดีเอฟ 15 มิล", position: "โครง", size: "240*120", yieldQty: 1, qty: 0.25, price: 380 },
  { section: "raw", name: "ฟองน้ำเขียว 2 นิ้ว*72*79", position: "ที่นั่ง", size: null, yieldQty: 2, qty: 1, price: 490 },
  { section: "raw", name: "ฟองน้ำเขียว 1 นิ้ว*72*80", position: "พนักพิง", size: null, yieldQty: 2, qty: 1, price: 240 },
  { section: "raw", name: "ใย", position: "ปะโครง", size: null, yieldQty: 1, qty: 1, price: 16 },
  { section: "raw", name: "กระสอบฟ้า", position: "โครง", size: null, yieldQty: 1, qty: 1, price: 7 },
  { section: "accessory", name: "ขา", position: null, size: null, yieldQty: 1, qty: 4, price: 20 },
  { section: "accessory", name: "ฟิตติ้ง", position: null, size: null, yieldQty: 1, qty: 1, price: 30 },
  { section: "accessory", name: "กาว+สกรู", position: null, size: null, yieldQty: 1, qty: 1, price: 30 },
  { section: "accessory", name: "แพ็ค", position: null, size: null, yieldQty: 1, qty: 1, price: 30 },
];

async function main() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".xlsx") && !f.startsWith("~$")).sort();
  const sheets: ParsedSheet[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const wb = XLSX.readFile(path.join(DIR, file));
    for (const sheetName of wb.SheetNames) {
      const parsed = parseSheet(file, sheetName, wb.Sheets[sheetName]);
      if (parsed) sheets.push(parsed);
      else skipped.push(`${file} / ${sheetName}`);
    }
  }

  // ---- report ----
  let mismatches = 0;
  console.log(`\nParsed ${sheets.length} cost sheets from ${files.length} files`);
  for (const s of sheets) {
    const total = calculateSheet(s.items).totalCost;
    const diff = s.excelTotal === null ? null : total - s.excelTotal;
    const flag = diff === null ? "  ? " : Math.abs(diff) < 0.01 ? "  ✓ " : "  ≠ ";
    if (diff !== null && Math.abs(diff) >= 0.01) mismatches++;
    console.log(
      `${flag}[${s.category}] ${s.file} / ${s.sheet} → "${s.name}" ${s.dimensions ?? ""} | app ${total.toFixed(2)} | excel ${s.excelTotal?.toFixed(2) ?? "-"}${diff !== null && Math.abs(diff) >= 0.01 ? ` (diff ${diff.toFixed(2)})` : ""}`,
    );
    if (diff !== null && Math.abs(diff) >= 0.01) {
      const rawSum = s.items.filter((i) => i.section === "raw").reduce((a, i) => a + (i.excelLine ?? 0), 0);
      const accSum = s.items.filter((i) => i.section === "accessory").reduce((a, i) => a + (i.excelLine ?? 0), 0);
      const r = calculateSheet(s.items);
      console.log(`      raw app ${r.rawTotal.toFixed(2)} vs Σexcel lines ${rawSum.toFixed(2)} | acc app ${r.accessoryTotal.toFixed(2)} vs Σexcel lines ${accSum.toFixed(2)}`);
    }
  }
  console.log(`\nSkipped (not cost sheets): ${skipped.join("; ") || "none"}`);
  console.log(`Mismatches vs Excel: ${mismatches}`);

  // ---- materials ----
  const byName = new Map<string, ParsedItem[]>();
  for (const s of sheets) for (const i of s.items) byName.set(i.name, [...(byName.get(i.name) ?? []), i]);
  for (const i of CHAIR_STARTER) if (!byName.has(i.name)) byName.set(i.name, [{ ...i, excelLine: null }]);
  const materialRows = [...byName.entries()].map(([name, uses]) => {
    const section = mode(uses.map((u) => u.section));
    const same = uses.filter((u) => u.section === section);
    return {
      name,
      section,
      group: guessMaterialGroup(name, section),
      unit: section === "raw" ? (/เอจ/.test(name) ? "ม้วน" : /ผ้า|หนัง/.test(name) ? "หลา" : /ไม้สะเดา|เหล็ก/.test(name) ? "เส้น" : "แผ่น") : "ชิ้น",
      defaultYield: section === "raw" ? mode(same.map((u) => u.yieldQty)) : 1,
      price: Math.round(mode(same.map((u) => u.price)) * 100) / 100,
    };
  });
  console.log(`Materials: ${materialRows.length}`);

  if (DRY) return;

  const { db } = await import("../src/db");
  const { costSheetItems, costSheets, materials, settings } = await import("../src/db/schema");
  const { isNotNull, sql } = await import("drizzle-orm");

  const existing = await db.select({ n: sql<number>`count(*)::int` }).from(costSheets).where(isNotNull(costSheets.sourceFile));
  if (existing[0].n > 0) {
    console.log(`Already imported (${existing[0].n} sheets). Aborting to avoid duplicates.`);
    return;
  }

  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
  const inserted = await db.insert(materials).values(materialRows).onConflictDoNothing().returning();
  const matId = new Map(inserted.map((m) => [m.name, m.id]));

  const save = async (s: Omit<ParsedSheet, "items"> & { items: Omit<ParsedItem, "excelLine">[]; note?: string; sourceFile: string | null }) => {
    const totalCost = calculateSheet(s.items).totalCost;
    const [row] = await db
      .insert(costSheets)
      .values({
        code: s.sheet || null,
        name: s.name,
        category: s.category,
        dimensions: s.dimensions,
        note: s.note ?? null,
        isTemplate: true,
        sourceFile: s.sourceFile,
        excelTotal: s.excelTotal,
        totalCost,
      })
      .returning({ id: costSheets.id });
    await db.insert(costSheetItems).values(
      s.items.map((i, idx) => ({
        sheetId: row.id,
        section: i.section,
        sortOrder: idx,
        materialId: matId.get(i.name) ?? null,
        name: i.name,
        position: i.position,
        size: i.size,
        yieldQty: i.yieldQty,
        qty: i.qty,
        price: i.price,
      })),
    );
  };

  for (const s of sheets) {
    await save({ ...s, sourceFile: s.file, note: `นำเข้าจาก Excel: ${s.file} (ชีต ${s.sheet})` });
  }
  await save({
    file: "",
    sheet: "",
    category: "chair",
    name: "เก้าอี้บุนวม (ตัวอย่างเริ่มต้น)",
    dimensions: null,
    excelTotal: null,
    sourceFile: null,
    items: CHAIR_STARTER,
    note: "เทมเพลตตั้งต้นสำหรับเก้าอี้ — ปรับรายการ ปริมาณ และราคาให้ตรงกับงานจริง",
  });

  console.log(`Imported ${sheets.length + 1} sheets and ${inserted.length} materials.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
