import { Armchair, Sofa, Table2 } from "lucide-react";
import type { Category } from "@/db/schema";
import { cn } from "@/lib/utils";

const ICONS = { chair: Armchair, sofa: Sofa, woodwork: Table2 } as const;

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = ICONS[category];
  return <Icon className={cn("size-5", className)} aria-hidden />;
}
