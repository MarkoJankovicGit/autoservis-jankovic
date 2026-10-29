import type { Metadata } from "next";
import Link from "next/link";
import { Check, Plus, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PeriodPicker } from "@/components/period-picker";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/domain/dates";
import { EXPENSE_KIND_LABELS, expenseCategory, type ExpenseKind } from "@/domain/finance";
import { formatMoney } from "@/domain/money";
import { resolvePeriod } from "@/lib/period";
import { listExpenses } from "@/server/suppliers";
import { markExpensePaid } from "../actions";
import { FinanceTabs } from "../finance-tabs";

export const metadata: Metadata = { title: "Troškovi" };

type SP = { p?: string; od?: string; do?: string; vrsta?: string; neplaceno?: string };

const KIND_PARAM: Record<string, ExpenseKind> = { trosak: "cost", investicija: "investment" };
const PARAM_OF: Record<ExpenseKind, string> = { cost: "trosak", investment: "investicija" };

export default async function TroskoviPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const unpaidOnly = sp.neplaceno === "1";
  const kind = sp.vrsta ? KIND_PARAM[sp.vrsta] : undefined;
  const period = resolvePeriod(sp);
  // „neplaćeni“ su svi neplaćeni, bez obzira na period
  const rows = await listExpenses({ period: unpaidOnly ? undefined : period.period, kind, unpaid: unpaidOnly });
  const sum = rows.reduce((a, r) => a + r.amount, 0);
  const keep = { ...(kind ? { vrsta: PARAM_OF[kind] } : {}), ...(unpaidOnly ? { neplaceno: "1" } : {}) };
  const filterHref = (k?: ExpenseKind, unpaid = false) => {
    const q = new URLSearchParams(unpaid ? "" : period.query);
    if (k) q.set("vrsta", PARAM_OF[k]);
    if (unpaid) q.set("neplaceno", "1");
    return `/finansije/troskovi?${q.toString()}`;
  };
  const chip = (active: boolean) =>
    cn("flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium", active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted");

  return (
    <>
      <PageHeader
        title="Finansije"
        actions={
          <Button asChild size="xl">
            <Link href={kind === "investment" ? "/finansije/troskovi/novi?vrsta=investicija" : "/finansije/troskovi/novi"}>
              <Plus aria-hidden />
              {kind === "investment" ? "Nova investicija" : "Novi trošak"}
            </Link>
          </Button>
        }
      />
      <FinanceTabs active="/finansije/troskovi" />
      <nav aria-label="Vrsta" className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link href={filterHref()} aria-current={!kind && !unpaidOnly ? "page" : undefined} className={chip(!kind && !unpaidOnly)}>
          Sve
        </Link>
        {(["cost", "investment"] as const).map((k) => (
          <Link key={k} href={filterHref(k)} aria-current={kind === k && !unpaidOnly ? "page" : undefined} className={chip(kind === k && !unpaidOnly)}>
            {k === "cost" ? "Troškovi" : "Investicije"}
          </Link>
        ))}
        <Link href={filterHref(undefined, true)} aria-current={unpaidOnly ? "page" : undefined} className={chip(unpaidOnly)}>
          Neplaćeno
        </Link>
      </nav>
      {!unpaidOnly && <PeriodPicker base="/finansije/troskovi" current={period} keep={keep} />}

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={unpaidOnly ? "Sve je plaćeno" : kind === "investment" ? "Nema investicija u periodu" : "Nema troškova u periodu"}
          action={
            !unpaidOnly && (
              <Button asChild variant="outline" size="xl">
                <Link href={kind === "investment" ? "/finansije/troskovi/novi?vrsta=investicija" : "/finansije/troskovi/novi"}>
                  <Plus aria-hidden />
                  Dodaj
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/finansije/troskovi/${r.id}`} className="min-w-0 flex-1 hover:opacity-80">
                  <span className="block font-medium">{r.description}</span>
                  <span className="block text-sm text-muted-foreground">
                    {[formatDate(r.date), expenseCategory(r.category)?.label, r.orderNumber && `nalog ${r.orderNumber}`, r.supplierName].filter(Boolean).join(" · ")}
                  </span>
                  {!r.paidDate && (
                    <span className={cn("block text-sm font-medium", r.overdue ? "text-destructive" : "text-warning")}>
                      Nije plaćeno{r.dueDate && ` · rok ${formatDate(r.dueDate)}`}
                    </span>
                  )}
                </Link>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold tabular">{formatMoney(r.amount, { decimals: false })}</span>
                  {r.kind === "investment" && <span className="block text-xs text-muted-foreground">{EXPENSE_KIND_LABELS.investment}</span>}
                </span>
                {!r.paidDate && (
                  <form action={markExpensePaid}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" aria-label={`Plaćeno danas: ${r.description}`} className="inline-flex size-11 items-center justify-center rounded-lg text-success hover:bg-success/10">
                      <Check className="size-5" aria-hidden />
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-baseline justify-between gap-3 px-1">
            <span className="text-lg font-semibold">Ukupno</span>
            <span className="text-2xl font-bold tabular">{formatMoney(sum)}</span>
          </p>
        </>
      )}
    </>
  );
}
