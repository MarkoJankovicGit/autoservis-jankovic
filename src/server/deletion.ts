/**
 * Trajno brisanje unosa (pogrešan unos; odluka i odgovornost su na korisniku).
 * - Briše se sve što bez obrisanog ne postoji: nalog nosi stavke, fotografije, uplate, račune, podsetnike i kilometražu iz naloga;
 *   vozilo nosi svoje naloge, vlasništva, kilometraže, podsetnike i linkove; klijent nosi svoje naloge, uplate, račune
 *   i vozila koja nisu imala drugog vlasnika.
 * - Ono što postoji i samo (trošak, narudžbenica, termin) ostaje, bez veze ka obrisanom; termin čuva ime i tablicu kao tekst.
 * - Posledice se vraćaju kao da obrisanog nikad nije bilo: podsetnici zatvoreni nalogom se ponovo otvaraju, termin se vraća
 *   na „zakazano“, prethodni vlasnik vozila ponovo postaje trenutni, a broj poslednjeg dokumenta dobija sledeći dokument.
 * Isti plan daje i spisak posledica za dijalog pre potvrde, pa korisnik vidi tačno ono što će se desiti.
 */
import { formatPlate } from "../domain/plate.ts";
import { plural } from "../domain/text.ts";
import { blobs } from "./blob-store.ts";
import { nowIso, read, write, type Db } from "./store/store.ts";

export type DeleteKind = "customer" | "vehicle" | "order" | "supplier" | "partsOrder" | "payment" | "invoice";

const DELETABLE = ["customers", "vehicles", "ownerships", "odometerReadings", "orders", "orderItems", "attachments", "reminders", "payments", "invoices", "shares", "suppliers", "partsOrders"] as const;
type Deletable = (typeof DELETABLE)[number];
type Plan = Record<Deletable, Set<string>>;

const ROOT: Record<DeleteKind, Deletable> = {
  customer: "customers",
  vehicle: "vehicles",
  order: "orders",
  supplier: "suppliers",
  partsOrder: "partsOrders",
  payment: "payments",
  invoice: "invoices",
};

function plan(db: Db, kind: DeleteKind, id: string): Plan | null {
  if (!(db[ROOT[kind]] as { id: string }[]).some((x) => x.id === id)) return null;
  const p = Object.fromEntries(DELETABLE.map((k) => [k, new Set<string>()])) as Plan;
  const add = <T extends { id: string }>(k: Deletable, rows: T[], when: (x: T) => boolean) => {
    for (const x of rows) if (when(x)) p[k].add(x.id);
  };

  const order = (orderId: string) => {
    if (p.orders.has(orderId)) return;
    p.orders.add(orderId);
    add("orderItems", db.orderItems, (x) => x.orderId === orderId);
    add("attachments", db.attachments, (x) => x.orderId === orderId);
    add("reminders", db.reminders, (x) => x.orderId === orderId);
    add("odometerReadings", db.odometerReadings, (x) => x.orderId === orderId);
    add("payments", db.payments, (x) => x.orderId === orderId);
    add("invoices", db.invoices, (x) => x.orderId === orderId);
  };
  const vehicle = (vehicleId: string) => {
    if (p.vehicles.has(vehicleId)) return;
    p.vehicles.add(vehicleId);
    add("ownerships", db.ownerships, (x) => x.vehicleId === vehicleId);
    add("odometerReadings", db.odometerReadings, (x) => x.vehicleId === vehicleId);
    add("reminders", db.reminders, (x) => x.vehicleId === vehicleId);
    add("attachments", db.attachments, (x) => x.vehicleId === vehicleId);
    add("shares", db.shares, (x) => x.vehicleId === vehicleId);
    for (const o of db.orders) if (o.vehicleId === vehicleId) order(o.id);
  };

  switch (kind) {
    case "customer": {
      p.customers.add(id);
      add("ownerships", db.ownerships, (x) => x.customerId === id);
      add("payments", db.payments, (x) => x.customerId === id);
      add("invoices", db.invoices, (x) => x.customerId === id);
      add("shares", db.shares, (x) => x.customerId === id);
      for (const o of db.orders) if (o.customerId === id) order(o.id);
      // vozilo koje nije imalo drugog vlasnika nestaje sa klijentom
      const vehicleIds = new Set(db.ownerships.filter((o) => o.customerId === id).map((o) => o.vehicleId));
      for (const vid of vehicleIds) if (db.ownerships.every((o) => o.vehicleId !== vid || o.customerId === id)) vehicle(vid);
      break;
    }
    case "vehicle":
      vehicle(id);
      break;
    case "order":
      order(id);
      break;
    default:
      p[ROOT[kind]].add(id);
  }
  return p;
}

