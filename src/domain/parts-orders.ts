/**
 * Narudžbenica za dobavljača: VIN i podaci vozila, delovi koji trebaju, rok „treba nam do“.
 * Status se izvodi iz primljenih količina; dok nije sve stiglo, nalog je „čeka deo“.
 */
import { isIsoDate, type IsoDate } from "./dates.ts";
import { parseMoney, parseQuantity, type Para } from "./money.ts";
import type { FieldErrors, Validated } from "./validation.ts";

export const PARTS_ORDER_STATUSES = ["draft", "sent", "partial", "received", "cancelled"] as const;
export type PartsOrderStatus = (typeof PARTS_ORDER_STATUSES)[number];
export const PARTS_ORDER_STATUS_LABELS: Record<PartsOrderStatus, string> = {
  draft: "U pripremi",
  sent: "Poslato",
  partial: "Delimično stiglo",
  received: "Stiglo",
  cancelled: "Otkazano",
};

/** Narudžbenica koja još čeka robu. */
export const isWaiting = (s: PartsOrderStatus) => s === "sent" || s === "partial";

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export type PartsLineRaw = { name?: string; partNumber?: string; qty?: string; note?: string };
export type PartsLineValue = { name: string; partNumber?: string; qtyMilli: number; note?: string };
export type PartsOrderRaw = { supplierId?: string; neededBy?: string; note?: string; lines: PartsLineRaw[] };
export type PartsOrderValue = { supplierId?: string; neededBy?: IsoDate; note?: string; lines: PartsLineValue[] };

export function validatePartsOrder(raw: PartsOrderRaw): Validated<PartsOrderValue> {
  const errors: FieldErrors = {};
  const lines: PartsLineValue[] = [];
  raw.lines.forEach((l, i) => {
    const name = s(l.name).replace(/\s+/g, " ");
    const partNumber = s(l.partNumber) || undefined;
    const note = s(l.note) || undefined;
    if (!name && !partNumber && !s(l.qty) && !note) return; // prazan red
    if (!name) errors[`lines.${i}.name`] = "Upiši naziv dela.";
    else if (name.length > 120) errors[`lines.${i}.name`] = "Najviše 120 znakova.";
    if (partNumber && partNumber.length > 40) errors[`lines.${i}.partNumber`] = "Najviše 40 znakova.";
    const qty = s(l.qty) ? parseQuantity(s(l.qty)) : 1000;
    if (qty === null || qty <= 0) errors[`lines.${i}.qty`] = "Količina je broj veći od 0.";
    if (note && note.length > 200) errors[`lines.${i}.note`] = "Najviše 200 znakova.";
    lines.push({ name, partNumber, qtyMilli: qty ?? 0, note });
  });
  if (!lines.length && !Object.keys(errors).length) errors["lines.0.name"] = "Dodaj bar jedan deo.";
  const neededBy = s(raw.neededBy) || undefined;
  if (neededBy && !isIsoDate(neededBy)) errors.neededBy = "Datum nije ispravan.";
  const note = s(raw.note) || undefined;
  if (note && note.length > 1000) errors.note = "Najviše 1.000 znakova.";
  if (Object.keys(errors).length) return { ok: false, errors, warnings: {} };
  return { ok: true, value: { supplierId: s(raw.supplierId) || undefined, neededBy, note, lines }, warnings: {} };
}

export type ReceiveRaw = { lineId: string; qty?: string; cost?: string; price?: string };
export type ReceiveValue = { lineId: string; qtyMilli: number; unitCost?: Para; unitPrice?: Para };

/** Prijem robe: po redu primljena količina, nabavna i (opciono) prodajna cena. Prazan red = nije stiglo. */
export function validateReceive(rows: ReceiveRaw[]): Validated<ReceiveValue[]> {
  const errors: FieldErrors = {};
  const out: ReceiveValue[] = [];
  rows.forEach((r, i) => {
    if (!s(r.qty)) return;
    const qty = parseQuantity(s(r.qty));
    if (qty === null || qty <= 0) errors[`rows.${i}.qty`] = "Količina nije ispravna.";
    const cost = s(r.cost) ? parseMoney(s(r.cost)) : undefined;
    if (cost === null || (cost !== undefined && cost < 0)) errors[`rows.${i}.cost`] = "Nabavna cena nije ispravna.";
    const price = s(r.price) ? parseMoney(s(r.price)) : undefined;
    if (price === null || (price !== undefined && price < 0)) errors[`rows.${i}.price`] = "Cena nije ispravna.";
    out.push({ lineId: r.lineId, qtyMilli: qty ?? 0, unitCost: cost ?? undefined, unitPrice: price ?? undefined });
  });
  if (!out.length && !Object.keys(errors).length) errors.form = "Upiši količinu bar za jedan deo koji je stigao.";
  if (Object.keys(errors).length) return { ok: false, errors, warnings: {} };
  return { ok: true, value: out, warnings: {} };
}

/** Status posle prijema: sve stiglo → received; nešto → partial. */
export function statusAfterReceive(lines: { qtyMilli: number; receivedMilli: number }[]): PartsOrderStatus {
  const any = lines.some((l) => l.receivedMilli > 0);
  const all = lines.every((l) => l.receivedMilli >= l.qtyMilli);
  return all ? "received" : any ? "partial" : "sent";
}
