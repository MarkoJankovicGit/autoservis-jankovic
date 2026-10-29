"use client";

import { Trash2 } from "lucide-react";
import { removeReading } from "../actions";

export function DeleteReadingButton({ vehicleId, readingId, label }: { vehicleId: string; readingId: string; label: string }) {
  return (
    <form
      action={removeReading}
      onSubmit={(e) => {
        if (!confirm(`Obrisati upis ${label}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="readingId" value={readingId} />
      <button type="submit" aria-label={`Obriši upis ${label}`} className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
        <Trash2 className="size-4" aria-hidden />
      </button>
    </form>
  );
}