// ---------- brojevi dokumenata ----------

const NUMBERED = [
  { coll: "orders", prefix: "order", next: "sledeći nalog" },
  { coll: "invoices", prefix: "invoice", next: "sledeći račun" },
  { coll: "partsOrders", prefix: "parts", next: "sledeća narudžbenica" },
] as const;

/** "2026-0014", "R-2026-0003", "N-2026-0001" → godina i redni broj. */
function numberParts(n: string): { year: string; seq: number } | null {
  const m = /(\d{4})-(\d+)$/.exec(n);
  return m ? { year: m[1]!, seq: Number(m[2]) } : null;
}

/** Brojevi koje dobijaju sledeći dokumenti: samo kad je obrisan poslednji broj u godini (raniji brojevi ostaju preskočeni). */
function releasedNumbers(db: Db, p: Plan): { key: string; value: number; numbers: string[]; next: string }[] {
  const out: { key: string; value: number; numbers: string[]; next: string }[] = [];
  for (const { coll, prefix, next } of NUMBERED) {
    const rows = db[coll] as { id: string; number: string }[];
    const years = new Set(rows.filter((r) => p[coll].has(r.id)).map((r) => numberParts(r.number)?.year).filter((y): y is string => !!y));
    for (const year of years) {
      const key = `${prefix}:${year}`;
      const counter = db.sequences[key] ?? 0;
      const sameYear = rows.map((r) => ({ r, n: numberParts(r.number) })).filter((x) => x.n?.year === year);
      const kept = sameYear.filter((x) => !p[coll].has(x.r.id)).map((x) => x.n!.seq);
      const value = Math.max(0, ...kept);
      if (value >= counter) continue;
      const numbers = sameYear.filter((x) => p[coll].has(x.r.id) && x.n!.seq > value).sort((a, b) => a.n!.seq - b.n!.seq).map((x) => x.r.number);
      if (numbers.length) out.push({ key, value, numbers, next });
    }
  }
  return out;
}

// ---------- spisak posledica za dijalog ----------

export type DeletionImpact = {
  /** šta se briše zajedno sa izabranim unosom */
  deleted: string[];
  /** šta ostaje ili se vraća na staro */
  kept: string[];
};

const count = (n: number, one: string, few: string, many: string) => `${n} ${plural(n, one, few, many)}`;

