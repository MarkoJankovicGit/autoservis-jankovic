"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { useServerForm } from "@/components/use-server-form";
import type { OrderTextField } from "@/server/orders";
import { saveOrderText } from "../actions";

/** Tekst naloga (prijavljeno, urađeno, interna napomena) sa izmenom na licu mesta. */
export function TextBlock({
  orderId,
  field,
  title,
  value,
  placeholder,
  empty,
  hint,
  emphasize,
}: {
  orderId: string;
  field: OrderTextField;
  title: string;
  value?: string;
  placeholder: string;
  /** tekst dok polje nije popunjeno, kad primer iz placeholder-a ne bi trebalo da liči na upisan sadržaj */
  empty?: string;
  hint?: string;
  emphasize?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { state, onSubmit, pending } = useServerForm(saveOrderText, { onSuccess: () => setEditing(false) });
  const error = state.errors?.[field] ?? state.errors?.form;

  return (
    <section aria-label={title} className={emphasize ? "rounded-xl border border-dashed border-warning/50 bg-warning/5 p-4" : undefined}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        {!editing && (
          <Button type="button" variant="ghost" size="sm" className="h-10 px-3" onClick={() => setEditing(true)}>
            <Pencil aria-hidden />
            {value ? "Izmeni" : "Dodaj"}
          </Button>
        )}
      </div>
      {editing ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="field" value={field} />
          <Textarea name="value" rows={4} defaultValue={value} placeholder={placeholder} autoFocus aria-label={title} aria-invalid={error ? true : undefined} className="bg-card text-base md:text-base" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
          <div className="flex gap-2">
            <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
            <Button type="button" variant="outline" size="xl" onClick={() => setEditing(false)}>
              Odustani
            </Button>
          </div>
        </form>
      ) : value ? (
        <p className="whitespace-pre-line">{value}</p>
      ) : (
        <p className="text-muted-foreground">{empty ?? placeholder}</p>
      )}
    </section>
  );
}
