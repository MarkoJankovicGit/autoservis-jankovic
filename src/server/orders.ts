/**
 * Radni nalozi: prijem, stavke, završetak sa podsetnicima, vraćanje u rad, otkazivanje.
 * Svaka operacija je jedna transakcija upisa (write), kao što će biti i u bazi.
 */
import { isIsoDate, todayIso, type IsoDate } from "../domain/dates.ts";
import type { Customer, OrderItem, Reminder, ServiceOrder, Vehicle } from "../domain/model.ts";
import { checkReading, type Reading } from "../domain/odometer.ts";
import { canTransition, formatOrderNumber, orderTotals, validateItem, type ItemKind, type ItemRaw, type OrderTotals } from "../domain/orders.ts";
import { phoneSearchKey } from "../domain/phone.ts";
import { normalizePlate, plateSearchKey } from "../domain/plate.ts";
import { normalizeVin } from "../domain/vin.ts";
import { reminderDue, reminderTargets, validateReminder, type DueInfo, type ReminderRaw } from "../domain/reminders.ts";
import { foldText } from "../domain/text.ts";
import { paymentStatus, type PaymentStatus } from "../domain/finance.ts";
import { isWaiting } from "../domain/parts-orders.ts";
import { parseKm, validateVehicle, type FieldErrors, type VehicleRaw } from "../domain/validation.ts";
import type { Duplicate } from "./customers.ts";
import { nowIso, read, write, type Db } from "./store/store.ts";
import { base, conflicts, currentOwnership, resolveOwner, vehicleFields, type OwnerChoice } from "./vehicles.ts";
import { markArrived } from "./appointments.ts";

export type OrderResult =
  | { ok: true; id: string; warning?: string }
  | { ok: false; errors: FieldErrors; duplicates?: Duplicate[]; conflictVehicleId?: string };

const fail = (errors: FieldErrors, extra: Partial<Extract<OrderResult, { ok: false }>> = {}) => ({ ok: false as const, errors, ...extra });

function nextNumber(db: Db, date: IsoDate): string {
  const year = Number(date.slice(0, 4));
  const key = `order:${year}`;
  db.sequences[key] = (db.sequences[key] ?? 0) + 1;
  return formatOrderNumber(year, db.sequences[key]);
}

function readingsOf(db: Db, vehicleId: string): Reading[] {
  return db.odometerReadings.filter((r) => r.vehicleId === vehicleId).map(({ date, km }) => ({ date, km }));
}

// ---------- prijem ----------

export type IntakeInput = {
  vehicle: { mode: "existing"; vehicleId: string } | { mode: "new"; raw: VehicleRaw };
  /** "keep" = trenutni vlasnik iz kartona je i klijent naloga */
  owner: OwnerChoice | { mode: "keep" };
  kmIn?: string;
  complaint: string;
  /** prijem iz zakazanog termina */
  appointmentId?: string;
};

