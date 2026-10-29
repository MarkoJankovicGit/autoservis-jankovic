/**
 * Globalna pretraga (Ctrl+K): vozila po tablici, VIN-u, marki/modelu i vlasniku; klijenti po imenu, telefonu, emailu, PIB-u.
 */
import { formatPlate, looksLikePlate, normalizePlate } from "../domain/plate.ts";
import { customerMatches } from "./customers.ts";
import { vehicleMatches } from "./vehicles.ts";
import { read } from "./store/store.ts";

export type SearchResults = {
  vehicles: { id: string; plate?: string; vin?: string; title: string; owner?: string }[];
  customers: { id: string; name: string; phone?: string; vehicles: number }[];
  /** Ako unos liči na tablicu koje nema: ponudi novo vozilo. */
  newPlate?: string;
};

const LIMIT = 5;

export function globalSearch(q: string): Promise<SearchResults> {
  const query = q.trim().slice(0, 80);
  if (query.length < 2) return Promise.resolve({ vehicles: [], customers: [] });
  return read((db) => {
    const ownerName = (vehicleId: string) => {
      const o = db.ownerships.find((x) => x.vehicleId === vehicleId && !x.validTo);
      return o ? db.customers.find((c) => c.id === o.customerId)?.name : undefined;
    };
    const vehicles = db.vehicles
      .filter((v) => !v.archivedAt && vehicleMatches(db, v, query))
      .slice(0, LIMIT)
      .map((v) => ({ id: v.id, plate: v.plate, vin: v.vin, title: [v.make, v.model, v.year].filter(Boolean).join(" "), owner: ownerName(v.id) }));
    const customers = db.customers
      .filter((c) => !c.archivedAt && customerMatches(db, c, query))
      .slice(0, LIMIT)
      .map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phones[0]?.e164,
        vehicles: db.ownerships.filter((o) => o.customerId === c.id && !o.validTo).length,
      }));
    const plate = normalizePlate(query);
    const exists = db.vehicles.some((v) => !v.archivedAt && v.plate === plate);
    // deo postojeće tablice ("va123") nije nova tablica: nudi se samo cela tablica ili kad nema rezultata
    const complete = formatPlate(plate) !== plate;
    const offer = looksLikePlate(query) && !exists && (complete || vehicles.length === 0);
    return { vehicles, customers, newPlate: offer ? plate : undefined };
  });
}
