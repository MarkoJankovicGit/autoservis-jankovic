/**
 * Finansije: uplate na naloge, računi (nefiskalni), dugovanja mušterija, pregled perioda i CSV izvozi.
 */
import { todayIso, type IsoDate } from "../domain/dates.ts";
import {
  ageBucket,
  csvMoney,
  expenseCategory,
  expenseKind,
  EXPENSE_KIND_LABELS,
  formatDocNumber,
  inPeriod,
  paymentStatus,
  summarize,
  toCsv,
  validatePayment,
  type AgeBucket,
  type Period,
  type PaymentRaw,
  type PaymentStatus,
  type PeriodSummary,
} from "../domain/finance.ts";
import type { Customer, Expense, Invoice, Payment, ServiceOrder } from "../domain/model.ts";
import { formatQuantity } from "../domain/money.ts";
import { itemTotal, orderTotals } from "../domain/orders.ts";
import { formatPhone } from "../domain/phone.ts";
import { formatPlate } from "../domain/plate.ts";
import type { FieldErrors } from "../domain/validation.ts";
import { nowIso, read, write, type Db } from "./store/store.ts";
import { base } from "./vehicles.ts";

export type FinResult = { ok: true; id: string } | { ok: false; errors: FieldErrors };
const fail = (errors: FieldErrors) => ({ ok: false as const, errors });

export function orderTotal(db: Db, orderId: string): number {
  return orderTotals(db.orderItems.filter((i) => i.orderId === orderId)).total;
}

export function paidFor(db: Db, orderId: string): number {
  return db.payments.filter((p) => p.orderId === orderId && !p.cancelledAt).reduce((a, p) => a + p.amount, 0);
}

/** Troškovi vezani za nalog (delovi i materijal za taj auto). */
export function costsFor(db: Db, orderId: string): number {
  return db.expenses.filter((e) => e.orderId === orderId).reduce((a, e) => a + e.amount, 0);
}

export const activeInvoice = (db: Db, orderId: string) => db.invoices.find((i) => i.orderId === orderId && !i.cancelledAt);

// ---------- uplate ----------

export function addPayment(orderId: string, raw: PaymentRaw): Promise<FinResult> {
  return write((db) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) return fail({ form: "Nalog ne postoji." });
    if (order.status === "cancelled") return fail({ form: "Na otkazan nalog ne može da se evidentira uplata." });
    const r = validatePayment(raw, todayIso());
    if (!r.ok) return fail(r.errors);
    const p: Payment = { ...base(), orderId, customerId: order.customerId, ...r.value };
    db.payments.push(p);
    return { ok: true as const, id: p.id };
  });
}

export function cancelPayment(id: string, reason: string): Promise<FinResult> {
  return write((db) => {
    const p = db.payments.find((x) => x.id === id);
    if (!p) return fail({ form: "Uplata ne postoji." });
    if (p.cancelledAt) return fail({ form: "Uplata je već poništena." });
    const r = reason.trim();
    if (r.length < 2) return fail({ reason: "Upiši razlog poništavanja." });
    Object.assign(p, { cancelledAt: nowIso(), cancelReason: r.slice(0, 200), updatedAt: nowIso() });
    return { ok: true as const, id };
  });
}

export type OrderFinance = {
  total: number;
  paid: number;
  balance: number;
  status: PaymentStatus;
  payments: Payment[];
  /** troškovi vezani za nalog i zarada = iznos naloga − troškovi */
  costs: (Expense & { supplierName?: string })[];
  costTotal: number;
  profit: number;
  invoice?: Invoice;
  cancelledInvoices: Invoice[];
};

