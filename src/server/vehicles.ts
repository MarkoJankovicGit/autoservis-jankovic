/**
 * Vozila, vlasništvo i kilometraža: use-case funkcije.
 * Vozilo je centar: istorija vlasnika je u periodima, a stari periodi ostaju netaknuti.
 */
import { todayIso, type IsoDate, isIsoDate } from "../domain/dates.ts";
import { uuidv7 } from "../domain/id.ts";
import { TENANT_ID, type Customer, type OdometerReading, type Ownership, type Vehicle } from "../domain/model.ts";
import { checkReading, latest, projectKmAt, trend, type Reading, type Trend } from "../domain/odometer.ts";
import { plateSearchKey } from "../domain/plate.ts";
import { foldText } from "../domain/text.ts";
import { validateVehicle, type CustomerRaw, type FieldErrors, type VehicleRaw, type VehicleValue } from "../domain/validation.ts";
import { checkCustomerForInsert, insertCustomer, type Duplicate } from "./customers.ts";
import { nowIso, read, write, type Db } from "./store/store.ts";

export type OwnerChoice =
  | { mode: "existing"; customerId: string }
  | { mode: "new"; customer: CustomerRaw; force?: boolean }
  | { mode: "none" };

export type SaveVehicleResult =
  | { ok: true; id: string; warnings: FieldErrors }
  | { ok: false; errors: FieldErrors; warnings?: FieldErrors; duplicates?: Duplicate[]; conflictVehicleId?: string };

export const base = () => {
  const now = nowIso();
  return { id: uuidv7(), tenantId: TENANT_ID, createdAt: now, updatedAt: now };
};

export function conflicts(db: Db, v: VehicleValue, exceptId?: string): { errors: FieldErrors; vehicleId?: string } {
  const errors: FieldErrors = {};
  let vehicleId: string | undefined;
  for (const x of db.vehicles) {
    if (x.id === exceptId || x.archivedAt) continue;
    if (v.plate && x.plate === v.plate) {
      errors.plate = "Vozilo sa ovom tablicom već postoji.";
      vehicleId = x.id;
    }
    if (v.vin && x.vin === v.vin) {
      errors.vin = "Vozilo sa ovim VIN-om već postoji.";
      vehicleId = x.id;
    }
  }
  return { errors, vehicleId };
}

export function vehicleFields(v: VehicleValue) {
  // eksplicitno sva opciona polja, da obrisana vrednost u formi zaista nestane
  return {
    plate: v.plate, vin: v.vin, make: v.make, model: v.model, year: v.year, fuel: v.fuel,
    engine: v.engine, powerKw: v.powerKw, color: v.color, registrationExpires: v.registrationExpires, note: v.note,
  };
}

export type OwnerResolution = {
  errors: FieldErrors;
  duplicates?: Duplicate[];
  /** upisuje novog klijenta ako treba; vraća id klijenta ili undefined (bez vlasnika) */
  commit: (db: Db) => string | undefined;
};

/** Proverava izbor vlasnika (postojeći / novi / bez) bez upisa; upis tek kroz commit(). */
export function resolveOwner(db: Db, owner: OwnerChoice): OwnerResolution {
  const errors: FieldErrors = {};
  if (owner.mode === "existing") {
    if (!db.customers.some((c) => c.id === owner.customerId && !c.archivedAt)) errors.owner = "Izaberi klijenta sa liste.";
    return { errors, commit: () => owner.customerId };
  }
  if (owner.mode === "new") {
    const r = checkCustomerForInsert(db, owner.customer, !!owner.force);
    if (!r.ok) {
      for (const [k, msg] of Object.entries(r.errors)) errors[`customer.${k}`] = msg;
      return { errors, duplicates: r.duplicates, commit: () => undefined };
    }
    return { errors, commit: (d) => insertCustomer(d, r.value).id };
  }
  return { errors, commit: () => undefined };
}

export function currentOwnership(db: Db, vehicleId: string): Ownership | undefined {
  return db.ownerships.find((o) => o.vehicleId === vehicleId && !o.validTo);
}

export function createVehicle(raw: VehicleRaw, owner: OwnerChoice): Promise<SaveVehicleResult> {
  return write((db) => {
    const r = validateVehicle(raw);
    const o = resolveOwner(db, owner);
    if (!r.ok) return { ok: false as const, errors: { ...r.errors, ...o.errors }, warnings: r.warnings, duplicates: o.duplicates };
    const c = conflicts(db, r.value);
    const errors = { ...c.errors, ...o.errors };
    if (Object.keys(errors).length || o.duplicates?.length) {
      return { ok: false as const, errors, warnings: r.warnings, duplicates: o.duplicates, conflictVehicleId: c.vehicleId };
    }

    const vehicle: Vehicle = { ...base(), ...vehicleFields(r.value) };
    db.vehicles.push(vehicle);
    const today = todayIso();
    const customerId = o.commit(db);
    if (customerId) {
      db.ownerships.push({ ...base(), vehicleId: vehicle.id, customerId, validFrom: today, reason: "initial" });
    }
    if (r.value.km !== undefined) {
      db.odometerReadings.push({ ...base(), vehicleId: vehicle.id, km: r.value.km, date: today, source: "manual" });
    }
    return { ok: true as const, id: vehicle.id, warnings: r.warnings };
  });
}

