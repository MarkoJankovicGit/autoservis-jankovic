import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Download, Plus, Truck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { PlateBadge } from "@/components/plate-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import { resolvePeriod } from "@/lib/period";
import { periodOverview } from "@/server/finance";
import { FinanceTabs } from "./finance-tabs";

export const metadata: Metadata = { title: "Finansije" };

const m = (p: number) => formatMoney(p, { decimals: false });

/** Jedan red obračuna: znak, naziv, iznos; zbirni redovi su istaknuti. */
function Row({ sign, label, value, href, total, tone }: { sign: string; label: string; value: number; href?: string; total?: boolean; tone?: boolean }) {
  const color = tone ? (value >= 0 ? "text-success" : "text-destructive") : undefined;
  const body = (
    <>
      <span className="w-5 shrink-0 text-center text-xl font-semibold text-muted-foreground" aria-hidden>
        {sign}
      </span>
      <span className={cn("min-w-0 flex-1", total ? "text-lg font-semibold" : "text-muted-foreground")}>{label}</span>
      <span className={cn("whitespace-nowrap tabular", total ? "text-[1.625rem] leading-tight font-bold sm:text-3xl" : "text-xl font-semibold", color)}>{m(value)}</span>
      {href && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
    </>
  );
  const cls = cn("flex items-center gap-3 px-4", total ? "min-h-16 bg-muted/40" : "min-h-14");
  return href ? (
    <Link href={href} className={cn(cls, "hover:bg-muted/60")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default async function FinansijePage({ searchParams }: { searchParams: Promise<{ p?: string; od?: string; do?: string }> }) {
  const period = resolvePeriod(await searchParams);
  const o = await periodOverview(period.period);
  const q = period.query;
  const totals = o.orders.reduce((a, x) => ({ total: a.total + x.total, costs: a.costs + x.costs, profit: a.profit + x.profit }), { total: 0, costs: 0, profit: 0 });

  return (
    <>
      <PageHeader
        title="Finansije"
        actions={
          <Button asChild size="xl">
            <Link href="/finansije/troskovi/novi">
              <Plus aria-hidden />
              Novi trošak
            </Link>
          </Button>
        }
      />
      <FinanceTabs active="/finansije" />
      <PeriodPicker base="/finansije" current={period} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <section aria-label={`Obračun: ${period.label}`} className="divide-y overflow-hidden rounded-2xl border bg-card">
            <Row sign="+" label="Prihodi" value={o.income} href={`/finansije/uplate?${q}`} />
            <Row sign="−" label="Troškovi" value={o.costs} href={`/finansije/troskovi?${q}&vrsta=trosak`} />
            <Row sign="=" label="Profit" value={o.profit} total tone />
            <Row sign="−" label="Investicije" value={o.investments} href={`/finansije/troskovi?${q}&vrsta=investicija`} />
            <Row sign="=" label="Saldo" value={o.balance} total tone />
          </section>

          {(o.owedByCustomers > 0 || o.owedToSuppliers > 0) && (
            <section aria-label="Dugovanja" className="divide-y overflow-hidden rounded-2xl border bg-card">
              {o.owedByCustomers > 0 && (
                <Link href="/finansije/dugovanja" className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted/60">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <Users className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-muted-foreground">Mušterije duguju</span>
                    <span className="block text-xl font-bold text-destructive tabular">{m(o.owedByCustomers)}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              )}
              {o.owedToSuppliers > 0 && (
                <Link href="/finansije/troskovi?neplaceno=1" className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted/60">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/12 text-warning">
                    <Truck className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-muted-foreground">Dugujemo dobavljačima</span>
                    <span className="block text-xl font-bold text-warning tabular">{m(o.owedToSuppliers)}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              )}
            </section>
          )}

          <nav aria-label="Izvoz za Excel" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Download className="size-4 text-muted-foreground" aria-hidden />
            {[
              { k: "nalozi", l: "Nalozi" },
              { k: "uplate", l: "Prihodi" },
              { k: "troskovi", l: "Troškovi" },
            ].map((x) => (
              <a key={x.k} href={`/api/izvoz?vrsta=${x.k}&${q}`} className="font-medium text-primary">
                {x.l}
              </a>
            ))}
          </nav>
        </div>

        <section aria-labelledby="nalozi-perioda">
          <h2 id="nalozi-perioda" className="mb-3 text-lg font-semibold">
            Završeni nalozi
          </h2>
          {o.orders.length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-card px-4 py-8 text-center text-muted-foreground">Nema završenih naloga u periodu.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <div className="hidden grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] gap-3 border-b px-4 py-2 text-xs font-semibold text-muted-foreground sm:grid">
                <span>Nalog</span>
                <span className="text-right">Iznos</span>
                <span className="text-right">Troškovi</span>
                <span className="text-right">Zarada</span>
              </div>
              <ul className="divide-y">
                {o.orders.map((x) => (
                  <li key={x.id}>
                    <Link href={`/nalozi/${x.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted/60 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem]">
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          {x.plate && <PlateBadge plate={x.plate} size="sm" />}
                          <span className="truncate font-medium">{x.vehicle}</span>
                        </span>
                        <span className="block text-xs text-muted-foreground tabular">
                          {x.number} · {formatDate(x.date)}
                          {x.paid < x.total && <span className="font-semibold text-destructive"> · duguje {m(x.total - x.paid)}</span>}
                        </span>
                      </span>
                      <span className="hidden text-right tabular sm:block">{m(x.total)}</span>
                      <span className="hidden text-right text-muted-foreground tabular sm:block">{x.costs ? `−${m(x.costs)}` : "—"}</span>
                      <span className={cn("text-right font-semibold tabular", x.profit < 0 && "text-destructive")}>
                        <span className="text-xs font-normal text-muted-foreground sm:hidden">zarada </span>
                        {m(x.profit)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-t bg-muted/40 px-4 py-3 font-semibold sm:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem]">
                <span>Ukupno</span>
                <span className="hidden text-right tabular sm:block">{m(totals.total)}</span>
                <span className="hidden text-right tabular sm:block">{totals.costs ? `−${m(totals.costs)}` : "—"}</span>
                <span className={cn("text-right text-lg font-bold tabular", totals.profit < 0 && "text-destructive")}>{m(totals.profit)}</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
