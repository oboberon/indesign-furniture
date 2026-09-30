"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, CloudOff, Copy, Loader2, MoreHorizontal, Printer, RefreshCw, Trash2 } from "lucide-react";
import { deleteSheet, duplicateSheet, saveSheet, type SheetInput } from "@/app/actions";
import { CategoryIcon } from "@/components/category-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CostSheet, CostSheetItem, Material, Section, Settings } from "@/db/schema";
import { calculateSheet, type Rates } from "@/lib/calc";
import { CATEGORIES } from "@/lib/constants";
import { formatDate, formatMoney, parseNum } from "@/lib/format";
import { ItemSection, type RowActions } from "./item-rows";
import { SummaryPanel } from "./summary-panel";
import { emptyItem, newKey, pctToRate, toCalcItem, toEditorHeader, toEditorItem, type EditorHeader, type EditorItem } from "./types";

type SaveState = "saved" | "dirty" | "saving" | "error";

export function SheetEditor({
  sheet,
  items: initialItems,
  materials,
  settings,
}: {
  sheet: CostSheet;
  items: CostSheetItem[];
  materials: Material[];
  settings: Settings;
}) {
  const router = useRouter();
  const [header, setHeader] = useState<EditorHeader>(() => toEditorHeader(sheet));
  const [items, setItems] = useState<EditorItem[]>(() => initialItems.map(toEditorItem));
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState<Date>(sheet.updatedAt);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, startBusy] = useTransition();
  const version = useRef(0);
  const savedVersion = useRef(0);
  const inflight = useRef<Promise<boolean> | null>(null);

  const defaults: Rates = { laborRate: settings.laborRate, overheadRate: settings.overheadRate, damageRate: settings.damageRate };
  const rates: Rates = {
    laborRate: pctToRate(header.laborPct) ?? defaults.laborRate,
    overheadRate: pctToRate(header.overheadPct) ?? defaults.overheadRate,
    damageRate: pctToRate(header.damagePct) ?? defaults.damageRate,
  };
  const markupRate = parseNum(header.markupPct, 0) / 100;
  const quantity = Math.max(1, Math.round(parseNum(header.quantity, 1)));
  const result = calculateSheet(items.map(toCalcItem), rates, markupRate, quantity);

  const rawItems = useMemo(() => items.filter((i) => i.section === "raw"), [items]);
  const accItems = useMemo(() => items.filter((i) => i.section === "accessory"), [items]);

  // ---------- persistence ----------
  const buildInput = useCallback(
    (h: EditorHeader, list: EditorItem[]): SheetInput => ({
      name: h.name.trim() || "ไม่มีชื่อ",
      code: h.code,
      category: h.category,
      dimensions: h.dimensions,
      customer: h.customer,
      note: h.note,
      isTemplate: h.isTemplate,
      quantity: Math.max(1, Math.round(parseNum(h.quantity, 1))),
      markupRate: Math.max(0, parseNum(h.markupPct, 0) / 100),
      laborRate: pctToRate(h.laborPct),
      overheadRate: pctToRate(h.overheadPct),
      damageRate: pctToRate(h.damagePct),
      items: list.map((i) => ({
        section: i.section,
        materialId: i.materialId,
        name: i.name,
        position: i.position,
        size: i.size,
        yieldQty: Math.max(0, parseNum(i.yieldQty, 1)),
        qty: Math.max(0, parseNum(i.qty, 0)),
        price: Math.max(0, parseNum(i.price, 0)),
      })),
    }),
    [],
  );

  const latest = useRef({ header, items });
  useEffect(() => {
    latest.current = { header, items };
  }, [header, items]);

  const save = useCallback(async (): Promise<boolean> => {
    if (inflight.current) await inflight.current;
    if (savedVersion.current === version.current) return true;
    const v = version.current;
    setSaveState("saving");
    const run = saveSheet(sheet.id, buildInput(latest.current.header, latest.current.items))
      .then((res) => {
        if (!res.ok) {
          setSaveState("error");
          setSaveError(res.error);
          return false;
        }
        savedVersion.current = v;
        setSavedAt(new Date(res.savedAt));
        setSaveError(null);
        setSaveState(version.current === v ? "saved" : "dirty");
        return true;
      })
      .catch(() => {
        setSaveState("error");
        setSaveError("บันทึกไม่สำเร็จ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
        return false;
      })
      .finally(() => {
        inflight.current = null;
      });
    inflight.current = run;
    return run;
  }, [buildInput, sheet.id]);

  // debounce autosave after every edit
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    version.current += 1;
    setSaveState("dirty");
    const t = setTimeout(() => void save(), 900);
    return () => clearTimeout(t);
  }, [header, items, save]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (savedVersion.current !== version.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // ---------- edits ----------
  const patchHeader = (patch: Partial<EditorHeader>) => setHeader((h) => ({ ...h, ...patch }));

  const actions: RowActions = {
    update: (key, patch) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i))),
    remove: (key) => setItems((list) => list.filter((i) => i.key !== key)),
    duplicate: (key) =>
      setItems((list) => {
        const idx = list.findIndex((i) => i.key === key);
        if (idx < 0) return list;
        const copy = { ...list[idx], key: newKey() };
        return [...list.slice(0, idx + 1), copy, ...list.slice(idx + 1)];
      }),
    move: (key, dir) =>
      setItems((list) => {
        const item = list.find((i) => i.key === key);
        if (!item) return list;
        const same = list.filter((i) => i.section === item.section);
        const others = list.filter((i) => i.section !== item.section);
        const idx = same.indexOf(item);
        const to = idx + dir;
        if (to < 0 || to >= same.length) return list;
        [same[idx], same[to]] = [same[to], same[idx]];
        return item.section === "raw" ? [...same, ...others] : [...others, ...same];
      }),
    add: (section: Section) => setItems((list) => [...list, emptyItem(section)]),
  };

  const refreshPrices = () => {
    const byId = new Map(materials.map((m) => [m.id, m]));
    let changed = 0;
    const next = items.map((i) => {
      const m = i.materialId ? byId.get(i.materialId) : undefined;
      if (!m || parseNum(i.price) === m.price) return i;
      changed++;
      return { ...i, price: String(m.price) };
    });
    if (changed) {
      setItems(next);
      toast.success(`อัปเดตราคา ${changed} รายการจากคลังวัสดุ`);
    } else {
      toast.info("ราคาทุกรายการตรงกับคลังวัสดุแล้ว");
    }
  };

  const withSaved = (fn: () => void | Promise<void>) =>
    startBusy(async () => {
      if (!(await save())) {
        toast.error("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
        return;
      }
      await fn();
    });

  const status = {
    saved: (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Check className="size-3.5 text-green-600" /> บันทึกแล้ว {formatDate(savedAt)}
      </span>
    ),
    dirty: <span className="text-muted-foreground">มีการแก้ไข…</span>,
    saving: (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> กำลังบันทึก
      </span>
    ),
    error: (
      <button type="button" onClick={() => void save()} className="flex items-center gap-1 text-destructive">
        <CloudOff className="size-3.5" /> {saveError ?? "บันทึกไม่สำเร็จ"} · ลองใหม่
      </button>
    ),
  }[saveState];

  const summary = <SummaryPanel result={result} rates={rates} defaults={defaults} header={header} onHeader={patchHeader} />;

  return (
    <div className="pb-20 xl:pb-0">
      {/* toolbar */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href={`/sheets?category=${header.category}`}>
            <ArrowLeft /> ใบคำนวณ
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <div className="hidden text-xs sm:block" aria-live="polite">
            {status}
          </div>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex" disabled={busy} onClick={() => withSaved(() => router.push(`/sheets/${sheet.id}/print`))}>
            <Printer /> พิมพ์
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
                <span className="sr-only sm:not-sr-only">เพิ่มเติม</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={refreshPrices}>
                <RefreshCw /> ดึงราคาล่าสุดจากคลัง
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => withSaved(() => duplicateSheet(sheet.id))}>
                <Copy /> ทำสำเนาใบนี้
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => withSaved(() => router.push(`/sheets/${sheet.id}/print`))}>
                <Printer /> พิมพ์ / บันทึก PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2 /> ลบใบคำนวณ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mb-3 text-xs sm:hidden" aria-live="polite">
        {status}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {/* header info */}
          <section className="rounded-2xl border border-border bg-white p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div className="mt-1 hidden size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-brand sm:flex">
                <CategoryIcon category={header.category} className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <Input
                  value={header.name}
                  onChange={(e) => patchHeader({ name: e.target.value })}
                  placeholder="ชื่อสินค้า เช่น โซฟา 3 ที่นั่ง"
                  aria-label="ชื่อสินค้า"
                  className="h-11 border-transparent px-2 text-xl font-medium text-navy shadow-none hover:border-border focus-visible:border-ring md:text-xl"
                />
                {sheet.sourceFile ? (
                  <p className="mt-1 px-2 text-xs text-muted-foreground">
                    ต้นฉบับ Excel: {sheet.sourceFile}
                    {sheet.excelTotal !== null && Math.abs(sheet.excelTotal - result.totalCost) >= 0.01 && !header.laborPct && !header.overheadPct && !header.damagePct
                      ? ` · ยอดใน Excel ฿${formatMoney(sheet.excelTotal)}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <label className="col-span-2 flex flex-col gap-1 md:col-span-1">
                <span className="text-xs text-muted-foreground">หมวดหมู่</span>
                <Select value={header.category} onValueChange={(v) => patchHeader({ category: v as EditorHeader["category"] })}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">ขนาด (กว้าง*ลึก*สูง ซม.)</span>
                <Input value={header.dimensions} onChange={(e) => patchHeader({ dimensions: e.target.value })} placeholder="200*90*85" className="h-9 text-base md:text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">รหัส / เลขที่งาน</span>
                <Input value={header.code} onChange={(e) => patchHeader({ code: e.target.value })} className="h-9 text-base md:text-sm" />
              </label>
              <label className="col-span-2 flex flex-col gap-1 md:col-span-1">
                <span className="text-xs text-muted-foreground">ลูกค้า</span>
                <Input value={header.customer} onChange={(e) => patchHeader({ customer: e.target.value })} className="h-9 text-base md:text-sm" />
              </label>
              <label className="col-span-2 flex flex-col gap-1 md:col-span-3">
                <span className="text-xs text-muted-foreground">หมายเหตุ</span>
                <Textarea value={header.note} onChange={(e) => patchHeader({ note: e.target.value })} rows={1} className="min-h-9 text-base md:text-sm" />
              </label>
              <label className="col-span-2 flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 md:col-span-1 md:self-end">
                <span className="text-sm">เก็บเป็นเทมเพลต</span>
                <Switch checked={header.isTemplate} onCheckedChange={(v) => patchHeader({ isTemplate: v })} />
              </label>
            </div>
          </section>

          <ItemSection
            section="raw"
            items={rawItems}
            subtotal={result.rawTotal}
            materials={materials}
            actions={actions}
            hint="ราคา/ชิ้น = ราคาซื้อ ÷ ชิ้นที่ได้ต่อแผ่น · รวม = ราคา/ชิ้น × จำนวนใช้"
          />
          <ItemSection
            section="accessory"
            items={accItems}
            subtotal={result.accessoryTotal}
            materials={materials}
            actions={actions}
            hint="รวม = ราคา/หน่วย × จำนวน · ไม่คิดค่าแรง แต่คิดค่าดำเนินการ"
          />
        </div>

        {/* desktop summary */}
        <aside className="hidden xl:block">
          <div className="sticky top-24">{summary}</div>
        </aside>
      </div>

      {/* mobile/tablet summary bar */}
      <Sheet>
        <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-30 border-t border-gold/50 bg-white/95 px-4 py-2.5 backdrop-blur md:bottom-0 xl:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground">รวมต้นทุนทั้งหมด / ตัว</div>
              <div className="num text-lg leading-tight font-medium text-navy">฿{formatMoney(result.totalCost)}</div>
            </div>
            <div className="min-w-0 text-right">
              <div className="text-[11px] text-muted-foreground">ราคาขาย / ตัว</div>
              <div className="num text-base leading-tight text-brand">฿{formatMoney(result.unitPrice)}</div>
            </div>
            <SheetTrigger asChild>
              <Button size="lg" className="h-10 shrink-0">
                สรุป
              </Button>
            </SheetTrigger>
          </div>
        </div>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-2xl bg-background px-4 pb-8">
          <SheetHeader className="px-0">
            <SheetTitle className="text-navy">สรุปต้นทุน · {header.name}</SheetTitle>
          </SheetHeader>
          {summary}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบใบคำนวณนี้?</AlertDialogTitle>
            <AlertDialogDescription>“{header.name}” จะถูกลบถาวรและกู้คืนไม่ได้</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                version.current = savedVersion.current; // nothing left to save
                startBusy(() => deleteSheet(sheet.id));
              }}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