export function updateVehicle(id: string, raw: VehicleRaw): Promise<SaveVehicleResult> {
  return write((db) => {
    const v = db.vehicles.find((x) => x.id === id);
    if (!v) return { ok: false as const, errors: { form: "Vozilo ne postoji." } };
    const r = validateVehicle({ ...raw, km: "" });
    if (!r.ok) return { ok: false as const, errors: r.errors, warnings: r.warnings };
    const c = conflicts(db, r.value, id);
    if (Object.keys(c.errors).length) return { ok: false as const, errors: c.errors, warnings: r.warnings, conflictVehicleId: c.vehicleId };
    Object.assign(v, vehicleFields(r.value), { updatedAt: nowIso() });
    return { ok: true as const, id, warnings: r.warnings };
  });
}

export function setVehicleArchived(id: string, archived: boolean): Promise<boolean> {
  return write((db) => {
    const v = db.vehicles.find((x) => x.id === id);
    if (!v) return false;
    v.archivedAt = archived ? nowIso() : undefined;
    v.updatedAt = nowIso();
    return true;
  });
}

// ---------- vlasništvo ----------

export type ChangeOwnerInput = {
  vehicleId: string;
  owner: OwnerChoice;
  date: string;
  reason: "sale" | "correction";
};

export type ChangeOwnerResult = { ok: true } | { ok: false; errors: FieldErrors; duplicates?: Duplicate[] };

export function changeOwner(input: ChangeOwnerInput): Promise<ChangeOwnerResult> {
  return write((db) => {
    const errors: FieldErrors = {};
    const vehicle = db.vehicles.find((v) => v.id === input.vehicleId);
    if (!vehicle) return { ok: false as const, errors: { form: "Vozilo ne postoji." } };
    const current = db.ownerships.find((o) => o.vehicleId === vehicle.id && !o.validTo);

    let customerId: string | undefined;
    let duplicates: Duplicate[] | undefined;
    let newCustomer: ReturnType<typeof checkCustomerForInsert> | undefined;
    if (input.owner.mode === "existing") {
      if (!db.customers.some((c) => c.id === (input.owner as { customerId: string }).customerId && !c.archivedAt)) {
        errors.owner = "Izaberi klijenta sa liste.";
      } else customerId = input.owner.customerId;
    } else if (input.owner.mode === "new") {
      newCustomer = checkCustomerForInsert(db, input.owner.customer, !!input.owner.force);
      if (!newCustomer.ok) {
        for (const [k, msg] of Object.entries(newCustomer.errors)) errors[`customer.${k}`] = msg;
        duplicates = newCustomer.duplicates;
      }
    } else {
      errors.owner = "Izaberi novog vlasnika.";
    }
    if (customerId && current && current.customerId === customerId) errors.owner = "Ovo je već trenutni vlasnik.";

    const date = input.date || todayIso();
    if (input.reason === "sale") {
      if (!isIsoDate(date)) errors.date = "Datum nije ispravan.";
      else if (date > todayIso()) errors.date = "Datum promene ne može biti u budućnosti.";
      else if (current && date < current.validFrom) errors.date = "Datum je pre početka trenutnog vlasništva.";
    } else if (!current) {
      errors.reason = "Vozilo nema vlasnika koji bi se ispravio. Izaberi „Prodaja / novi vlasnik“.";
    }
    if (Object.keys(errors).length || duplicates?.length) return { ok: false as const, errors, duplicates };

    if (input.owner.mode === "new" && newCustomer?.ok) customerId = insertCustomer(db, newCustomer.value).id;
    const now = nowIso();
    if (input.reason === "correction" && current) {
      // ispravka greške u unosu: isti period, drugi klijent (nalozi još ne postoje; kad postoje, ovde ide provera)
      current.customerId = customerId!;
      current.updatedAt = now;
    } else {
      if (current) {
        current.validTo = date;
        current.updatedAt = now;
      }
      db.ownerships.push({ ...base(), vehicleId: vehicle.id, customerId: customerId!, validFrom: date, reason: "sale" });
    }
    vehicle.updatedAt = now;
    return { ok: true as const };
  });
}

// ---------- kilometraža ----------

export type AddReadingResult = { ok: true; warning?: string } | { ok: false; errors: FieldErrors };

export function addReading(vehicleId: string, km: number | null, date: string, note?: string): Promise<AddReadingResult> {
  return write((db) => {
    if (!db.vehicles.some((v) => v.id === vehicleId)) return { ok: false as const, errors: { form: "Vozilo ne postoji." } };
    const errors: FieldErrors = {};
    const d = date || todayIso();
    if (!isIsoDate(d)) errors.date = "Datum nije ispravan.";
    else if (d > todayIso()) errors.date = "Datum ne može biti u budućnosti.";
    if (km === null) errors.km = "Kilometraža je ceo broj, do 9.999.999.";
    const existing = db.odometerReadings.filter((r) => r.vehicleId === vehicleId);
    const check = km === null ? null : checkReading(existing, km, d);
    if (check && !check.ok) errors.km = check.error!;
    if (Object.keys(errors).length) return { ok: false as const, errors };
    db.odometerReadings.push({ ...base(), vehicleId, km: km!, date: d, source: "manual", note: note?.trim() || undefined });
    return { ok: true as const, warning: check?.warning };
  });
}

