"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, FileText, Plus, Receipt, Undo2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, controlCls, fieldAria } from "@/components/form/field";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { useServerForm } from "@/components/use-server-form";
import { formatDate, todayIso } from "@/domain/dates";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/domain/finance";
import { formatMoney } from "@/domain/money";
import type { Payment } from "@/domain/model";
import { makeInvoice, savePayment, voidInvoice, voidPayment } from "../actions";

type Props = {
  orderId: string;
  orderStatus: "open" | "done" | "cancelled";
  total: number;
  paid: number;
  status: PaymentStatus;
  payments: Payment[];
  costs: { id: string; date: string; description: string; amount: number; supplierName?: string }[];
  costTotal: number;
  invoice?: { id: string; number: string; issuedDate: string; total: number };
};

const statusCls: Record<PaymentStatus, string> = {
  none: "text-muted-foreground",
  unpaid: "text-destructive",
  partial: "text-warning",
  paid: "text-success",
  overpaid: "text-warning",
};

export function PaymentPanel({ orderId, orderStatus, total, paid, status, payments, costs, costTotal, invoice }: Props) {
  const router = useRouter();
  const balance = total - paid;
  const profit = total - costTotal;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const { state, onSubmit, pending } = useServerForm(savePayment, { onSuccess: () => setNonce((n) => n + 1) });
  const e = state.errors ?? {};

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    try {
      const err = await fn();
      if (err) setError(err);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[1fr_auto] items-baseline gap-y-1.5 tabular">
        <dt className="text-muted-foreground">Iznos naloga</dt>
        <dd className="text-right text-lg font-semibold">{formatMoney(total)}</dd>
        <dt className="text-muted-foreground">Naplaćeno</dt>
        <dd className="text-right text-lg">{formatMoney(paid)}</dd>
      </dl>
      {balance !== 0 && (
        <dl className="-mt-2 flex items-baseline justify-between gap-3 border-t pt-2 tabular">
          <dt className={cn("text-lg font-semibold", statusCls[status])}>{balance > 0 ? "Duguje" : PAYMENT_STATUS_LABELS[status]}</dt>
          <dd className={cn("text-right text-[1.75rem] leading-tight font-bold", balance > 0 ? "text-destructive" : "text-warning")}>{formatMoney(Math.abs(balance))}</dd>
        </dl>
      )}
      {balance === 0 && total > 0 && (
        <p className="-mt-2 flex items-center gap-1.5 font-semibold text-success">
          <CheckCircle2 className="size-4" aria-hidden />
          {PAYMENT_STATUS_LABELS.paid}
        </p>
      )}
      {error && <Notice variant="error" title={error} />}

      {orderStatus !== "cancelled" && balance <= 0 && !showForm && total > 0 && (
        <Button type="button" variant="ghost" className="-mt-2 self-start" onClick={() => setShowForm(true)}>
          <Wallet aria-hidden />
          Još jedna uplata
        </Button>
      )}
      {orderStatus !== "cancelled" && (balance > 0 || showForm || total <= 0) && (
        <form key={nonce} onSubmit={onSubmit} className="flex flex-col gap-3 rounded-xl bg-muted/50 p-3" noValidate>
          <input type="hidden" name="orderId" value={orderId} />
          {e.form && <p className="text-sm text-destructive">{e.form}</p>}
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9.5rem)] gap-2">
            <Field id={`pay-amount-${nonce}`} label="Iznos (RSD)" error={e.amount}>
              <Input name="amount" inputMode="decimal" defaultValue={balance > 0 ? formatMoney(balance, { currency: false }) : ""} className={`${controlCls} tabular`} {...fieldAria(`pay-amount-${nonce}`, e.amount)} />
            </Field>
            <Field id={`pay-date-${nonce}`} label="Datum" error={e.date}>
              <Input name="date" type="date" defaultValue={todayIso()} max={todayIso()} className={controlCls} {...fieldAria(`pay-date-${nonce}`, e.date)} />
            </Field>
          </div>
          <SubmitButton pending={pending} pendingText="Čuvam…">
            <Wallet aria-hidden />
            Naplati
          </SubmitButton>
        </form>
      )}

      {payments.length > 0 && (
        <ul className="flex flex-col divide-y text-sm" aria-label="Uplate">
          {payments.map((p) => (
            <li key={p.id} className={cn("flex items-center gap-2 py-2", p.cancelledAt && "text-muted-foreground")}>
              <span className="min-w-0 flex-1">
                <span className={cn("font-medium tabular", p.cancelledAt && "line-through")}>{formatMoney(p.amount)}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatDate(p.date)}
                  {p.cancelledAt && ` · poništeno: ${p.cancelReason}`}
                </span>
              </span>
              {!p.cancelledAt && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const reason = prompt(`Razlog poništavanja uplate ${formatMoney(p.amount)}:`);
                    if (reason !== null) void run(() => voidPayment(orderId, p.id, reason));
                  }}
                  aria-label={`Poništi uplatu ${formatMoney(p.amount)}`}
                  className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                >
                  <Undo2 className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <section aria-label="Troškovi naloga" className="flex flex-col gap-2 border-t pt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Troškovi</h3>
          {orderStatus !== "cancelled" && (
            <Button asChild variant="ghost" size="sm" className="h-10">
              <Link href={`/finansije/troskovi/novi?nalog=${orderId}`}>
                <Plus aria-hidden />
                Dodaj
              </Link>
            </Button>
          )}
        </div>
        {costs.length > 0 && (
          <ul className="flex flex-col divide-y text-sm">
            {costs.map((c) => (
              <li key={c.id}>
                <Link href={`/finansije/troskovi/${c.id}`} className="flex items-baseline justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="block truncate">{c.description}</span>
                    <span className="block text-xs text-muted-foreground">{[formatDate(c.date), c.supplierName].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular">{formatMoney(c.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {(costs.length > 0 || total > 0) && (
          <p className="flex items-baseline justify-between border-t pt-2 tabular">
            <span className="text-lg font-semibold">Zarada</span>
            <span className={cn("text-2xl font-bold", profit >= 0 ? "text-success" : "text-destructive")}>{formatMoney(profit)}</span>
          </p>
        )}
      </section>

      {(invoice || orderStatus === "done") && (
        <div className="border-t pt-3">
          {invoice ? (
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" className="justify-start">
                <Link href={`/dokumenti/racun/${invoice.id}`} target="_blank">
                  <FileText aria-hidden />
                  Račun {invoice.number}
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground tabular">
                {formatDate(invoice.issuedDate)} · {formatMoney(invoice.total)}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const reason = prompt(`Razlog poništavanja računa ${invoice.number}:`);
                  if (reason !== null) void run(() => voidInvoice(orderId, invoice.id, reason));
                }}
                className="self-start text-sm font-medium text-destructive"
              >
                Poništi račun
              </button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full justify-start" disabled={busy || total <= 0} onClick={() => void run(() => makeInvoice(orderId))}>
              <Receipt aria-hidden />
              Izdaj račun
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
