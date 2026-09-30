import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SheetList } from "@/components/sheet-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category } from "@/db/schema";
import { CATEGORIES } from "@/lib/constants";
import { listSheets, type SheetListType } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "ใบคำนวณต้นทุน" };

const TYPES: { value: SheetListType; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "jobs", label: "งานลูกค้า" },
  { value: "templates", label: "เทมเพลต" },
];

function pick<T extends string>(v: string | string[] | undefined, allowed: readonly T[]): T | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

export default async function SheetsPage({ searchParams }: PageProps<"/sheets">) {
  await connection();
  const sp = await searchParams;
  const category = pick<Category>(sp.category, ["chair", "sofa", "woodwork"]);
  const type = pick<SheetListType>(sp.type, ["all", "jobs", "templates"]) ?? "all";
  const q = typeof sp.q === "string" ? sp.q : "";
  const rows = await listSheets({ category, type, q });

  const href = (next: { category?: Category | null; type?: SheetListType }) => {
    const p = new URLSearchParams();
    const c = next.category === undefined ? category : next.category;
    const t = next.type ?? type;
    if (c) p.set("category", c);
    if (t !== "all") p.set("type", t);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/sheets?${s}` : "/sheets";
  };

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
      active ? "border-brand bg-brand text-white" : "border-border bg-white text-foreground/75 hover:border-brand/40",
    );

  return (
    <div>
      <PageHeader
        title="ใบคำนวณต้นทุน"
        description={`${rows.length} รายการ`}
        actions={
          <Button asChild size="lg" className="h-10">
            <Link href={category ? `/sheets/new?category=${category}` : "/sheets/new"}>
              <Plus /> สร้างใบคำนวณใหม่
            </Link>
          </Button>
        }
      />

      <div className="mb-5 space-y-3">
        <form action="/sheets" className="relative">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="ค้นหาชื่อสินค้า ขนาด ลูกค้า หรือชื่อไฟล์…"
            className="h-11 bg-white pl-9 text-base sm:text-sm"
          />
        </form>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <Link href={href({ category: null })} className={chip(!category)}>
            ทุกหมวด
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c.value} href={href({ category: c.value })} className={chip(category === c.value)}>
              {c.label}
            </Link>
          ))}
          <span className="mx-1 w-px shrink-0 bg-border" />
          {TYPES.map((t) => (
            <Link key={t.value} href={href({ type: t.value })} className={chip(type === t.value)}>
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <SheetList rows={rows} emptyText={q ? `ไม่พบรายการที่ตรงกับ “${q}”` : "ยังไม่มีใบคำนวณในหมวดนี้"} />
    </div>
  );
}
