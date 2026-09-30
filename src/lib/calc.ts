/**
 * Cost engine — mirrors the Excel cost sheets used by Indesign Furniture.
 *
 * Section "raw" (วัตถุดิบหลัก):  line = ราคาซื้อ ÷ ชิ้นที่ได้ × จำนวนใช้/ตัว
 *   A  = Σ raw lines,  labor = A × laborRate  (Excel "ค่าวัสดุ + ค่าแรง 1.40")
 * Section "accessory" (อะไหล่/ฟิตติ้ง/บริการ): line = ราคา × จำนวน
 *   B  = Σ accessory lines, overhead = B × overheadRate (Excel "× 1.15")
 * subtotal = (A + labor) + (B + overhead)
 * total    = subtotal × (1 + damageRate)  (ค่าความเสียหาย 3%)
 */

export type CalcSection = "raw" | "accessory";

export interface CalcItem {
  section: CalcSection;
  yieldQty: number;
  qty: number;
  price: number;
}

export interface Rates {
  laborRate: number;
  overheadRate: number;
  damageRate: number;
}

export const DEFAULT_RATES: Rates = { laborRate: 0.4, overheadRate: 0.15, damageRate: 0.03 };

export interface SheetResult {
  rawTotal: number;
  labor: number;
  rawWithLabor: number;
  accessoryTotal: number;
  overhead: number;
  accessoryWithOverhead: number;
  subtotal: number;
  damage: number;
  totalCost: number;
  markupRate: number;
  markup: number;
  unitPrice: number;
  quantity: number;
  orderCost: number;
  orderPrice: number;
  orderProfit: number;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** ราคา/ชิ้น — purchase price divided by pieces obtained (raw), or the price itself (accessory). */
export function unitCost(item: CalcItem): number {
  if (item.section === "accessory") return num(item.price);
  const y = num(item.yieldQty);
  return y > 0 ? num(item.price) / y : 0;
}

/** รวมเงิน of one line. */
export function lineTotal(item: CalcItem): number {
  return unitCost(item) * num(item.qty);
}

export function calculateSheet(
  items: CalcItem[],
  rates: Rates = DEFAULT_RATES,
  markupRate = 0,
  quantity = 1,
): SheetResult {
  let rawTotal = 0;
  let accessoryTotal = 0;
  for (const item of items) {
    if (item.section === "raw") rawTotal += lineTotal(item);
    else accessoryTotal += lineTotal(item);
  }

  const labor = rawTotal * num(rates.laborRate);
  const rawWithLabor = rawTotal + labor;
  const overhead = accessoryTotal * num(rates.overheadRate);
  const accessoryWithOverhead = accessoryTotal + overhead;
  const subtotal = rawWithLabor + accessoryWithOverhead;
  const damage = subtotal * num(rates.damageRate);
  const totalCost = subtotal + damage;

  const markup = totalCost * num(markupRate);
  const unitPrice = totalCost + markup;
  const q = Math.max(0, num(quantity));

  return {
    rawTotal,
    labor,
    rawWithLabor,
    accessoryTotal,
    overhead,
    accessoryWithOverhead,
    subtotal,
    damage,
    totalCost,
    markupRate: num(markupRate),
    markup,
    unitPrice,
    quantity: q,
    orderCost: totalCost * q,
    orderPrice: unitPrice * q,
    orderProfit: markup * q,
  };
}

/** Resolve per-sheet overrides against the global defaults. */
export function resolveRates(
  sheet: { laborRate: number | null; overheadRate: number | null; damageRate: number | null },
  defaults: Rates,
): Rates {
  return {
    laborRate: sheet.laborRate ?? defaults.laborRate,
    overheadRate: sheet.overheadRate ?? defaults.overheadRate,
    damageRate: sheet.damageRate ?? defaults.damageRate,
  };
}
