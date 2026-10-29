/**
 * Klijenti: use-case funkcije. Jedina mesta koja menjaju podatke o klijentima.
 */
import { uuidv7 } from "../domain/id.ts";
import { TENANT_ID, type Customer, type Vehicle } from "../domain/model.ts";
import { phoneSearchKey } from "../domain/phone.ts";
import { plateSearchKey } from "../domain/plate.ts";
import { foldText } from "../domain/text.ts";
import { validateCustomer, type CustomerRaw, type CustomerValue, type FieldErrors } from "../domain/validation.ts";
import { nowIso, read, write, type Db } from "./store/json-store.ts";

export type Duplicate = { id: string; name: string; reason: string };

export type SaveCustomerResult =
  | { ok: true; id: string }
  | { ok: false; errors: FieldErrors; duplicates?: Duplicate[] };

function findDuplicates(db: Db, v: CustomerValue, exceptId?: string): Duplicate[] {
  const out: Duplicate[] = [];
  for (const c of db.customers) {
    if (c.id === exceptId || c.archivedAt) continue;
    const reasons: string[] = [];
    if (v.phones.some((p) => c.phones.some((q) => q.e164 === p.e164))) reasons.push("isti telefon");
    if (v.email && c.email === v.email) reasons.push("isti email");
    if (v.taxId && c.taxId === v.taxId) reasons.push("isti PIB");
    if (reasons.length) out.push({ id: c.id, name: c.name, reason: reasons.join(", ") });
  }
  return out;
}

/** Unutar transakcije upisa: pravi klijenta (koristi se i iz forme vozila). */
export function insertCustomer(db: Db, v: CustomerValue): Customer {
  const now = nowIso();
  const c: Customer = { id: uuidv7(), tenantId: TENANT_ID, createdAt: now, updatedAt: now, ...v };
  db.customers.push(c);
  return c;
}

export function checkCustomerForInsert(db: Db, raw: CustomerRaw, force: boolean):
  | { ok: true; value: CustomerValue }
  | { ok: false; errors: FieldErrors; duplicates?: Duplicate[] } {
  const r = validateCustomer(raw);
  if (!r.ok) return { ok: false, errors: r.errors };
  const duplicates = force ? [] : findDuplicates(db, r.value);
  if (duplicates.length) return { ok: false, errors: {}, duplicates };
  return { ok: true, value: r.value };
}

export function createCustomer(raw: CustomerRaw, { force = false } = {}): Promise<SaveCustomerResult> {
  return write((db) => {
    const r = checkCustomerForInsert(db, raw, force);
    if (!r.ok) return r;
    return { ok: true as const, id: insertCustomer(db, r.value).id };
  });
}

export function updateCustomer(id: string, raw: CustomerRaw, { force = false } = {}): Promise<SaveCustomerResult> {
  return write((db) => {
    const c = db.customers.find((x) => x.id === id);
    if (!c) return { ok: false as const, errors: { form: "Klijent ne postoji." } };
    const r = validateCustomer(raw);
    if (!r.ok) return { ok: false as const, errors: r.errors };
    const duplicates = force ? [] : findDuplicates(db, r.value, id);
    if (duplicates.length) return { ok: false as const, errors: {}, duplicates };
    // polja koja forma ne šalje moraju nestati (npr. obrisan email)
    const { email, taxId, address, note, ...rest } = r.value;
    Object.assign(c, rest, { email, taxId, address, note, updatedAt: nowIso() });
    return { ok: true as const, id };
  });
}

export function setCustomerArchived(id: string, archived: boolean): Promise<boolean> {
  return write((db) => {
    const c = db.customers.find((x) => x.id === id);
    if (!c) return false;
    c.archivedAt = archived ? nowIso() : undefined;
    c.updatedAt = nowIso();
    return true;
  });
}

// ---------- čitanje ----------

export type CustomerListItem = Customer & { vehicles: Pick<Vehicle, "id" | "plate" | "make" | "model">[] };

function currentVehicles(db: Db, customerId: string) {
  const ids = new Set(db.ownerships.filter((o) => o.customerId === customerId && !o.validTo).map((o) => o.vehicleId));
  return db.vehicles.filter((v) => ids.has(v.id) && !v.archivedAt);
}

export function customerMatches(db: Db, c: Customer, q: string): boolean {
  const fq = foldText(q);
  if (!fq) return true;
  const words = fq.split(" ");
  const vehicles = currentVehicles(db, c.id);
  const hay = foldText([c.name, c.email ?? "", c.taxId ?? "", ...vehicles.map((v) => `${v.make} ${v.model ?? ""}`)].join(" "));
  if (words.every((w) => hay.includes(w))) return true;
  const looksLikePhone = /^[\d\s+/().-]+$/.test(q.trim());
  // "064" je 3 otkucane cifre, ali ključ bez vodeće nule je "64": dužina se meri na unosu
  // "064..." ili "+381 64..." je početak broja; same cifre ("4567") mogu biti bilo gde u broju
  const pk = phoneSearchKey(q);
  const typedDigits = q.replace(/\D/g, "").length;
  const fromStart = /^\s*(\+|0)/.test(q);
  const national = (e164: string) => (e164.startsWith("+381") ? e164.slice(4) : e164.slice(1));
  if (
    looksLikePhone &&
    typedDigits >= 3 &&
    pk.length >= 2 &&
    c.phones.some((p) => (fromStart ? national(p.e164).startsWith(pk) : national(p.e164).includes(pk)))
  ) {
    return true;
  }
  const plateKey = plateSearchKey(q);
  return plateKey.length >= 3 && vehicles.some((v) => v.plate && plateSearchKey(v.plate).includes(plateKey));
}

export function listCustomers({ q = "", archived = false } = {}): Promise<CustomerListItem[]> {
  return read((db) =>
    db.customers
      .filter((c) => (archived ? !!c.archivedAt : !c.archivedAt) && customerMatches(db, c, q))
      .sort((a, b) => a.name.localeCompare(b.name, "sr-Latn"))
      .map((c) => ({ ...c, vehicles: currentVehicles(db, c.id).map(({ id, plate, make, model }) => ({ id, plate, make, model })) })),
  );
}

export type CustomerProfile = {
  customer: Customer;
  current: Vehicle[];
  former: (Vehicle & { until: string })[];
};

export function getCustomer(id: string): Promise<CustomerProfile | null> {
  return read((db) => {
    const customer = db.customers.find((c) => c.id === id);
    if (!customer) return null;
    const current = currentVehicles(db, id);
    const former = db.ownerships
      .filter((o) => o.customerId === id && o.validTo)
      .flatMap((o) => {
        const v = db.vehicles.find((x) => x.id === o.vehicleId);
        return v && !current.some((c) => c.id === v.id) ? [{ ...v, until: o.validTo! }] : [];
      });
    return { customer, current, former };
  });
}

export function getCustomerBasic(id: string): Promise<Customer | null> {
  return read((db) => db.customers.find((c) => c.id === id) ?? null);
}
