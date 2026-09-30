"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, FileSpreadsheet, House, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "หน้าหลัก", icon: House },
  { href: "/sheets", label: "ใบคำนวณ", icon: FileSpreadsheet },
  { href: "/materials", label: "คลังวัสดุ", icon: Boxes },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

export function AppHeader() {
  const isActive = useActive();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image src="/logo.png" alt="Indesign Furniture" width={40} height={40} className="size-10 shrink-0" priority />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[15px] font-semibold tracking-wide text-navy">INDESIGN FURNITURE</div>
            <div className="truncate text-xs text-muted-foreground">ระบบคำนวณต้นทุนสินค้านอกแบบ</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(href) ? "bg-secondary font-medium text-brand" : "text-foreground/70 hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="h-[2px] bg-gradient-to-r from-brand via-gold to-brand opacity-80" />
    </header>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-4">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px]",
              isActive(href) ? "font-medium text-brand" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
