import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PeriodPicker } from "@/components/period-picker";
import { PlateBadge } from "@/components/plate-badge";
import { formatDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import { resolvePeriod } from "@/lib/period";
import { paymentsInPeriod } from "@/server/finance";
import { FinanceTabs } from "../finance-tabs";

export const metadata: Metadata = { title: "Prihodi" };

export default async function PrihodiPage({ searchParams }: { searchParams: Promise<{ p?: string; od?: string; do?: string }> }) {
  const period = resolvePeriod(await searchParams);
  const rows = await paymentsInPeriod(period.period);
  const total = rows.filter((r) => !r.cancelledAt).reduce((a, r) => a + r.amount, 0);
  return (
    <>
      <PageHeader title="Finansije" />
      <FinanceTabs active="/finansije/uplate" />
      <PeriodPicker base="/finansije/uplate" current={period} />
      {rows.length === 0 ? (
        <EmptyState icon={Wallet} title="Nema naplate u periodu" />
      ) : (
        <>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/nalozi/${r.orderId}`} className={cn("flex items-center gap-3 px-4 py-3 hover:bg-muted/60", r.cancelledAt && "text-muted-foreground")}>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      {r.plate && <PlateBadge plate={r.plate} size="sm" />}
                      <span className="font-medium">{r.customerName}</span>
                    </span>
                    <span className="block text-sm text-muted-foreground tabular">
                      {formatDate(r.date)} · nalog {r.orderNumber}
                      {r.cancelledAt && ` · poništeno: ${r.cancelReason}`}
                    </span>
                  </span>
                  <span className={cn("shrink-0 font-semibold tabular", r.cancelledAt && "line-through")}>{formatMoney(r.amount, { decimals: false })}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-baseline justify-between gap-3 px-1">
            <span className="text-lg font-semibold">Ukupno</span>
            <span className="text-2xl font-bold tabular">{formatMoney(total)}</span>
          </p>
        </>
      )}
    </>
  );
}
