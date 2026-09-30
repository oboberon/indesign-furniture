import "server-only";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { costSheetItems, costSheets, materials, settings, type Category, type Settings } from "@/db/schema";

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  laborRate: 0.4,
  overheadRate: 0.15,
  damageRate: 0.03,
  defaultMarkup: 0.3,
  updatedAt: new Date(0),
};

export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  return row ?? DEFAULT_SETTINGS;
}

export type SheetListType = "all" | "jobs" | "templates";

export async function listSheets(opts: { category?: Category; q?: string; type?: SheetListType; limit?: number } = {}) {
  const where: SQL[] = [];
  if (opts.category) where.push(eq(costSheets.category, opts.category));
  if (opts.type === "templates") where.push(eq(costSheets.isTemplate, true));
  if (opts.type === "jobs") where.push(eq(costSheets.isTemplate, false));
  const q = opts.q?.trim();
  if (q) {
    const like = `%${q}%`;
    where.push(
      or(
        ilike(costSheets.name, like),
        ilike(costSheets.dimensions, like),
        ilike(costSheets.customer, like),
        ilike(costSheets.code, like),
        ilike(costSheets.sourceFile, like),
      )!,
    );
  }
  return db
    .select({
      id: costSheets.id,
      name: costSheets.name,
      code: costSheets.code,
      category: costSheets.category,
      dimensions: costSheets.dimensions,
      customer: costSheets.customer,
      isTemplate: costSheets.isTemplate,
      quantity: costSheets.quantity,
      markupRate: costSheets.markupRate,
      totalCost: costSheets.totalCost,
      updatedAt: costSheets.updatedAt,
    })
    .from(costSheets)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(costSheets.updatedAt), desc(costSheets.id))
    .limit(opts.limit ?? 500);
}

export type SheetListRow = Awaited<ReturnType<typeof listSheets>>[number];

export async function getCategoryStats() {
  const rows = await db
    .select({
      category: costSheets.category,
      total: sql<number>`count(*)::int`,
      jobs: sql<number>`count(*) filter (where not ${costSheets.isTemplate})::int`,
    })
    .from(costSheets)
    .groupBy(costSheets.category);
  return Object.fromEntries(rows.map((r) => [r.category, r])) as Partial<Record<Category, (typeof rows)[number]>>;
}

export async function getSheet(id: number) {
  const [sheet] = await db.select().from(costSheets).where(eq(costSheets.id, id));
  if (!sheet) return null;
  const items = await db
    .select()
    .from(costSheetItems)
    .where(eq(costSheetItems.sheetId, id))
    .orderBy(asc(costSheetItems.section), asc(costSheetItems.sortOrder), asc(costSheetItems.id));
  return { sheet, items };
}

export async function listMaterials() {
  return db.select().from(materials).orderBy(asc(materials.group), asc(materials.name));
}