export function orderFinance(orderId: string): Promise<OrderFinance> {
  return read((db) => {
    const total = orderTotal(db, orderId);
    const paid = paidFor(db, orderId);
    const costTotal = costsFor(db, orderId);
    return {
      total,
      paid,
      balance: total - paid,
      status: paymentStatus(total, paid),
      payments: db.payments.filter((p) => p.orderId === orderId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
      costs: db.expenses
        .filter((e) => e.orderId === orderId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((e) => ({ ...e, supplierName: db.suppliers.find((x) => x.id === e.supplierId)?.name })),
      costTotal,
      profit: total - costTotal,
      invoice: activeInvoice(db, orderId),
      cancelledInvoices: db.invoices.filter((i) => i.orderId === orderId && i.cancelledAt),
    };
  });
}

/** Kratka oznaka naloga za vezu troška: broj i tablica ili vozilo. */
export function orderRef(orderId: string): Promise<{ id: string; number: string; label: string } | null> {
  return read((db) => {
    const o = db.orders.find((x) => x.id === orderId);
    if (!o) return null;
    const v = db.vehicles.find((x) => x.id === o.vehicleId);
    return { id: o.id, number: o.number, label: v?.plate ? formatPlate(v.plate) : [v?.make, v?.model].filter(Boolean).join(" ") };
  });
}

// ---------- računi ----------

export function issueInvoice(orderId: string): Promise<FinResult> {
  return write((db) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) return fail({ form: "Nalog ne postoji." });
    if (order.status !== "done") return fail({ form: "Račun se izdaje za završen nalog." });
    if (activeInvoice(db, orderId)) return fail({ form: "Za ovaj nalog račun je već izdat." });
    const items = db.orderItems.filter((i) => i.orderId === orderId).sort((a, b) => a.sortOrder - b.sortOrder);
    if (!items.length) return fail({ form: "Nalog nema stavki." });
    const c = db.customers.find((x) => x.id === order.customerId);
    const v = db.vehicles.find((x) => x.id === order.vehicleId);
    const issuedDate = todayIso();
    const year = Number(issuedDate.slice(0, 4));
    const key = `invoice:${year}`;
    db.sequences[key] = (db.sequences[key] ?? 0) + 1;
    const lines = items.map((i) => ({ kind: i.kind, name: i.name, partNumber: i.partNumber, qtyMilli: i.qtyMilli, unit: i.unit, unitPrice: i.unitPrice, discountBp: i.discountBp, total: itemTotal(i) }));
    const inv: Invoice = {
      ...base(),
      number: formatDocNumber("R", year, db.sequences[key]),
      orderId,
      customerId: order.customerId,
      issuedDate,
      customer: { name: c?.name ?? "—", address: c?.address, taxId: c?.taxId, phone: c?.phones[0]?.e164 },
      vehicle: { plate: v?.plate, make: v?.make ?? "", model: v?.model, year: v?.year, vin: v?.vin, km: order.kmOut ?? order.kmIn },
      lines,
      total: lines.reduce((a, l) => a + l.total, 0),
    };
    db.invoices.push(inv);
    return { ok: true as const, id: inv.id };
  });
}

export function cancelInvoice(id: string, reason: string): Promise<FinResult> {
  return write((db) => {
    const inv = db.invoices.find((x) => x.id === id);
    if (!inv) return fail({ form: "Račun ne postoji." });
    if (inv.cancelledAt) return fail({ form: "Račun je već poništen." });
    const r = reason.trim();
    if (r.length < 2) return fail({ reason: "Upiši razlog poništavanja." });
    Object.assign(inv, { cancelledAt: nowIso(), cancelReason: r.slice(0, 200), updatedAt: nowIso() });
    return { ok: true as const, id };
  });
}

export function getInvoice(id: string): Promise<(Invoice & { paid: number; orderNumber?: string }) | null> {
  return read((db) => {
    const inv = db.invoices.find((x) => x.id === id);
    if (!inv) return null;
    return { ...inv, paid: paidFor(db, inv.orderId), orderNumber: db.orders.find((o) => o.id === inv.orderId)?.number };
  });
}

// ---------- dugovanja ----------

