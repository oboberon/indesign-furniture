import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { getSettings } from "@/lib/queries";

export const metadata: Metadata = { title: "ตั้งค่า" };

export default async function SettingsPage() {
  await connection();
  const s = await getSettings();
  return (
    <div className="max-w-2xl">
      <PageHeader title="ตั้งค่าอัตราเริ่มต้น" description="ใช้กับทุกใบคำนวณที่ไม่ได้ปรับอัตราเฉพาะใบ" />
      <SettingsForm
        values={{
          laborRate: s.laborRate * 100,
          overheadRate: s.overheadRate * 100,
          damageRate: s.damageRate * 100,
          defaultMarkup: s.defaultMarkup * 100,
        }}
      />
    </div>
  );
}
