/**
 * Dobavljači, troškovi i investicije, uz evidenciju šta je plaćeno, a šta nije.
 * Trošak može biti vezan za nalog, pa se vidi i zarada po nalogu.
 */
import { todayIso } from "../domain/dates.ts";
import { expenseKind, inPeriod, validateExpense, type ExpenseKind, type ExpenseRaw, type ExpenseValue, type Period } from "../domain/finance.ts";
import type { Expense, PartsOrder, Supplier } from "../domain/model.ts";
import { isWaiting } from "../domain/parts-orders.ts";
import { normalizePhone } from "../domain/phone.ts";
import { foldText } from "../domain/text.ts";
import type { FieldErrors } from "../domain/validation.ts";
import { nowIso, read, write } from "./store/json-store.ts";
import { base } from "./vehicles.ts";

export type SupResult = { ok: true; id: string } | { ok: false; errors: FieldErrors };
const fail = (errors: FieldErrors) => ({ ok: false as const, errors });
const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// ---------- dobavljači ----------

export type SupplierRaw = { name?: string; phone?: string; email?: string; contactPerson?: string; note?: string };

function validateSupplier(raw: SupplierRaw) {
  const errors: FieldErrors = {};
  const name = s(raw.name).replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Unesi naziv dobavljača.";
  else if (name.length > 100) errors.name = "Najviše 100 znakova.";
  let phone: string | undefined;
  if (s(raw.phone)) {
    const r = normalizePhone(s(raw.phone));
    if (!r.ok) errors.phone = r.error;
    else phone = r.e164;
  }
  const email = s(raw.email).toLowerCase() || undefined;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Email nije ispravan.";
  const contactPerson = s(raw.contactPerson) || undefined;
  const note = s(raw.note) || undefined;
  if (contactPerson && contactPerson.length > 80) errors.contactPerson = "Najviše 80 znakova.";
  if (note && note.length > 1000) errors.note = "Najviše 1.000 znakova.";
  return { errors, value: { name, phone, email, contactPerson, note } };
}

export function createSupplier(raw: SupplierRaw): Promise<SupResult> {
  return write((db) => {
    const { errors, value } = validateSupplier(raw);
    if (Object.keys(errors).length) return fail(errors);
    if (db.suppliers.some((x) => !x.archivedAt && foldText(x.name) === foldText(value.name))) return fail({ name: "Dobavljač sa ovim nazivom već postoji." });
    const sup: Supplier = { ...base(), ...value };
    db.suppliers.push(sup);
    return { ok: true as const, id: sup.id };
  });
}

export function updateSupplier(id: string, raw: SupplierRaw): Promise<SupResult> {
  return write((db) => {
    const sup = db.suppliers.find((x) => x.id === id);
    if (!sup) return fail({ form: "Dobavljač ne postoji." });
    const { errors, value } = validateSupplier(raw);
    if (Object.keys(errors).length) return fail(errors);
    if (db.suppliers.some((x) => x.id !== id && !x.archivedAt && foldText(x.name) === foldText(value.name))) return fail({ name: "Dobavljač sa ovim nazivom već postoji." });
    Object.assign(sup, value, { updatedAt: nowIso() });
    return { ok: true as const, id };
  });
}

export function setSupplierArchived(id: string, archived: boolean): Promise<boolean> {
  return write((db) => {
    const sup = db.suppliers.find((x) => x.id === id);
    if (!sup) return false;
    sup.archivedAt = archived ? nowIso() : undefined;
    sup.updatedAt = nowIso();
    return true;
  });
}

export type SupplierListItem = Supplier & { unpaid: number; unpaidCount: number; waiting: number };

export function listSuppliers({ q = "", archived = false } = {}): Promise<SupplierListItem[]> {
  return read((db) =>
    db.suppliers
      .filter((x) => (archived ? !!x.archivedAt : !x.archivedAt))
      .filter((x) => !q.trim() || foldText([x.name, x.contactPerson, x.email].filter(Boolean).join(" ")).includes(foldText(q)))
      .map((x) => {
        const unpaid = db.expenses.filter((e) => e.supplierId === x.id && !e.paidDate);
        return { ...x, unpaid: unpaid.reduce((a, e) => a + e.amount, 0), unpaidCount: unpaid.length, waiting: db.partsOrders.filter((p) => p.supplierId === x.id && isWaiting(p.status)).length };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "sr-Latn")),
  );
}