export type DebtOrder = { id: string; number: string; date: IsoDate; total: number; paid: number; balance: number; bucket: AgeBucket; plate?: string };
export type CustomerDebt = { customer: Pick<Customer, "id" | "name" | "phones">; balance: number; oldest: IsoDate; bucket: AgeBucket; orders: DebtOrder[] };

function debtsIn(db: Db, today: IsoDate, customerId?: string): CustomerDebt[] {
  const map = new Map<string, CustomerDebt>();
  for (const o of db.orders) {
    if (o.status !== "done" || (customerId && o.customerId !== customerId)) continue;
    const total = orderTotal(db, o.id);
    const paid = paidFor(db, o.id);
    if (total - paid <= 0) continue;
    const c = db.customers.find((x) => x.id === o.customerId);
    if (!c) continue;
    const date = o.completedDate ?? o.receivedDate;
    const d: DebtOrder = { id: o.id, number: o.number, date, total, paid, balance: total - paid, bucket: ageBucket(date, today), plate: db.vehicles.find((v) => v.id === o.vehicleId)?.plate };
    const cur = map.get(c.id) ?? { customer: { id: c.id, name: c.name, phones: c.phones }, balance: 0, oldest: date, bucket: d.bucket, orders: [] };
    cur.balance += d.balance;
    cur.orders.push(d);
    if (date < cur.oldest) {
      cur.oldest = date;
      cur.bucket = d.bucket;
    }
    map.set(c.id, cur);
  }
  return [...map.values()].map((d) => ({ ...d, orders: d.orders.sort((a, b) => a.date.localeCompare(b.date)) })).sort((a, b) => a.oldest.localeCompare(b.oldest));
}

export function listDebts(): Promise<CustomerDebt[]> {
  return read((db) => debtsIn(db, todayIso()));
}

export type CustomerFinance = { billed: number; paid: number; owed: number; payments: (Payment & { orderNumber?: string })[] };

