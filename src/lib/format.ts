const baht = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plain = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 4 });
const dateFmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit" });

export const formatBaht = (n: number) => `฿${baht.format(Number.isFinite(n) ? n : 0)}`;
export const formatMoney = (n: number) => baht.format(Number.isFinite(n) ? n : 0);
export const formatNumber = (n: number) => plain.format(Number.isFinite(n) ? n : 0);
export const formatPercent = (rate: number) => `${plain.format(Math.round(rate * 10000) / 100)}%`;
export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));

/** Parse a user-typed number ("1,200.5", "") → number (NaN-safe). */
export function parseNum(v: string | number | null | undefined, fallback = 0): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (!v) return fallback;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : fallback;
}