export function createOrderFromIntake(input: IntakeInput): Promise<OrderResult> {
  return write((db) => {
    const errors: FieldErrors = {};
    const today = todayIso();

    // vozilo
    let vehicle: Vehicle | undefined;
    let newVehicle: ReturnType<typeof validateVehicle> | undefined;
    let conflictVehicleId: string | undefined;
    if (input.vehicle.mode === "existing") {
      const id = input.vehicle.vehicleId;
      vehicle = db.vehicles.find((v) => v.id === id && !v.archivedAt);
      if (!vehicle) errors.vehicleId = "Izaberi vozilo ili unesi novo.";
    } else {
      newVehicle = validateVehicle({ ...input.vehicle.raw, km: "" });
      if (!newVehicle.ok) for (const [k, m] of Object.entries(newVehicle.errors)) errors[`vehicle.${k}`] = m;
      // sukob tablice/VIN-a se proverava i kad ostatak forme ima greške: „ovo vozilo već imate“ je najvažnije
      const raw = input.vehicle.raw;
      const c = conflicts(db, { plate: normalizePlate(raw.plate ?? "") || undefined, vin: normalizeVin(raw.vin ?? "") || undefined, make: "" });
      for (const [k, m] of Object.entries(c.errors)) errors[`vehicle.${k}`] = m;
      conflictVehicleId = c.vehicleId;
    }

    // klijent
    const ownership = vehicle ? currentOwnership(db, vehicle.id) : undefined;
    let owner = input.owner;
    if (owner.mode === "keep" && !ownership) {
      errors.owner = "Vozilo nema vlasnika u kartonu. Izaberi ili unesi klijenta.";
      owner = { mode: "none" };
    }
    const o = owner.mode === "keep" ? null : resolveOwner(db, owner);
    if (o) Object.assign(errors, o.errors);
    if (owner.mode === "none" && !errors.owner) errors.owner = "Nalog mora imati klijenta.";

    // kilometraža i opis
    const kmIn = parseKm(input.kmIn);
    if (kmIn === null) errors.kmIn = "Kilometraža je ceo broj, do 9.999.999.";
    const complaint = input.complaint.trim().replace(/\s+\n/g, "\n");
    if (complaint.length < 2) errors.complaint = "Upiši šta mušterija prijavljuje ili šta treba uraditi.";
    else if (complaint.length > 2000) errors.complaint = "Najviše 2.000 znakova.";

    if (Object.keys(errors).length || o?.duplicates?.length) return fail(errors, { duplicates: o?.duplicates, conflictVehicleId });

    // upis
    if (!vehicle && newVehicle?.ok) {
      vehicle = { ...base(), ...vehicleFields(newVehicle.value) };
      db.vehicles.push(vehicle);
    }
    const v = vehicle!;
    const customerId = o ? o.commit(db)! : ownership!.customerId;
    if (!currentOwnership(db, v.id)) {
      db.ownerships.push({ ...base(), vehicleId: v.id, customerId, validFrom: today, reason: "initial" });
    }
    const order: ServiceOrder = {
      ...base(),
      number: nextNumber(db, today),
      vehicleId: v.id,
      customerId,
      status: "open",
      receivedDate: today,
      kmIn: kmIn ?? undefined,
      complaint,
    };
    db.orders.push(order);
    if (input.appointmentId) markArrived(db, input.appointmentId, order.id);
    let warning: string | undefined;
    if (kmIn !== undefined && kmIn !== null) {
      const check = checkReading(readingsOf(db, v.id), kmIn, today);
      warning = check.warning;
      db.odometerReadings.push({ ...base(), vehicleId: v.id, km: kmIn, date: today, source: "order", orderId: order.id });
    }
    v.updatedAt = nowIso();
    return { ok: true as const, id: order.id, warning };
  });
}

// ---------- izmene naloga ----------

function openOrder(db: Db, id: string): { order?: ServiceOrder; error?: string } {
  const order = db.orders.find((o) => o.id === id);
  if (!order) return { error: "Nalog ne postoji." };
  if (order.status !== "open") return { order, error: "Nalog nije u radu. Vrati ga u rad da bi menjao stavke." };
  return { order };
}

export type OrderTextField = "complaint" | "workDone" | "internalNote";

export function updateOrderText(id: string, field: OrderTextField, value: string): Promise<OrderResult> {
  return write((db) => {
    const order = db.orders.find((o) => o.id === id);
    if (!order) return fail({ form: "Nalog ne postoji." });
    const v = value.trim();
    if (field === "complaint" && v.length < 2) return fail({ [field]: "Ne može biti prazno." });
    if (v.length > 4000) return fail({ [field]: "Najviše 4.000 znakova." });
    if (field === "complaint") order.complaint = v;
    else order[field] = v || undefined;
    order.updatedAt = nowIso();
    return { ok: true as const, id };
  });
}

export function addItem(orderId: string, raw: ItemRaw): Promise<OrderResult> {
  return write((db) => {
    const { order, error } = openOrder(db, orderId);
    if (error) return fail({ form: error });
    const r = validateItem(raw);
    if (!r.ok) return fail(r.errors);
    const sortOrder = db.orderItems.filter((i) => i.orderId === orderId).reduce((m, i) => Math.max(m, i.sortOrder), 0) + 1;
    const item: OrderItem = { ...base(), orderId, sortOrder, ...r.value };
    db.orderItems.push(item);
    order!.updatedAt = nowIso();
    return { ok: true as const, id: item.id };
  });
}

