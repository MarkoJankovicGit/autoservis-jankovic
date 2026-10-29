import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/finansije", label: "Pregled" },
  { href: "/finansije/uplate", label: "Prihodi" },
  { href: "/finansije/troskovi", label: "Troškovi" },
  { href: "/finansije/dugovanja", label: "Dugovanja" },
];

export function FinanceTabs({ active }: { active: string }) {
  return (
    <nav aria-label="Finansije" className="mb-4 flex gap-1 overflow-x-auto rounded-xl border bg-card p-1 sm:inline-flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={active === t.href ? "page" : undefined}
          className={cn(
            "flex min-h-11 flex-1 shrink-0 items-center justify-center rounded-lg px-2 text-sm font-semibold sm:flex-none sm:px-5",
            active === t.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
