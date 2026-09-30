"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { categoryEnum, costSheetItems, costSheets, materials, settings } from "@/db/schema";
import { calculateSheet, resolveRates } from "@/lib/calc";
import { MATERIAL_GROUPS } from "@/lib/constants";
import { getSettings, getSheet } from "@/lib/queries";

const money = z.number().finite().min(0).max(1e9);
const rate = z.number().finite().min(0).max(10);
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const itemSchema = z.object({
  section: z.enum(["raw", "accessory"]),
  materialId: z.number().int().positive().nullable(),
  name: z.string().trim().max(300),
  position: optText(200),
  size: optText(200),
  yieldQty: money,
  qty: money,
  price: money,
});

const sheetSchema = z.object({
  name: z.string().trim().min(1, "กรุณาใส่ชื่อสินค้า").max(300),
  code: optText(100),
  category: z.enum(categoryEnum.enumValues),
  dimensions: optText(100),
  customer: optText(200),
  note: optText(2000),
  isTemplate: z.boolean(),
  quantity: z.number().int().min(1).max(100000),
  markupRate: rate,
  laborRate: rate.nullable(),
  overheadRate: rate.nullable(),
  damageRate: rate.nullable(),
  items: z.array(itemSchema).max(500),
});

export type SheetInput = z.input<typeof sheetSchema>;
export type ActionResult = { ok: true; savedAt: string } | { ok: false; error: string };

function revalidateLists() {
  revalidatePath("/");
  revalidatePath("/sheets");
}

export async function saveSheet(id: number, input: SheetInput): Promise<ActionResult> {
  const parsed = sheetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const data = parsed.data;
  const defaults = await getSettings();
  const items = data.items.filter((i) => i.name !== "" || i.price > 0);
  const totalCost = calculateSheet(items, resolveRates(data, defaults)).totalCost;
  const now = new Date();

  const { items: _omit, ...header } = data;
  void _omit;
  const update = db
    .update(costSheets)
    .set({ ...header, totalCost, updatedAt: now })
    .where(eq(costSheets.id, id))
    .returning({ id: costSheets.id });
  const clear = db.delete(costSheetItems).where(eq(costSheetItems.sheetId, id));
  const rows = items.map((i, idx) => ({ ...i, sheetId: id, sortOrder: idx }));

  const [updated] = rows.length
    ? await db.batch([update, clear, db.insert(costSheetItems).values(rows)])
    : await db.batch([update, clear]);
  if (updated.length === 0) return { ok: false, error: "ไม่พบใบคำนวณนี้ (อาจถูกลบไปแล้ว)" };

  revalidateLists();
  return { ok: true, savedAt: now.toISOString() };
}

async function copySheet(sourceId: number, overrides: { name?: string; isTemplate: boolean; note?: string | null }) {
  const src = await getSheet(sourceId);
  if (!src) throw new Error("ไม่พบใบคำนวณต้นฉบับ");
  const { id: _id, createdAt: _c, updatedAt: _u, sourceFile: _s, excelTotal: _e, ...rest } = src.sheet;
  void [_id, _c, _u, _s, _e];
  const [row] = await db
    .insert(costSheets)
    .values({ ...rest, ...overrides, customer: overrides.isTemplate ? rest.customer : null })
    .returning({ id: costSheets.id });
  if (src.items.length) {
    await db.insert(costSheetItems).values(
      src.items.map(({ id: _iid, sheetId: _sid, ...i }) => {
        void [_iid, _sid];
        return { ...i, sheetId: row.id };
      }),
    );
  }
  return row.id;
}