export function updateItem(orderId: string, itemId: string, raw: ItemRaw): Promise<OrderResult> {
  return write((db) => {
    const { order, error } = openOrder(db, orderId);
    if (error) return fail({ form: error });
    const item = db.orderItems.find((i) => i.id === itemId && i.orderId === orderId);
    if (!item) return fail({ form: "Stavka ne postoji." });
    const r = validateItem(raw);
    if (!r.ok) return fail(r.errors);
    const { unitCost, partNumber, ...rest } = r.value;
    Object.assign(item, rest, { unitCost, partNumber, updatedAt: nowIso() });
    order!.updatedAt = nowIso();
    return { ok: true as const, id: itemId };
  });
}

export function deleteItem(orderId: string, itemId: string): Promise<OrderResult> {
  return write((db) => {
    const { order, error } = openOrder(db, orderId);
    if (error) return fail({ form: error });
    const i = db.orderItems.findIndex((x) => x.id === itemId && x.orderId === orderId);
    if (i < 0) return fail({ form: "Stavka ne postoji." });
    db.orderItems.splice(i, 1);
    order!.updatedAt = nowIso();
    return { ok: true as const, id: itemId };
  });
}

// ---------- završetak, vraćanje, otkazivanje ----------

export type CompleteInput = {
  date: string;
  kmOut?: string;
  workDone?: string;
  reminders: ReminderRaw[];
  /** otvoreni podsetnici vozila koji su urađeni u ovom nalogu */
  closeReminderIds: string[];
};

export function completeOrder(id: string, input: CompleteInput): Promise<OrderResult> {
  return write((db) => {
    const order = db.orders.find((o) => o.id === id);
    if (!order) return fail({ form: "Nalog ne postoji." });
    if (!canTransition(order.status, "done")) return fail({ form: "Samo nalog u radu može da se završi." });
    const errors: FieldErrors = {};
    const today = todayIso();
    const date = input.date || today;
    if (!isIsoDate(date)) errors.date = "Datum nije ispravan.";
    else if (date > today) errors.date = "Datum završetka ne može biti u budućnosti.";
    else if (date < order.receivedDate) errors.date = "Datum završetka je pre prijema.";

    const kmOut = parseKm(input.kmOut);
    if (kmOut === null) errors.kmOut = "Kilometraža je ceo broj, do 9.999.999.";
    const workDone = (input.workDone ?? order.workDone ?? "").trim();
    const items = db.orderItems.filter((i) => i.orderId === id);
    if (!items.length && !workDone) errors.workDone = "Dodaj bar jednu stavku ili opiši šta je urađeno.";

    const reminders = input.reminders
      .map((raw, i) => ({ raw, i }))
      .filter(({ raw }) => [raw.title, raw.months, raw.km].some((x) => (x ?? "").trim()));
    const validated = reminders.map(({ raw, i }) => {
      const r = validateReminder(raw);
      if (!r.ok) for (const [k, m] of Object.entries(r.errors)) errors[`reminders.${i}.${k}`] = m;
      return r;
    });
    if (Object.keys(errors).length) return fail(errors);

    const km = kmOut ?? order.kmIn;
    for (const r of validated) {
      if (!r.ok) continue;
      const t = reminderTargets(r.value, date, km);
      if (!t.dueDate && t.dueKm === undefined) {
        return fail({ kmOut: "Za podsetnik po kilometraži unesi kilometražu na izlazu." });
      }
    }

    order.status = "done";
    order.completedDate = date;
    order.kmOut = kmOut ?? undefined;
    order.workDone = workDone || undefined;
    order.updatedAt = nowIso();
    if (kmOut !== undefined && kmOut !== null && kmOut !== order.kmIn) {
      db.odometerReadings.push({ ...base(), vehicleId: order.vehicleId, km: kmOut, date, source: "order", orderId: id });
    }
    for (const r of validated) {
      if (!r.ok) continue;
      const t = reminderTargets(r.value, date, km);
      db.reminders.push({ ...base(), vehicleId: order.vehicleId, orderId: id, title: r.value.title, ...t, status: "open" });
    }
    for (const rid of input.closeReminderIds) {
      const rem = db.reminders.find((x) => x.id === rid && x.vehicleId === order.vehicleId && x.status === "open");
      if (rem) Object.assign(rem, { status: "done", closedAt: nowIso(), closedByOrderId: id, updatedAt: nowIso() });
    }
    return { ok: true as const, id };
  });
}

