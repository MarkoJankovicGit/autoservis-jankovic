import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ClipboardList, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ListSearch } from "@/components/list-search";
import { PlateBadge } from "@/components/plate-badge";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import { countOrders, listOrders, type OrderFilter } from "@/server/orders";

export const metadata: Metadata = { title: "Nalozi" };

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "open", label: "U radu" },
  { value: "waiting", label: "Čeka deo" },
  { value: "unpaid", label: "Neplaćeni" },
  { value: "done", label: "Završeni" },
  { value: "cancelled", label: "Otkazani" },
  { value: "all", label: "Svi" },
];

export default async function NaloziPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status: s } = await searchParams;
  const status: OrderFilter = FILTERS.some((f) => f.value === s) ? (s as OrderFilter) : "open";
  const [orders, counts] = await Promise.all([listOrders({ status, q }), countOrders()]);
  const count = (f: OrderFilter) => counts[f];

  return (
    <>
      <PageHeader
        title="Nalozi"
        actions={
          <Button asChild size="xl">
            <Link href="/nalozi/novi">
              <Plus aria-hidden />
              Novi prijem
            </Link>
          </Button>
        }
      />
      <nav aria-label="Filter naloga" className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/nalozi?status=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-current={status === f.value ? "page" : undefined}
            className={cn(
              "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium",
              status === f.value ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
            <span className={cn("tabular", status === f.value ? "opacity-80" : "opacity-70")}>{count(f.value)}</span>
          </Link>
        ))}
      </nav>
      <ListSearch action="/nalozi" q={q} placeholder="Tablica, broj, klijent ili telefon" hidden={{ status }} />

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={q ? "Nema rezultata" : status === "open" ? "Nema naloga u radu" : status === "unpaid" ? "Nema neplaćenih naloga" : status === "waiting" ? "Nijedan nalog ne čeka deo" : "Nema naloga"}
          text={q ? `Nijedan nalog ne odgovara pretrazi „${q}“.` : "Nalog se otvara prijemom vozila."}
          action={
            <Button asChild size="xl">
              <Link href="/nalozi/novi">
                <Plus aria-hidden />
                Novi prijem
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/nalozi/${o.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none">
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <PlateBadge plate={o.vehicle?.plate} vin={o.vehicle?.plate ? undefined : o.vehicle?.vin} className="w-fit max-w-full" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {[o.vehicle?.make, o.vehicle?.model].filter(Boolean).join(" ")}
                      <span className="font-normal text-muted-foreground"> · {o.customer?.name}</span>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      <span className="tabular">{o.number}</span> · {formatDate(o.completedDate ?? o.receivedDate)} · {o.complaint}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <OrderStatusBadge status={o.status} />
                  {o.waitingParts && <span className="rounded-full bg-warning/12 px-2 py-0.5 text-xs font-semibold text-warning">Čeka deo</span>}
                  {o.total > 0 && <span className="text-sm font-semibold tabular">{formatMoney(o.total, { decimals: false })}</span>}
                  {o.status === "done" && o.total > 0 && o.paymentStatus !== "paid" && o.paymentStatus !== "overpaid" && (
                    <span className="text-xs font-semibold text-destructive tabular">duguje {formatMoney(o.total - o.paid, { decimals: false })}</span>
                  )}
                </div>
                <ChevronRight className="hidden size-5 shrink-0 text-muted-foreground sm:block" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
