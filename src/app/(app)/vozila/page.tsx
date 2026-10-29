import type { Metadata } from "next";
import Link from "next/link";
import { Car, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ListSearch } from "@/components/list-search";
import { PlateBadge } from "@/components/plate-badge";
import { Button } from "@/components/ui/button";
import { looksLikePlate, normalizePlate } from "@/domain/plate";
import { listVehicles } from "@/server/vehicles";
import { plural } from "@/domain/text";

export const metadata: Metadata = { title: "Vozila" };

export default async function VozilaPage({ searchParams }: { searchParams: Promise<{ q?: string; arhiva?: string }> }) {
  const { q = "", arhiva } = await searchParams;
  const archived = arhiva === "1";
  const vehicles = await listVehicles({ q, archived });
  const newHref = q && looksLikePlate(q) ? `/vozila/novo?tablica=${encodeURIComponent(normalizePlate(q))}` : "/vozila/novo";

  return (
    <>
      <PageHeader
        title={archived ? "Arhivirana vozila" : "Vozila"}
        actions={
          !archived && (
            <Button asChild size="xl">
              <Link href="/vozila/novo">
                <Plus aria-hidden />
                Novo vozilo
              </Link>
            </Button>
          )
        }
      />
      <ListSearch action="/vozila" q={q} placeholder="Tablica, VIN, model ili vlasnik" hidden={archived ? { arhiva: "1" } : undefined} />

      {vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title={q ? "Nema rezultata" : "Nema vozila"}
          text={q ? `Nijedno vozilo ne odgovara pretrazi „${q}“.` : "Vozila se dodaju ovde ili pri prijemu."}
          action={
            !archived && (
              <Button asChild size="xl">
                <Link href={newHref}>
                  <Plus aria-hidden />
                  {q && looksLikePlate(q) ? `Novo vozilo ${normalizePlate(q)}` : "Novo vozilo"}
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {vehicles.map((v) => (
            <li key={v.id}>
              <Link href={`/vozila/${v.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none">
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <PlateBadge plate={v.plate} vin={v.plate ? undefined : v.vin} className="w-fit max-w-full" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{[v.make, v.model, v.year].filter(Boolean).join(" ")}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[v.owner?.name ?? "bez vlasnika", v.lastKm !== undefined ? `${v.lastKm.toLocaleString("sr-Latn-RS")} km` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-muted-foreground">
        {vehicles.length} {plural(vehicles.length, "vozilo", "vozila", "vozila")} ·{" "}
        <Link href={archived ? "/vozila" : "/vozila?arhiva=1"} className="underline underline-offset-4">
          {archived ? "Nazad na aktivna" : "Arhivirana vozila"}
        </Link>
      </p>
    </>
  );
}
