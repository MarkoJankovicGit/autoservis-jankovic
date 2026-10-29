"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, Segmented, controlCls, fieldAria } from "@/components/form/field";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { formatPhone } from "@/domain/phone";
import type { Customer } from "@/domain/model";
import { val } from "@/lib/form-data";
import { useServerForm } from "@/components/use-server-form";
import { saveCustomer } from "./actions";

export function CustomerForm({ customer, cancelHref }: { customer?: Customer; cancelHref: string }) {
  const { state, onSubmit, pending } = useServerForm(saveCustomer);
  const e = state.errors ?? {};
  const initialPhones = state.values?.["phones[]"]
    ? ([] as string[]).concat(state.values["phones[]"])
    : customer?.phones.length
      ? customer.phones.map((p) => formatPhone(p.e164))
      : [""];
  const [type, setType] = useState(val(state, "type", customer?.type ?? "person"));
  const [phones, setPhones] = useState<string[]>(initialPhones);
  const isCompany = type === "company";
  const force = state.duplicates?.length ? "1" : "";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <input type="hidden" name="force" value={force} />

      {e.form && <Notice variant="error" title={e.form} />}
      {state.duplicates?.length ? (
        <Notice variant="warning" title="Možda ovaj klijent već postoji">
          <ul className="mt-1 flex flex-col gap-1">
            {state.duplicates.map((d) => (
              <li key={d.id}>
                <Link href={`/klijenti/${d.id}`} className="font-medium text-primary underline underline-offset-4">
                  {d.name}
                </Link>{" "}
                ({d.reason})
              </li>
            ))}
          </ul>
          <p className="mt-2">Ako je ipak novi klijent, klikni „Ipak sačuvaj“.</p>
        </Notice>
      ) : null}

      <Segmented
        name="type"
        label="Tip klijenta"
        value={type}
        onChange={setType}
        options={[
          { value: "person", label: "Fizičko lice" },
          { value: "company", label: "Firma" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field id="name" label={isCompany ? "Naziv firme" : "Ime i prezime"} error={e.name} required className="md:col-span-2">
          <Input
            name="name"
            defaultValue={val(state, "name", customer?.name)}
            autoComplete={isCompany ? "organization" : "name"}
            autoFocus={!customer}
            className={controlCls}
            {...fieldAria("name", e.name)}
          />
        </Field>

        <div className="flex flex-col gap-3 md:col-span-2">
          {phones.map((p, i) => (
            <Field key={i} id={`phone-${i}`} label={i === 0 ? "Telefon" : `Telefon ${i + 1}`} error={e[`phones.${i}`]}>
              <div className="flex gap-2">
                <Input
                  name="phones[]"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={p}
                  onChange={(ev) => setPhones((all) => all.map((x, j) => (j === i ? ev.target.value : x)))}
                  className={controlCls}
                  {...fieldAria(`phone-${i}`, e[`phones.${i}`])}
                />
                {phones.length > 1 && (
                  <Button type="button" variant="outline" size="icon-lg" className="size-11" aria-label="Ukloni telefon" onClick={() => setPhones((all) => all.filter((_, j) => j !== i))}>
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </div>
            </Field>
          ))}
          {phones.length < 4 && (
            <Button type="button" variant="ghost" className="self-start" onClick={() => setPhones((all) => [...all, ""])}>
              <Plus aria-hidden />
              Dodaj još jedan telefon
            </Button>
          )}
        </div>

        <Field id="email" label="Email" error={e.email}>
          <Input name="email" type="email" inputMode="email" autoComplete="email" defaultValue={val(state, "email", customer?.email)} className={controlCls} {...fieldAria("email", e.email)} />
        </Field>

        {isCompany && (
          <Field id="taxId" label="PIB" error={e.taxId}>
            <Input name="taxId" inputMode="numeric" defaultValue={val(state, "taxId", customer?.taxId)} className={controlCls} {...fieldAria("taxId", e.taxId)} />
          </Field>
        )}

        <Field id="address" label="Adresa" error={e.address} className={isCompany ? "md:col-span-2" : undefined}>
          <Input name="address" autoComplete="street-address" defaultValue={val(state, "address", customer?.address)} className={controlCls} {...fieldAria("address", e.address)} />
        </Field>

        <Field id="note" label="Napomena" error={e.note} className="md:col-span-2">
          <Textarea name="note" rows={3} defaultValue={val(state, "note", customer?.note)} className="bg-card text-base md:text-base" {...fieldAria("note", e.note)} />
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="xl">
          <Link href={cancelHref}>Odustani</Link>
        </Button>
        <SubmitButton pending={pending}>{force ? "Ipak sačuvaj" : "Sačuvaj"}</SubmitButton>
      </div>
    </form>
  );
}
