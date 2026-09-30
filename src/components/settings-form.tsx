"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateSettings } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";

const FIELDS = [
  { name: "laborRate", label: "ค่าแรง", help: "คิดจากรวมค่าวัสดุหลัก (Excel: “ค่าวัสดุ + ค่าแรง 1.40” = 40%)" },
  { name: "overheadRate", label: "ค่าดำเนินการ", help: "คิดจากรวมอะไหล่ / ฟิตติ้ง (Excel: “× 1.15” = 15%)" },
  { name: "damageRate", label: "ค่าความเสียหาย", help: "คิดจากรวมต้นทุนทั้งหมดก่อนบวกกำไร (Excel: 3%)" },
  { name: "defaultMarkup", label: "กำไรเริ่มต้น (Markup)", help: "ใช้เป็นค่าเริ่มต้นเมื่อสร้างใบคำนวณเปล่า — ปรับได้ในแต่ละใบ" },
] as const;

export function SettingsForm({ values }: { values: Record<(typeof FIELDS)[number]["name"], number> }) {
  const [state, action] = useActionState(updateSettings, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success("บันทึกการตั้งค่าแล้ว");
    else toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border bg-white p-5">
      {FIELDS.map((f) => (
        <label key={f.name} className="grid gap-1 sm:grid-cols-[1fr_160px] sm:items-center sm:gap-4">
          <span>
            <span className="block text-sm font-medium">{f.label}</span>
            <span className="block text-xs text-muted-foreground">{f.help}</span>
          </span>
          <span className="relative">
            <Input
              name={f.name}
              inputMode="decimal"
              defaultValue={Math.round(values[f.name] * 10000) / 10000}
              className="num h-10 pr-8 text-right text-base sm:text-sm"
              required
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </span>
        </label>
      ))}
      <div className="border-t border-border pt-4">
        <SubmitButton size="lg" className="h-10 w-full sm:w-auto">
          บันทึกการตั้งค่า
        </SubmitButton>
      </div>
    </form>
  );
}
