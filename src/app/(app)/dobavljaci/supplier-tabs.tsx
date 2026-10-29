import Link from "next/link";
import { cn } from "@/lib/utils";

export function SupplierTabs({ active }: { active: "dobavljaci" | "narudzbenice" }) {
  const tabs = [
    { key: "dobavljaci", href: "/dobavljaci", label: "Dobavljači" },
    { key: "narudzbenice", href: "/dobavljaci/narudzbenice", label: "Narudžbenice" },
  ] as const;
  return (
    <nav aria-label="Dobavljači" className="mb-4 flex gap-1 rounded-xl border bg-card p-1 sm:inline-flex">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={cn("flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-sm font-semibold sm:flex-none sm:px-5", active === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
