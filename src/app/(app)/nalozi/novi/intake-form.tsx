"use client";

import Link from "next/link";
import { useState } from "react";
import { BellRing, Car, Loader2, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, controlCls, fieldAria } from "@/components/form/field";
import { Notice } from "@/components/notice";
import { PlateBadge } from "@/components/plate-badge";
import { SubmitButton } from "@/components/submit-button";
import { useSearch } from "@/components/use-search";
import { useServerForm } from "@/components/use-server-form";
import type { PickedCustomer } from "@/components/customer-picker";
import { COMMON_MAKES } from "@/domain/model";
import { COMMON_COMPLAINTS } from "@/domain/orders";
import { formatPlate, looksLikePlate, normalizePlate } from "@/domain/plate";
import { val } from "@/lib/form-data";
import { saveIntake } from "../actions";
import { OwnerFields } from "../../vozila/owner-fields";

export type IntakeVehicle = {
  id: string;
  plate?: string;
  vin?: string;
  title: string;
  owner?: PickedCustomer | null;
  lastKm?: number;
  openReminders: { title: string; overdue: boolean; when: string }[];
};

export type IntakeAppointment = { id: string; when: string; reason: string; vehicleText?: string; customerName?: string; phone?: string };

export function IntakeForm({
  initialVehicle,
  appointment,
  makes = COMMON_MAKES,
}: {
  initialVehicle?: IntakeVehicle | null;
  appointment?: IntakeAppointment | null;
  makes?: string[];
}) {
  const { state, onSubmit, pending } = useServerForm(saveIntake);
  const e = state.errors ?? {};
  const [vehicle, setVehicle] = useState<IntakeVehicle | null>(initialVehicle ?? null);
  const apptPlate = appointment?.vehicleText && looksLikePlate(appointment.vehicleText) ? formatPlate(normalizePlate(appointment.vehicleText)) : "";
  const [mode, setMode] = useState<"search" | "existing" | "new">(initialVehicle ? "existing" : val(state, "vehicleMode") === "new" || apptPlate ? "new" : "search");
  const [q, setQ] = useState("");
  const [newPlate, setNewPlate] = useState(val(state, "vehicle.plate", apptPlate));
  const [complaint, setComplaint] = useState(val(state, "complaint", appointment?.reason ?? ""));
  const { results, loading, query } = useSearch(mode === "search" ? q : "");

  const [picking, setPicking] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const pickVehicle = async (id: string) => {
    setPicking(id);
    setPickError(null);
    try {
      const r = await fetch(`/api/vozila/${id}/prijem`);
      if (!r.ok) throw new Error();
      setVehicle((await r.json()) as IntakeVehicle);
      setMode("existing");
    } catch {
      setPickError("Vozilo nije učitano. Pokušaj ponovo.");
    } finally {
      setPicking(null);
    }
  };
  const startNew = (plate: string) => {
    setNewPlate(plate ? formatPlate(normalizePlate(plate)) : "");
    setVehicle(null);
    setMode("new");
  };
  const addChip = (c: string) => setComplaint((cur) => (cur.trim() ? `${cur.trim()}, ${c.toLowerCase()}` : c));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="vehicleMode" value={mode === "existing" ? "existing" : "new"} />
      {vehicle && <input type="hidden" name="vehicleId" value={vehicle.id} />}
      {appointment && <input type="hidden" name="appointmentId" value={appointment.id} />}
      {e.form && <Notice variant="error" title={e.form} />}
      {appointment && (
        <Notice variant="info" title={`Prijem iz termina: ${appointment.when}`}>
          {[appointment.reason, appointment.vehicleText, appointment.customerName, appointment.phone].filter(Boolean).join(" · ")}
        </Notice>
      )}

      {/* 1. vozilo */}
      <section className="flex flex-col gap-3" aria-labelledby="s-vozilo">
        <h2 id="s-vozilo" className="flex items-center gap-2 text-lg font-semibold">
          <Car className="size-5 text-muted-foreground" aria-hidden />
          Vozilo
        </h2>

        {mode === "search" && (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={q}
                onChange={(ev) => setQ(ev.target.value)}
                placeholder="Tablica, VIN ili vlasnik"
                aria-label="Pretraga vozila"
                autoFocus
                autoCapitalize="characters"
                autoComplete="off"
                enterKeyHint="search"
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") ev.preventDefault();
                }}
                className="h-14 bg-card pl-11 text-lg uppercase md:text-lg"
              />
            </div>
            {(e.vehicleId || pickError) && <p className="text-sm text-destructive">{pickError ?? e.vehicleId}</p>}
            {query.length >= 2 && (
              <ul className="overflow-hidden rounded-xl border bg-card" aria-live="polite" aria-busy={loading}>
                {results.vehicles.map((v) => (
                  <li key={v.id} className="border-b last:border-b-0">
                    <button type="button" disabled={!!picking} onClick={() => void pickVehicle(v.id)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-60">
                      <PlateBadge plate={v.plate} vin={v.plate ? undefined : v.vin} size="sm" />
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium">{v.title}</span>
                        {v.owner && <span className="text-muted-foreground"> · {v.owner}</span>}
                      </span>
                      {picking === v.id && <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" aria-label="Učitavam" />}
                    </button>
                  </li>
                ))}
                {!loading && results.vehicles.length === 0 && <li className="p-3 text-sm text-muted-foreground">Nema vozila „{query}“ u evidenciji.</li>}
                <li>
                  <button type="button" onClick={() => startNew(looksLikePlate(query) ? query : "")} className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left font-medium text-primary hover:bg-muted">
                    <Plus className="size-5" aria-hidden />
                    {looksLikePlate(query) ? `Novo vozilo ${formatPlate(normalizePlate(query))}` : "Novo vozilo"}
                  </button>
                </li>
              </ul>
            )}
            {query.length < 2 && (
              <Button type="button" variant="ghost" className="self-start" onClick={() => startNew("")}>
                <Plus aria-hidden />
                Vozilo nije u evidenciji
              </Button>
            )}
          </>
        )}

        {mode === "existing" && vehicle && (
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <PlateBadge plate={vehicle.plate} vin={vehicle.plate ? undefined : vehicle.vin} />
              <Button type="button" variant="ghost" onClick={() => { setVehicle(null); setMode("search"); }}>
                <X aria-hidden />
                Promeni
              </Button>
            </div>
            <p className="-mt-1 text-lg font-semibold">{vehicle.title}</p>
            {vehicle.lastKm !== undefined && <p className="text-sm text-muted-foreground tabular">Poslednja kilometraža: {vehicle.lastKm.toLocaleString("sr-Latn-RS")} km</p>}
            {vehicle.openReminders.length > 0 && (
              <div className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
                <p className="flex items-center gap-2 font-semibold">
                  <BellRing className="size-4" aria-hidden />
                  Podsetnici za ovo vozilo
                </p>
                <ul className="mt-1">
                  {vehicle.openReminders.map((r, i) => (
                    <li key={i} className={r.overdue ? "font-medium text-destructive" : undefined}>
                      {r.title} · {r.when}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {mode === "new" && (
          <div className="grid gap-4 rounded-xl border bg-muted/40 p-4 md:grid-cols-2">
            {state.conflictVehicleId && (
              <Notice variant="warning" title="Ovo vozilo je već u evidenciji" className="md:col-span-2">
                <button type="button" className="font-medium text-primary underline underline-offset-4" onClick={() => void pickVehicle(state.conflictVehicleId!)}>
                  Izaberi postojeće vozilo
                </button>
              </Notice>
            )}
            <Field id="v-plate" label="Tablica" error={e["vehicle.plate"]}>
              <div className="flex items-center gap-3">
                <Input name="vehicle.plate" value={newPlate} onChange={(ev) => setNewPlate(ev.target.value)} autoCapitalize="characters" autoComplete="off" autoFocus={!newPlate} className={`${controlCls} uppercase`} {...fieldAria("v-plate", e["vehicle.plate"])} />
                {normalizePlate(newPlate) && <PlateBadge plate={normalizePlate(newPlate)} size="sm" className="hidden sm:inline-flex" />}
              </div>
            </Field>
            <Field id="v-vin" label="VIN" error={e["vehicle.vin"]}>
              <Input name="vehicle.vin" defaultValue={val(state, "vehicle.vin")} autoCapitalize="characters" autoComplete="off" spellCheck={false} className={`${controlCls} font-mono uppercase`} {...fieldAria("v-vin", e["vehicle.vin"])} />
            </Field>
            <Field id="v-make" label="Marka" error={e["vehicle.make"]} required>
              <Input name="vehicle.make" list="intake-makes" defaultValue={val(state, "vehicle.make")} autoComplete="off" autoFocus={!!newPlate} className={controlCls} {...fieldAria("v-make", e["vehicle.make"])} />
              <datalist id="intake-makes">
                {makes.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <Field id="v-model" label="Model" error={e["vehicle.model"]}>
                <Input name="vehicle.model" defaultValue={val(state, "vehicle.model")} autoComplete="off" className={controlCls} {...fieldAria("v-model", e["vehicle.model"])} />
              </Field>
              <Field id="v-year" label="Godište" error={e["vehicle.year"]}>
                <Input name="vehicle.year" inputMode="numeric" defaultValue={val(state, "vehicle.year")} className={controlCls} {...fieldAria("v-year", e["vehicle.year"])} />
              </Field>
            </div>
            <Button type="button" variant="ghost" className="justify-self-start md:col-span-2" onClick={() => setMode("search")}>
              <Search aria-hidden />
              Ipak potraži postojeće vozilo
            </Button>
          </div>
        )}
      </section>

      {/* 2. klijent */}
      {mode !== "search" && (
        <section className="flex flex-col gap-3 border-t pt-6" aria-label="Klijent">
          <OwnerFields
            key={vehicle?.id ?? "new"}
            state={state}
            keepOwner={mode === "existing" ? vehicle?.owner : null}
            allowNone={false}
            label="Klijent"
            initialNew={appointment ? { name: appointment.customerName, phone: appointment.phone } : undefined}
          />
        </section>
      )}

      {/* 3. nalog */}
      {mode !== "search" && (
        <section className="flex flex-col gap-4 border-t pt-6" aria-label="Nalog">
          <Field id="kmIn" label="Kilometraža" error={e.kmIn} hint={vehicle?.lastKm !== undefined ? `Poslednja: ${vehicle.lastKm.toLocaleString("sr-Latn-RS")} km` : undefined} className="max-w-xs">
            <Input name="kmIn" inputMode="numeric" defaultValue={val(state, "kmIn")} placeholder="184250" className={`${controlCls} tabular`} {...fieldAria("kmIn", e.kmIn, undefined, vehicle?.lastKm !== undefined ? "hint" : undefined)} />
          </Field>
          <Field id="complaint" label="Šta mušterija prijavljuje / šta treba uraditi" error={e.complaint} required>
            <Textarea name="complaint" rows={3} value={complaint} onChange={(ev) => setComplaint(ev.target.value)} className="bg-card text-base md:text-base" {...fieldAria("complaint", e.complaint)} />
          </Field>
          <div className="-mt-2 flex flex-wrap gap-1.5" aria-label="Česti razlozi">
            {COMMON_COMPLAINTS.map((c) => (
              <button key={c} type="button" onClick={() => addChip(c)} className="min-h-9 rounded-full border bg-card px-3 text-sm hover:bg-muted">
                {c}
              </button>
            ))}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button asChild variant="outline" size="xl">
              <Link href="/nalozi">Odustani</Link>
            </Button>
            <SubmitButton pending={pending} pendingText="Otvaram…">
              {state.duplicates?.length ? "Ipak sačuvaj i otvori nalog" : "Otvori nalog"}
            </SubmitButton>
          </div>
        </section>
      )}
    </form>
  );
}
