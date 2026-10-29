"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, controlCls, fieldAria } from "@/components/form/field";
import { SubmitButton } from "@/components/submit-button";
import { useServerForm } from "@/components/use-server-form";
import { REMINDER_PRESETS } from "@/domain/reminders";
import { saveReminder } from "@/app/(app)/nalozi/actions";

/** Ručno dodavanje podsetnika na kartonu (rok od danas i poslednje kilometraže). */
export function ReminderForm({ vehicleId }: { vehicleId: string }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ title: "", months: "", km: "" });
  const { state, onSubmit, pending } = useServerForm(saveReminder, {
    onSuccess: () => {
      setOpen(false);
      setV({ title: "", months: "", km: "" });
    },
  });
  const e = state.errors ?? {};

  if (!open) {
    return (
      <Button type="button" variant="outline" className="self-start" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Dodaj podsetnik
      </Button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-3" noValidate>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <div className="flex flex-wrap gap-1.5">
        {REMINDER_PRESETS.map((p) => (
          <button key={p.title} type="button" onClick={() => setV({ title: p.title, months: p.months?.toString() ?? "", km: p.km?.toString() ?? "" })} className="min-h-9 rounded-full border bg-card px-3 text-sm hover:bg-muted">
            {p.title}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_7rem_8rem]">
        <Field id="rf-title" label="Šta" error={e.title} className="col-span-2 sm:col-span-1">
          <Input name="title" value={v.title} onChange={(ev) => setV({ ...v, title: ev.target.value })} className={controlCls} {...fieldAria("rf-title", e.title)} />
        </Field>
        <Field id="rf-months" label="Za meseci" error={e.months}>
          <Input name="months" inputMode="numeric" value={v.months} onChange={(ev) => setV({ ...v, months: ev.target.value })} className={`${controlCls} tabular`} {...fieldAria("rf-months", e.months)} />
        </Field>
        <Field id="rf-km" label="Za km" error={e.km}>
          <Input name="km" inputMode="numeric" value={v.km} onChange={(ev) => setV({ ...v, km: ev.target.value })} className={`${controlCls} tabular`} {...fieldAria("rf-km", e.km)} />
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
        <Button type="button" variant="outline" size="xl" onClick={() => setOpen(false)}>
          Odustani
        </Button>
      </div>
    </form>
  );
}
