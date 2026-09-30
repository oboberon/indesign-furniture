import type { Category, Section } from "@/db/schema";

export const CATEGORIES: { value: Category; label: string; description: string }[] = [
  { value: "chair", label: "เก้าอี้", description: "เก้าอี้บุนวม เก้าอี้ไม้ เก้าอี้ขาเหล็ก" },
  { value: "sofa", label: "โซฟา", description: "โซฟา เบาะนั่ง เบาะกรุผนัง" },
  { value: "woodwork", label: "งานโต๊ะ โรงไม้", description: "โต๊ะทำงาน โต๊ะประชุม ตู้ ชั้นวาง" },
];

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

export const SECTION_LABELS: Record<Section, string> = {
  raw: "วัตถุดิบหลัก",
  accessory: "อะไหล่ / ฟิตติ้ง / ค่าบริการ",
};

export const MATERIAL_GROUPS = [
  "ไม้แผ่น",
  "ไม้โครง",
  "ฟองน้ำ / ใย",
  "ผ้า / หนัง",
  "เหล็ก",
  "เอจปิดขอบ",
  "ฮาร์ดแวร์",
  "ค่าบริการ",
  "อื่นๆ",
] as const;

export function guessMaterialGroup(name: string, section: Section): string {
  if (/ค่าทำสี|ค่าชุบ|ค่าติดตั้ง|ค่ารื้อ|แพ็ค|ค่าขนส่ง/.test(name)) return "ค่าบริการ";
  if (/เอจ/.test(name)) return "เอจปิดขอบ";
  if (/ไม้สะเดา|โครงสปาโก้|ไม้โครง/.test(name)) return "ไม้โครง";
  if (/ไม้|มินิสกรีน|MDF|HMR/i.test(name) && section === "raw") return "ไม้แผ่น";
  if (/ฟองน้ำ|ใย/.test(name)) return "ฟองน้ำ / ใย";
  if (/ผ้า|หนัง|กระสอบ|ตีนตุ๊กแก|ตีนตู๊กแก/.test(name)) return "ผ้า / หนัง";
  if (/เหล็ก|ขาโต๊ะ/.test(name)) return "เหล็ก";
  if (section === "accessory") return "ฮาร์ดแวร์";
  return "อื่นๆ";
}
