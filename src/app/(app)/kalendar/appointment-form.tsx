"use client";

import Link from "next/link";
import { useState } from "react";
import { Car, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, Segmented, controlCls, fieldAria } from "@/components/form/field";
import { Notice } from "@/components/notice";
import { PlateBadge } from "@/components/plate-badge";
import { SubmitButton } from "@/components/submit-button";
import { useSearch } from "@/components/use-search";
import { useServerForm } from "@/components/use-server-form";
import { DURATIONS, formatDuration, formatTime, timeOptions } from "@/domain/appointments";
import { COMMON_COMPLAINTS } from "@/domain/orders";
import { formatPhone } from "@/domain/phone";
import type { Appointment } from "@/domain/model";
import { val } from "@/lib/form-data";
import { saveAppointment } from "./actions";

export type PickedVehicle = { id: string; plate?: string; vin?: string; title: string; owner?: { id: string; name: string; phone?: string } | null };

export function AppointmentForm({
  appointment,
  initialVehicle,
  initialDate,
  initialTime,
  initialReason,
  cancelHref,
}: {
  appointment?: Appointment;
  initialVehicle?: PickedVehicle | null;
  initialDate: string;
  initialTime?: string;
  initialReason?: string;
  cancelHref: string;
}) {
  const { state, onSubmit, pending } = useServerForm(saveAppointment);
  const e = state.errors ?? {};
  const [vehicle, setVehicle] = useState<PickedVehicle | null>(initialVehicle ?? null);
  const [mode, setMode] = useState(val(state, "mode", vehicle || !appointment ? "existing" : appointment.vehicleId ? "existing" : "text"));
  const [q, setQ] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  const [reason, setReason] = useState(val(state, "reason", appointment?.reason ?? initialReason ?? ""));
  const { results, loading, query } = useSearch(mode === "existing" && !vehicle ? q : "");

  const pick = async (id: string) => {
    setPicking(id);
    try {
      const r = await fetch(`/api/vozila/${id}/prijem`);
      if (r.ok) setVehicle((await r.json()) as PickedVehicle);
    } finally {
      setPicking(null);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {appointment && <input type="hidden" name="id" value={appointment.id} />}
      {e.form && <Notice variant="error" title={e.form} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field id="ap-date" label="Datum" error={e.date} className="col-span-2 sm:col-span-1">
          <Input name="date" type="date" defaultValue={val(state, "date", appointment?.date ?? initialDate)} className={controlCls} {...fieldAria("ap-date", e.date)} />
        </Field>
        <Field id="ap-time" label="Vreme" error={e.time}>
          <NativeSelect name="time" defaultValue={val(state, "time", appointment ? formatTime(appointment.startMin) : (initialTime ?? "08:00"))} {...fieldAria("ap-time", e.time)}>
            {timeOptions().map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="ap-dur" label="Trajanje" error={e.duration}>
          <NativeSelect name="duration" defaultValue={val(state, "duration", String(appointment?.durationMin ?? 60))} {...fieldAria("ap-dur", e.duration)}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {formatDuration(d)}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <section className="flex flex-col gap-3 border-t pt-5" aria-label="Vozilo i klijent">
        <input type="hidden" name="mode" value={mode} />
        <Segmented
          name="_mode"
          label="Vozilo"
          value={mode}
          onChange={setMode}
          options={[
            { value: "existing", label: "Iz evidencije" },
            { value: "text", label: "Novo / nepoznato" },
          ]}
        />
        {mode === "existing" &&
          (vehicle ? (
            <div className="flex flex-col gap-1 rounded-xl border bg-card p-3">
              <input type="hidden" name="vehicleId" value={vehicle.id} />
              {vehicle.owner && <input type="hidden" name="customerId" value={vehicle.owner.id} />}
              <div className="flex items-center justify-between gap-2">
                <PlateBadge plate={vehicle.plate} vin={vehicle.plate ? undefined : vehicle.vin} />
                <Button type="button" variant="ghost" onClick={() => setVehicle(null)}>
                  <X aria-hidden />
                  Promeni
                </Button>
              </div>
              <p className="font-semibold">{vehicle.title}</p>
              <p className="text-sm text-muted-foreground">
                {vehicle.owner ? `${vehicle.owner.name}${vehicle.owner.phone ? ` · ${formatPhone(vehicle.owner.phone)}` : ""}` : "bez vlasnika u kartonu"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Tablica, VIN ili vlasnik" aria-label="Pretraga vozila" autoComplete="off" className="h-11 bg-card pl-10 text-base uppercase md:text-base" />
              </div>
              {e.vehicleText && <p className="text-sm text-destructive">{e.vehicleText}</p>}
              {query.length >= 2 && (
                <ul className="overflow-hidden rounded-xl border bg-card" aria-live="polite" aria-busy={loading}>
                  {results.vehicles.map((v) => (
                    <li key={v.id} className="border-b last:border-b-0">
                      <button type="button" disabled={!!picking} onClick={() => void pick(v.id)} className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted disabled:opacity-60">
                        <PlateBadge plate={v.plate} vin={v.plate ? undefined : v.vin} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {v.title}
                          {v.owner && <span className="text-muted-foreground"> · {v.owner}</span>}
                        </span>
                        {picking === v.id && <Loader2 className="size-4 animate-spin" aria-label="Učitavam" />}
                      </button>
                    </li>
                  ))}
                  {!loading && results.vehicles.length === 0 && (
                    <li className="p-3 text-sm text-muted-foreground">
                      Nema vozila „{query}“.{" "}
                      <button type="button" className="font-medium text-primary" onClick={() => setMode("text")}>
                        Upiši kao novo
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          ))}
        {mode === "text" && (
          <div className="grid gap-3 rounded-xl border bg-muted/40 p-3 sm:grid-cols-2">
            <Field id="ap-vtext" label="Vozilo (tablica, marka, model)" error={e.vehicleText} className="sm:col-span-2">
              <div className="relative">
                <Car className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input name="vehicleText" defaultValue={val(state, "vehicleText", appointment?.vehicleText)} placeholder="Golf 5, BG 123-XY" className={cn(controlCls, "pl-10")} {...fieldAria("ap-vtext", e.vehicleText)} />
              </div>
            </Field>
            <Field id="ap-cname" label="Klijent" error={e.customerName}>
              <Input name="customerName" defaultValue={val(state, "customerName", appointment?.customerName)} autoComplete="off" className={controlCls} {...fieldAria("ap-cname", e.customerName)} />
            </Field>
            <Field id="ap-phone" label="Telefon" error={e.phone}>
              <Input name="phone" type="tel" inputMode="tel" defaultValue={val(state, "phone", appointment?.phone ? formatPhone(appointment.phone) : "")} className={controlCls} {...fieldAria("ap-phone", e.phone)} />
            </Field>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t pt-5" aria-label="Razlog">
        <Field id="ap-reason" label="Razlog dolaska" error={e.reason} required>
          <Input name="reason" value={reason} onChange={(ev) => setReason(ev.target.value)} className={controlCls} {...fieldAria("ap-reason", e.reason)} />
        </Field>
        <div className="-mt-1 flex flex-wrap gap-1.5">
          {COMMON_COMPLAINTS.map((c) => (
            <button key={c} type="button" onClick={() => setReason(c)} className={cn("min-h-9 rounded-full border px-3 text-sm", reason === c ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>
              {c}
            </button>
          ))}
        </div>
        <Field id="ap-note" label="Napomena" error={e.note}>
          <Textarea name="note" rows={2} defaultValue={val(state, "note", appointment?.note)} className="bg-card text-base md:text-base" {...fieldAria("ap-note", e.note)} />
        </Field>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="xl">
          <Link href={cancelHref}>Odustani</Link>
        </Button>
        <SubmitButton pending={pending}>{appointment ? "Sačuvaj izmene" : "Zakaži"}</SubmitButton>
      </div>
    </form>
  );
}
