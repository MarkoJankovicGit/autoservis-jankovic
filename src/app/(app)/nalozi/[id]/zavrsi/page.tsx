import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PlateBadge } from "@/components/plate-badge";
import { Notice } from "@/components/notice";
import { formatDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import { describeTarget } from "@/domain/reminders";
import { getOrder } from "@/server/orders";
import { CompletionForm } from "./completion-form";
import { plural } from "@/domain/text";

export const metadata: Metadata = { title: "Završetak naloga" };

export default async function ZavrsiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getOrder(id);
  if (!d) notFound();
  if (d.order.status !== "open") redirect(`/nalozi/${id}`);
  const { order: o, vehicle: v, items, totals } = d;

  return (
    <div className="max-w-3xl">
      <PageHeader title={`Završetak naloga ${o.number}`} description={[v.make, v.model].filter(Boolean).join(" ")} actions={<PlateBadge plate={v.plate} vin={v.vin} />} />
      {items.length === 0 ? (
        <Notice variant="warning" title="Nalog nema stavki" className="mb-4">
          <Link href={`/nalozi/${id}`} className="font-medium text-primary underline underline-offset-4">Dodaj stavke</Link>
        </Notice>
      ) : (
        <p className="mb-4 rounded-xl bg-muted/60 px-4 py-3 text-sm tabular">
          {items.length} {plural(items.length, "stavka", "stavke", "stavki")} · ukupno <span className="font-semibold">{formatMoney(totals.total)}</span>
        </p>
      )}
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <CompletionForm
          orderId={o.id}
          vehicleId={v.id}
          receivedDate={o.receivedDate}
          kmIn={o.kmIn}
          workDone={o.workDone}
          openReminders={d.openReminders.map((r) => ({ id: r.id, title: r.title, overdue: r.due.overdue, when: r.due.overdue ? "prekoračen" : describeTarget(r, formatDate) }))}
        />
      </div>
    </div>
  );
}
