"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { removeEntity } from "@/app/(app)/delete-actions";
import type { DeleteKind, DeletionImpact } from "@/server/deletion";

/** Trajno brisanje sa spiskom posledica (isti plan kao samo brisanje, pa spisak odgovara onome što će se desiti). */
export function DeleteDialog({
  kind,
  id,
  what,
  label = "Obriši",
  impact,
  size = "xl",
  className,
}: {
  kind: DeleteKind;
  id: string;
  /** u akuzativu, za naslov: „klijenta Petar Petrović“, „nalog 2026-0014“ */
  what: string;
  label?: string;
  impact: DeletionImpact;
  /** veličina kao susedno dugme (Arhiviraj, Otkaži) */
  size?: "default" | "xl";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size={size} className={cn("text-muted-foreground hover:bg-destructive/10 hover:text-destructive", className)}>
          <Trash2 aria-hidden />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={removeEntity} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Obrisati {what}?</DialogTitle>
            <DialogDescription>Brisanje je trajno i ne može da se vrati.</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          {impact.deleted.length > 0 && (
            <div className="text-sm">
              <p className="font-semibold">Briše se i:</p>
              <ul className="mt-1 list-disc pl-5 tabular">
                {impact.deleted.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {impact.kept.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold">Pored toga:</p>
              <ul className="mt-1 list-disc pl-5 tabular">
                {impact.kept.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" size="xl" onClick={() => setOpen(false)}>
              Nazad
            </Button>
            <SubmitButton variant="destructive" pendingText="Brišem…">
              <Trash2 aria-hidden />
              Obriši
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
