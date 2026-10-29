"use client";

import { useState } from "react";
import { CircleSlash } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, controlCls, fieldAria } from "@/components/form/field";
import { SubmitButton } from "@/components/submit-button";
import { useServerForm } from "@/components/use-server-form";
import { saveCancel } from "../actions";

export function CancelDialog({ orderId, number }: { orderId: string; number: string }) {
  const [open, setOpen] = useState(false);
  const { state, onSubmit, pending } = useServerForm(saveCancel, { onSuccess: () => setOpen(false) });
  const e = state.errors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="xl" className="text-muted-foreground">
          <CircleSlash aria-hidden />
          Otkaži nalog
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Otkazati nalog {number}?</DialogTitle>
            <DialogDescription>Nalog ostaje u evidenciji kao otkazan i može da se vrati u rad.</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="orderId" value={orderId} />
          <Field id="cancel-reason" label="Razlog" error={e.reason ?? e.form} required>
            <Input name="reason" autoFocus placeholder="klijent odustao" className={controlCls} {...fieldAria("cancel-reason", e.reason)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" size="xl" onClick={() => setOpen(false)}>
              Nazad
            </Button>
            <SubmitButton pending={pending} variant="destructive">
              Otkaži nalog
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