export function reopenOrder(id: string): Promise<OrderResult> {
  return write((db) => {
    const order = db.orders.find((o) => o.id === id);
    if (!order) return fail({ form: "Nalog ne postoji." });
    if (!canTransition(order.status, "open")) return fail({ form: "Nalog je već u radu." });
    if (db.invoices.some((i) => i.orderId === id && !i.cancelledAt)) {
      return fail({ form: "Za nalog je izdat račun. Poništi račun da bi nalog vratio u rad." });
    }
    if (order.status === "done") {
      // poništi posledice završetka; ponovni završetak ih pravi iznova
      db.reminders = db.reminders.filter((r) => !(r.orderId === id && r.status === "open"));
      for (const r of db.reminders) {
        if (r.closedByOrderId === id && r.status === "done") Object.assign(r, { status: "open", closedAt: undefined, closedByOrderId: undefined, updatedAt: nowIso() });
      }
      db.odometerReadings = db.odometerReadings.filter((r) => !(r.orderId === id && r.date === order.completedDate && r.km === order.kmOut));
      order.completedDate = undefined;
      order.kmOut = undefined;
    }
    order.status = "open";
    order.cancelledAt = undefined;
    order.cancelReason = undefined;
    order.updatedAt = nowIso();
    return { ok: true as const, id };
  });
}

export function cancelOrder(id: string, reason: string): Promise<OrderResult> {
  return write((db) => {
    const order = db.orders.find((o) => o.id === id);
    if (!order) return fail({ form: "Nalog ne postoji." });
    if (!canTransition(order.status, "cancelled")) return fail({ form: "Samo nalog u radu može da se otkaže." });
    const r = reason.trim();
    if (r.length < 2) return fail({ reason: "Upiši razlog otkazivanja." });
    Object.assign(order, { status: "cancelled", cancelledAt: nowIso(), cancelReason: r.slice(0, 500), updatedAt: nowIso() });
    return { ok: true as const, id };
  });
}

// ---------- čitanje ----------

export type OrderListItem = ServiceOrder & {
  vehicle?: Pick<Vehicle, "id" | "plate" | "vin" | "make" | "model" | "year">;
  customer?: Pick<Customer, "id" | "name" | "phones">;
  total: number;
  itemCount: number;
  paid: number;
  paymentStatus: PaymentStatus;
  /** postoji narudžbenica za ovaj nalog koja još nije stigla */
  waitingParts: boolean;
};

function enrich(db: Db, o: ServiceOrder): OrderListItem {
  const v = db.vehicles.find((x) => x.id === o.vehicleId);
  const c = db.customers.find((x) => x.id === o.customerId);
  const items = db.orderItems.filter((i) => i.orderId === o.id);
  const total = orderTotals(items).total;
  const paid = db.payments.filter((p) => p.orderId === o.id && !p.cancelledAt).reduce((a, p) => a + p.amount, 0);
  return {
    ...o,
    vehicle: v && { id: v.id, plate: v.plate, vin: v.vin, make: v.make, model: v.model, year: v.year },
    customer: c && { id: c.id, name: c.name, phones: c.phones },
    total,
    itemCount: items.length,
    paid,
    paymentStatus: paymentStatus(total, paid),
    waitingParts: db.partsOrders.some((p) => p.orderId === o.id && isWaiting(p.status)),
  };
}

