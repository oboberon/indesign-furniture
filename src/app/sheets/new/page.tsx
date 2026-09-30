import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { FilePlus2 } from "lucide-react";
import { createSheet } from "@/app/actions";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import type { Category } from "@/db/schema";
import { CATEGORIES, categoryLabel } from "@/lib/constants";
import { formatBaht } from "@/lib/format";
import { listSheets } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "สร้างใบคำนวณใหม่" };

export default async function NewSheetPage({ searchParams }: PageProps<"/sheets/new">) {
  await connection();
  const sp = await searchParams;
  const category = (CATEGORIES.find((c) => c.value === sp.category)?.value ?? "sofa") as Category;
  const q = typeof sp.q === "string" ? sp.q : "";
  const templates = await listSheets({ category, type: "templates", q });

  return (
    <div>
      <PageHeader title="สร้างใบคำนวณใหม่" description="เลือกหมวดหมู่ แล้วเริ่มจากใบเปล่าหรือคัดลอกจากเทมเพลตที่ใกล้เคียง" />

      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={`/sheets/new?category=${c.value}`}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-sm transition-colors sm:flex-row sm:p-4 sm:text-left",
              c.value === category ? "border-brand bg-secondary text-brand" : "border-border bg-white hover:border-brand/40",
            )}
          >
            <CategoryIcon category={c.value} className="size-6" />
            <span className="font-medium">{c.label}</span>
          </Link>
        ))}
      </div>

      <form action={createSheet} className="mb-8">
        <input type="hidden" name="category" value={category} />
        <SubmitButton size="lg" className="h-12 w-full text-base sm:w-auto sm:px-6">
          <FilePlus2 /> เริ่มจากใบเปล่า ({categoryLabel(category)})
        </SubmitButton>
      </form>

      <h2 className="gold-rule mb-4 text-lg text-navy">หรือคัดลอกจากเทมเพลต ({templates.length})</h2>
      <form action="/sheets/new" className="mb-4">
        <input type="hidden" name="category" value={category} />
        <input
          name="q"
          defaultValue={q}
          placeholder="ค้นหาเทมเพลต…"
          className="h-11 w-full rounded-lg border border-input bg-white px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
        />
      </form>

      {templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          ยังไม่มีเทมเพลตในหมวดนี้
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <li key={t.id}>
              <form action={createSheet} className="h-full">
                <input type="hidden" name="category" value={category} />
                <input type="hidden" name="fromId" value={t.id} />
                <button
                  type="submit"
                  className="flex h-full w-full flex-col rounded-xl border border-border bg-white p-4 text-left transition-colors hover:border-brand hover:bg-secondary/40"
                >
                  <span className="line-clamp-2 font-medium">{t.name}</span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {[t.dimensions && `${t.dimensions} ซม.`, t.code].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <span className="num mt-3 text-sm text-navy">ต้นทุน {formatBaht(t.totalCost)}</span>
                  <span className="mt-2 text-xs font-medium text-brand">ใช้เทมเพลตนี้ →</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
