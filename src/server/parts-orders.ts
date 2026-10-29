/**
 * Narudžbenice za dobavljače: priprema, slanje (PDF ili javni link), prijem robe u nalog i trošak.
 * Dok narudžbenica nije stigla, nalog za koji je pravljena je „čeka deo“.
 */
import { todayIso } from "../domain/dates.ts";
import { formatDocNumber } from "../domain/finance.ts";
import { uuidv7 } from "../domain/id.ts";
import { lineTotal } from "../domain/money.ts";
import type { OrderItem, PartsOrder, Supplier, Vehicle } from "../domain/model.ts";
import { isWaiting, statusAfterReceive, validatePartsOrder, validateReceive, type PartsOrderRaw, type ReceiveRaw } from "../domain/parts-orders.ts";
import type { FieldErrors } from "../domain/validation.ts";
import { foldText } from "../domain/text.ts";
import { hashToken, looksLikeToken, newToken } from "./share-tokens.ts";
import { nowIso, read, write, type Db } from "./store/store.ts";
import { base } from "./vehicles.ts";

export type PoResult = { ok: true; id: string } | { ok: false; errors: FieldErrors };
const fail = (errors: FieldErrors) => ({ ok: false as const, errors });

export function waitingOrderIds(db: Db): Set<string> {
  return new Set(db.partsOrders.filter((p) => p.orderId && isWaiting(p.status)).map((p) => p.orderId!));
}

export function createPartsOrder(input: { orderId?: string; vehicleId?: string; raw: PartsOrderRaw }): Promise<PoResult> {
  return write((db) => {
    const r = validatePartsOrder(input.raw);
    if (!r.ok) return fail(r.errors);
    if (r.value.supplierId && !db.suppliers.some((x) => x.id === r.value.supplierId && !x.archivedAt)) return fail({ supplierId: "Izaberi dobavljača sa liste." });
    const order = input.orderId ? db.orders.find((o) => o.id === input.orderId) : undefined;
    if (input.orderId && !order) return fail({ form: "Nalog ne postoji." });
    const vehicleId = order?.vehicleId ?? input.vehicleId;
    if (vehicleId && !db.vehicles.some((v) => v.id === vehicleId)) return fail({ form: "Vozilo ne postoji." });
    const year = Number(todayIso().slice(0, 4));
    const key = `parts:${year}`;
    db.sequences[key] = (db.sequences[key] ?? 0) + 1;
    const po: PartsOrder = {
      ...base(),
      number: formatDocNumber("N", year, db.sequences[key]),
      supplierId: r.value.supplierId,
      orderId: order?.id,
      vehicleId,
      status: "draft",
      neededBy: r.value.neededBy,
      note: r.value.note,
      lines: r.value.lines.map((l) => ({ id: uuidv7(), ...l, receivedMilli: 0 })),
      shareOpens: 0,
    };
    db.partsOrders.push(po);
    return { ok: true as const, id: po.id };
  });
}

export function updatePartsOrder(id: string, raw: PartsOrderRaw): Promise<PoResult> {
  return write((db) => {
    const po = db.partsOrders.find((p) => p.id === id);
    if (!po) return fail({ form: "Narudžbenica ne postoji." });
    if (po.lines.some((l) => l.receivedMilli > 0) || po.status === "received" || po.status === "cancelled") {
      return fail({ form: "Narudžbenica po kojoj je roba primljena ili koja je otkazana se ne menja." });
    }
    const r = validatePartsOrder(raw);
    if (!r.ok) return fail(r.errors);
    if (r.value.supplierId && !db.suppliers.some((x) => x.id === r.value.supplierId && !x.archivedAt)) return fail({ supplierId: "Izaberi dobavljača sa liste." });
    Object.assign(po, {
      supplierId: r.value.supplierId, neededBy: r.value.neededBy, note: r.value.note,
      lines: r.value.lines.map((l) => ({ id: uuidv7(), ...l, receivedMilli: 0 })), updatedAt: nowIso(),
    });
    return { ok: true as const, id };
  });
}

export function markSent(id: string): Promise<PoResult> {
  return write((db) => {
    const po = db.partsOrders.find((p) => p.id === id);
    if (!po) return fail({ form: "Narudžbenica ne postoji." });
    if (po.status !== "draft") return fail({ form: "Narudžbenica je već poslata." });
    Object.assign(po, { status: "sent", sentAt: nowIso(), updatedAt: nowIso() });
    return { ok: true as const, id };
  });
}

