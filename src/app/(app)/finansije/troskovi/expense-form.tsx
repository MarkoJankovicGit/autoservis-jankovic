"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardList, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, Segmented, controlCls, fieldAria } from "@/components/form/field";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { useServerForm } from "@/components/use-server-form";
import { todayIso } from "@/domain/dates";
import { EXPENSE_CATEGORIES, EXPENSE_KIND_LABELS, EXPENSE_KINDS, expenseKind, type ExpenseKind } from "@/domain/finance";
import { formatMoney } from "@/domain/money";
import type { Expense } from "@/domain/model";
import { val } from "@/lib/form-data";
import { saveExpense } from "../actions";

export type ExpenseOrder = { id: string; number: string; label: string };

export function ExpenseForm({
  expense,
  suppliers,
  defaultSupplierId,
  defaultKind,
  order,
  back,
}: {
  expense?: Expense;
  suppliers: { id: string; name: string }[];
  defaultSupplierId?: string;
  defaultKind?: ExpenseKind;
  /** nalog za koji je trošak (dolazi sa naloga ili iz postojećeg troška) */
  order?: ExpenseOrder;
  back: string;
}) {
  const { state, onSubmit, pending } = useServerForm(saveExpense);
  const e = state.errors ?? {};
  const [kind, setKind] = useState<ExpenseKind>(
    (val(state, "kind") as ExpenseKind) || (expense ? expenseKind(expense.category) : (defaultKind ?? "cost")),
  );
  const initialCategory = val(state, "category", expense?.category ?? (order || defaultSupplierId ? "parts" : ""));
  const [category, setCategory] = useState(initialCategory);
  const [paid, setPaid] = useState(state.values ? val(state, "paid") === "1" : expense ? !!expense.paidDate : true);
  const [linked, setLinked] = useState(order);
  const options = EXPENSE_CATEGORIES.filter((c) => c.kind === kind);
  const hasMore = !!(expense?.supplierId || expense?.documentNo || expense?.note || defaultSupplierId || !paid);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="orderId" value={linked?.id ?? ""} />
      {e.form && <Notice variant="error" title={e.form} />}

      {linked && (
        <p className="flex items-center gap-2 self-start rounded-full border bg-accent/60 py-1 pr-1 pl-3 text-sm font-medium">
          <ClipboardList className="size-4 text-muted-foreground" aria-hidden />
          Nalog {linked.number} · {linked.label}
          <button type="button" onClick={() => setLinked(undefined)} aria-label="Ukloni vezu sa nalogom" className="inline-flex size-8 items-center justify-center rounded-full hover:bg-muted">
            <X className="size-4" aria-hidden />
          </button>
        </p>
      )}

      <Segmented
        name="kind"
        label="Vrsta"
        value={kind}
        onChange={(v) => {
          setKind(v as ExpenseKind);
          if (!EXPENSE_CATEGORIES.some((c) => c.key === category && c.kind === v)) setCategory("");
        }}
        options={EXPENSE_KINDS.map((k) => ({ value: k, label: EXPENSE_KIND_LABELS[k] }))}
      />

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">
          Kategorija<span className="text-destructive" aria-hidden> *</span>
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-invalid={e.category ? true : undefined} aria-describedby={e.category ? "ex-category-error" : undefined}>
          {options.map((c) => (
            <label
              key={c.key}
              className={cn(
                "flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                category === c.key ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              <input type="radio" name="category" value={c.key} checked={category === c.key} onChange={() => setCategory(c.key)} className="sr-only" />
              {c.label}
            </label>
          ))}
        </div>
        {e.category && (
          <p id="ex-category-error" className="mt-1.5 text-sm text-destructive">
            {e.category}
          </p>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)]">
        <Field id="ex-desc" label="Opis" error={e.description} required>
          <Input name="description" defaultValue={val(state, "description", expense?.description)} placeholder={kind === "investment" ? "Dizalica" : "Ulje 5W30, 20 l"} className={controlCls} {...fieldAria("ex-desc", e.description)} />
        </Field>
        <Field id="ex-amount" label="Iznos (RSD)" error={e.amount} required>
          <Input name="amount" inputMode="decimal" defaultValue={val(state, "amount", expense ? formatMoney(expense.amount, { currency: false }) : "")} className={`${controlCls} tabular`} {...fieldAria("ex-amount", e.amount)} />
        </Field>
        <Field id="ex-date" label="Datum" error={e.date}>
          <Input name="date" type="date" defaultValue={val(state, "date", expense?.date ?? todayIso())} className={controlCls} {...fieldAria("ex-date", e.date)} />
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end sm:pb-0.5">
          <input type="checkbox" name="paid" value="1" checked={paid} onChange={(ev) => setPaid(ev.target.checked)} className="size-5 accent-[var(--color-primary)]" />
          <span className="font-medium">Plaćeno</span>
        </label>
      </div>
      {paid && <input type="hidden" name="paidDate" value={val(state, "paidDate", expense?.paidDate ?? "")} />}

      <details open={hasMore} className="group rounded-xl border">
        <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-semibold marker:text-muted-foreground">Dobavljač i račun</summary>
        <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
          <Field id="ex-supplier" label="Dobavljač" error={e.supplierId}>
            <NativeSelect name="supplierId" defaultValue={val(state, "supplierId", expense?.supplierId ?? defaultSupplierId ?? "")} {...fieldAria("ex-supplier", e.supplierId)}>
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="ex-doc" label="Broj računa" error={e.documentNo}>
            <Input name="documentNo" defaultValue={val(state, "documentNo", expense?.documentNo)} autoComplete="off" className={controlCls} {...fieldAria("ex-doc", e.documentNo)} />
          </Field>
          {!paid && (
            <Field id="ex-due" label="Rok plaćanja" error={e.dueDate}>
              <Input name="dueDate" type="date" defaultValue={val(state, "dueDate", expense?.dueDate)} className={controlCls} {...fieldAria("ex-due", e.dueDate)} />
            </Field>
          )}
          <Field id="ex-note" label="Napomena" error={e.note} className="sm:col-span-2">
            <Textarea name="note" rows={2} defaultValue={val(state, "note", expense?.note)} className="bg-card text-base md:text-base" {...fieldAria("ex-note", e.note)} />
          </Field>
        </div>
      </details>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="xl">
          <Link href={back}>Odustani</Link>
        </Button>
        <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
      </div>
    </form>
  );
}