function vehicleLabel(db: Db, id: string): string {
  const v = db.vehicles.find((x) => x.id === id);
  if (!v) return "vozilo";
  return [v.plate ? formatPlate(v.plate) : undefined, [v.make, v.model].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
}

function describe(db: Db, kind: DeleteKind, id: string, p: Plan): DeletionImpact {
  const deleted: string[] = [];
  const kept: string[] = [];
  const n = (k: Deletable) => p[k].size - (ROOT[kind] === k ? 1 : 0);

  if (kind === "customer") for (const vid of p.vehicles) deleted.push(`vozilo ${vehicleLabel(db, vid)}`);
  if (n("orders") > 0) {
    const numbers = db.orders.filter((o) => p.orders.has(o.id) && o.id !== id).map((o) => o.number).sort();
    deleted.push(`${count(numbers.length, "nalog", "naloga", "naloga")}${numbers.length <= 3 ? ` (${numbers.join(", ")})` : ""}`);
  }
  const lines: [Deletable, string, string, string][] = [
    ["payments", "uplata", "uplate", "uplata"],
    ["invoices", "račun", "računa", "računa"],
    ["attachments", "fotografija", "fotografije", "fotografija"],
    ["reminders", "podsetnik", "podsetnika", "podsetnika"],
    ["odometerReadings", "upis kilometraže", "upisa kilometraže", "upisa kilometraže"],
    ["shares", "link za mušteriju", "linka za mušteriju", "linkova za mušteriju"],
  ];
  for (const [k, one, few, many] of lines) if (n(k) > 0) deleted.push(count(n(k), one, few, many));
  if (kind === "order" && n("orderItems") > 0) deleted.unshift(count(n("orderItems"), "stavka", "stavke", "stavki"));

  const expenses = db.expenses.filter((e) => (e.orderId && p.orders.has(e.orderId)) || (e.supplierId && p.suppliers.has(e.supplierId)) || (e.partsOrderId && p.partsOrders.has(e.partsOrderId)));
  if (expenses.length) kept.push(`${count(expenses.length, "trošak", "troška", "troškova")} ostaje u finansijama, bez ove veze`);
  const parts = db.partsOrders.filter((x) => !p.partsOrders.has(x.id) && ((x.orderId && p.orders.has(x.orderId)) || (x.vehicleId && p.vehicles.has(x.vehicleId)) || (x.supplierId && p.suppliers.has(x.supplierId))));
  if (parts.length) kept.push(`${count(parts.length, "narudžbenica", "narudžbenice", "narudžbenica")} ostaje, bez ove veze`);
  const appts = db.appointments.filter((a) => (a.orderId && p.orders.has(a.orderId)) || (a.vehicleId && p.vehicles.has(a.vehicleId)) || (a.customerId && p.customers.has(a.customerId)));
  if (appts.length) kept.push(`${count(appts.length, "termin", "termina", "termina")} ostaje u kalendaru (ime i tablica kao tekst)`);
  const reopened = db.reminders.filter((r) => !p.reminders.has(r.id) && r.closedByOrderId && p.orders.has(r.closedByOrderId));
  if (reopened.length) kept.push(`${count(reopened.length, "podsetnik", "podsetnika", "podsetnika")} zatvoren ovim nalogom ponovo je otvoren`);
  for (const { vehicleId, owner } of restoredOwners(db, p)) kept.push(`vozilo ${vehicleLabel(db, vehicleId)} se vraća prethodnom vlasniku (${owner})`);
  for (const r of releasedNumbers(db, p)) kept.push(r.numbers.length === 1 ? `broj ${r.numbers[0]} dobiće ${r.next}` : `brojevi ${r.numbers.join(", ")} ponovo se dodeljuju`);
  return { deleted, kept };
}

/** Vozila koja ostaju, a gube trenutnog vlasnika: poslednji raniji vlasnik ponovo postaje trenutni. */
function restoredOwners(db: Db, p: Plan): { vehicleId: string; ownershipId: string; owner: string }[] {
  const out: { vehicleId: string; ownershipId: string; owner: string }[] = [];
  const lost = new Set(db.ownerships.filter((o) => p.ownerships.has(o.id) && !o.validTo && !p.vehicles.has(o.vehicleId)).map((o) => o.vehicleId));
  for (const vehicleId of lost) {
    const prev = db.ownerships
      .filter((o) => o.vehicleId === vehicleId && !p.ownerships.has(o.id))
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom) || b.createdAt.localeCompare(a.createdAt))[0];
    if (prev) out.push({ vehicleId, ownershipId: prev.id, owner: db.customers.find((c) => c.id === prev.customerId)?.name ?? "nepoznat klijent" });
  }
  return out;
}

export function deletionImpact(kind: DeleteKind, id: string): Promise<DeletionImpact | null> {
  return read((db) => {
    const p = plan(db, kind, id);
    return p ? describe(db, kind, id, p) : null;
  });
}

// ---------- brisanje ----------

export type DeleteResult = { ok: true; orderId?: string; vehicleId?: string } | { ok: false };

