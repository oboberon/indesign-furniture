"use client";

import { useMemo, useState } from "react";
import { BookOpen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Material, Section } from "@/db/schema";
import { formatMoney } from "@/lib/format";

export function MaterialPicker({
  materials,
  section,
  selectedId,
  onPick,
}: {
  materials: Material[];
  section: Section;
  selectedId: number | null;
  onPick: (m: Material) => void;
}) {
  const [open, setOpen] = useState(false);

  // Materials of the row's own section first, grouped by material group.
  const groups = useMemo(() => {
    const sorted = [...materials].sort((a, b) => Number(b.section === section) - Number(a.section === section));
    const map = new Map<string, Material[]>();
    for (const m of sorted) {
      const g = m.section === section ? m.group : `${m.group} (หมวดอื่น)`;
      map.set(g, [...(map.get(g) ?? []), m]);
    }
    return [...map.entries()];
  }, [materials, section]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" aria-label="เลือกจากคลังวัสดุ" title="เลือกจากคลังวัสดุ">
          <BookOpen />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,380px)] p-0" align="start">
        <Command>
          <CommandInput placeholder="ค้นหาวัสดุ…" />
          <CommandList className="max-h-[50vh]">
            <CommandEmpty>ไม่พบวัสดุ — พิมพ์ชื่อเองในช่องรายการได้เลย</CommandEmpty>
            {groups.map(([group, list]) => (
              <CommandGroup key={group} heading={group}>
                {list.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`${m.name} ${m.group}`}
                    onSelect={() => {
                      onPick(m);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Check className={m.id === selectedId ? "opacity-100" : "opacity-0"} />
                    <span className="flex-1 truncate">{m.name}</span>
                    <span className="num text-xs text-muted-foreground">
                      ฿{formatMoney(m.price)}/{m.unit}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
