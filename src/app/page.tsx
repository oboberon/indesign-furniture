import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Plus } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeader } from "@/components/page-header";
import { SheetList } from "@/components/sheet-list";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/constants";
import { formatPercent } from "@/lib/format";
import { getCategoryStats, getSettings, listSheets } from "@/lib/queries";

export default async function HomePage() {
  await connection();
  const [stats, recent, settings] = await Promise.all([
    getCategoryStats(),
    listSheets({ limit: 6 }),
    getSettings(),
  ]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl bg-navy px-6 py-8 text-white sm:px-10 sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 size-64 rotate-12 border-2 border-gold/40 sm:size-80"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-2 -bottom-20 size-48 rotate-12 border border-gold/25 sm:size-64"
        />
        <div className="relative max-w-2xl">
          <p className="text-sm tracking-[0.2em] text-gold">INDESIGN FURNITURE &amp; DECORATION</p>
          <h1 className="mt-2 text-2xl leading-snug font-medium sm:text-3xl">คำนวณต้นทุนสินค้านอกแบบ</h1>
          <p className="mt-2 text-sm text-white/75 sm:text-base">
            คิดต้นทุนเก้าอี้ โซฟา และงานโต๊ะโรงไม้ รวมค่าแรง {formatPercent(settings.laborRate)} · ค่าดำเนินการ{" "}
            {formatPercent(settings.overheadRate)} · ค่าความเสียหาย {formatPercent(settings.damageRate)} อัตโนมัติ
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-11 bg-gold px-5 text-navy hover:bg-gold/90">
              <Link href="/sheets/new">
                <Plus /> สร้างใบคำนวณต้นทุนใหม่
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 border-white/30 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white">
              <Link href="/sheets?type=templates">ดูเทมเพลตทั้งหมด</Link>
            </Button>
          </div>
        </div>
      </section>

      <section>
        <PageHeader title="หมวดหมู่สินค้า" />
        <div className="grid gap-4 sm:grid-cols-3">
          {CATEGORIES.map((c) => {
            const s = stats[c.value];
            return (
              <div key={c.value} className="group flex flex-col rounded-2xl border border-border bg-white p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-brand">
                    <CategoryIcon category={c.value} className="size-6" />
                  </div>
                  <span className="rounded-full bg-gold-soft px-2.5 py-1 text-xs text-navy">{s?.total ?? 0} ใบ</span>
                </div>
                <h3 className="mt-4 text-lg text-navy">{c.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-5 flex gap-2 pt-1">
                  <Button asChild className="flex-1">
                    <Link href={`/sheets/new?category=${c.value}`}>
                      <Plus /> สร้างใหม่
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link href={`/sheets?category=${c.value}`}>
                      ดูทั้งหมด <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <PageHeader
          title="แก้ไขล่าสุด"
          actions={
            <Button asChild variant="ghost" className="text-brand">
              <Link href="/sheets">
                ดูใบคำนวณทั้งหมด <ArrowRight />
              </Link>
            </Button>
          }
        />
        <SheetList rows={recent} />
      </section>
    </div>
  );
}
