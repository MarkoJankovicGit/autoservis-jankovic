import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, PackageSearch, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PlateBadge } from "@/components/plate-badge";
import { Button } from "@/components/ui/button";
import { formatDate, todayIso } from "@/domain/dates";
import { PARTS_ORDER_STATUS_LABELS, isWaiting } from "@/domain/parts-orders";
import { listPartsOrders } from "@/server/parts-orders";
import { SupplierTabs } from "../supplier-tabs";

export const metadata: Metadata = { title: "Narudžbenice" };

export default async function NarudzbenicePage({ searchParams }: { searchParams: Promise<{ sve?: string }> }) {
  const { sve } = await searchParams;
  const all = sve === "1";
  const rows = await listPartsOrders({ status: all ? "all" : "waiting" });
  const today = todayIso();
  const chip = (active: boolean) => cn("flex min-h-10 items-center rounded-full border px-4 text-sm font-medium", active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted");

  return (
    <>
      <PageHeader
        title="Dobavljači"
        actions={
          <Button asChild size="xl">
            <Link href="/dobavljaci/narudzbenice/nova">
              <Plus aria-hidden />
              Nova narudžbenica
            </Link>
          </Button>
        }
      />
      <SupplierTabs active="narudzbenice" />
      <nav aria-label="Filter" className="mb-4 flex gap-1.5">
        <Link href="/dobavljaci/narudzbenice" className={chip(!all)}>
          U toku
        </Link>
        <Link href="/dobavljaci/narudzbenice?sve=1" className={chip(all)}>
          Sve
        </Link>
      </nav>
      {rows.length === 0 ? (
        <EmptyState icon={PackageSearch} title={all ? "Nema narudžbenica" : "Ništa ne čeka"} />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {rows.map((p) => {
            const late = isWaiting(p.status) && !!p.neededBy && p.neededBy < today;
            return (
              <li key={p.id}>
                <Link href={`/dobavljaci/narudzbenice/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/60">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tabular">{p.number}</span>
                      {p.vehicle && <PlateBadge plate={p.vehicle.plate} vin={p.vehicle.plate ? undefined : p.vehicle.vin} size="sm" />}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {p.supplier?.name ?? "bez dobavljača"} · {p.lines.map((l) => l.name).join(", ")}
                    </span>
                    {p.neededBy && isWaiting(p.status) && <span className={cn("block text-sm", late ? "font-medium text-destructive" : "text-muted-foreground")}>treba do {formatDate(p.neededBy)}</span>}
                  </span>
                  <span className="shrink-0 text-sm font-semibold">{PARTS_ORDER_STATUS_LABELS[p.status]}</span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
