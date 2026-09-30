"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteMaterial, saveMaterial, type MaterialInput } from "@/app/actions";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Material, Section } from "@/db/schema";
import { MATERIAL_GROUPS, SECTION_LABELS } from "@/lib/constants";
import { formatDate, formatMoney, formatNumber, parseNum } from "@/lib/format";
import { cn } from "@/lib/utils";

type Draft = {
  id?: number;
  name: string;
  group: (typeof MATERIAL_GROUPS)[number];
  section: Section;
  unit: string;
  defaultYield: string;
  price: string;
  note: string;
};

const blank: Draft = { name: "", group: "ไม้แผ่น", section: "raw", unit: "แผ่น", defaultYield: "1", price: "", note: "" };

function toDraft(m: Material): Draft {
  return {
    id: m.id,
    name: m.name,
    group: (MATERIAL_GROUPS as readonly string[]).includes(m.group) ? (m.group as Draft["group"]) : "อื่นๆ",
    section: m.section,
    unit: m.unit,
    defaultYield: String(m.defaultYield),
    price: String(m.price),
    note: m.note ?? "",
  };
}

export function MaterialsManager({ materials }: { materials: Material[] }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<Material | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return materials.filter((m) => (group === "all" || m.group === group) && (!s || m.name.toLowerCase().includes(s)));
  }, [materials, q, group]);

  const grouped = useMemo(() => {
    const map = new Map<string, Material[]>();
    for (const m of filtered) map.set(m.group, [...(map.get(m.group) ?? []), m]);
    return [...map.entries()].sort(
      (a, b) => (MATERIAL_GROUPS as readonly string[]).indexOf(a[0]) - (MATERIAL_GROUPS as readonly string[]).indexOf(b[0]),
    );
  }, [filtered]);

  const submit = () => {
    if (!draft) return;
    const input: MaterialInput = {
      id: draft.id,
      name: draft.name,
      group: draft.group,
      section: draft.section,
      unit: draft.unit,
      defaultYield: draft.section === "raw" ? parseNum(draft.defaultYield, 1) : 1,
      price: parseNum(draft.price, 0),
      note: draft.note,
    };
    start(async () => {
      const res = await saveMaterial(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(draft.id ? "บันทึกการแก้ไขแล้ว" : "เพิ่มวัสดุแล้ว");
      setDraft(null);
    });
  };

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาวัสดุ…" className="h-11 bg-white pl-9 text-base sm:text-sm" />
        </div>
        <Select value={group} onValueChange={setGroup}>
          <SelectTrigger className="h-11! w-full bg-white sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกกลุ่ม ({materials.length})</SelectItem>
            {MATERIAL_GROUPS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="lg" className="h-11" onClick={() => setDraft({ ...blank })}>
          <Plus /> เพิ่มวัสดุ
        </Button>
      </div>

      {grouped.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">ไม่พบวัสดุ</p>
      ) : null}

      {grouped.map(([g, list]) => (
        <section key={g}>
          <h2 className="mb-2 flex items-baseline gap-2 text-base text-navy">
            {g} <span className="text-xs text-muted-foreground">{list.length} รายการ</span>
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
            {list.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.section === "raw" ? `วัตถุดิบหลัก · ได้ ${formatNumber(m.defaultYield)} ชิ้น/${m.unit}` : "อะไหล่ / ฟิตติ้ง"}
                    {" · "}อัปเดต {formatDate(m.updatedAt)}
                  </div>
                </div>
                <div className="num text-right text-sm font-medium text-navy">
                  ฿{formatMoney(m.price)}
                  <div className="text-[11px] font-normal text-muted-foreground">ต่อ{m.unit}</div>
                </div>
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon" aria-label={`แก้ไข ${m.name}`} onClick={() => setDraft(toDraft(m))}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label={`ลบ ${m.name}`} onClick={() => setToDelete(m)}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-navy">{draft?.id ? "แก้ไขวัสดุ" : "เพิ่มวัสดุ"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <form
              className="grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">ชื่อวัสดุ</span>
                <Input autoFocus value={draft.name} onChange={(e) => set({ name: e.target.value })} className="text-base sm:text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">ใช้ในส่วน</span>
                <Select value={draft.section} onValueChange={(v) => set({ section: v as Section })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw">{SECTION_LABELS.raw}</SelectItem>
                    <SelectItem value="accessory">อะไหล่ / ฟิตติ้ง</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">กลุ่ม</span>
                <Select value={draft.group} onValueChange={(v) => set({ group: v as Draft["group"] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">ราคาซื้อ (บาท)</span>
                <Input inputMode="decimal" value={draft.price} onChange={(e) => set({ price: e.target.value })} className="num text-right text-base sm:text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">หน่วย</span>
                <Input value={draft.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="แผ่น, เส้น, หลา, ชิ้น" className="text-base sm:text-sm" />
              </label>
              <label className={cn("col-span-2 flex flex-col gap-1", draft.section !== "raw" && "hidden")}>
                <span className="text-xs text-muted-foreground">ชิ้นที่ได้ต่อหน่วย (ค่าเริ่มต้น)</span>
                <Input inputMode="decimal" value={draft.defaultYield} onChange={(e) => set({ defaultYield: e.target.value })} className="num text-right text-base sm:text-sm" />
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">หมายเหตุ</span>
                <Input value={draft.note} onChange={(e) => set({ note: e.target.value })} className="text-base sm:text-sm" />
              </label>
              <DialogFooter className="col-span-2 mt-2">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" /> : null} บันทึก
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบวัสดุนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.name}” จะถูกลบออกจากคลัง ใบคำนวณที่ใช้อยู่แล้วจะไม่เปลี่ยนแปลง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                const m = toDelete;
                if (!m) return;
                start(async () => {
                  await deleteMaterial(m.id);
                  toast.success(`ลบ “${m.name}” แล้ว`);
                });
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
