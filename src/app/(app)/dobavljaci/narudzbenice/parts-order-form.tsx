"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, controlCls, fieldAria } from "@/components/form/field";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { useServerForm } from "@/components/use-server-form";
import { formatQuantity } from "@/domain/money";
import type { PartsOrder } from "@/domain/model";
import { val } from "@/lib/form-data";
import { savePartsOrder } from "../actions";

type Line = { key: number; name: string; qty: string; note: string };

export function PartsOrderForm({
  partsOrder,
  orderId,
  suppliers,
  defaultSupplierId,
  cancelHref,
}: {
  partsOrder?: PartsOrder;
  orderId?: string;
  suppliers: { id: string; name: string }[];
  defaultSupplierId?: string;
  cancelHref: string;
}) {
  const { state, onSubmit, pending } = useServerForm(savePartsOrder);
  const e = state.errors ?? {};
  const [lines, setLines] = useState<Line[]>(() =>
    partsOrder?.lines.length
      ? partsOrder.lines.map((l, i) => ({ key: i, name: l.name, qty: formatQuantity(l.qtyMilli), note: l.note ?? "" }))
      : [{ key: 0, name: "", qty: "1", note: "" }],
  );
  const [seq, setSeq] = useState(lines.length);
  const patch = (key: number, p: Partial<Line>) => setLines((all) => all.map((l) => (l.key === key ? { ...l, ...p } : l)));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {partsOrder && <input type="hidden" name="id" value={partsOrder.id} />}
      {orderId && <input type="hidden" name="orderId" value={orderId} />}
      {e.form && <Notice variant="error" title={e.form} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="po-supplier" label="Dobavljač" error={e.supplierId}>
          <NativeSelect name="supplierId" defaultValue={val(state, "supplierId", partsOrder?.supplierId ?? defaultSupplierId ?? "")} {...fieldAria("po-supplier", e.supplierId)}>
            <option value="">—</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="po-needed" label="Treba nam do" error={e.neededBy}>
          <Input name="neededBy" type="date" defaultValue={val(state, "neededBy", partsOrder?.neededBy)} className={controlCls} {...fieldAria("po-needed", e.neededBy)} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">Delovi</legend>
        {lines.map((l, i) => (
          <div key={l.key} className="grid grid-cols-[minmax(0,1fr)_5rem_auto] gap-3 rounded-xl border bg-muted/40 p-3">
            <Field id={`ln-${l.key}-name`} label="Deo" error={e[`lines.${i}.name`]}>
              <Input name="line.name[]" value={l.name} onChange={(ev) => patch(l.key, { name: ev.target.value })} placeholder="Krajnik spone desni" className={controlCls} {...fieldAria(`ln-${l.key}-name`, e[`lines.${i}.name`])} />
            </Field>
            <Field id={`ln-${l.key}-qty`} label="Kol." error={e[`lines.${i}.qty`]}>
              <Input name="line.qty[]" inputMode="decimal" value={l.qty} onChange={(ev) => patch(l.key, { qty: ev.target.value })} className={`${controlCls} tabular`} {...fieldAria(`ln-${l.key}-qty`, e[`lines.${i}.qty`])} />
            </Field>
            <div className="flex items-end">
              {lines.length > 1 && (
                <Button type="button" variant="ghost" size="icon-lg" className="size-11 text-muted-foreground" aria-label={`Ukloni ${l.name || `red ${i + 1}`}`} onClick={() => setLines((all) => all.filter((x) => x.key !== l.key))}>
                  <Trash2 aria-hidden />
                </Button>
              )}
            </div>
            <Field id={`ln-${l.key}-note`} label="Napomena" error={e[`lines.${i}.note`]} className="col-span-3">
              <Input name="line.note[]" value={l.note} onChange={(ev) => patch(l.key, { note: ev.target.value })} placeholder="Original, sa senzorom" className={controlCls} {...fieldAria(`ln-${l.key}-note`, e[`lines.${i}.note`])} />
            </Field>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => {
            setLines((all) => [...all, { key: seq, name: "", qty: "1", note: "" }]);
            setSeq((s) => s + 1);
          }}
        >
          <Plus aria-hidden />
          Još jedan deo
        </Button>
      </fieldset>

      <Field id="po-note" label="Napomena za dobavljača" error={e.note}>
        <Textarea name="note" rows={2} defaultValue={val(state, "note", partsOrder?.note)} className="bg-card text-base md:text-base" {...fieldAria("po-note", e.note)} />
      </Field>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="xl">
          <Link href={cancelHref}>Odustani</Link>
        </Button>
        <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
      </div>
    </form>
  );
}
