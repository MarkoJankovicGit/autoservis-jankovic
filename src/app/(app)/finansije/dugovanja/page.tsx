import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PlateBadge } from "@/components/plate-badge";
import { formatDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import { formatPhone, telHref } from "@/domain/phone";
import { listDebts } from "@/server/finance";
import { FinanceTabs } from "../finance-tabs";
import { plural } from "@/domain/text";

export const metadata: Metadata = { title: "Dugovanja" };

const bucketCls: Record<string, string> = {
  "0-30": "bg-muted text-muted-foreground",
  "31-60": "bg-warning/12 text-warning",
  "61-90": "bg-destructive/10 text-destructive",
  "90+": "bg-destructive text-destructive-foreground",
};

export default async function DugovanjaPage() {
  const debts = await listDebts();
  const total = debts.reduce((a, d) => a + d.balance, 0);
  return (
    <>
      <PageHeader title="Finansije" />
      <FinanceTabs active="/finansije/dugovanja" />
      {debts.length === 0 ? (
        <EmptyState icon={HandCoins} title="Niko ne duguje" />
      ) : (
        <>
          <p className="mb-4 flex flex-wrap items-baseline gap-x-3">
            <span className="text-[1.75rem] leading-tight font-bold text-destructive tabular">{formatMoney(total)}</span>
            <span className="text-muted-foreground">
              {debts.length} {plural(debts.length, "klijent", "klijenta", "klijenata")}
            </span>
          </p>
          <ul className="flex flex-col gap-3">
            {debts.map((d) => (
              <li key={d.customer.id} className="rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/klijenti/${d.customer.id}`} className="min-w-0 flex-1 font-semibold text-primary">
                    {d.customer.name}
                  </Link>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", bucketCls[d.bucket])}>{d.bucket} dana</span>
                  <span className="font-bold text-destructive tabular">{formatMoney(d.balance, { decimals: false })}</span>
                  {d.customer.phones[0] && (
                    <a href={telHref(d.customer.phones[0].e164)} aria-label={`Pozovi ${d.customer.name}, ${formatPhone(d.customer.phones[0].e164)}`} className="inline-flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <Phone className="size-4" aria-hidden />
                    </a>
                  )}
                </div>
                <ul className="mt-2 flex flex-col divide-y text-sm">
                  {d.orders.map((o) => (
                    <li key={o.id}>
                      <Link href={`/nalozi/${o.id}`} className="flex flex-wrap items-center gap-2 py-2 hover:opacity-80">
                        <span className="tabular">{formatDate(o.date)}</span>
                        <span className="text-muted-foreground tabular">{o.number}</span>
                        {o.plate && <PlateBadge plate={o.plate} size="sm" />}
                        <span className="ml-auto text-muted-foreground tabular">
                          {formatMoney(o.total, { decimals: false })}
                          {o.paid > 0 && ` − ${formatMoney(o.paid, { decimals: false })}`}
                        </span>
                        <span className="font-semibold tabular">{formatMoney(o.balance, { decimals: false })}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
