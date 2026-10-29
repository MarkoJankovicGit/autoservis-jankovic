/**
 * Radni nalozi i stavke: pravila, validacija i obračun. Radnja nije obveznik PDV-a.
 * Status je namerno jednostavan: u radu → završen; otkazan kao izuzetak.
 * „Čeka deo“ se ne unosi, nego se izvodi iz narudžbenice koja nije stigla (Iteracija 3).
 */
import { lineTotal, parseMoney, parseQuantity, sum, type Para } from "./money.ts";
import type { FieldErrors, Validated } from "./validation.ts";

export const ORDER_STATUSES = ["open", "done", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  open: "U radu",
  done: "Završen",
  cancelled: "Otkazan",
};

/** Dozvoljeni prelazi. Vraćanje iz „završen“ u „u radu“ ide dok račun nije izdat (proverava servisni sloj). */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  open: ["done", "cancelled"],
  done: ["open"],
  cancelled: ["open"],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export const ITEM_KINDS = ["labor", "part", "material"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  labor: "Rad",
  part: "Deo",
  material: "Materijal",
};

/** Za zbirove po vrsti („Delovi: 2.400 RSD“). */
export const ITEM_KIND_TOTAL_LABELS: Record<ItemKind, string> = {
  labor: "Rad",
  part: "Delovi",
  material: "Materijal",
};

export const UNITS = ["kom", "h", "l", "kg", "m", "kompl."] as const;

export const DEFAULT_UNIT: Record<ItemKind, string> = { labor: "h", part: "kom", material: "l" };

/** Brojevi naloga: "2026-0001", brojač po godini. */
export function formatOrderNumber(year: number, seq: number): string {
  return `${year}-${String(seq).padStart(4, "0")}`;
}

// ---------- stavke ----------

export type ItemRaw = {
  kind?: string;
  name?: string;
  qty?: string;
  unit?: string;
  price?: string;
  cost?: string;
  discount?: string;
  partNumber?: string;
};

export type ItemValue = {
  kind: ItemKind;
  name: string;
  qtyMilli: number;
  unit: string;
  unitPrice: Para;
  unitCost?: Para;
  discountBp: number;
  partNumber?: string;
};

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function validateItem(raw: ItemRaw): Validated<ItemValue> {
  const errors: FieldErrors = {};
  const kind = (ITEM_KINDS as readonly string[]).includes(s(raw.kind)) ? (s(raw.kind) as ItemKind) : "labor";

  const name = s(raw.name).replace(/\s+/g, " ");
  if (!name) errors.name = "Unesi naziv stavke.";
  else if (name.length > 120) errors.name = "Najviše 120 znakova.";

  const qtyMilli = s(raw.qty) ? parseQuantity(s(raw.qty)) : 1000;
  if (qtyMilli === null || qtyMilli <= 0 || qtyMilli > 100_000_000) errors.qty = "Količina je broj veći od 0, do 3 decimale.";

  const unit = s(raw.unit) || DEFAULT_UNIT[kind];
  if (unit.length > 10) errors.unit = "Najviše 10 znakova.";

  const unitPrice = s(raw.price) ? parseMoney(s(raw.price)) : 0;
  if (unitPrice === null || unitPrice < 0) errors.price = "Cena nije ispravna (npr. 2.400 ili 2400,50).";

  let unitCost: Para | undefined;
  if (kind !== "labor" && s(raw.cost)) {
    const c = parseMoney(s(raw.cost));
    if (c === null || c < 0) errors.cost = "Nabavna cena nije ispravna.";
    else unitCost = c;
  }

  let discountBp = 0;
  if (s(raw.discount)) {
    const d = Number(s(raw.discount).replace(",", ".").replace("%", ""));
    if (!Number.isFinite(d) || d < 0 || d > 100) errors.discount = "Popust je između 0 i 100 %.";
    else discountBp = Math.round(d * 100);
  }

  const partNumber = kind === "labor" ? undefined : s(raw.partNumber) || undefined;
  if (partNumber && partNumber.length > 40) errors.partNumber = "Najviše 40 znakova.";

  if (Object.keys(errors).length) return { ok: false, errors, warnings: {} };
  return { ok: true, value: { kind, name, qtyMilli: qtyMilli!, unit, unitPrice: unitPrice!, unitCost, discountBp, partNumber }, warnings: {} };
}

export type PricedItem = Pick<ItemValue, "kind" | "qtyMilli" | "unitPrice" | "unitCost" | "discountBp">;

export function itemTotal(i: PricedItem): Para {
  return lineTotal(i.qtyMilli, i.unitPrice, i.discountBp);
}

/** Nabavna vrednost stavke (bez popusta: popust smanjuje prihod, ne trošak). */
export function itemCost(i: PricedItem): Para | null {
  if (i.unitCost === undefined) return null;
  return lineTotal(i.qtyMilli, i.unitCost, 0);
}

export type OrderTotals = {
  total: Para;
  byKind: Record<ItemKind, Para>;
  discount: Para;
  /** nabavna vrednost delova i materijala za koje je uneta */
  cost: Para;
  /** zarada = ukupno − nabavna vrednost; samo stavke sa unetom nabavnom cenom ulaze u trošak */
  profit: Para;
  /** broj delova/materijala bez nabavne cene (zarada je tada precenjena) */
  missingCost: number;
};

export function orderTotals(items: PricedItem[]): OrderTotals {
  const byKind: Record<ItemKind, Para> = { labor: 0, part: 0, material: 0 };
  let discount = 0;
  let cost = 0;
  let missingCost = 0;
  for (const i of items) {
    const t = itemTotal(i);
    byKind[i.kind] += t;
    discount += lineTotal(i.qtyMilli, i.unitPrice, 0) - t;
    const c = itemCost(i);
    if (c !== null) cost += c;
    else if (i.kind !== "labor") missingCost++;
  }
  const total = sum(Object.values(byKind));
  return { total, byKind, discount, cost, profit: total - cost, missingCost };
}

// ---------- prijem ----------

/** Česti razlozi dolaska, kao brzi izbor na prijemu. */
export const COMMON_COMPLAINTS = ["Redovan servis", "Mali servis", "Veliki servis", "Kočnice", "Buka", "Lampica na tabli", "Klima", "Gume", "Tehnički pregled", "Ne pali"];
