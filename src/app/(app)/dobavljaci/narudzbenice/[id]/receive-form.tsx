"use client";

import { useState } from "react";
import { PackageCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { useServerForm } from "@/components/use-server-form";
import { formatMoney, formatQuantity } from "@/domain/money";
import type { PartsOrderLine } from "@/domain/model";
import { saveReceipt } from "../../actions";

/** Prijem robe: po redu stigla količina, nabavna i prodajna cena; opciono u nalog i kao trošak. */
export function ReceiveForm({ id, orderId, orderOpen, orderNumber, hasSupplier, lines }: { id: string; orderId?: string; orderOpen: boolean; orderNumber?: string; hasSupplier: boolean; lines: PartsOrderLine[] }) {
  const [nonce, setNonce] = useState(0);
  const { state, onSubmit, pending } = useServerForm(saveReceipt, { onSuccess: () => setNonce((n) => n + 1) });
  const e = state.errors ?? {};
  const open = lines.filter((l) => l.receivedMilli < l.qtyMilli);

  return (
    <form key={nonce} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="id" value={id} />
      {orderId && <input type="hidden" name="orderId" value={orderId} />}
      {e.form && <Notice variant="error" title={e.form} />}
      {state.message && <Notice variant="success" title={state.message} />}
      <ul className="flex flex-col gap-3">
        {open.map((l, i) => {
          const left = l.qtyMilli - l.receivedMilli;
          return (
            <li key={l.id} className="rounded-xl border bg-muted/40 p-3">
              <input type="hidden" name="rcv.lineId[]" value={l.id} />
              <p className="font-medium">
                {l.name}
                {l.partNumber && <span className="font-mono text-sm text-muted-foreground"> · {l.partNumber}</span>}
              </p>
              <p className="mb-2 text-sm text-muted-foreground tabular">
                Naručeno {formatQuantity(l.qtyMilli)}
                {l.receivedMilli > 0 && `, stiglo ${formatQuantity(l.receivedMilli)}`}
                {l.receivedCost !== undefined && ` · poslednja nabavna ${formatMoney(l.receivedCost)}`}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span>Stiglo</span>
                  <Input name="rcv.qty[]" inputMode="decimal" defaultValue={formatQuantity(left)} aria-invalid={e[`rows.${i}.qty`] ? true : undefined} className="h-11 bg-card text-base tabular" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>Nabavna / kom</span>
                  <Input name="rcv.cost[]" inputMode="decimal" placeholder="0,00" aria-invalid={e[`rows.${i}.cost`] ? true : undefined} className="h-11 bg-card text-base tabular" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>Cena za kupca</span>
                  <Input name="rcv.price[]" inputMode="decimal" placeholder="= nabavna" aria-invalid={e[`rows.${i}.price`] ? true : undefined} className="h-11 bg-card text-base tabular" />
                </label>
              </div>
              {[e[`rows.${i}.qty`], e[`rows.${i}.cost`], e[`rows.${i}.price`]].filter(Boolean).map((m) => (
                <p key={m} className="mt-1 text-sm text-destructive">
                  {m}
                </p>
              ))}
            </li>
          );
        })}
      </ul>

      <fieldset className="flex flex-col gap-1 rounded-xl border p-3">
        <legend className="px-1 text-sm font-medium">Šta još uraditi</legend>
        {orderId && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" name="addToOrder" value="1" defaultChecked={orderOpen} disabled={!orderOpen} className="size-5 accent-[var(--color-primary)]" />
            <span>
              Dodaj delove u nalog {orderNumber}
              {!orderOpen && <span className="block text-xs text-muted-foreground">Nalog nije u radu; vrati ga u rad da bi delovi ušli u njega.</span>}
            </span>
          </label>
        )}
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" name="createExpense" value="1" defaultChecked className="size-5 accent-[var(--color-primary)]" />
          <span>Upiši trošak ka dobavljaču (zbir nabavnih cena){!hasSupplier && " — bez dobavljača"}</span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" name="paid" value="1" className="size-5 accent-[var(--color-primary)]" />
          <span>Plaćeno odmah</span>
        </label>
      </fieldset>

      <SubmitButton pending={pending} className="self-start">
        <PackageCheck aria-hidden />
        Evidentiraj prijem
      </SubmitButton>
    </form>
  );
}
