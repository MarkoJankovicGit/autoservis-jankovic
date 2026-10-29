/**
 * Deljivi karton za mušteriju (`/k/<token>`). Majstor bira naloge, fotografije, cene i podsetnike;
 * u bazu ide zamrznut snimak izabranog, a od tokena samo SHA-256 heš.
 */
import { todayIso } from "../domain/dates.ts";
import type { SharedOrder, ShareSnapshot, VehicleShare } from "../domain/model.ts";
import { itemTotal, orderTotals } from "../domain/orders.ts";
import { shareExpiry, shareState, validateShare, type ShareRaw, type ShareState, type ShareValue } from "../domain/shares.ts";
import type { FieldErrors } from "../domain/validation.ts";
import { readAttachmentFile } from "./files.ts";
import { hashToken, looksLikeToken, newToken } from "./share-tokens.ts";
import { nowIso, read, write, type Db } from "./store/store.ts";
import { base, currentOwnership } from "./vehicles.ts";

const fail = (errors: FieldErrors) => ({ ok: false as const, errors });
const newestFirst = (a: { receivedDate: string; number: string }, b: { receivedDate: string; number: string }) =>
  b.receivedDate.localeCompare(a.receivedDate) || b.number.localeCompare(a.number);

export type ShareListItem = {
  id: string;
  createdAt: string;
  expiresAt: string;
  state: ShareState;
  opens: number;
  lastOpenedAt?: string;
  orderNumbers: string[];
  photos: number;
  showPrices: boolean;
  reminders: number;
};

function listItem(s: VehicleShare, today: string): ShareListItem {
  return {
    id: s.id,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    state: shareState(s, today),
    opens: s.opens,
    lastOpenedAt: s.lastOpenedAt,
    orderNumbers: s.snapshot.orders.map((o) => o.number),
    photos: s.snapshot.orders.reduce((n, o) => n + o.photos.length, 0),
    showPrices: s.snapshot.showPrices,
    reminders: s.snapshot.reminders?.length ?? 0,
  };
}

export type ShareOptions = {
  vehicle: { id: string; plate?: string; make: string; model?: string; year?: number };
  orders: {
    id: string;
    number: string;
    status: "open" | "done";
    receivedDate: string;
    completedDate?: string;
    complaint: string;
    total: number;
    photos: { id: string; category: string }[];
  }[];
  openReminders: number;
  shares: ShareListItem[];
};

