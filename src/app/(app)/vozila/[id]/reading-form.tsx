"use client";

import { useEffect, useRef } from "react";
import { Gauge } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field, controlCls, fieldAria } from "@/components/form/field";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { todayIso } from "@/domain/dates";
import { val } from "@/lib/form-data";
import { useServerForm } from "@/components/use-server-form";
import { saveReading } from "../actions";

export function ReadingForm({ vehicleId }: { vehicleId: string }) {
  const { state, onSubmit, pending } = useServerForm(saveReading);
  const e = state.errors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  const ok = !!state.message && !state.errors;

  useEffect(() => {
    if (ok) formRef.current?.reset();
  }, [ok, state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="grid grid-cols-[1fr_auto] items-end gap-3 sm:grid-cols-[1fr_11rem_auto]">
        <Field id="reading-km" label="Nova kilometraža" error={e.km}>
          <Input name="km" inputMode="numeric" placeholder="185400" defaultValue={ok ? "" : val(state, "km")} className={`${controlCls} tabular`} {...fieldAria("reading-km", e.km)} />
        </Field>
        <Field id="reading-date" label="Datum" error={e.date} className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
          <Input name="date" type="date" defaultValue={ok ? todayIso() : val(state, "date", todayIso())} max={todayIso()} className={controlCls} {...fieldAria("reading-date", e.date)} />
        </Field>
        <SubmitButton pending={pending} className="self-end" pendingText="…">
          <Gauge aria-hidden />
          Upiši
        </SubmitButton>
      </div>
      {state.message && <Notice variant={state.message.startsWith("Sačuvano.") ? "warning" : "success"} title={state.message} />}
    </form>
  );
}
