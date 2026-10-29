"use client";

import { useState } from "react";
import { Search, UserRound, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/domain/phone";
import { useSearch } from "./use-search";

export type PickedCustomer = { id: string; name: string; phone?: string };

/** Izbor postojećeg klijenta pretragom po imenu ili telefonu. Upisuje customerId u skriveno polje. */
export function CustomerPicker({
  name = "customerId",
  initial,
  error,
  autoFocus,
}: {
  name?: string;
  initial?: PickedCustomer | null;
  error?: string;
  autoFocus?: boolean;
}) {
  const [picked, setPicked] = useState<PickedCustomer | null>(initial ?? null);
  const [q, setQ] = useState("");
  const { results, loading } = useSearch(q);

  if (picked) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <input type="hidden" name={name} value={picked.id} />
        <UserRound className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{picked.name}</p>
          {picked.phone && <p className="text-sm text-muted-foreground tabular">{formatPhone(picked.phone)}</p>}
        </div>
        <Button type="button" variant="ghost" onClick={() => setPicked(null)}>
          <X aria-hidden />
          Promeni
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value="" />
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ime ili telefon klijenta"
          aria-label="Pretraga klijenta"
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          className="h-11 bg-card pl-10 text-base md:text-base"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {q.trim().length >= 2 && (
        <ul className="overflow-hidden rounded-xl border bg-card" aria-live="polite" aria-busy={loading}>
          {results.customers.length === 0 && !loading && <li className="p-3 text-sm text-muted-foreground">Nema klijenta „{q}“. Izaberi „Novi klijent“.</li>}
          {results.customers.map((c) => (
            <li key={c.id} className="border-b last:border-b-0">
              <button
                type="button"
                onClick={() => setPicked({ id: c.id, name: c.name, phone: c.phone })}
                className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <UserRound className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block text-sm text-muted-foreground tabular">
                    {[c.phone && formatPhone(c.phone), c.vehicles ? `${c.vehicles} voz.` : ""].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
