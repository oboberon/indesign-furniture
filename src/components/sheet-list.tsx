import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";
import { categoryLabel } from "@/lib/constants";
import { formatBaht, formatDate } from "@/lib/format";
import type { SheetListRow } from "@/lib/queries";

function TemplateBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Badge variant="outline" className="border-gold/60 bg-gold-soft text-[11px] font-normal text-navy">
      เทมเพลต
    </Badge>
  );
}

export function SheetList({ rows, emptyText = "ยังไม่มีใบคำนวณ" }: { rows: SheetListRow[]; emptyText?: string }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <>
      {/* mobile: cards */}
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/sheets/${r.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 active:bg-muted"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-brand">
                <CategoryIcon category={r.category} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{r.name}</span>
                  <TemplateBadge show={r.isTemplate} />
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {[r.dimensions && `${r.dimensions} ซม.`, r.customer, formatDate(r.updatedAt)].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="text-right">
                <div className="num text-sm font-medium text-navy">{formatBaht(r.totalCost)}</div>
                <div className="text-[11px] text-muted-foreground">ต้นทุน/ตัว</div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      {/* desktop: table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">สินค้า</th>
              <th className="px-4 py-3 font-medium">หมวดหมู่</th>
              <th className="px-4 py-3 font-medium">ขนาด (ซม.)</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">ลูกค้า</th>
              <th className="px-4 py-3 text-right font-medium">ต้นทุน/ตัว</th>
              <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">ราคาขาย/ตัว</th>
              <th className="px-4 py-3 text-right font-medium whitespace-nowrap">แก้ไขล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="group border-t border-border hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <Link href={`/sheets/${r.id}`} className="flex items-center gap-2 font-medium text-foreground group-hover:text-brand">
                    <span className="line-clamp-1">{r.name}</span>
                    <TemplateBadge show={r.isTemplate} />
                  </Link>
                  {r.code ? <div className="text-xs text-muted-foreground">{r.code}</div> : null}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
                    <CategoryIcon category={r.category} className="size-4" />
                    {categoryLabel(r.category)}
                  </span>
                </td>
                <td className="num px-4 py-3 whitespace-nowrap text-muted-foreground">{r.dimensions ?? "—"}</td>
                <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{r.customer ?? "—"}</td>
                <td className="num px-4 py-3 text-right font-medium text-navy">{formatBaht(r.totalCost)}</td>
                <td className="num hidden px-4 py-3 text-right lg:table-cell">{formatBaht(r.totalCost * (1 + r.markupRate))}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap text-muted-foreground">{formatDate(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