/** Podaci za ekran „Podeli“: šta može da se izabere i ranije napravljeni linkovi. */
export function shareOptions(vehicleId: string): Promise<ShareOptions | null> {
  return read((db) => {
    const v = db.vehicles.find((x) => x.id === vehicleId);
    if (!v) return null;
    const today = todayIso();
    return {
      vehicle: { id: v.id, plate: v.plate, make: v.make, model: v.model, year: v.year },
      orders: db.orders
        .filter((o) => o.vehicleId === vehicleId && o.status !== "cancelled")
        .sort(newestFirst)
        .map((o) => ({
          id: o.id,
          number: o.number,
          status: o.status as "open" | "done",
          receivedDate: o.receivedDate,
          completedDate: o.completedDate,
          complaint: o.complaint,
          total: orderTotals(db.orderItems.filter((i) => i.orderId === o.id)).total,
          photos: db.attachments
            .filter((a) => a.orderId === o.id)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map((a) => ({ id: a.id, category: a.category })),
        })),
      openReminders: db.reminders.filter((r) => r.vehicleId === vehicleId && r.status === "open").length,
      shares: db.shares
        .filter((s) => s.vehicleId === vehicleId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((s) => listItem(s, today)),
    };
  });
}

/** Snimak izabranog. Pripadnost naloga i fotografija vozilu proverava se ovde, jer forma može biti izmenjena. */
function buildSnapshot(db: Db, vehicleId: string, value: ShareValue): { ok: true; snapshot: ShareSnapshot } | { ok: false; errors: FieldErrors } {
  const v = db.vehicles.find((x) => x.id === vehicleId)!;
  const { orderIds, photoIds, showPrices, showReminders } = value;
  const orders = orderIds.map((id) => db.orders.find((o) => o.id === id));
  if (orders.some((o) => !o || o.vehicleId !== vehicleId || o.status === "cancelled")) return fail({ form: "Izabrani nalog ne pripada ovom vozilu ili je otkazan." });
  const photos = photoIds.map((id) => db.attachments.find((a) => a.id === id));
  if (photos.some((p) => !p || !p.orderId || !orderIds.includes(p.orderId))) return fail({ form: "Fotografija nije uz izabrani nalog." });

  const shared: SharedOrder[] = orders
    .map((o) => o!)
    .sort(newestFirst)
    .map((o) => {
      const items = db.orderItems.filter((i) => i.orderId === o.id).sort((a, b) => a.sortOrder - b.sortOrder);
      return {
        id: o.id,
        number: o.number,
        status: o.status as "open" | "done",
        receivedDate: o.receivedDate,
        completedDate: o.completedDate,
        km: o.kmOut ?? o.kmIn,
        complaint: o.complaint,
        workDone: o.workDone,
        items: items.map((i) => ({ kind: i.kind, name: i.name, qtyMilli: i.qtyMilli, unit: i.unit, ...(showPrices ? { total: itemTotal(i) } : {}) })),
        ...(showPrices ? { total: orderTotals(items).total } : {}),
        photos: photos
          .map((p) => p!)
          .filter((p) => p.orderId === o.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map((p) => ({ id: p.id, category: p.category, width: p.width, height: p.height })),
      };
    });

  const reminders = showReminders
    ? db.reminders
        .filter((r) => r.vehicleId === vehicleId && r.status === "open")
        .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || (a.dueKm ?? Infinity) - (b.dueKm ?? Infinity))
        .map((r) => ({ title: r.title, dueDate: r.dueDate, dueKm: r.dueKm }))
    : undefined;
  if (!shared.length && !reminders?.length) return fail({ form: "Vozilo nema otvorenih podsetnika; izaberi bar jedan nalog." });

  return {
    ok: true,
    snapshot: {
      vehicle: { plate: v.plate, make: v.make, model: v.model, year: v.year, fuel: v.fuel, engine: v.engine },
      showPrices,
      orders: shared,
      reminders,
    },
  };
}

/** Novi link. Token se vraća samo ovde (jedini trenutak kad je poznat); u bazi ostaju heš i snimak. */
export function createVehicleShare(vehicleId: string, raw: ShareRaw): Promise<{ ok: true; id: string; token: string; expiresAt: string } | { ok: false; errors: FieldErrors }> {
  return write((db) => {
    if (!db.vehicles.some((x) => x.id === vehicleId)) return fail({ form: "Vozilo ne postoji." });
    const r = validateShare(raw);
    if (!r.ok) return fail(r.errors);
    const built = buildSnapshot(db, vehicleId, r.value);
    if (!built.ok) return built;
    const { token, hash } = newToken();
    const share: VehicleShare = {
      ...base(),
      vehicleId,
      customerId: currentOwnership(db, vehicleId)?.customerId,
      tokenHash: hash,
      expiresAt: shareExpiry(todayIso(), r.value.days),
      opens: 0,
      snapshot: built.snapshot,
    };
    db.shares.push(share);
    return { ok: true as const, id: share.id, token, expiresAt: share.expiresAt };
  });
}

/** Gašenje je trajno: heš se briše, pa se stari token više ni sa čim ne poklapa. */
export function revokeVehicleShare(id: string): Promise<boolean> {
  return write((db) => {
    const s = db.shares.find((x) => x.id === id);
    if (!s || s.revokedAt) return false;
    Object.assign(s, { tokenHash: undefined, revokedAt: nowIso(), updatedAt: nowIso() });
    return true;
  });
}

function activeShare(db: Db, token: string): VehicleShare | undefined {
  const hash = hashToken(token);
  const s = db.shares.find((x) => x.tokenHash === hash);
  return s && shareState(s, todayIso()) === "active" ? s : undefined;
}

export type PublicShare = { snapshot: ShareSnapshot; sharedDate: string; expiresAt: string };

/** Snimak bez fotografija koje su u međuvremenu obrisane. */
function shareView(db: Db, s: VehicleShare): PublicShare {
  const exists = new Set(db.attachments.map((a) => a.id));
  const snapshot = structuredClone(s.snapshot);
  for (const o of snapshot.orders) o.photos = o.photos.filter((p) => exists.has(p.id));
  return { snapshot, sharedDate: s.createdAt.slice(0, 10), expiresAt: s.expiresAt };
}

/**
 * Javna strana: broji otvaranje i izbacuje fotografije koje su u međuvremenu obrisane.
 * `count: false` za pregled prijavljenog majstora, da brojač pokazuje samo mušterijina otvaranja.
 */
export function getPublicShare(token: string, { count = true } = {}): Promise<PublicShare | null> {
  if (!looksLikeToken(token)) return Promise.resolve(null);
  return write((db) => {
    const s = activeShare(db, token);
    if (!s) return null;
    if (count) {
      s.opens += 1;
      s.lastOpenedAt = nowIso();
    }
    return shareView(db, s);
  });
}

/** Snimak za PDF (samo prijavljen majstor): radi i kad je link istekao ili ugašen, jer PDF ne zavisi od linka. */
export function getSharePdf(id: string): Promise<PublicShare | null> {
  return read((db) => {
    const s = db.shares.find((x) => x.id === id);
    return s ? shareView(db, s) : null;
  });
}

/** Fotografija sa javne strane: samo ako je link aktivan i fotografija je u njegovom snimku. Ne broji otvaranje. */
export async function readSharedPhoto(token: string, attachmentId: string, variant: "full" | "thumb") {
  if (!looksLikeToken(token)) return null;
  const allowed = await read((db) => {
    const s = activeShare(db, token);
    return !!s?.snapshot.orders.some((o) => o.photos.some((p) => p.id === attachmentId));
  });
  return allowed ? readAttachmentFile(attachmentId, variant) : null;
}
