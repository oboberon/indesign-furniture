import type { Category, CostSheet, CostSheetItem, Section } from "@/db/schema";
import type { CalcItem } from "@/lib/calc";
import { parseNum } from "@/lib/format";

/** Editor keeps numbers as strings so users can type freely ("0.", "1,200"). */
export interface EditorItem {
  key: string;
  section: Section;
  materialId: number | null;
  name: string;
  position: string;
  size: string;
  yieldQty: string;
  qty: string;
  price: string;
}

export interface EditorHeader {
  name: string;
  code: string;
  category: Category;
  dimensions: string;
  customer: string;
  note: string;
  isTemplate: boolean;
  quantity: string;
  markupPct: string;
  laborPct: string; // "" = use default
  overheadPct: string;
  damagePct: string;
}

let seq = 0;
export const newKey = () => `k${Date.now().toString(36)}${(seq++).toString(36)}`;

const numStr = (n: number) => String(Math.round(n * 1e6) / 1e6);
const pctStr = (rate: number | null) => (rate === null ? "" : numStr(rate * 100));

export function toEditorItem(i: CostSheetItem): EditorItem {
  return {
    key: newKey(),
    section: i.section,
    materialId: i.materialId,
    name: i.name,
    position: i.position ?? "",
    size: i.size ?? "",
    yieldQty: numStr(i.yieldQty),
    qty: numStr(i.qty),
    price: numStr(i.price),
  };
}

export function emptyItem(section: Section): EditorItem {
  return { key: newKey(), section, materialId: null, name: "", position: "", size: "", yieldQty: "1", qty: "1", price: "" };
}

export function toEditorHeader(s: CostSheet): EditorHeader {
  return {
    name: s.name,
    code: s.code ?? "",
    category: s.category,
    dimensions: s.dimensions ?? "",
    customer: s.customer ?? "",
    note: s.note ?? "",
    isTemplate: s.isTemplate,
    quantity: String(s.quantity),
    markupPct: pctStr(s.markupRate),
    laborPct: pctStr(s.laborRate),
    overheadPct: pctStr(s.overheadRate),
    damagePct: pctStr(s.damageRate),
  };
}

export const toCalcItem = (i: EditorItem): CalcItem => ({
  section: i.section,
  yieldQty: parseNum(i.yieldQty, 0),
  qty: parseNum(i.qty, 0),
  price: parseNum(i.price, 0),
});

export const pctToRate = (v: string): number | null => (v.trim() === "" ? null : parseNum(v, 0) / 100);
