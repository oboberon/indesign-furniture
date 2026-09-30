import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const categoryEnum = pgEnum("category", ["chair", "sofa", "woodwork"]);
export const sectionEnum = pgEnum("section", ["raw", "accessory"]);

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  laborRate: doublePrecision("labor_rate").notNull().default(0.4),
  overheadRate: doublePrecision("overhead_rate").notNull().default(0.15),
  damageRate: doublePrecision("damage_rate").notNull().default(0.03),
  defaultMarkup: doublePrecision("default_markup").notNull().default(0.3),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  group: text("group").notNull().default("อื่นๆ"),
  section: sectionEnum("section").notNull().default("raw"),
  unit: text("unit").notNull().default("แผ่น"),
  defaultYield: doublePrecision("default_yield").notNull().default(1),
  price: doublePrecision("price").notNull().default(0),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const costSheets = pgTable(
  "cost_sheets",
  {
    id: serial("id").primaryKey(),
    code: text("code"),
    name: text("name").notNull(),
    category: categoryEnum("category").notNull(),
    dimensions: text("dimensions"),
    customer: text("customer"),
    note: text("note"),
    isTemplate: boolean("is_template").notNull().default(false),
    quantity: integer("quantity").notNull().default(1),
    markupRate: doublePrecision("markup_rate").notNull().default(0.3),
    // null = use the default rate from settings
    laborRate: doublePrecision("labor_rate"),
    overheadRate: doublePrecision("overhead_rate"),
    damageRate: doublePrecision("damage_rate"),
    sourceFile: text("source_file"),
    excelTotal: doublePrecision("excel_total"),
    totalCost: doublePrecision("total_cost").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("cost_sheets_category_idx").on(t.category), index("cost_sheets_updated_idx").on(t.updatedAt)],
);

export const costSheetItems = pgTable(
  "cost_sheet_items",
  {
    id: serial("id").primaryKey(),
    sheetId: integer("sheet_id")
      .notNull()
      .references(() => costSheets.id, { onDelete: "cascade" }),
    section: sectionEnum("section").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    materialId: integer("material_id").references(() => materials.id, { onDelete: "set null" }),
    name: text("name").notNull().default(""),
    position: text("position"),
    size: text("size"),
    yieldQty: doublePrecision("yield_qty").notNull().default(1),
    qty: doublePrecision("qty").notNull().default(1),
    price: doublePrecision("price").notNull().default(0),
  },
  (t) => [index("cost_sheet_items_sheet_idx").on(t.sheetId)],
);

export type Category = (typeof categoryEnum.enumValues)[number];
export type Section = (typeof sectionEnum.enumValues)[number];
export type Settings = typeof settings.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type CostSheet = typeof costSheets.$inferSelect;
export type CostSheetItem = typeof costSheetItems.$inferSelect;