export async function deleteEntity(kind: DeleteKind, id: string): Promise<DeleteResult> {
  const done = await write((db) => {
    const p = plan(db, kind, id);
    if (!p) return null;
    const now = nowIso();
    const files = db.attachments.filter((a) => p.attachments.has(a.id)).flatMap((a) => [a.file, a.thumb]);
    // gde se korisnik vraća posle brisanja
    const orderId = kind === "payment" ? db.payments.find((x) => x.id === id)?.orderId : kind === "invoice" ? db.invoices.find((x) => x.id === id)?.orderId : undefined;
    const vehicleId = kind === "order" ? db.orders.find((x) => x.id === id)?.vehicleId : undefined;
    const context = { ...(orderId ? { orderId } : {}), ...(vehicleId ? { vehicleId } : {}) };
    // pre brisanja: posledice se računaju nad starim stanjem
    const restored = restoredOwners(db, p);
    const released = releasedNumbers(db, p);
    const vehicleText = new Map([...p.vehicles].map((vid) => [vid, vehicleLabel(db, vid)]));
    const customers = new Map(db.customers.filter((c) => p.customers.has(c.id)).map((c) => [c.id, c]));

    for (const k of DELETABLE) {
      if (!p[k].size) continue;
      (db as unknown as Record<Deletable, { id: string }[]>)[k] = (db[k] as { id: string }[]).filter((x) => !p[k].has(x.id));
    }

    for (const e of db.expenses) {
      const next = {
        orderId: e.orderId && p.orders.has(e.orderId) ? undefined : e.orderId,
        supplierId: e.supplierId && p.suppliers.has(e.supplierId) ? undefined : e.supplierId,
        partsOrderId: e.partsOrderId && p.partsOrders.has(e.partsOrderId) ? undefined : e.partsOrderId,
      };
      if (next.orderId !== e.orderId || next.supplierId !== e.supplierId || next.partsOrderId !== e.partsOrderId) Object.assign(e, next, { updatedAt: now });
    }
    for (const x of db.partsOrders) {
      const next = {
        orderId: x.orderId && p.orders.has(x.orderId) ? undefined : x.orderId,
        vehicleId: x.vehicleId && p.vehicles.has(x.vehicleId) ? undefined : x.vehicleId,
        supplierId: x.supplierId && p.suppliers.has(x.supplierId) ? undefined : x.supplierId,
      };
      if (next.orderId !== x.orderId || next.vehicleId !== x.vehicleId || next.supplierId !== x.supplierId) Object.assign(x, next, { updatedAt: now });
    }
    for (const a of db.appointments) {
      let changed = false;
      if (a.orderId && p.orders.has(a.orderId)) {
        Object.assign(a, { orderId: undefined, status: a.status === "arrived" ? "scheduled" : a.status });
        changed = true;
      }
      if (a.vehicleId && p.vehicles.has(a.vehicleId)) {
        Object.assign(a, { vehicleId: undefined, vehicleText: vehicleText.get(a.vehicleId) });
        changed = true;
      }
      const c = a.customerId ? customers.get(a.customerId) : undefined;
      if (c) {
        Object.assign(a, { customerId: undefined, customerName: c.name, phone: a.phone ?? c.phones[0]?.e164 });
        changed = true;
      }
      if (changed) a.updatedAt = now;
    }
    for (const r of db.reminders) {
      if (r.closedByOrderId && p.orders.has(r.closedByOrderId)) Object.assign(r, { status: "open", closedAt: undefined, closedByOrderId: undefined, updatedAt: now });
    }
    for (const { ownershipId } of restored) {
      const o = db.ownerships.find((x) => x.id === ownershipId);
      if (o) Object.assign(o, { validTo: undefined, updatedAt: now });
    }
    for (const { key, value } of released) db.sequences[key] = value;
    return { files, context };
  });
  if (!done) return { ok: false };

  // fajlovi tek posle uspešnog upisa; ako Storage tada ne odgovori, ostaje fajl bez zapisa (podatak se ne gubi)
  for (let i = 0; i < done.files.length; i += 100) {
    try {
      await blobs().remove(done.files.slice(i, i + 100));
    } catch (e) {
      console.error("Brisanje fotografija iz skladišta nije uspelo:", e instanceof Error ? e.message : e);
    }
  }
  return { ok: true, ...done.context };
}
