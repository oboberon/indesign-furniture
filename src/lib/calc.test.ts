import { describe, expect, it } from "vitest";
import { calculateSheet, type CalcItem } from "./calc";

const raw = (price: number, yieldQty: number, qty: number): CalcItem => ({ section: "raw", price, yieldQty, qty });
const acc = (price: number, qty = 1): CalcItem => ({ section: "accessory", price, yieldQty: 1, qty });

// Expected totals are the cached "รวมต้นทุนทั้งหมด" values from the original Excel files.
describe("calculateSheet matches the Excel cost sheets", () => {
  it("ตู้สูงเก็บเอกสาร 80x40x120 (68-031)", () => {
    const r = calculateSheet([
      raw(765, 9, 1), raw(650, 6, 2), raw(650, 9, 2), raw(440, 3, 1),
      raw(590, 9, 2), raw(650, 9, 1), raw(13, 1, 5), raw(11, 1, 15),
      acc(30), acc(30), acc(8, 2), acc(28, 4), acc(30),
    ]);
    expect(r.rawTotal).toBeCloseTo(1026.1111, 3);
    expect(r.accessoryTotal).toBe(218);
    expect(r.totalCost).toBeCloseTo(1737.8732, 3);
  });

  it("โซฟาสปาโก้ 180x110x88 (โซฟาเฟอริค / เก่ง (3))", () => {
    const r = calculateSheet([
      raw(150, 1, 14), raw(380, 1, 0.5), raw(34, 1, 22), raw(490, 1, 1), raw(240, 1, 1),
      raw(80, 1, 2), raw(30, 1, 2), raw(16, 1, 6), raw(7, 1, 2), raw(7, 1, 2), raw(24, 1, 5),
      acc(1100), acc(30), acc(20, 5), acc(30), acc(30),
    ]);
    expect(r.rawTotal).toBe(4232);
    expect(r.totalCost).toBeCloseTo(7630.549, 3);
  });

  it("โต๊ะประชุม HMR 150x100x75", () => {
    const r = calculateSheet([raw(1220, 1, 1), raw(890, 2, 2), raw(18, 1, 5), raw(11, 1, 8), acc(20), acc(1500), acc(20)]);
    expect(r.totalCost).toBeCloseTo(5123.426, 3);
  });

  it("เบาะกันกระแทก 100x100", () => {
    const r = calculateSheet([raw(60, 1, 2), raw(333, 2, 1), raw(490, 2, 1), raw(350, 2, 1), acc(20), acc(50), acc(95)]);
    expect(r.totalCost).toBeCloseTo(1214.2155, 3);
  });
});

describe("selling price", () => {
  it("applies markup and quantity", () => {
    const r = calculateSheet([acc(100)], { laborRate: 0.4, overheadRate: 0, damageRate: 0 }, 0.3, 4);
    expect(r.totalCost).toBe(100);
    expect(r.unitPrice).toBeCloseTo(130);
    expect(r.orderPrice).toBeCloseTo(520);
    expect(r.orderProfit).toBeCloseTo(120);
  });

  it("treats zero yield as zero cost instead of Infinity", () => {
    expect(calculateSheet([raw(100, 0, 2)]).totalCost).toBe(0);
  });
});
