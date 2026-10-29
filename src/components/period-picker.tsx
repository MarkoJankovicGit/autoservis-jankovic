"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PERIOD_OPTIONS, type ResolvedPeriod } from "@/lib/period";

const chip = (active: boolean) =>
  cn("flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium", active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted");

/** Period: brzi izbori kao linkovi; „Od – do“ otvara proizvoljan raspon (GET forma). */
export function PeriodPicker({ base, current, keep = {} }: { base: string; current: ResolvedPeriod; keep?: Record<string, string> }) {
  const custom = current.key === "custom";
  const [open, setOpen] = useState(custom);
  const extra = new URLSearchParams(keep).toString();
  const href = (q: string) => `${base}?${q}${extra ? `&${extra}` : ""}`;
  return (
    <div className="mb-4">
      <nav aria-label="Period" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PERIOD_OPTIONS().map((o) => (
          <Link key={o.key} href={href(`p=${o.key}`)} aria-current={current.key === o.key ? "page" : undefined} className={chip(current.key === o.key)}>
            {o.label}
          </Link>
        ))}
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={chip(custom)}>
          {custom ? current.label : "Od – do"}
        </button>
      </nav>
      {open && (
        <form action={base} className="mt-2 flex flex-wrap items-end gap-2 text-sm">
          {Object.entries(keep).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">Od</span>
            <input type="date" name="od" defaultValue={current.period.from} className="h-12 rounded-lg border border-input bg-card px-2.5 text-base" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">Do</span>
            <input type="date" name="do" defaultValue={current.period.to} className="h-12 rounded-lg border border-input bg-card px-2.5 text-base" />
          </label>
          <button type="submit" className="h-12 rounded-lg border border-primary bg-primary px-5 text-base font-medium text-primary-foreground">
            Prikaži
          </button>
        </form>
      )}
    </div>
  );
}
