import type { Metadata } from "next";
import { connection } from "next/server";
import { MaterialsManager } from "@/components/materials-manager";
import { PageHeader } from "@/components/page-header";
import { listMaterials } from "@/lib/queries";

export const metadata: Metadata = { title: "คลังวัสดุ" };

export default async function MaterialsPage() {
  await connection();
  const materials = await listMaterials();
  return (
    <div>
      <PageHeader
        title="คลังวัสดุ"
        description="ราคาวัตถุดิบและอะไหล่ที่ใช้เลือกในใบคำนวณ — แก้ราคาที่นี่แล้วกด “ดึงราคาล่าสุดจากคลัง” ในใบคำนวณเพื่ออัปเดต"
      />
      <MaterialsManager materials={materials} />
    </div>
  );
}
