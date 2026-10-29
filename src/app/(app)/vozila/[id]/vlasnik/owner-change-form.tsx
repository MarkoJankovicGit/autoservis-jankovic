"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, Segmented, controlCls, fieldAria } from "@/components/form/field";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { todayIso } from "@/domain/dates";
import { val } from "@/lib/form-data";
import { useServerForm } from "@/components/use-server-form";
import { saveOwnerChange } from "../../actions";
import { OwnerFields } from "../../owner-fields";

export function OwnerChangeForm({ vehicleId, currentOwner }: { vehicleId: string; currentOwner?: string }) {
  const { state, onSubmit, pending } = useServerForm(saveOwnerChange);
  const e = state.errors ?? {};
  const [reason, setReason] = useState(val(state, "reason", "sale"));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {e.form && <Notice variant="error" title={e.form} />}

      <Segmented
        name="reason"
        label="Šta se desilo"
        value={reason}
        onChange={setReason}
        options={[
          { value: "sale", label: "Prodaja / novi vlasnik" },
          ...(currentOwner ? [{ value: "correction", label: "Greška u unosu" }] : []),
        ]}
      />
      {e.reason && <p className="-mt-4 text-sm text-destructive">{e.reason}</p>}
      <Notice variant="info">
        {reason === "sale"
          ? `${currentOwner ? `Vlasništvo klijenta ${currentOwner} se zatvara na izabrani datum. ` : ""}Ranija istorija vozila ostaje vezana za prethodnog vlasnika.`
          : `Ispravlja se pogrešno uneti vlasnik (${currentOwner}). Ne pravi se novi period vlasništva.`}
      </Notice>

      <OwnerFields state={state} allowNone={false} defaultMode="existing" />

      {reason === "sale" && (
        <Field id="date" label="Datum promene" error={e.date} className="max-w-xs">
          <Input name="date" type="date" defaultValue={val(state, "date", todayIso())} max={todayIso()} className={controlCls} {...fieldAria("date", e.date)} />
        </Field>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" size="xl">
          <Link href={`/vozila/${vehicleId}`}>Odustani</Link>
        </Button>
        <SubmitButton pending={pending}>{state.duplicates?.length ? "Ipak sačuvaj" : "Sačuvaj promenu"}</SubmitButton>
      </div>
    </form>
  );
}
