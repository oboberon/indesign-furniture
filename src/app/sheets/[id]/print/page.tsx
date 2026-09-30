import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { calculateSheet, lineTotal, resolveRates, unitCost } from "@/lib/calc";
import { categoryLabel } from "@/lib/constants";
import { formatDate, formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { getSettings, getSheet } from "@/lib/queries";

export const metadata: Metadata = { title: "พิมพ์ใบคำนวณต้นทุน" };

const th = "border border-neutral-300 bg-neutral-100 px-2 py-1.5 text-left font-medium";
const td = "border border-neutral-300 px-2 py-1";
const tdn = `${td} num text-right`;

function Sum({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <tr className={bold ? "font-medium" : undefined}>
      <td className={`${td} text-right`} colSpan={99}>
        <span className="float-left">{label}</span>
        <span className="num">{formatMoney(value)}</span>
      </td>
    </tr>
  );
}

export default async function PrintPage({ params }: PageProps<"/sheets/[id]/print">) {
  await connection();
  const { id } = await params;
  const [data, settings] = await Promise.all([getSheet(Number(id)), getSettings()]);
  if (!data) notFound();
  const { sheet, items } = data;
  const rates = resolveRates(sheet, settings);
  const r = calculateSheet(items, rates, sheet.markupRate, sheet.quantity);
  const raw = items.filter((i) => i.section === "raw");
  const acc = items.filter((i) => i.section === "accessory");

  return (
    <div className="mx-auto max-w-[210mm]">
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/sheets/${sheet.id}`}>
            <ArrowLeft /> กลับไปแก้ไข
          </Link>
        </Button>
        <PrintButton />
      </div>

      <article className="rounded-xl bg-white p-6 text-[12px] leading-relaxed text-neutral-900 shadow-sm print:rounded-none print:p-0 print:shadow-none sm:p-10">
        <header className="flex items-start justify-between gap-4 border-b-2 border-gold pb-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={56} height={56} className="size-14" />
            <div>
              <div className="text-sm font-semibold tracking-wide text-navy">INDESIGN FURNITURE &amp; DECORATION</div>
              <div className="text-neutral-500">ใบคำนวณต้นทุนสินค้า</div>
            </div>
          </div>
          <div className="text-right text-neutral-600">
            <div>วันที่ {formatDate(sheet.updatedAt)}</div>
            {sheet.code ? <div>รหัส {sheet.code}</div> : null}
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
          <div className="col-span-2">
            <div className="text-neutral-500">สินค้า</div>
            <div className="text-base font-medium">{sheet.name}</div>
          </div>
          <div>
            <div className="text-neutral-500">หมวดหมู่</div>
            <div>{categoryLabel(sheet.category)}</div>
          </div>
          <div>
            <div className="text-neutral-500">ขนาด (ซม.)</div>
            <div>{sheet.dimensions ?? "—"}</div>
          </div>
          {sheet.customer ? (
            <div className="col-span-2">
              <div className="text-neutral-500">ลูกค้า</div>
              <div>{sheet.customer}</div>
            </div>
          ) : null}
          {sheet.note ? (
            <div className="col-span-2">
              <div className="text-neutral-500">หมายเหตุ</div>
              <div className="whitespace-pre-line">{sheet.note}</div>
            </div>
          ) : null}
        </section>

        <h2 className="mt-6 mb-2 font-medium text-navy">1. วัตถุดิบหลัก</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>#</th>
                <th className={th}>รายการ</th>
                <th className={th}>ตำแหน่ง</th>
                <th className={th}>ขนาด</th>
                <th className={`${th} text-right`}>ชิ้นที่ได้</th>
                <th className={`${th} text-right`}>จำนวน</th>
                <th className={`${th} text-right`}>ราคาซื้อ</th>
                <th className={`${th} text-right`}>ราคา/ชิ้น</th>
                <th className={`${th} text-right`}>รวมเงิน</th>
              </tr>
            </thead>
            <tbody>
              {raw.map((i, idx) => (
                <tr key={i.id}>
                  <td className={td}>{idx + 1}</td>
                  <td className={td}>{i.name}</td>
                  <td className={td}>{i.position}</td>
                  <td className={td}>{i.size}</td>
                  <td className={tdn}>{formatNumber(i.yieldQty)}</td>
                  <td className={tdn}>{formatNumber(i.qty)}</td>
                  <td className={tdn}>{formatMoney(i.price)}</td>
                  <td className={tdn}>{formatMoney(unitCost(i))}</td>
                  <td className={tdn}>{formatMoney(lineTotal(i))}</td>
                </tr>
              ))}
              <Sum label="รวมค่าวัสดุ" value={r.rawTotal} />
              <Sum label={`ค่าแรง ${formatPercent(rates.laborRate)}`} value={r.labor} />
              <Sum label="รวมต้นทุน + ค่าแรง" value={r.rawWithLabor} bold />
            </tbody>
          </table>
        </div>

        <h2 className="mt-6 mb-2 font-medium text-navy">2. อะไหล่ / ฟิตติ้ง / ค่าบริการ</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>#</th>
                <th className={th}>รายการ</th>
                <th className={th}>หมายเหตุ</th>
                <th className={`${th} text-right`}>จำนวน</th>
                <th className={`${th} text-right`}>ราคา/หน่วย</th>
                <th className={`${th} text-right`}>รวมเงิน</th>
              </tr>
            </thead>
            <tbody>
              {acc.map((i, idx) => (
                <tr key={i.id}>
                  <td className={td}>{idx + 1}</td>
                  <td className={td}>{i.name}</td>
                  <td className={td}>{i.position}</td>
                  <td className={tdn}>{formatNumber(i.qty)}</td>
                  <td className={tdn}>{formatMoney(i.price)}</td>
                  <td className={tdn}>{formatMoney(lineTotal(i))}</td>
                </tr>
              ))}
              <Sum label="รวมวัสดุ" value={r.accessoryTotal} />
              <Sum label={`ค่าดำเนินการ ${formatPercent(rates.overheadRate)}`} value={r.overhead} />
              <Sum label="รวมต้นทุน + ค่าดำเนินการ" value={r.accessoryWithOverhead} bold />
            </tbody>
          </table>
        </div>

        <section className="mt-6 ml-auto w-full max-w-sm break-inside-avoid">
          <table className="w-full border-collapse">
            <tbody>
              <Sum label="รวมต้นทุน" value={r.subtotal} />
              <Sum label={`ค่าความเสียหาย ${formatPercent(rates.damageRate)}`} value={r.damage} />
              <tr className="bg-gold-soft text-sm font-semibold text-navy">
                <td className={`${td} text-right`}>
                  <span className="float-left">รวมต้นทุนทั้งหมด / ตัว</span>
                  <span className="num">{formatMoney(r.totalCost)}</span>
                </td>
              </tr>
              <Sum label={`บวกกำไร ${formatPercent(r.markupRate)}`} value={r.markup} />
              <Sum label="ราคาขาย / ตัว" value={r.unitPrice} bold />
              {r.quantity > 1 ? (
                <>
                  <Sum label={`จำนวน ${formatNumber(r.quantity)} ตัว — ต้นทุนรวม`} value={r.orderCost} />
                  <Sum label="ราคาขายรวม" value={r.orderPrice} bold />
                </>
              ) : null}
            </tbody>
          </table>
        </section>
      </article>
    </div>
  );
}