export function cancelPartsOrder(id: string): Promise<PoResult> {
  return write((db) => {
    const po = db.partsOrders.find((p) => p.id === id);
    if (!po) return fail({ form: "Narudžbenica ne postoji." });
    if (po.status === "received") return fail({ form: "Roba je stigla; narudžbenica ne može da se otkaže." });
    Object.assign(po, { status: "cancelled", shareTokenHash: undefined, updatedAt: nowIso() });
    return { ok: true as const, id };
  });
}

/** Novi javni link (stari prestaje da važi). Token se vraća samo ovde; u bazi ostaje heš. Pravljenje linka znači i slanje. */
export function createShareLink(id: string): Promise<{ ok: true; token: string } | { ok: false; errors: FieldErrors }> {
  return write((db) => {
    const po = db.partsOrders.find((p) => p.id === id);
    if (!po) return fail({ form: "Narudžbenica ne postoji." });
    if (po.status === "cancelled") return fail({ form: "Narudžbenica je otkazana." });
    const { token, hash } = newToken();
    Object.assign(po, { shareTokenHash: hash, shareCreatedAt: nowIso(), shareOpens: 0, shareLastOpenedAt: undefined, updatedAt: nowIso() });
    if (po.status === "draft") Object.assign(po, { status: "sent", sentAt: nowIso() });
    return { ok: true as const, token };
  });
}

export function revokeShareLink(id: string): Promise<boolean> {
  return write((db) => {
    const po = db.partsOrders.find((p) => p.id === id);
    if (!po || !po.shareTokenHash) return false;
    Object.assign(po, { shareTokenHash: undefined, updatedAt: nowIso() });
    return true;
  });
}

export type PublicPartsOrder = {
  number: string;
  createdDate: string;
  neededBy?: string;
  note?: string;
  status: PartsOrder["status"];
  supplierName?: string;
  vehicle?: Pick<Vehicle, "make" | "model" | "year" | "vin" | "engine" | "powerKw" | "fuel">;
  lines: { name: string; partNumber?: string; qtyMilli: number; note?: string }[];
};

/**
 * Javni prikaz za dobavljača: samo ono što mu treba da pripremi robu.
 * Namerno bez klijenta, tablice, cena i internih napomena naloga.
 */
export function getPublicPartsOrder(token: string): Promise<PublicPartsOrder | null> {
  if (!looksLikeToken(token)) return Promise.resolve(null);
  const hash = hashToken(token);
  return write((db) => {
    const po = db.partsOrders.find((p) => p.shareTokenHash === hash);
    if (!po || po.status === "cancelled") return null;
    po.shareOpens += 1;
    po.shareLastOpenedAt = nowIso();
    const v = db.vehicles.find((x) => x.id === po.vehicleId);
    return {
      number: po.number,
      createdDate: po.createdAt.slice(0, 10),
      neededBy: po.neededBy,
      note: po.note,
      status: po.status,
      supplierName: db.suppliers.find((x) => x.id === po.supplierId)?.name,
      vehicle: v && { make: v.make, model: v.model, year: v.year, vin: v.vin, engine: v.engine, powerKw: v.powerKw, fuel: v.fuel },
      lines: po.lines.map(({ name, partNumber, qtyMilli, note }) => ({ name, partNumber, qtyMilli, note })),
    };
  });
}

export type ReceiveOptions = { addToOrder: boolean; createExpense: boolean; paid: boolean };