function orderMatches(o: OrderListItem, q: string): boolean {
  const query = q.trim();
  if (!query) return true;
  if (o.number.includes(query)) return true;
  const pk = plateSearchKey(query);
  if (pk.length >= 2 && o.vehicle?.plate && plateSearchKey(o.vehicle.plate).includes(pk)) return true;
  const digits = phoneSearchKey(query);
  if (/^[\d\s+/().-]+$/.test(query) && query.replace(/\D/g, "").length >= 3 && o.customer?.phones.some((p) => p.e164.includes(digits))) return true;
  const hay = foldText([o.customer?.name, o.vehicle?.make, o.vehicle?.model, o.complaint].filter(Boolean).join(" "));
  return foldText(query).split(" ").every((w) => hay.includes(w));
}

export type OrderFilter = "open" | "done" | "cancelled" | "all" | "unpaid" | "waiting";

export function listOrders({ status = "open", q = "" }: { status?: OrderFilter; q?: string } = {}): Promise<OrderListItem[]> {
  return read((db) =>
    db.orders
      .filter((o) => status === "all" || status === "unpaid" || status === "waiting" || o.status === status)
      .map((o) => enrich(db, o))
      .filter((o) => (status === "unpaid" ? o.status === "done" && (o.paymentStatus === "unpaid" || o.paymentStatus === "partial") : status === "waiting" ? o.waitingParts : true))
      .filter((o) => orderMatches(o, q))
      .sort((a, b) => (b.receivedDate === a.receivedDate ? b.createdAt.localeCompare(a.createdAt) : b.receivedDate.localeCompare(a.receivedDate))),
  );
}

export function countOrders(): Promise<Record<OrderFilter, number>> {
  return read((db) => {
    const c: Record<OrderFilter, number> = { open: 0, done: 0, cancelled: 0, all: db.orders.length, unpaid: 0, waiting: 0 };
    for (const o of db.orders) {
      c[o.status]++;
      const e = enrich(db, o);
      if (o.status === "done" && (e.paymentStatus === "unpaid" || e.paymentStatus === "partial")) c.unpaid++;
      if (e.waitingParts) c.waiting++;
    }
    return c;
  });
}

export type ReminderWithDue = Reminder & { due: DueInfo };

export type OrderDetail = {
  order: ServiceOrder;
  vehicle: Vehicle;
  customer?: Customer;
  owner?: Customer;
  items: OrderItem[];
  totals: OrderTotals;
  attachments: import("../domain/model.ts").Attachment[];
  /** otvoreni podsetnici vozila (osim onih nastalih iz ovog naloga) */
  openReminders: ReminderWithDue[];
  /** podsetnici nastali završetkom ovog naloga */
  createdReminders: Reminder[];
  /** podsetnici zatvoreni ovim nalogom */
  closedReminders: Reminder[];
};

