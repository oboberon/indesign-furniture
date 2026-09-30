import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SheetEditor } from "@/components/sheet-editor/sheet-editor";
import { getSettings, getSheet, listMaterials } from "@/lib/queries";

async function load(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const data = await getSheet(id);
  if (!data) notFound();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/sheets/[id]">): Promise<Metadata> {
  const { id } = await params;
  const data = await getSheet(Number(id)).catch(() => null);
  return { title: data ? data.sheet.name : "ใบคำนวณ" };
}

export default async function SheetPage({ params }: PageProps<"/sheets/[id]">) {
  await connection();
  const { id } = await params;
  const [{ sheet, items }, materials, settings] = await Promise.all([load(id), listMaterials(), getSettings()]);

  return <SheetEditor key={sheet.id} sheet={sheet} items={items} materials={materials} settings={settings} />;
}