export async function createSheet(formData: FormData) {
  const category = z.enum(categoryEnum.enumValues).parse(formData.get("category"));
  const fromId = Number(formData.get("fromId") ?? 0);
  let id: number;

  if (fromId > 0) {
    const src = await getSheet(fromId);
    id = await copySheet(fromId, {
      isTemplate: false,
      note: src ? `สร้างจากเทมเพลต: ${src.sheet.name}${src.sheet.dimensions ? ` ${src.sheet.dimensions}` : ""}` : null,
    });
  } else {
    const s = await getSettings();
    const [row] = await db
      .insert(costSheets)
      .values({ name: "สินค้านอกแบบ (ใหม่)", category, markupRate: s.defaultMarkup })
      .returning({ id: costSheets.id });
    id = row.id;
  }
  revalidateLists();
  redirect(`/sheets/${id}`);
}

export async function duplicateSheet(id: number) {
  const src = await getSheet(id);
  if (!src) return;
  const newId = await copySheet(id, { name: `${src.sheet.name} (สำเนา)`, isTemplate: false });
  revalidateLists();
  redirect(`/sheets/${newId}`);
}

export async function deleteSheet(id: number) {
  await db.delete(costSheets).where(eq(costSheets.id, id));
  revalidateLists();
  redirect("/sheets");
}

// ---------- materials ----------

const materialSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1, "กรุณาใส่ชื่อวัสดุ").max(300),
  group: z.enum(MATERIAL_GROUPS),
  section: z.enum(["raw", "accessory"]),
  unit: z.string().trim().min(1).max(40),
  defaultYield: z.number().finite().positive("ชิ้นที่ได้ต้องมากกว่า 0").max(100000),
  price: money,
  note: optText(500),
});

export type MaterialInput = z.input<typeof materialSchema>;

export async function saveMaterial(input: MaterialInput): Promise<ActionResult> {
  const parsed = materialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const { id, ...data } = parsed.data;
  try {
    if (id) await db.update(materials).set({ ...data, updatedAt: new Date() }).where(eq(materials.id, id));
    else await db.insert(materials).values(data);
  } catch (e) {
    if (String((e as { cause?: unknown })?.cause ?? e).includes("unique")) {
      return { ok: false, error: "มีวัสดุชื่อนี้อยู่แล้ว" };
    }
    throw e;
  }
  revalidatePath("/materials");
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function deleteMaterial(id: number): Promise<ActionResult> {
  await db.delete(materials).where(eq(materials.id, id));
  revalidatePath("/materials");
  return { ok: true, savedAt: new Date().toISOString() };
}

// ---------- settings ----------

/** Sheets that use the default rates cache a total — refresh them when the defaults change. */
async function recomputeCachedTotals(defaults: { laborRate: number; overheadRate: number; damageRate: number }) {
  const [sheets, items] = await Promise.all([db.select().from(costSheets), db.select().from(costSheetItems)]);
  const bySheet = Map.groupBy(items, (i) => i.sheetId);
  const updates = sheets
    .map((s) => ({ id: s.id, total: calculateSheet(bySheet.get(s.id) ?? [], resolveRates(s, defaults)).totalCost, old: s.totalCost }))
    .filter((u) => Math.abs(u.total - u.old) > 1e-9)
    .map((u) => db.update(costSheets).set({ totalCost: u.total }).where(eq(costSheets.id, u.id)));
  if (updates.length) await db.batch(updates as [(typeof updates)[number], ...typeof updates]);
}

const pct = z.coerce.number().finite().min(0).max(1000);

export async function updateSettings(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ laborRate: pct, overheadRate: pct, damageRate: pct, defaultMarkup: pct })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "กรุณากรอกตัวเลขเปอร์เซ็นต์ให้ถูกต้อง" };
  const v = parsed.data;
  const values = {
    laborRate: v.laborRate / 100,
    overheadRate: v.overheadRate / 100,
    damageRate: v.damageRate / 100,
    defaultMarkup: v.defaultMarkup / 100,
    updatedAt: new Date(),
  };
  await db.insert(settings).values({ id: 1, ...values }).onConflictDoUpdate({ target: settings.id, set: values });
  await recomputeCachedTotals(values);
  revalidatePath("/", "layout");
  return { ok: true, savedAt: values.updatedAt.toISOString() };
}
