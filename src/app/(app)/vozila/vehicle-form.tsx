"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, controlCls, fieldAria } from "@/components/form/field";
import { Notice } from "@/components/notice";
import { PlateBadge } from "@/components/plate-badge";
import { SubmitButton } from "@/components/submit-button";
import type { PickedCustomer } from "@/components/customer-picker";
import { COMMON_MAKES, FUEL_LABELS, FUELS, type Vehicle } from "@/domain/model";
import { formatPlate, normalizePlate } from "@/domain/plate";
import { val } from "@/lib/form-data";
import { useServerForm } from "@/components/use-server-form";
import { saveVehicle } from "./actions";
import { OwnerFields } from "./owner-fields";

export function VehicleForm({
  vehicle,
  initialOwner,
  initialPlate,
  cancelHref,
  makes = COMMON_MAKES,
}: {
  vehicle?: Vehicle;
  initialOwner?: PickedCustomer | null;
  initialPlate?: string;
  cancelHref: string;
  makes?: string[];
}) {
  const { state, onSubmit, pending } = useServerForm(saveVehicle);
  const e = state.errors ?? {};
  const w = state.warnings ?? {};
  const [plate, setPlate] = useState(val(state, "plate", vehicle?.plate ? formatPlate(vehicle.plate) : (initialPlate ?? "")));
  const preview = normalizePlate(plate);
  const isNew = !vehicle;
  const year = new Date().getFullYear();

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {vehicle && <input type="hidden" name="id" value={vehicle.id} />}
      {e.form && <Notice variant="error" title={e.form} />}
      {state.conflictVehicleId && (
        <Notice variant="warning" title="Ovo vozilo je već u evidenciji">
          <Link href={`/vozila/${state.conflictVehicleId}`} className="font-medium text-primary underline underline-offset-4">
            Otvori karton postojećeg vozila
          </Link>
        </Notice>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field id="plate" label="Registarska tablica" error={e.plate}>
          <Input
            name="plate"
            value={plate}
            onChange={(ev) => setPlate(ev.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            autoFocus={isNew && !initialPlate}
            className={`${controlCls} uppercase`}
            {...fieldAria("plate", e.plate)}
          />
        </Field>
        <div className="flex items-end pb-1 md:pb-7" aria-hidden>
          {preview && <PlateBadge plate={preview} size="md" />}
        </div>

        <Field id="vin" label="VIN / broj šasije" error={e.vin} warning={w.vin}>
          <Input name="vin" defaultValue={val(state, "vin", vehicle?.vin)} autoCapitalize="characters" autoComplete="off" spellCheck={false} className={`${controlCls} font-mono uppercase`} {...fieldAria("vin", e.vin, w.vin)} />
        </Field>
        <Field id="make" label="Marka" error={e.make} required>
          <Input name="make" list="makes" defaultValue={val(state, "make", vehicle?.make)} autoComplete="off" className={controlCls} {...fieldAria("make", e.make)} />
          <datalist id="makes">
            {makes.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
        <Field id="model" label="Model" error={e.model}>
          <Input name="model" defaultValue={val(state, "model", vehicle?.model)} autoComplete="off" placeholder="Golf 4" className={controlCls} {...fieldAria("model", e.model)} />
        </Field>
        <Field id="year" label="Godište" error={e.year}>
          <Input name="year" inputMode="numeric" defaultValue={val(state, "year", vehicle?.year?.toString())} placeholder={String(year - 10)} className={controlCls} {...fieldAria("year", e.year)} />
        </Field>
        <Field id="fuel" label="Gorivo" error={e.fuel}>
          <NativeSelect name="fuel" defaultValue={val(state, "fuel", vehicle?.fuel ?? "")} {...fieldAria("fuel", e.fuel)}>
            <option value="">—</option>
            {FUELS.map((f) => (
              <option key={f} value={f}>
                {FUEL_LABELS[f]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="engine" label="Motor" error={e.engine}>
          <Input name="engine" defaultValue={val(state, "engine", vehicle?.engine)} placeholder="1.9 TDI" autoComplete="off" className={controlCls} {...fieldAria("engine", e.engine)} />
        </Field>
        <Field id="powerKw" label="Snaga (kW)" error={e.powerKw}>
          <Input name="powerKw" inputMode="numeric" defaultValue={val(state, "powerKw", vehicle?.powerKw?.toString())} placeholder="77" className={`${controlCls} tabular`} {...fieldAria("powerKw", e.powerKw)} />
        </Field>
        <Field id="color" label="Boja" error={e.color}>
          <Input name="color" defaultValue={val(state, "color", vehicle?.color)} autoComplete="off" className={controlCls} {...fieldAria("color", e.color)} />
        </Field>
        <Field id="registrationExpires" label="Registracija ističe" error={e.registrationExpires}>
          <Input name="registrationExpires" type="date" defaultValue={val(state, "registrationExpires", vehicle?.registrationExpires)} className={controlCls} {...fieldAria("registrationExpires", e.registrationExpires)} />
        </Field>
        {isNew && (
          <Field id="km" label="Kilometraža danas" error={e.km}>
            <Input name="km" inputMode="numeric" defaultValue={val(state, "km")} placeholder="184250" className={`${controlCls} tabular`} {...fieldAria("km", e.km)} />
          </Field>
        )}
        <Field id="note" label="Napomena" error={e.note} className="md:col-span-2">
          <Textarea name="note" rows={2} defaultValue={val(state, "note", vehicle?.note)} className="bg-card text-base md:text-base" {...fieldAria("note", e.note)} />
        </Field>
      </div>

      {isNew && (
        <section className="flex flex-col gap-3 border-t pt-6">
          <OwnerFields state={state} initial={initialOwner} />
        </section>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="xl">
          <Link href={cancelHref}>Odustani</Link>
        </Button>
        <SubmitButton pending={pending}>{state.duplicates?.length ? "Ipak sačuvaj" : "Sačuvaj vozilo"}</SubmitButton>
      </div>
    </form>
  );
}
