import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import { AppHeader, BottomNav } from "@/components/app-nav";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Indesign Furniture — คำนวณต้นทุน", template: "%s · Indesign Furniture" },
  description: "ระบบคำนวณต้นทุนสินค้านอกแบบ — เก้าอี้ โซฟา งานโต๊ะ โรงไม้",
  // Internal cost data: keep it out of search engines even though the app is public.
  robots: { index: false, follow: false },
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#014fa3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${kanit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <AppHeader />
          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-12 lg:px-8">{children}</main>
          <BottomNav />
          <Toaster position="top-center" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
