/**
 * Finansije: prihodi (uplate na naloge), troškovi, investicije, dugovanja, pregled perioda, CSV.
 * Profit = prihodi − troškovi; saldo = profit − investicije.
 * Trošak može biti vezan za nalog (delovi za taj auto), pa se zarada vidi i po nalogu.
 */
import { addDays, addMonths, daysBetween, isIsoDate, type IsoDate } from "./dates.ts";
import { parseMoney, type Para } from "./money.ts";
import type { FieldErrors, Validated } from "./validation.ts";

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// ---------- uplate ----------

export type PaymentStatus = "none" | "unpaid" | "partial" | "paid" | "overpaid";
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  none: "Bez iznosa",
  unpaid: "Nije plaćeno",
  partial: "Delimično plaćeno",
  paid: "Plaćeno",
  overpaid: "Preplaćeno",
};

export function paymentStatus(total: Para, paid: Para): PaymentStatus {
  if (total <= 0) return paid > 0 ? "overpaid" : "none";
  if (paid <= 0) return "unpaid";
  if (paid < total) return "partial";
  return paid === total ? "paid" : "overpaid";
}

/** Beleži se samo iznos i datum; način naplate se ne vodi. */
export type PaymentRaw = { amount?: string; date?: string; note?: string };
export type PaymentValue = { amount: Para; date: IsoDate; note?: string };

export function validatePayment(raw: PaymentRaw, today: IsoDate): Validated<PaymentValue> {
  const errors: FieldErrors = {};
  const amount = parseMoney(s(raw.amount));
  if (amount === null || amount <= 0) errors.amount = "Unesi iznos veći od 0 (npr. 5.000 ili 5000,50).";
  const date = s(raw.date) || today;
  if (!isIsoDate(date)) errors.date = "Datum nije ispravan.";
  else if (date > today) errors.date = "Datum uplate ne može biti u budućnosti.";
  const note = s(raw.note) || undefined;
  if (note && note.length > 200) errors.note = "Najviše 200 znakova.";
  if (Object.keys(errors).length) return { ok: false, errors, warnings: {} };
  return { ok: true, value: { amount: amount!, date, note }, warnings: {} };
}

// ---------- troškovi i investicije ----------

/** Trošak umanjuje profit; investicija (alat, oprema, uređenje) umanjuje samo saldo. */
export type ExpenseKind = "cost" | "investment";
export const EXPENSE_KINDS: ExpenseKind[] = ["cost", "investment"];
export const EXPENSE_KIND_LABELS: Record<ExpenseKind, string> = { cost: "Trošak", investment: "Investicija" };
export const EXPENSE_CATEGORIES = [
  { key: "parts", label: "Delovi", kind: "cost" },
  { key: "material", label: "Materijal", kind: "cost" },
  { key: "rent", label: "Kirija", kind: "cost" },
  { key: "utilities", label: "Struja, voda, grejanje", kind: "cost" },
  { key: "salaries", label: "Plate", kind: "cost" },
  { key: "taxes", label: "Porezi i doprinosi", kind: "cost" },
  { key: "accounting", label: "Knjigovođa", kind: "cost" },
  { key: "other", label: "Ostalo", kind: "cost" },
  { key: "tools", label: "Alat", kind: "investment" },
  { key: "equipment", label: "Oprema i uređaji", kind: "investment" },
  { key: "workshop", label: "Uređenje radionice", kind: "investment" },
  { key: "other_investment", label: "Ostalo", kind: "investment" },
] as const satisfies readonly { key: string; label: string; kind: ExpenseKind }[];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["key"];

/** Stare vrste iz prve verzije (fiksni/varijabilni) vode na „Ostalo“. */
const LEGACY_CATEGORY: Record<string, ExpenseCategory> = { other_fixed: "other", other_variable: "other" };

export function expenseCategory(key: string) {
  const k = LEGACY_CATEGORY[key] ?? key;
  return EXPENSE_CATEGORIES.find((c) => c.key === k);
}

/** Nepoznata vrsta se računa kao trošak (sigurnije za profit nego da se izgubi). */
export const expenseKind = (category: string): ExpenseKind => expenseCategory(category)?.kind ?? "cost";

export type ExpenseRaw = {
  date?: string;
  category?: string;
  amount?: string;
  description?: string;
  supplierId?: string;
  orderId?: string;
  paid?: string; // "1" = plaćeno
  paidDate?: string;
  dueDate?: string;
  documentNo?: string;
  note?: string;
};

export type ExpenseValue = {
  date: IsoDate;
  category: ExpenseCategory;
  amount: Para;
  description: string;
  supplierId?: string;
  orderId?: string; // trošak za konkretan nalog (npr. delovi za taj auto)
  paidDate?: IsoDate; // prazno = nije plaćeno
  dueDate?: IsoDate;
  documentNo?: string;
  note?: string;
};

