"use client";

import { ArrowDown, ArrowUp, Copy, MoreVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Material, Section } from "@/db/schema";
import { lineTotal, unitCost } from "@/lib/calc";
import { SECTION_LABELS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MaterialPicker } from "./material-picker";
import { toCalcItem, type EditorItem } from "./types";

type Patch = Partial<Omit<EditorItem, "key" | "section">>;

export interface RowActions {
  update: (key: string, patch: Patch) => void;
  remove: (key: string) => void;
  duplicate: (key: string) => void;
  move: (key: string, dir: -1 | 1) => void;
  add: (section: Section) => void;
}

// raw:       รายการ | ตำแหน่ง | ขนาด | ชิ้นที่ได้ | จำนวน | ราคาซื้อ | ราคา/ชิ้น | รวม | ⋮
// accessory: รายการ | หมายเหตุ | จำนวน | ราคา/หน่วย | รวม | ⋮
const GRID = {
  raw: "md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.95fr)_minmax(0,0.9fr)_minmax(0,1fr)_2.25rem]",
  accessory: "md:grid-cols-[minmax(0,3fr)_minmax(0,1.6fr)_minmax(0,0.75fr)_minmax(0,0.95fr)_minmax(0,1fr)_2.25rem]",
};

const numInput = "num h-9 text-right text-base md:text-sm";

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-[11px] text-muted-foreground md:hidden">{label}</span>
      {children}
    </label>
  );
}