export function getSupplier(id: string): Promise<{ supplier: Supplier; expenses: Expense[]; partsOrders: PartsOrder[] } | null> {
  return read((db) => {
    const supplier = db.suppliers.find((x) => x.id === id);
    if (!supplier) return null;
    return {
      supplier,
      expenses: db.expenses.filter((e) => e.supplierId === id).sort((a, b) => Number(!!a.paidDate) - Number(!!b.paidDate) || b.date.localeCompare(a.date)),
      partsOrders: db.partsOrders.filter((p) => p.supplierId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  });
}

export function supplierOptions(): Promise<{ id: string; name: string }[]> {
  return read((db) => db.suppliers.filter((x) => !x.archivedAt).sort((a, b) => a.name.localeCompare(b.name, "sr-Latn")).map(({ id, name }) => ({ id, name })));
}

// ---------- troškovi ----------

function checkRefs(db: { suppliers: { id: string }[]; orders: { id: string }[] }, v: ExpenseValue) {
  if (v.supplierId && !db.suppliers.some((x) => x.id === v.supplierId)) return fail({ supplierId: "Izaberi dobavljača sa liste." });
  if (v.orderId && !db.orders.some((x) => x.id === v.orderId)) return fail({ form: "Nalog ne postoji." });
  return null;
}

export function createExpense(raw: ExpenseRaw): Promise<SupResult> {
  return write((db) => {
    const r = validateExpense(raw, todayIso());
    if (!r.ok) return fail(r.errors);
    const bad = checkRefs(db, r.value);
    if (bad) return bad;
    const e: Expense = { ...base(), ...r.value };
    db.expenses.push(e);
    return { ok: true as const, id: e.id };
  });
}

export function updateExpense(id: string, raw: ExpenseRaw): Promise<SupResult> {
  return write((db) => {
    const e = db.expenses.find((x) => x.id === id);
    if (!e) return fail({ form: "Trošak ne postoji." });
    const r = validateExpense(raw, todayIso());
    if (!r.ok) return fail(r.errors);
    const bad = checkRefs(db, r.value);
    if (bad) return bad;
    const v = r.value;
    Object.assign(e, {
      date: v.date, category: v.category, amount: v.amount, description: v.description, supplierId: v.supplierId, orderId: v.orderId,
      paidDate: v.paidDate, dueDate: v.dueDate, documentNo: v.documentNo, note: v.note, updatedAt: nowIso(),
    });
    return { ok: true as const, id };
  });
}

export function deleteExpense(id: string): Promise<boolean> {
  return write((db) => {
    const i = db.expenses.findIndex((x) => x.id === id);
    if (i < 0) return false;
    db.expenses.splice(i, 1);
    return true;
  });
}

export function payExpense(id: string, date?: string): Promise<SupResult> {
  return write((db) => {
    const e = db.expenses.find((x) => x.id === id);
    if (!e) return fail({ form: "Trošak ne postoji." });
    if (e.paidDate) return fail({ form: "Trošak je već plaćen." });
    const d = s(date) || todayIso();
    if (d > todayIso()) return fail({ paidDate: "Datum plaćanja ne može biti u budućnosti." });
    Object.assign(e, { paidDate: d, dueDate: undefined, updatedAt: nowIso() });
    return { ok: true as const, id };
  });
}

export type ExpenseRow = Expense & { supplierName?: string; orderNumber?: string; kind: ExpenseKind; overdue: boolean };

export function listExpenses({ period, kind, unpaid = false, supplierId }: { period?: Period; kind?: ExpenseKind; unpaid?: boolean; supplierId?: string } = {}): Promise<ExpenseRow[]> {
  return read((db) => {
    const today = todayIso();
    return db.expenses
      .filter((e) => (!period || inPeriod(e.date, period)) && (!unpaid || !e.paidDate) && (!supplierId || e.supplierId === supplierId))
      .map((e) => ({
        ...e,
        supplierName: db.suppliers.find((x) => x.id === e.supplierId)?.name,
        orderNumber: db.orders.find((x) => x.id === e.orderId)?.number,
        kind: expenseKind(e.category),
        overdue: !e.paidDate && !!e.dueDate && e.dueDate < today,
      }))
      .filter((e) => !kind || e.kind === kind)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  });
}

export function getExpense(id: string): Promise<Expense | null> {
  return read((db) => db.expenses.find((x) => x.id === id) ?? null);
}
