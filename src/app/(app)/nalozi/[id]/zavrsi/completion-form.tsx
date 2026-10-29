"use client";

import Link from "next/link";
import { useState } from "react";
import { BellRing, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, controlCls, fieldAria } from "@/components/form/field";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { useServerForm } from "@/components/use-server-form";
import { todayIso } from "@/domain/dates";
import { REMINDER_PRESETS } from "@/domain/reminders";
import { val } from "@/lib/form-data";
import { saveCompletion } from "../../actions";

type Row = { key: number; title: string; months: string; km: string };

export function CompletionForm({
  orderId,
  vehicleId,
  receivedDate,
  kmIn,
  workDone,
  openReminders,
}: {
  orderId: string;
  vehicleId: string;
  receivedDate: string;
  kmIn?: number;
  workDone?: string;
  openReminders: { id: string; title: string; when: string; overdue: boolean }[];
}) {
  const { state, onSubmit, pending } = useServerForm(saveCompletion);
  const e = state.errors ?? {};
  const [rows, setRows] = useState<Row[]>([]);
  const [seq, setSeq] = useState(1);
  const add = (r: Omit<Row, "key">) => {
    setRows((all) => [...all, { ...r, key: seq }]);
    setSeq((s) => s + 1);
  };
  const patch = (key: number, p: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...p } : r)));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {e.form && <Notice variant="error" title={e.form} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="date" label="Datum završetka" error={e.date}>
          <Input name="date" type="date" defaultValue={val(state, "date", todayIso())} min={receivedDate} max={todayIso()} className={controlCls} {...fieldAria("date", e.date)} />
        </Field>
        <Field id="kmOut" label="Kilometraža na izlazu" error={e.kmOut} hint={kmIn !== undefined ? `Na prijemu: ${kmIn.toLocaleString("sr-Latn-RS")} km` : undefined}>
          <Input name="kmOut" inputMode="numeric" defaultValue={val(state, "kmOut", kmIn?.toString())} className={`${controlCls} tabular`} {...fieldAria("kmOut", e.kmOut, undefined, kmIn !== undefined ? "hint" : undefined)} />
        </Field>
      </div>

      <Field id="workDone" label="Šta je urađeno" error={e.workDone}>
        <Textarea name="workDone" rows={4} defaultValue={val(state, "workDone", workDone)} className="bg-card text-base md:text-base" {...fieldAria("workDone", e.workDone)} />
      </Field>

      <section className="flex flex-col gap-3 border-t pt-6" aria-labelledby="sledeci">
        <h2 id="sledeci" className="flex items-center gap-2 text-lg font-semibold">
          <BellRing className="size-5 text-muted-foreground" aria-hidden />
          Sledeći put
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {REMINDER_PRESETS.map((p) => (
            <button
              key={p.title}
              type="button"
              onClick={() => add({ title: p.title, months: p.months?.toString() ?? "", km: p.km?.toString() ?? "" })}
              className="min-h-9 rounded-full border bg-card px-3 text-sm hover:bg-muted"
            >
              + {p.title}
            </button>
          ))}
        </div>
        {rows.map((r, i) => (
          <div key={r.key} className="grid grid-cols-2 items-end gap-3 rounded-xl border bg-muted/40 p-3 sm:grid-cols-[1fr_7rem_8rem_auto]">
            <Field id={`rem-${r.key}-title`} label="Šta" error={e[`reminders.${i}.title`]} className="col-span-2 sm:col-span-1">
              <Input name="rem.title[]" value={r.title} onChange={(ev) => patch(r.key, { title: ev.target.value })} className={controlCls} {...fieldAria(`rem-${r.key}-title`, e[`reminders.${i}.title`])} />
            </Field>
            <Field id={`rem-${r.key}-months`} label="Za meseci" error={e[`reminders.${i}.months`]}>
              <Input name="rem.months[]" inputMode="numeric" value={r.months} onChange={(ev) => patch(r.key, { months: ev.target.value })} className={`${controlCls} tabular`} {...fieldAria(`rem-${r.key}-months`, e[`reminders.${i}.months`])} />
            </Field>
            <Field id={`rem-${r.key}-km`} label="Za km" error={e[`reminders.${i}.km`]}>
              <Input name="rem.km[]" inputMode="numeric" value={r.km} onChange={(ev) => patch(r.key, { km: ev.target.value })} className={`${controlCls} tabular`} {...fieldAria(`rem-${r.key}-km`, e[`reminders.${i}.km`])} />
            </Field>
            <Button type="button" variant="ghost" size="icon-lg" className="size-11 text-muted-foreground" aria-label={`Ukloni podsetnik ${r.title || i + 1}`} onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))}>
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        <Button type="button" variant="ghost" className="self-start" onClick={() => add({ title: "", months: "", km: "" })}>
          <Plus aria-hidden />
          Drugi podsetnik
        </Button>
      </section>

      {openReminders.length > 0 && (
        <fieldset className="flex flex-col gap-2 border-t pt-6">
          <legend className="mb-2 text-lg font-semibold">Urađeno iz ranijih podsetnika</legend>
          {openReminders.map((r) => (
            <label key={r.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 has-[:checked]:border-success/50 has-[:checked]:bg-success/5">
              <input type="checkbox" name="closeReminder[]" value={r.id} className="size-5 accent-[var(--color-success)]" />
              <span className="flex-1">
                <span className="font-medium">{r.title}</span>
                <span className={r.overdue ? "text-destructive" : "text-muted-foreground"}> · {r.when}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="xl">
          <Link href={`/nalozi/${orderId}`}>Nazad na nalog</Link>
        </Button>
        <SubmitButton pending={pending} pendingText="Završavam…">
          <CheckCircle2 aria-hidden />
          Završi nalog
        </SubmitButton>
      </div>
    </form>
  );
}
