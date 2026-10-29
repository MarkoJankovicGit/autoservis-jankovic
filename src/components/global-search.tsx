"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Car, Plus, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PlateBadge } from "@/components/plate-badge";
import { formatPhone } from "@/domain/phone";
import { formatPlate } from "@/domain/plate";
import { useSearch } from "./use-search";

type Item = { key: string; href: string; group: "Vozila" | "Klijenti" | "Akcije"; node: React.ReactNode };

export function GlobalSearch({
  trigger,
  shortcut = false,
}: {
  trigger: (open: () => void) => React.ReactNode;
  /** samo jedna instanca na strani sluša Ctrl/Cmd+K */
  shortcut?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const { results, loading, query } = useSearch(q);

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const v of results.vehicles) {
      out.push({
        key: "v" + v.id,
        href: `/vozila/${v.id}`,
        group: "Vozila",
        node: (
          <>
            <PlateBadge plate={v.plate} vin={v.plate ? undefined : v.vin} size="sm" />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{v.title}</span>
              {v.owner && <span className="text-muted-foreground"> · {v.owner}</span>}
            </span>
          </>
        ),
      });
    }
    for (const c of results.customers) {
      out.push({
        key: "c" + c.id,
        href: `/klijenti/${c.id}`,
        group: "Klijenti",
        node: (
          <>
            <UserRound className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{c.name}</span>
              {c.phone && <span className="text-muted-foreground tabular"> · {formatPhone(c.phone)}</span>}
            </span>
          </>
        ),
      });
    }
    if (results.newPlate) {
      out.push({
        key: "new-plate",
        href: `/vozila/novo?tablica=${encodeURIComponent(results.newPlate)}`,
        group: "Akcije",
        node: (
          <>
            <Plus className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="font-medium text-primary">Novo vozilo {formatPlate(results.newPlate)}</span>
          </>
        ),
      });
    }
    return out;
  }, [results]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  const current = Math.min(active, Math.max(items.length - 1, 0));
  let lastGroup = "";

  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQ("");
        }}
      >
        <DialogContent className="top-4 max-w-[calc(100%-1rem)] translate-y-0 gap-0 overflow-hidden p-0 sm:top-[12%] sm:max-w-xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Pretraga</DialogTitle>
          <DialogDescription className="sr-only">Tablica, VIN, ime ili telefon. Strelice biraju, Enter otvara.</DialogDescription>
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, items.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter" && items[current]) {
                  e.preventDefault();
                  go(items[current].href);
                }
              }}
              placeholder="Tablica, VIN, ime ili telefon"
              aria-label="Pretraga"
              role="combobox"
              aria-expanded={items.length > 0}
              aria-controls="global-search-results"
              aria-activedescendant={items[current] ? `gs-${items[current].key}` : undefined}
              autoComplete="off"
              enterKeyHint="search"
              className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-placeholder"
            />
            <kbd className="hidden rounded border px-1.5 text-xs text-muted-foreground sm:block">Esc</kbd>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2" aria-live="polite">
            {query.length < 2 ? (
              <p className="p-3 text-sm text-muted-foreground">Upiši bar 2 znaka.</p>
            ) : items.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">{loading ? "Tražim…" : `Nema rezultata za „${query}“.`}</p>
            ) : (
              <ul id="global-search-results" role="listbox" aria-label="Rezultati">
                {items.map((it, i) => {
                  const header = it.group !== lastGroup ? it.group : null;
                  lastGroup = it.group;
                  return (
                    <li key={it.key} role="none">
                      {header && (
                        <p className="flex items-center gap-1.5 px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {header === "Vozila" && <Car className="size-3.5" aria-hidden />}
                          {header}
                        </p>
                      )}
                      <button
                        id={`gs-${it.key}`}
                        type="button"
                        role="option"
                        aria-selected={i === current}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(it.href)}
                        className={cn("flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left", i === current && "bg-muted")}
                      >
                        {it.node}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
