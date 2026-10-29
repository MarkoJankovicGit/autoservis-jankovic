"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CustomerPicker, type PickedCustomer } from "@/components/customer-picker";
import { Field, Segmented, controlCls, fieldAria } from "@/components/form/field";
import { Notice } from "@/components/notice";
import { val, type FormState } from "@/lib/form-data";
import { formatPhone } from "@/domain/phone";

/**
 * Vlasnik vozila / klijent naloga: postojeći klijent, novi klijent (ime + telefon) ili bez vlasnika.
 * Sa `keepOwner` prva opcija je trenutni vlasnik iz kartona (prijem vozila koje već ima vlasnika).
 */
export function OwnerFields({
  state,
  initial,
  allowNone = true,
  defaultMode,
  keepOwner,
  label = "Vlasnik",
  initialNew,
}: {
  state: FormState;
  initial?: PickedCustomer | null;
  allowNone?: boolean;
  defaultMode?: "existing" | "new" | "none" | "keep";
  keepOwner?: PickedCustomer | null;
  label?: string;
  /** predlog za „Novi klijent“ (npr. ime i telefon iz zakazanog termina) */
  initialNew?: { name?: string; phone?: string };
}) {
  const e = state.errors ?? {};
  const [mode, setMode] = useState(val(state, "ownerMode", defaultMode ?? (keepOwner ? "keep" : initial ? "existing" : "new")));
  const [ctype, setCtype] = useState(val(state, "customer.type", "person"));
  const options = [
    ...(keepOwner ? [{ value: "keep", label: "Vlasnik iz kartona" }] : []),
    { value: "existing", label: keepOwner ? "Drugi klijent" : "Postojeći klijent" },
    { value: "new", label: "Novi klijent" },
    ...(allowNone ? [{ value: "none", label: "Bez vlasnika" }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <Segmented name="ownerMode" label={label} value={mode} onChange={setMode} options={options} />

      {mode === "keep" && keepOwner && (
        <div className="rounded-xl border bg-card p-3">
          <p className="font-medium">{keepOwner.name}</p>
          {keepOwner.phone && <p className="text-sm text-muted-foreground tabular">{formatPhone(keepOwner.phone)}</p>}
        </div>
      )}
      {mode === "existing" && keepOwner && (
        <p className="-mt-2 text-sm text-muted-foreground">Vlasnik u kartonu ostaje {keepOwner.name}. Ako je vozilo prodato, promeni vlasnika na kartonu.</p>
      )}
      {e.owner && mode !== "existing" && <p className="-mt-2 text-sm text-destructive">{e.owner}</p>}

      {mode === "existing" && <CustomerPicker initial={initial} error={e.owner} />}

      {mode === "new" && (
        <div className="grid gap-4 rounded-xl border bg-muted/40 p-4 md:grid-cols-2">
          <input type="hidden" name="force" value={state.duplicates?.length ? "1" : ""} />
          {state.duplicates?.length ? (
            <Notice variant="warning" title="Možda ovaj klijent već postoji" className="md:col-span-2">
              <ul className="mt-1">
                {state.duplicates.map((d) => (
                  <li key={d.id}>
                    <Link href={`/klijenti/${d.id}`} target="_blank" className="font-medium text-primary underline underline-offset-4">
                      {d.name}
                    </Link>{" "}
                    ({d.reason})
                  </li>
                ))}
              </ul>
              <p className="mt-2">Izaberi „Postojeći klijent“ ili sačuvaj ponovo ako je ipak novi.</p>
            </Notice>
          ) : null}
          <div className="md:col-span-2">
            <Segmented
              name="customer.type"
              label="Tip"
              value={ctype}
              onChange={setCtype}
              options={[
                { value: "person", label: "Fizičko lice" },
                { value: "company", label: "Firma" },
              ]}
            />
          </div>
          <Field id="customer-name" label={ctype === "company" ? "Naziv firme" : "Ime i prezime"} error={e["customer.name"]} required>
            <Input name="customer.name" defaultValue={val(state, "customer.name", initialNew?.name)} autoComplete="off" className={controlCls} {...fieldAria("customer-name", e["customer.name"])} />
          </Field>
          <Field id="customer-phone" label="Telefon" error={e["customer.phones.0"]} required>
            <Input
              name="customer.phones[]"
              type="tel"
              inputMode="tel"
              defaultValue={([] as string[]).concat(state.values?.["customer.phones[]"] ?? [])[0] ?? initialNew?.phone ?? ""}
              autoComplete="off"
              className={controlCls}
              placeholder="064 123 4567" {...fieldAria("customer-phone", e["customer.phones.0"])}
            />
          </Field>
        </div>
      )}
    </div>
  );
}