export function validateExpense(raw: ExpenseRaw, today: IsoDate): Validated<ExpenseValue> {
  const errors: FieldErrors = {};
  const date = s(raw.date) || today;
  if (!isIsoDate(date)) errors.date = "Datum nije ispravan.";
  const cat = expenseCategory(s(raw.category));
  if (!cat) errors.category = "Izaberi vrstu troška.";
  const amount = parseMoney(s(raw.amount));
  if (amount === null || amount <= 0) errors.amount = "Unesi iznos veći od 0.";
  const description = s(raw.description).replace(/\s+/g, " ");
  if (!description) errors.description = "Upiši šta je plaćeno ili kupljeno.";
  else if (description.length > 120) errors.description = "Najviše 120 znakova.";
  let paidDate: string | undefined;
  if (s(raw.paid) === "1") {
    paidDate = s(raw.paidDate) || (isIsoDate(date) ? date : today);
    if (!isIsoDate(paidDate)) errors.paidDate = "Datum plaćanja nije ispravan.";
  }
  const dueDate = s(raw.dueDate) || undefined;
  if (dueDate && !isIsoDate(dueDate)) errors.dueDate = "Rok nije ispravan.";
  const documentNo = s(raw.documentNo) || undefined;
  if (documentNo && documentNo.length > 40) errors.documentNo = "Najviše 40 znakova.";
  const note = s(raw.note) || undefined;
  if (note && note.length > 500) errors.note = "Najviše 500 znakova.";
  if (Object.keys(errors).length) return { ok: false, errors, warnings: {} };
  return {
    ok: true,
    value: { date, category: cat!.key, amount: amount!, description, supplierId: s(raw.supplierId) || undefined, orderId: s(raw.orderId) || undefined, paidDate, dueDate: paidDate ? undefined : dueDate, documentNo, note },
    warnings: {},
  };
}

// ---------- dugovanja ----------

export type AgeBucket = "0-30" | "31-60" | "61-90" | "90+";
export function ageBucket(since: IsoDate, today: IsoDate): AgeBucket {
  const d = daysBetween(since, today);
  return d <= 30 ? "0-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : "90+";
}

// ---------- period ----------

export type Period = { from: IsoDate; to: IsoDate };

export function monthOf(d: IsoDate): Period {
  const from = `${d.slice(0, 7)}-01` as IsoDate;
  return { from, to: addDays(addMonths(from, 1), -1) };
}

export function periodPresets(today: IsoDate): { key: string; label: string; period: Period }[] {
  const thisMonth = monthOf(today);
  const lastMonth = monthOf(addMonths(thisMonth.from, -1));
  const y = today.slice(0, 4);
  return [
    { key: "mesec", label: "Ovaj mesec", period: thisMonth },
    { key: "prosli", label: "Prošli mesec", period: lastMonth },
    { key: "90", label: "Poslednjih 90 dana", period: { from: addDays(today, -89), to: today } },
    { key: "godina", label: `${y}. godina`, period: { from: `${y}-01-01`, to: `${y}-12-31` } },
  ];
}

export const inPeriod = (d: IsoDate | undefined, p: Period) => !!d && d >= p.from && d <= p.to;

export type PeriodSummary = {
  /** uplate u periodu */
  income: Para;
  costs: Para;
  investments: Para;
  /** prihodi − troškovi */
  profit: Para;
  /** profit − investicije: koliko je stvarno ostalo */
  balance: Para;
};

export function summarize(input: { payments: { amount: Para }[]; expenses: { amount: Para; category: string }[] }): PeriodSummary {
  const income = input.payments.reduce((a, p) => a + p.amount, 0);
  let costs = 0;
  let investments = 0;
  for (const e of input.expenses) {
    if (expenseKind(e.category) === "investment") investments += e.amount;
    else costs += e.amount;
  }
  const profit = income - costs;
  return { income, costs, investments, profit, balance: profit - investments };
}

// ---------- CSV za Excel ----------

/** CSV sa „;“ (Excel sa srpskim podešavanjima) i BOM-om da se č, ć, š, ž, đ vide ispravno. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const t = v === null || v === undefined ? "" : String(v);
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

/** Iznos za CSV: "12450,50" (decimalni zarez, bez razdvajanja hiljada, da ga Excel čita kao broj). */
export const csvMoney = (p: Para) => (p / 100).toFixed(2).replace(".", ",");

// ---------- brojevi dokumenata ----------

export const formatDocNumber = (prefix: "R" | "N", year: number, seq: number) => `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
