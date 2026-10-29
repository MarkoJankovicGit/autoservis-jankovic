import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus, Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ListSearch } from "@/components/list-search";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/domain/money";
import { formatPhone } from "@/domain/phone";
import { listSuppliers } from "@/server/suppliers";
import { SupplierTabs } from "./supplier-tabs";
import { plural } from "@/domain/text";

export const metadata: Metadata = { title: "Dobavljači" };

export default async function DobavljaciPage({ searchParams }: { searchParams: Promise<{ q?: string; arhiva?: string }> }) {
  const { q = "", arhiva } = await searchParams;
  const archived = arhiva === "1";
  const suppliers = await listSuppliers({ q, archived });
  const owed = suppliers.reduce((a, s) => a + s.unpaid, 0);

  return (
    <>
      <PageHeader
        title="Dobavljači"
        actions={
          <>
            <Button asChild variant="outline" size="xl">
              <Link href="/dobavljaci/narudzbenice/nova">
                <Plus aria-hidden />
                Narudžbenica
              </Link>
            </Button>
            <Button asChild size="xl">
              <Link href="/dobavljaci/novi">
                <Plus aria-hidden />
                Novi dobavljač
              </Link>
            </Button>
          </>
        }
      />
      <SupplierTabs active="dobavljaci" />
      <ListSearch action="/dobavljaci" q={q} placeholder="Naziv, kontakt ili email" hidden={archived ? { arhiva: "1" } : undefined} />
      {suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={q ? "Nema rezultata" : "Nema dobavljača"}
          text={q ? undefined : "Dodaj dobavljače delova da bi im slao narudžbenice i pratio šta im duguješ."}
          action={
            <Button asChild size="xl">
              <Link href="/dobavljaci/novi">
                <Plus aria-hidden />
                Novi dobavljač
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {suppliers.map((s) => (
            <li key={s.id}>
              <Link href={`/dobavljaci/${s.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/60">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="block truncate text-sm text-muted-foreground tabular">
                    {[s.phone && formatPhone(s.phone), s.contactPerson, s.waiting ? `${s.waiting} ${plural(s.waiting, "narudžbenica čeka", "narudžbenice čekaju", "narudžbenica čeka")}` : null].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                {s.unpaid > 0 && (
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold text-destructive tabular">{formatMoney(s.unpaid, { decimals: false })}</span>
                    <span className="block text-xs text-muted-foreground">dugujemo</span>
                  </span>
                )}
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-muted-foreground">
        {owed > 0 && (
          <>
            Ukupno dugujemo dobavljačima: <span className="font-semibold text-destructive tabular">{formatMoney(owed)}</span> ·{" "}
          </>
        )}
        <Link href={archived ? "/dobavljaci" : "/dobavljaci?arhiva=1"} className="underline underline-offset-4">
          {archived ? "Nazad na aktivne" : "Arhivirani dobavljači"}
        </Link>
      </p>
    </>
  );
}