export function getOrder(id: string): Promise<OrderDetail | null> {
  return read((db) => {
    const order = db.orders.find((o) => o.id === id);
    if (!order) return null;
    const vehicle = db.vehicles.find((v) => v.id === order.vehicleId);
    if (!vehicle) return null;
    const own = currentOwnership(db, vehicle.id);
    const items = db.orderItems.filter((i) => i.orderId === id).sort((a, b) => a.sortOrder - b.sortOrder);
    const readings = readingsOf(db, vehicle.id);
    const today = todayIso();
    return {
      order,
      vehicle,
      customer: db.customers.find((c) => c.id === order.customerId),
      owner: own ? db.customers.find((c) => c.id === own.customerId) : undefined,
      items,
      totals: orderTotals(items),
      attachments: db.attachments.filter((a) => a.orderId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      openReminders: db.reminders
        .filter((r) => r.vehicleId === vehicle.id && r.status === "open" && r.orderId !== id)
        .map((r) => ({ ...r, due: reminderDue(r, readings, today) })),
      createdReminders: db.reminders.filter((r) => r.orderId === id && r.status !== "dismissed"),
      closedReminders: db.reminders.filter((r) => r.closedByOrderId === id),
    };
  });
}

export type OrderSummary = OrderListItem & { items: Pick<OrderItem, "kind" | "name" | "qtyMilli" | "unit">[]; photos: number };

function summaries(db: Db, orders: ServiceOrder[]): OrderSummary[] {
  return orders
    .filter((o) => o.status !== "cancelled")
    .sort((a, b) => (b.completedDate ?? b.receivedDate).localeCompare(a.completedDate ?? a.receivedDate))
    .map((o) => ({
      ...enrich(db, o),
      items: db.orderItems.filter((i) => i.orderId === o.id).sort((a, b) => a.sortOrder - b.sortOrder).map(({ kind, name, qtyMilli, unit }) => ({ kind, name, qtyMilli, unit })),
      photos: db.attachments.filter((a) => a.orderId === o.id).length,
    }));
}

/** Istorija popravki vozila (bez otkazanih), najnovije prvo. */
export function ordersForVehicle(vehicleId: string): Promise<OrderSummary[]> {
  return read((db) => summaries(db, db.orders.filter((o) => o.vehicleId === vehicleId)));
}

export function ordersForCustomer(customerId: string): Promise<OrderSummary[]> {
  return read((db) => summaries(db, db.orders.filter((o) => o.customerId === customerId)));
}

export type ItemSuggestion = {
  kind: ItemKind;
  name: string;
  unit: string;
  unitPrice: number;
  unitCost?: number;
  partNumber?: string;
  uses: number;
};

/** Predlozi stavki iz ranijih naloga: poslednja cena po nazivu, najčešće prve. */
export function itemSuggestions(limit = 300): Promise<ItemSuggestion[]> {
  return read((db) => {
    const map = new Map<string, ItemSuggestion & { last: string }>();
    for (const i of db.orderItems) {
      const key = `${i.kind}:${foldText(i.name)}`;
      const cur = map.get(key);
      if (!cur || i.createdAt > cur.last) {
        map.set(key, { kind: i.kind, name: i.name, unit: i.unit, unitPrice: i.unitPrice, unitCost: i.unitCost, partNumber: i.partNumber, uses: (cur?.uses ?? 0) + 1, last: i.createdAt });
      } else cur.uses++;
    }
    return [...map.values()]
      .sort((a, b) => b.uses - a.uses || b.last.localeCompare(a.last))
      .slice(0, limit)
      .map(({ last: _last, ...s }) => {
        void _last;
        return s;
      });
  });
}

export type IntakeVehicleSummary = {
  id: string;
  plate?: string;
  vin?: string;
  title: string;
  owner: { id: string; name: string; phone?: string } | null;
  lastKm?: number;
  openReminders: { title: string; overdue: boolean; when: string }[];
};

/** Sažetak vozila za ekran prijema: vlasnik, poslednja kilometraža i otvoreni podsetnici. */
export function getIntakeVehicle(id: string, fmtDate: (d: IsoDate) => string): Promise<IntakeVehicleSummary | null> {
  return read((db) => {
    const v = db.vehicles.find((x) => x.id === id && !x.archivedAt);
    if (!v) return null;
    const own = currentOwnership(db, id);
    const c = own ? db.customers.find((x) => x.id === own.customerId && !x.archivedAt) : undefined;
    const readings = readingsOf(db, id);
    const lastKm = readings.length ? [...readings].sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km).at(-1)!.km : undefined;
    const today = todayIso();
    return {
      id: v.id,
      plate: v.plate,
      vin: v.vin,
      title: [v.make, v.model, v.year].filter(Boolean).join(" "),
      owner: c ? { id: c.id, name: c.name, phone: c.phones[0]?.e164 } : null,
      lastKm,
      openReminders: db.reminders
        .filter((r) => r.vehicleId === id && r.status === "open")
        .map((r) => {
          const due = reminderDue(r, readings, today);
          return { title: r.title, overdue: due.overdue, when: due.overdue ? "prekoračen" : due.date ? `do ${fmtDate(due.date)}` : r.dueKm ? `na ${r.dueKm.toLocaleString("sr-Latn-RS")} km` : "" };
        }),
    };
  });
}