export function customerFinance(customerId: string): Promise<CustomerFinance> {
  return read((db) => {
    const orders = db.orders.filter((o) => o.customerId === customerId && o.status === "done");
    const billed = orders.reduce((a, o) => a + orderTotal(db, o.id), 0);
    const payments = db.payments
      .filter((p) => p.customerId === customerId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((p) => ({ ...p, orderNumber: db.orders.find((o) => o.id === p.orderId)?.number }));
    const paid = payments.filter((p) => !p.cancelledAt).reduce((a, p) => a + p.amount, 0);
    const owed = debtsIn(db, todayIso(), customerId).reduce((a, d) => a + d.balance, 0);
    return { billed, paid, owed, payments };
  });
}

// ---------- pregled perioda ----------

/** Nalog u pregledu perioda: koliko vredi, koliko je naplaćeno, koliko je koštao i šta je ostalo. */
export type OrderLine = { id: string; number: string; date: IsoDate; plate?: string; vehicle: string; total: number; paid: number; costs: number; profit: number };

export type PeriodOverview = PeriodSummary & {
  owedByCustomers: number;
  owedToSuppliers: number;
  /** nalozi završeni u periodu, najnoviji prvi */
  orders: OrderLine[];
};

export function periodOverview(period: Period): Promise<PeriodOverview> {
  return read((db) => {
    const sm = summarize({
      payments: db.payments.filter((p) => !p.cancelledAt && inPeriod(p.date, period)),
      expenses: db.expenses.filter((e) => inPeriod(e.date, period)),
    });
    const orders: OrderLine[] = db.orders
      .filter((o) => o.status === "done" && inPeriod(o.completedDate, period))
      .sort((a, b) => (b.completedDate ?? "").localeCompare(a.completedDate ?? "") || b.number.localeCompare(a.number))
      .map((o) => {
        const v = db.vehicles.find((x) => x.id === o.vehicleId);
        const total = orderTotal(db, o.id);
        const costs = costsFor(db, o.id);
        return { id: o.id, number: o.number, date: o.completedDate!, plate: v?.plate, vehicle: [v?.make, v?.model].filter(Boolean).join(" "), total, paid: paidFor(db, o.id), costs, profit: total - costs };
      });
    return {
      ...sm,
      owedByCustomers: debtsIn(db, todayIso()).reduce((a, d) => a + d.balance, 0),
      owedToSuppliers: db.expenses.filter((e) => !e.paidDate).reduce((a, e) => a + e.amount, 0),
      orders,
    };
  });
}

export type PaymentRow = Payment & { orderNumber?: string; customerName?: string; plate?: string };

export function paymentsInPeriod(period: Period): Promise<PaymentRow[]> {
  return read((db) =>
    db.payments
      .filter((p) => inPeriod(p.date, period))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .map((p) => {
        const o = db.orders.find((x) => x.id === p.orderId);
        return { ...p, orderNumber: o?.number, customerName: db.customers.find((c) => c.id === p.customerId)?.name, plate: db.vehicles.find((v) => v.id === o?.vehicleId)?.plate };
      }),
  );
}

// ---------- CSV ----------

export type ExportKind = "uplate" | "troskovi" | "nalozi";

export function exportCsv(kind: ExportKind, period: Period): Promise<string> {
  return read((db) => {
    if (kind === "uplate") {
      const rows = db.payments.filter((p) => inPeriod(p.date, period)).sort((a, b) => a.date.localeCompare(b.date));
      return toCsv([
        ["Datum", "Nalog", "Klijent", "Iznos (RSD)", "Napomena", "Poništeno"],
        ...rows.map((p) => [p.date, db.orders.find((o) => o.id === p.orderId)?.number, db.customers.find((c) => c.id === p.customerId)?.name, csvMoney(p.amount), p.note, p.cancelledAt ? `da: ${p.cancelReason ?? ""}` : ""]),
      ]);
    }
    if (kind === "troskovi") {
      const rows = db.expenses.filter((e) => inPeriod(e.date, period)).sort((a, b) => a.date.localeCompare(b.date));
      return toCsv([
        ["Datum", "Trošak/investicija", "Kategorija", "Opis", "Nalog", "Dobavljač", "Broj računa", "Iznos (RSD)", "Plaćeno", "Rok"],
        ...rows.map((e) => [
          e.date, EXPENSE_KIND_LABELS[expenseKind(e.category)], expenseCategory(e.category)?.label, e.description, db.orders.find((o) => o.id === e.orderId)?.number,
          db.suppliers.find((s) => s.id === e.supplierId)?.name, e.documentNo, csvMoney(e.amount), e.paidDate ?? "ne", e.dueDate,
        ]),
      ]);
    }
    const orders: ServiceOrder[] = db.orders.filter((o) => o.status === "done" && inPeriod(o.completedDate, period)).sort((a, b) => (a.completedDate ?? "").localeCompare(b.completedDate ?? ""));
    return toCsv([
      ["Završen", "Nalog", "Klijent", "Telefon", "Tablica", "Vozilo", "Stavke", "Ukupno (RSD)", "Plaćeno (RSD)", "Duguje (RSD)", "Troškovi (RSD)", "Zarada (RSD)"],
      ...orders.map((o) => {
        const items = db.orderItems.filter((i) => i.orderId === o.id);
        const t = orderTotals(items);
        const paid = paidFor(db, o.id);
        const costs = costsFor(db, o.id);
        const c = db.customers.find((x) => x.id === o.customerId);
        const v = db.vehicles.find((x) => x.id === o.vehicleId);
        return [
          o.completedDate, o.number, c?.name, c?.phones[0] ? formatPhone(c.phones[0].e164) : "", v?.plate ? formatPlate(v.plate) : "", [v?.make, v?.model].filter(Boolean).join(" "),
          items.map((i) => `${i.name} ${formatQuantity(i.qtyMilli)} ${i.unit}`).join(", "),
          csvMoney(t.total), csvMoney(paid), csvMoney(Math.max(0, t.total - paid)), csvMoney(costs), csvMoney(t.total - costs),
        ];
      }),
    ]);
  });
}