function Row({
  item,
  index,
  count,
  materials,
  actions,
}: {
  item: EditorItem;
  index: number;
  count: number;
  materials: Material[];
  actions: RowActions;
}) {
  const raw = item.section === "raw";
  const calc = toCalcItem(item);
  const set = (patch: Patch) => actions.update(item.key, patch);
  const numProps = (field: "yieldQty" | "qty" | "price") => ({
    inputMode: "decimal" as const,
    value: item[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set({ [field]: e.target.value }),
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
    className: numInput,
  });

  return (
    <div
      className={cn(
        "relative grid grid-cols-6 gap-x-2 gap-y-2.5 rounded-xl border border-border bg-white p-3 md:items-center md:gap-y-0 md:rounded-none md:border-0 md:border-t md:bg-transparent md:px-3 md:py-2",
        GRID[item.section],
      )}
    >
      <div className="col-span-6 flex items-center gap-1.5 pr-9 md:col-span-1 md:pr-0">
        <span className="num w-5 shrink-0 text-center text-xs text-muted-foreground">{index + 1}</span>
        <Input
          value={item.name}
          onChange={(e) => set({ name: e.target.value, materialId: null })}
          placeholder={raw ? "เช่น ไม้ PB หนา 19 มิล" : "เช่น บานพับ, ค่าทำสี"}
          className="h-9 min-w-0 flex-1 text-base md:text-sm"
          aria-label="รายการ"
        />
        <MaterialPicker
          materials={materials}
          section={item.section}
          selectedId={item.materialId}
          onPick={(m) =>
            set({
              materialId: m.id,
              name: m.name,
              price: String(m.price),
              ...(raw ? { yieldQty: String(m.defaultYield) } : {}),
            })
          }
        />
      </div>

      <Field label={raw ? "ตำแหน่งชิ้นงาน" : "หมายเหตุ"} className={raw ? "col-span-3 md:col-span-1" : "col-span-6 md:col-span-1"}>
        <Input value={item.position} onChange={(e) => set({ position: e.target.value })} className="h-9 text-base md:text-sm" />
      </Field>
      {raw ? (
        <>
          <Field label="ขนาด (ซม.)" className="col-span-3 md:col-span-1">
            <Input value={item.size} onChange={(e) => set({ size: e.target.value })} className="h-9 text-base md:text-sm" placeholder="120*60" />
          </Field>
          <Field label="ชิ้นที่ได้/แผ่น" className="col-span-2 md:col-span-1">
            <Input {...numProps("yieldQty")} />
          </Field>
        </>
      ) : null}
      <Field label={raw ? "จำนวนใช้/ตัว" : "จำนวน"} className={raw ? "col-span-2 md:col-span-1" : "col-span-3 md:col-span-1"}>
        <Input {...numProps("qty")} />
      </Field>
      <Field label={raw ? "ราคาซื้อ" : "ราคา/หน่วย"} className={raw ? "col-span-2 md:col-span-1" : "col-span-3 md:col-span-1"}>
        <Input {...numProps("price")} placeholder="0" />
      </Field>
      {raw ? (
        <div className="num col-span-3 flex items-center justify-between text-sm text-muted-foreground md:col-span-1 md:block md:text-right">
          <span className="text-[11px] md:hidden">ราคา/ชิ้น</span>
          {formatMoney(unitCost(calc))}
        </div>
      ) : null}
      <div
        className={cn(
          "num flex items-center justify-between rounded-lg bg-muted/60 px-2.5 py-1.5 text-sm font-medium text-navy md:block md:bg-transparent md:px-0 md:py-0 md:text-right",
          raw ? "col-span-3 md:col-span-1" : "col-span-6 md:col-span-1",
        )}
      >
        <span className="text-[11px] font-normal text-muted-foreground md:hidden">รวมเงิน</span>
        {formatMoney(lineTotal(calc))}
      </div>

      <div className="absolute top-3 right-2 md:static md:flex md:justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="ตัวเลือกแถว">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={index === 0} onSelect={() => actions.move(item.key, -1)}>
              <ArrowUp /> ย้ายขึ้น
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === count - 1} onSelect={() => actions.move(item.key, 1)}>
              <ArrowDown /> ย้ายลง
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => actions.duplicate(item.key)}>
              <Copy /> คัดลอกแถว
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => actions.remove(item.key)}>
              <Trash2 /> ลบแถว
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function ItemSection({
  section,
  items,
  subtotal,
  materials,
  actions,
  hint,
}: {
  section: Section;
  items: EditorItem[];
  subtotal: number;
  materials: Material[];
  actions: RowActions;
  hint: string;
}) {
  const raw = section === "raw";
  return (
    <section className="rounded-2xl border border-border bg-white/60 md:bg-white">
      <div className="flex flex-wrap items-end justify-between gap-2 px-4 pt-4 pb-3 md:px-5">
        <div>
          <h2 className="gold-rule text-lg text-navy">{SECTION_LABELS[section]}</h2>
          <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="num text-right text-sm">
          <span className="text-muted-foreground">รวม </span>
          <span className="font-medium text-navy">฿{formatMoney(subtotal)}</span>
        </div>
      </div>

      <div
        className={cn(
          "hidden gap-x-2 border-t border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground md:grid",
          GRID[section],
        )}
      >
        <span className="pl-6">รายการ</span>
        <span>{raw ? "ตำแหน่งชิ้นงาน" : "หมายเหตุ"}</span>
        {raw ? (
          <>
            <span>ขนาด (ซม.)</span>
            <span className="text-right">ชิ้นที่ได้</span>
          </>
        ) : null}
        <span className="text-right">{raw ? "จำนวนใช้/ตัว" : "จำนวน"}</span>
        <span className="text-right">{raw ? "ราคาซื้อ" : "ราคา/หน่วย"}</span>
        {raw ? <span className="text-right">ราคา/ชิ้น</span> : null}
        <span className="text-right">รวมเงิน</span>
        <span />
      </div>

      <div className="grid gap-3 px-3 pb-3 md:block md:gap-0 md:px-0 md:pb-0">
        {items.map((item, i) => (
          <Row key={item.key} item={item} index={i} count={items.length} materials={materials} actions={actions} />
        ))}
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground md:rounded-none md:border-0 md:border-t">
            ยังไม่มีรายการ
          </p>
        ) : null}
      </div>
      <div className="border-t border-border p-3">
        <Button variant="ghost" className="w-full text-brand md:w-auto" onClick={() => actions.add(section)}>
          <Plus /> เพิ่มรายการ
        </Button>
      </div>
    </section>
  );
}
