"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, controlCls, fieldAria } from "@/components/form/field";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { useServerForm } from "@/components/use-server-form";
import { formatPhone } from "@/domain/phone";
import type { Supplier } from "@/domain/model";
import { val } from "@/lib/form-data";
import { saveSupplier } from "./actions";

export function SupplierForm({ supplier, cancelHref }: { supplier?: Supplier; cancelHref: string }) {
  const { state, onSubmit, pending } = useServerForm(saveSupplier);
  const e = state.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {supplier && <input type="hidden" name="id" value={supplier.id} />}
      {e.form && <Notice variant="error" title={e.form} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="sup-name" label="Naziv" error={e.name} required className="sm:col-span-2">
          <Input name="name" defaultValue={val(state, "name", supplier?.name)} autoFocus={!supplier} autoComplete="organization" className={controlCls} {...fieldAria("sup-name", e.name)} />
        </Field>
        <Field id="sup-phone" label="Telefon" error={e.phone}>
          <Input name="phone" type="tel" inputMode="tel" defaultValue={val(state, "phone", supplier?.phone ? formatPhone(supplier.phone) : "")} className={controlCls} {...fieldAria("sup-phone", e.phone)} />
        </Field>
        <Field id="sup-email" label="Email" error={e.email}>
          <Input name="email" type="email" inputMode="email" defaultValue={val(state, "email", supplier?.email)} className={controlCls} {...fieldAria("sup-email", e.email)} />
        </Field>
        <Field id="sup-contact" label="Kontakt osoba" error={e.contactPerson}>
          <Input name="contactPerson" defaultValue={val(state, "contactPerson", supplier?.contactPerson)} className={controlCls} {...fieldAria("sup-contact", e.contactPerson)} />
        </Field>
        <Field id="sup-note" label="Napomena" error={e.note} className="sm:col-span-2">
          <Textarea name="note" rows={2} defaultValue={val(state, "note", supplier?.note)} placeholder="dostava do 14h, popust 10 %" className="bg-card text-base md:text-base" {...fieldAria("sup-note", e.note)} />
        </Field>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="xl">
          <Link href={cancelHref}>Odustani</Link>
        </Button>
        <SubmitButton pending={pending}>Sačuvaj dobavljača</SubmitButton>
      </div>
    </form>
  );
}
