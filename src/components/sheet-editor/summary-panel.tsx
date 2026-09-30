"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Rates, SheetResult } from "@/lib/calc";
import { formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EditorHeader } from "./types";

function Line({ label, value, muted, strong }: { label: string; value: number; muted?: boolean; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1 text-sm", muted && "text-muted-foreground", strong && "font-medium")}>
      <span>{label}</span>
      <span className="num">{formatMoney(value)}</span>
    </div>
  );
}

function PctInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="relative">
        <Input
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="num h-9 pr-7 text-right text-base md:text-sm"
        />
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>
    </label>
  );
}

export function SummaryPanel({
  result,
  rates,
  defaults,
  header,
  onHeader,
}: {
  result: SheetResult;
  rates: Rates;
  defaults: Rates;
  header: EditorHeader;
  onHeader: (patch: Partial<EditorHeader>) => void;
}) {
  const overridden = header.laborPct !== "" || header.overheadPct !== "" || header.damagePct !== "";
  const [showRates, setShowRates] = useState(overridden);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-white p-4">
        <h3 className="mb-2 text-sm font-medium text-navy">สรุปต้นทุนต่อตัว</h3>
        <Line label="รวมค่าวัสดุหลัก" value={result.rawTotal} />
        <Line label={`ค่าแรง (${formatPercent(rates.laborRate)})`} value={result.labor} muted />
        <Line label="รวมต้นทุน + ค่าแรง" value={result.rawWithLabor} strong />
        <div className="my-2 border-t border-dashed border-border" />
        <Line label="รวมอะไหล่ / ฟิตติ้ง" value={result.accessoryTotal} />
        <Line label={`ค่าดำเนินการ (${formatPercent(rates.overheadRate)})`} value={result.overhead} muted />
        <Line label="รวมต้นทุน + ค่าดำเนินการ" value={result.accessoryWithOverhead} strong />
        <div className="my-2 border-t border-dashed border-border" />
        <Line label="รวมต้นทุน" value={result.subtotal} />
        <Line label={`ค่าความเสียหาย (${formatPercent(rates.damageRate)})`} value={result.damage} muted />
        <div className="mt-3 rounded-xl border border-gold/50 bg-gold-soft px-3 py-3">
          <div className="text-xs text-navy/70">รวมต้นทุนทั้งหมด / ตัว</div>
          <div className="num text-2xl font-medium text-navy">฿{formatMoney(result.totalCost)}</div>
        </div>

        <button
          type="button"
          onClick={() => setShowRates((v) => !v)}
          className="mt-3 flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground"
        >
          <span>{overridden ? "ใช้อัตราเฉพาะใบนี้" : "ปรับอัตราเฉพาะใบนี้"}</span>
          <ChevronDown className={cn("size-4 transition-transform", showRates && "rotate-180")} />
        </button>
        {showRates ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <PctInput label="ค่าแรง" value={header.laborPct} placeholder={String(defaults.laborRate * 100)} onChange={(v) => onHeader({ laborPct: v })} />
              <PctInput label="ดำเนินการ" value={header.overheadPct} placeholder={String(defaults.overheadRate * 100)} onChange={(v) => onHeader({ overheadPct: v })} />
              <PctInput label="เสียหาย" value={header.damagePct} placeholder={String(defaults.damageRate * 100)} onChange={(v) => onHeader({ damagePct: v })} />
            </div>
            {overridden ? (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onHeader({ laborPct: "", overheadPct: "", damagePct: "" })}>
                <RotateCcw /> ใช้ค่าเริ่มต้น
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">เว้นว่างไว้ = ใช้ค่าเริ่มต้นจากหน้าตั้งค่า</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-white p-4">
        <h3 className="mb-3 text-sm font-medium text-navy">ราคาขาย</h3>
        <div className="grid grid-cols-2 gap-2">
          <PctInput label="บวกกำไร (Markup)" value={header.markupPct} onChange={(v) => onHeader({ markupPct: v })} />
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">จำนวนที่สั่ง (ตัว)</span>
            <Input
              inputMode="numeric"
              value={header.quantity}
              onChange={(e) => onHeader({ quantity: e.target.value.replace(/[^\d]/g, "") })}
              onFocus={(e) => e.target.select()}
              className="num h-9 text-right text-base md:text-sm"
            />
          </label>
        </div>
        <div className="mt-3 space-y-0.5">
          <Line label="กำไร / ตัว" value={result.markup} muted />
          <div className="flex items-baseline justify-between gap-3 py-1">
            <span className="text-sm font-medium">ราคาขาย / ตัว</span>
            <span className="num text-lg font-medium text-brand">฿{formatMoney(result.unitPrice)}</span>
          </div>
        </div>
        {result.quantity > 1 ? (
          <div className="mt-2 rounded-xl bg-secondary/60 px-3 py-2">
            <Line label={`ต้นทุนรวม ${result.quantity} ตัว`} value={result.orderCost} muted />
            <Line label={`กำไรรวม`} value={result.orderProfit} muted />
            <div className="flex items-baseline justify-between gap-3 py-1">
              <span className="text-sm font-medium">ราคาขายรวม</span>
              <span className="num text-lg font-medium text-navy">฿{formatMoney(result.orderPrice)}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
