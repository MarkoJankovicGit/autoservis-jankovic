import { DEMO } from "@/server/demo";

/** Traka na vrhu u demo režimu: podaci su primer i vraćaju se na početno stanje. */
export function DemoBanner() {
  if (!DEMO) return null;
  return (
    <p role="note" className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950">
      Demo verzija: podaci su primer i vraćaju se na početno stanje. Ne unosite prave podatke.
    </p>
  );
}
