"use client";

import { useEffect, useState } from "react";
import type { SearchResults } from "@/server/search";

const EMPTY: SearchResults = { vehicles: [], customers: [] };

/**
 * Pretraga sa zadrškom od 150 ms. Rezultati se pamte uz upit za koji su stigli,
 * pa se „učitavanje“ i prazan rezultat izvode iz stanja umesto da se postavljaju u efektu.
 */
export function useSearch(q: string) {
  const query = q.trim();
  const [data, setData] = useState<{ q: string; results: SearchResults } | null>(null);

  useEffect(() => {
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (r.ok) setData({ q: query, results: (await r.json()) as SearchResults });
      } catch {
        // prekinut zahtev ili mreža: zadrži poslednje rezultate
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const short = query.length < 2;
  return {
    results: short ? EMPTY : (data?.results ?? EMPTY),
    loading: !short && data?.q !== query,
    query,
  };
}
