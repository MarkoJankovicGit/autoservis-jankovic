import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronRight, Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ListSearch } from "@/components/list-search";
import { PlateBadge } from "@/components/plate-badge";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/domain/phone";
import { listCustomers } from "@/server/customers";
import { plural } from "@/domain/text";

export const metadata: Metadata = { title: "Klijenti" };

export default async function KlijentiPage({ searchParams }: { searchParams: Promise<{ q?: string; arhiva?: string }> }) {
  const { q = "", arhiva } = await searchParams;
  const archived = arhiva === "1";
  const customers = await listCustomers({ q, archived });

  return (
    <>
      <PageHeader
        title={archived ? "Arhivirani klijenti" : "Klijenti"}
        description={archived ? "Ne pojavljuju se u pretrazi i pri prijemu." : "Mušterije i njihova vozila"}
        actions={
          !archived && (
            <Button asChild size="xl">
              <Link href="/klijenti/novi">
                <Plus aria-hidden />
                Novi klijent
              </Link>
            </Button>
          )
        }
      />
      <ListSearch action="/klijenti" q={q} placeholder="Ime, telefon ili tablica" hidden={archived ? { arhiva: "1" } : undefined} />

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? "Nema rezultata" : archived ? "Nema arhiviranih klijenata" : "Nema klijenata"}
          text={q ? `Nijedan klijent ne odgovara pretrazi „${q}“.` : archived ? undefined : "Klijenti se dodaju ovde ili pri prijemu vozila."}
          action={
            !archived && (
              <Button asChild size="xl">
                <Link href="/klijenti/novi">
                  <Plus aria-hidden />
                  Novi klijent
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {customers.map((c) => (
            <li key={c.id}>
              <Link href={`/klijenti/${c.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">
                    {c.type === "company" && <Building2 className="size-4 shrink-0 text-muted-foreground" aria-label="Firma" />}
                    <span className="truncate">{c.name}</span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground tabular">
                    {[c.phones[0] && formatPhone(c.phones[0].e164), c.email].filter(Boolean).join(" · ") || "bez kontakta"}
                  </p>
                </div>
                <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                  {c.vehicles.slice(0, 3).map((v) => (
                    <PlateBadge key={v.id} plate={v.plate} size="sm" />
                  ))}
                  {c.vehicles.length > 3 && <span className="self-center text-sm text-muted-foreground">+{c.vehicles.length - 3}</span>}
                </div>
                <span className="text-sm text-muted-foreground sm:hidden">{c.vehicles.length ? `${c.vehicles.length} voz.` : ""}</span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-sm text-muted-foreground">
        {customers.length} {plural(customers.length, "klijent", "klijenta", "klijenata")} ·{" "}
        <Link href={archived ? "/klijenti" : "/klijenti?arhiva=1"} className="underline underline-offset-4">
          {archived ? "Nazad na aktivne" : "Arhivirani klijenti"}
        </Link>
      </p>
    </>
  );
}