/** Prijem robe: ažurira količine, opciono dodaje delove u nalog (sa nabavnom cenom) i pravi trošak ka dobavljaču. */
export function receiveParts(id: string, rows: ReceiveRaw[], opts: ReceiveOptions): Promise<PoResult> {
  return write((db) => {
    const po = db.partsOrders.find((p) => p.id === id);
    if (!po) return fail({ form: "Narudžbenica ne postoji." });
    if (po.status === "cancelled" || po.status === "received") return fail({ form: "Po ovoj narudžbenici nema više šta da se primi." });
    const r = validateReceive(rows);
    if (!r.ok) return fail(r.errors);
    for (const row of r.value) if (!po.lines.some((l) => l.id === row.lineId)) return fail({ form: "Nepoznat red narudžbenice." });
    const order = po.orderId ? db.orders.find((o) => o.id === po.orderId) : undefined;
    if (opts.addToOrder && order && order.status !== "open") {
      return fail({ form: `Nalog ${order.number} nije u radu. Vrati ga u rad ili primi robu bez dodavanja u nalog.` });
    }
    const now = nowIso();
    let sort = db.orderItems.filter((i) => i.orderId === order?.id).reduce((m, i) => Math.max(m, i.sortOrder), 0);
    let costTotal = 0;
    for (const row of r.value) {
      const line = po.lines.find((l) => l.id === row.lineId)!;
      line.receivedMilli += row.qtyMilli;
      if (row.unitCost !== undefined) {
        line.receivedCost = row.unitCost;
        costTotal += lineTotal(row.qtyMilli, row.unitCost, 0);
      }
      if (opts.addToOrder && order) {
        // deo je možda već na nalogu (dodat radi cene pre poručivanja): dopuni ga umesto duplikata
        const existing = db.orderItems.find(
          (i) =>
            i.orderId === order.id && i.kind === "part" && i.unitCost === undefined &&
            ((line.partNumber && i.partNumber && i.partNumber.replace(/\s/g, "").toUpperCase() === line.partNumber.replace(/\s/g, "").toUpperCase()) || foldText(i.name) === foldText(line.name)),
        );
        if (existing) {
          Object.assign(existing, {
            unitCost: row.unitCost,
            partNumber: existing.partNumber ?? line.partNumber,
            unitPrice: row.unitPrice ?? existing.unitPrice,
            updatedAt: now,
          });
          order.updatedAt = now;
          continue;
        }
        const item: OrderItem = {
          ...base(), orderId: order.id, sortOrder: ++sort, kind: "part", name: line.name, partNumber: line.partNumber,
          qtyMilli: row.qtyMilli, unit: "kom", unitPrice: row.unitPrice ?? row.unitCost ?? 0, unitCost: row.unitCost, discountBp: 0,
        };
        db.orderItems.push(item);
        order.updatedAt = now;
      }
    }
    if (opts.createExpense && costTotal > 0) {
      db.expenses.push({
        ...base(), date: todayIso(), category: "parts", amount: costTotal, description: `Delovi po narudžbenici ${po.number}`,
        supplierId: po.supplierId, orderId: po.orderId, paidDate: opts.paid ? todayIso() : undefined, partsOrderId: po.id,
      });
    }
    po.status = statusAfterReceive(po.lines);
    po.updatedAt = now;
    return { ok: true as const, id };
  });
}

export type PartsOrderRow = PartsOrder & { supplier?: Pick<Supplier, "id" | "name" | "phone" | "email">; orderNumber?: string; vehicle?: Pick<Vehicle, "id" | "plate" | "vin" | "make" | "model" | "year" | "engine" | "powerKw" | "fuel"> };

function enrich(db: Db, p: PartsOrder): PartsOrderRow {
  const s = db.suppliers.find((x) => x.id === p.supplierId);
  const v = db.vehicles.find((x) => x.id === p.vehicleId);
  return {
    ...p,
    supplier: s && { id: s.id, name: s.name, phone: s.phone, email: s.email },
    orderNumber: db.orders.find((o) => o.id === p.orderId)?.number,
    vehicle: v && { id: v.id, plate: v.plate, vin: v.vin, make: v.make, model: v.model, year: v.year, engine: v.engine, powerKw: v.powerKw, fuel: v.fuel },
  };
}

export function listPartsOrders({ status, orderId }: { status?: "waiting" | "all"; orderId?: string } = {}): Promise<PartsOrderRow[]> {
  return read((db) =>
    db.partsOrders
      .filter((p) => (!orderId || p.orderId === orderId) && (status !== "waiting" || isWaiting(p.status) || p.status === "draft"))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => enrich(db, p)),
  );
}

export function getPartsOrder(id: string): Promise<(PartsOrderRow & { orderStatus?: string }) | null> {
  return read((db) => {
    const p = db.partsOrders.find((x) => x.id === id);
    if (!p) return null;
    return { ...enrich(db, p), orderStatus: db.orders.find((o) => o.id === p.orderId)?.status };
  });
}