export function deleteReading(vehicleId: string, readingId: string): Promise<boolean> {
  return write((db) => {
    const i = db.odometerReadings.findIndex((r) => r.id === readingId && r.vehicleId === vehicleId);
    if (i < 0) return false;
    db.odometerReadings.splice(i, 1);
    return true;
  });
}

// ---------- čitanje ----------

export type VehicleListItem = Vehicle & { owner?: Pick<Customer, "id" | "name">; lastKm?: number };

function ownerOf(db: Db, vehicleId: string): Customer | undefined {
  const o = db.ownerships.find((x) => x.vehicleId === vehicleId && !x.validTo);
  return o ? db.customers.find((c) => c.id === o.customerId) : undefined;
}

export function vehicleMatches(db: Db, v: Vehicle, q: string): boolean {
  const query = q.trim();
  if (!query) return true;
  const pk = plateSearchKey(query);
  if (pk.length >= 2 && v.plate && plateSearchKey(v.plate).includes(pk)) return true;
  const vinQ = query.toUpperCase().replace(/\s/g, "");
  if (vinQ.length >= 4 && v.vin?.includes(vinQ)) return true;
  const owner = ownerOf(db, v.id);
  const hay = foldText([v.make, v.model ?? "", v.engine ?? "", owner?.name ?? ""].join(" "));
  return foldText(query).split(" ").every((w) => hay.includes(w));
}

function readingsOf(db: Db, vehicleId: string): OdometerReading[] {
  return db.odometerReadings.filter((r) => r.vehicleId === vehicleId);
}

export function listVehicles({ q = "", archived = false } = {}): Promise<VehicleListItem[]> {
  return read((db) =>
    db.vehicles
      .filter((v) => (archived ? !!v.archivedAt : !v.archivedAt) && vehicleMatches(db, v, q))
      .map((v) => {
        const owner = ownerOf(db, v.id);
        return { ...v, owner: owner && { id: owner.id, name: owner.name }, lastKm: latest(readingsOf(db, v.id))?.km };
      })
      .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1)),
  );
}

export type OwnershipRow = Ownership & { customer?: Pick<Customer, "id" | "name"> };

export type VehicleCard = {
  vehicle: Vehicle;
  owner?: Customer;
  ownerships: OwnershipRow[];
  readings: OdometerReading[];
  trend: Trend | null;
  kmInYear: number | null;
};

export function getVehicleCard(id: string): Promise<VehicleCard | null> {
  return read((db) => {
    const vehicle = db.vehicles.find((v) => v.id === id);
    if (!vehicle) return null;
    const readings = readingsOf(db, id).sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
    const asReadings: Reading[] = readings.map(({ date, km }) => ({ date, km }));
    const ownerships = db.ownerships
      .filter((o) => o.vehicleId === id)
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom) || b.createdAt.localeCompare(a.createdAt))
      .map((o) => {
        const c = db.customers.find((x) => x.id === o.customerId);
        return { ...o, customer: c && { id: c.id, name: c.name } };
      });
    const inYear = new Date();
    inYear.setFullYear(inYear.getFullYear() + 1);
    return {
      vehicle,
      owner: ownerOf(db, id),
      ownerships,
      readings,
      trend: trend(asReadings),
      kmInYear: projectKmAt(asReadings, todayIso(inYear) as IsoDate),
    };
  });
}

export function getVehicleBasic(id: string): Promise<Vehicle | null> {
  return read((db) => db.vehicles.find((v) => v.id === id) ?? null);
}

export type ExpiringRegistration = Pick<Vehicle, "id" | "plate" | "vin" | "make" | "model" | "registrationExpires"> & {
  daysLeft: number;
  owner?: Pick<Customer, "id" | "name" | "phones">;
};

/** Vozila kojima registracija ističe u narednih `days` dana (i ona kojima je istekla do 30 dana). */
export function registrationsExpiring(days = 30): Promise<ExpiringRegistration[]> {
  return read((db) => {
    const today = todayIso();
    const out: ExpiringRegistration[] = [];
    for (const v of db.vehicles) {
      if (v.archivedAt || !v.registrationExpires) continue;
      const left = Math.round((Date.parse(v.registrationExpires) - Date.parse(today)) / 86_400_000);
      if (left > days || left < -30) continue;
      const owner = ownerOf(db, v.id);
      out.push({
        id: v.id, plate: v.plate, vin: v.vin, make: v.make, model: v.model, registrationExpires: v.registrationExpires, daysLeft: left,
        owner: owner && { id: owner.id, name: owner.name, phones: owner.phones },
      });
    }
    return out.sort((a, b) => a.daysLeft - b.daysLeft);
  });
}
