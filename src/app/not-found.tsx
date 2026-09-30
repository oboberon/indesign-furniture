import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl text-navy">ไม่พบหน้านี้</h1>
      <p className="mt-2 text-sm text-muted-foreground">ใบคำนวณอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง</p>
      <Button asChild className="mt-6">
        <Link href="/sheets">กลับไปหน้าใบคำนวณ</Link>
      </Button>
    </div>
  );
}
