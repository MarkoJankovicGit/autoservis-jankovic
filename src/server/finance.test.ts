import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { todayIso } from "../domain/dates.ts";
import { monthOf } from "../domain/finance.ts";

let dir: string;
let cwd: string;
let O: typeof import("./orders.ts");
let F: typeof import("./finance.ts");
let S: typeof import("./suppliers.ts");
let P: typeof import("./parts-orders.ts");

before(async () => {
  cwd = process.cwd();
  dir = await mkdtemp(path.join(tmpdir(), "jk-fin-"));
  process.chdir(dir);
  O = await import("./orders.ts");
  F = await import("./finance.ts");
  S = await import("./suppliers.ts");
  P = await import("./parts-orders.ts");
});
after(async () => {
  process.chdir(cwd);
  await rm(dir, { recursive: true, force: true });
});

let n = 0;
async function doneOrder(items: { kind: string; name: string; qty?: string; price: string; cost?: string }[], complete = true) {
  n++;
  const r = await O.createOrderFromIntake({
    vehicle: { mode: "new", raw: { plate: `VA ${100 + n}-FN`, make: "Opel", vin: `WVWZZZ1JZ3W0000${String(n).padStart(2, "0")}` } },
    owner: { mode: "new", customer: { name: `Kupac ${n}`, phones: [`06412300${String(n).padStart(2, "0")}`] } },
    kmIn: "100000",
    complaint: "Servis",
  });
  assert.ok(r.ok, JSON.stringify(r));
  const id = (r as { id: string }).id;
  for (const i of items) assert.ok((await O.addItem(id, i)).ok);
  if (complete) assert.ok((await O.completeOrder(id, { date: "", workDone: "Urađeno", reminders: [], closeReminderIds: [] })).ok);
  return id;
}

test("uplate: delimično, plaćeno, poništena uplata, greške", async () => {
  const id = await doneOrder([{ kind: "labor", name: "Rad", price: "3000" }, { kind: "part", name: "Filter", price: "2000", cost: "1200" }]);
  let f = await F.orderFinance(id);
  assert.equal(f.total, 500000);
  assert.equal(f.status, "unpaid");
  assert.ok((await F.addPayment(id, { amount: "2.000" })).ok);
  f = await F.orderFinance(id);
  assert.equal(f.status, "partial");
  assert.equal(f.balance, 300000);
  const p2 = await F.addPayment(id, { amount: "3000" });
  assert.ok(p2.ok);
  assert.equal((await F.orderFinance(id)).status, "paid");
  if (!p2.ok) return;
  assert.equal((await F.cancelPayment(p2.id, "")).ok, false);
  assert.ok((await F.cancelPayment(p2.id, "Greška u iznosu")).ok);
  f = await F.orderFinance(id);
  assert.equal(f.status, "partial");
  assert.equal(f.payments.length, 2); // poništena ostaje vidljiva
  assert.equal((await F.cancelPayment(p2.id, "opet")).ok, false);
  assert.equal((await F.addPayment(id, { amount: "0" })).ok, false);
});

test("dugovanja i finansije klijenta", async () => {
  const id = await doneOrder([{ kind: "labor", name: "Rad", price: "10000" }]);
  await F.addPayment(id, { amount: "4000" });
  const debts = await F.listDebts();
  const d = debts.find((x) => x.orders.some((o) => o.id === id));
  assert.equal(d?.balance, 600000);
  assert.equal(d?.bucket, "0-30");
  const cf = await F.customerFinance(d!.customer.id);
  assert.equal(cf.billed, 1000000);
  assert.equal(cf.paid, 400000);
  assert.equal(cf.owed, 600000);
  // nalog u radu nije dug
  const open = await doneOrder([{ kind: "labor", name: "Rad", price: "5000" }], false);
  assert.ok(!(await F.listDebts()).some((x) => x.orders.some((o) => o.id === open)));
});

test("račun: izdavanje, zamrznut snimak, blokada vraćanja u rad, poništavanje", async () => {
  const open = await doneOrder([{ kind: "labor", name: "Rad", price: "1000" }], false);
  assert.equal((await F.issueInvoice(open)).ok, false); // nalog u radu
  const id = await doneOrder([{ kind: "part", name: "Akumulator 74Ah", price: "12000", cost: "9000" }]);
  const r = await F.issueInvoice(id);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal((await F.issueInvoice(id)).ok, false); // drugi račun
  const inv = await F.getInvoice(r.id);
  assert.match(inv!.number, new RegExp(`^R-${todayIso().slice(0, 4)}-\\d{4}$`));
  assert.equal(inv?.total, 1200000);
  assert.equal(inv?.lines[0].name, "Akumulator 74Ah");
  assert.equal(JSON.stringify(inv).includes("9000"), false); // nabavna cena nije u računu
  const re = await O.reopenOrder(id);
  assert.equal(re.ok, false);
  if (!re.ok) assert.match(re.errors.form, /Poništi račun/);
  assert.ok((await F.cancelInvoice(r.id, "Pogrešna stavka")).ok);
  assert.ok((await O.reopenOrder(id)).ok);
  const r2 = await (async () => {
    await O.completeOrder(id, { date: "", workDone: "Urađeno", reminders: [], closeReminderIds: [] });
    return F.issueInvoice(id);
  })();
  assert.ok(r2.ok);
  const inv2 = await F.getInvoice((r2 as { id: string }).id);
  assert.notEqual(inv2?.number, inv?.number); // novi broj, stari ostaje poništen
});

test("dobavljači i troškovi: duplikat naziva, neplaćeno, plaćanje, filteri", async () => {
  const s1 = await S.createSupplier({ name: "Auto Delovi Plus", phone: "014 222 444", email: "Prodaja@AutoPlus.rs" });
  assert.ok(s1.ok);
  assert.equal((await S.createSupplier({ name: "auto delovi plus" })).ok, false);
  assert.equal((await S.createSupplier({ name: "X", phone: "123", email: "x@" })).ok, false);
  if (!s1.ok) return;
  const e1 = await S.createExpense({ category: "parts", amount: "15.000", description: "Diskovi i pločice", supplierId: s1.id, dueDate: "2026-12-01" });
  const e2 = await S.createExpense({ category: "rent", amount: "40000", description: "Kirija", paid: "1" });
  assert.ok(e1.ok && e2.ok);
  assert.equal((await S.createExpense({ category: "parts", amount: "1", description: "x", supplierId: "nepostoji" })).ok, false);
  const list = await S.listSuppliers();
  const sup = list.find((x) => x.id === s1.id);
  assert.equal(sup?.unpaid, 1500000);
  assert.equal(sup?.email, "prodaja@autoplus.rs");
  assert.equal((await S.listExpenses({ unpaid: true })).length, 1);
  assert.equal((await S.listExpenses({ kind: "cost" })).length, 2);
  const inv = await S.createExpense({ category: "equipment", amount: "120000", description: "Dizalica", paid: "1" });
  assert.ok(inv.ok);
  assert.equal((await S.listExpenses({ kind: "investment" })).length, 1);
  assert.equal((await S.createExpense({ category: "parts", amount: "1", description: "x", orderId: "nepostoji" })).ok, false);
  if (inv.ok) assert.ok(await S.deleteExpense(inv.id));
  if (!e1.ok) return;
  assert.equal((await S.payExpense(e1.id, "2999-01-01")).ok, false);
  assert.ok((await S.payExpense(e1.id)).ok);
  assert.equal((await S.payExpense(e1.id)).ok, false);
  assert.equal((await S.listSuppliers()).find((x) => x.id === s1.id)?.unpaid, 0);
  assert.ok((await S.updateExpense(e1.id, { category: "parts", amount: "16000", description: "Diskovi i pločice", supplierId: s1.id })).ok);
  assert.equal((await S.getExpense(e1.id))?.paidDate, undefined); // izmena bez „plaćeno“ vraća u neplaćeno
  assert.ok(await S.deleteExpense(e1.id));
});

test("narudžbenica: link za dobavljača bez podataka klijenta, prijem u nalog, trošak, čeka deo", async () => {
  const sup = await S.createSupplier({ name: "Delovi Kolubara" });
  assert.ok(sup.ok);
  if (!sup.ok) return;
  const orderId = await doneOrder([{ kind: "labor", name: "Pregled trapa", price: "2000" }], false);
  const po = await P.createPartsOrder({ orderId, raw: { supplierId: sup.id, neededBy: "2026-11-05", note: "Treba do četvrtka", lines: [{ name: "Krajnik spone desni", partNumber: "TRW JTE123", qty: "1" }, { name: "Manžetna", qty: "2" }] } });
  assert.ok(po.ok);
  if (!po.ok) return;
  let d = await P.getPartsOrder(po.id);
  assert.equal(d?.status, "draft");
  assert.match(d!.number, /^N-\d{4}-\d{4}$/);
  assert.equal(d?.vehicle?.make, "Opel");

  const link = await P.createShareLink(po.id);
  assert.ok(link.ok);
  if (!link.ok) return;
  d = await P.getPartsOrder(po.id);
  assert.equal(d?.status, "sent");
  assert.notEqual(d?.shareTokenHash, link.token); // u bazi samo heš
  assert.ok((await O.listOrders({ status: "waiting" })).some((o) => o.id === orderId));

  const pub = await P.getPublicPartsOrder(link.token);
  assert.equal(pub?.lines.length, 2);
  assert.equal(pub?.vehicle?.vin?.length, 17);
  const json = JSON.stringify(pub);
  for (const forbidden of ["Kupac", "064", "VA1", "100000", "Pregled trapa", "Servis"]) assert.equal(json.includes(forbidden), false, forbidden);
  assert.equal(await P.getPublicPartsOrder("pogresan-token-pogresan-token"), null);
  assert.equal(await P.getPublicPartsOrder("<script>"), null);
  assert.equal((await P.getPartsOrder(po.id))?.shareOpens, 1);

  const lines = d!.lines;
  const bad = await P.receiveParts(po.id, [{ lineId: lines[0].id }], { addToOrder: true, createExpense: true, paid: false });
  assert.equal(bad.ok, false);
  const r1 = await P.receiveParts(po.id, [{ lineId: lines[0].id, qty: "1", cost: "2.900", price: "4.200" }], { addToOrder: true, createExpense: true, paid: false });
  assert.ok(r1.ok, JSON.stringify(r1));
  assert.equal((await P.getPartsOrder(po.id))?.status, "partial");
  const od = await O.getOrder(orderId);
  const added = od?.items.find((i) => i.name === "Krajnik spone desni");
  assert.equal(added?.unitPrice, 420000);
  assert.equal(added?.unitCost, 290000);
  assert.equal(added?.partNumber, "TRW JTE123");
  const exp = (await S.listExpenses({ supplierId: sup.id }))[0];
  assert.equal(exp.amount, 290000);
  assert.equal(exp.paidDate, undefined);

  await P.receiveParts(po.id, [{ lineId: lines[1].id, qty: "2", cost: "500" }], { addToOrder: true, createExpense: false, paid: false });
  assert.equal((await P.getPartsOrder(po.id))?.status, "received");
  assert.ok(!(await O.listOrders({ status: "waiting" })).some((o) => o.id === orderId));
  assert.equal((await P.receiveParts(po.id, [{ lineId: lines[1].id, qty: "1" }], { addToOrder: false, createExpense: false, paid: false })).ok, false);
  assert.equal((await P.cancelPartsOrder(po.id)).ok, false);
  assert.equal((await P.updatePartsOrder(po.id, { lines: [{ name: "Novo" }] })).ok, false);
});

test("narudžbenica: opoziv linka, otkazivanje, nalog nije u radu", async () => {
  const orderId = await doneOrder([{ kind: "labor", name: "Rad", price: "1000" }]);
  const po = await P.createPartsOrder({ orderId, raw: { lines: [{ name: "Filter", qty: "1" }] } });
  assert.ok(po.ok);
  if (!po.ok) return;
  const link = await P.createShareLink(po.id);
  assert.ok(link.ok);
  if (!link.ok) return;
  assert.ok(await P.revokeShareLink(po.id));
  assert.equal(await P.getPublicPartsOrder(link.token), null);
  const lineId = (await P.getPartsOrder(po.id))!.lines[0].id;
  const r = await P.receiveParts(po.id, [{ lineId, qty: "1", cost: "100" }], { addToOrder: true, createExpense: false, paid: false });
  assert.equal(r.ok, false); // nalog je završen
  assert.ok((await P.receiveParts(po.id, [{ lineId, qty: "1", cost: "100" }], { addToOrder: false, createExpense: false, paid: false })).ok);
  const po2 = await P.createPartsOrder({ raw: { lines: [{ name: "Ulje", qty: "5" }] } });
  assert.ok(po2.ok);
  if (!po2.ok) return;
  assert.ok((await P.updatePartsOrder(po2.id, { lines: [{ name: "Ulje 5W30", qty: "4" }] })).ok);
  assert.ok((await P.markSent(po2.id)).ok);
  assert.equal((await P.markSent(po2.id)).ok, false);
  assert.ok((await P.cancelPartsOrder(po2.id)).ok);
  assert.equal((await P.createShareLink(po2.id)).ok, false);
  assert.ok((await P.listPartsOrders({ status: "all" })).length >= 2);
});

test("pregled perioda i CSV", async () => {
  const id = await doneOrder([{ kind: "part", name: "Pločice; zadnje", price: "5000", cost: "3000" }]);
  await F.addPayment(id, { amount: "5000" });
  await S.createExpense({ category: "utilities", amount: "8000", description: "Struja", paid: "1" });
  await S.createExpense({ category: "tools", amount: "20000", description: "Moment ključ", paid: "1" });
  const linked = await S.createExpense({ category: "parts", amount: "3000", description: "Pločice za ovaj nalog", orderId: id, paid: "1" });
  assert.ok(linked.ok);
  const period = monthOf(todayIso());
  const ov = await F.periodOverview(period);
  assert.ok(ov.income >= 500000);
  assert.ok(ov.costs >= 1100000);
  assert.ok(ov.investments >= 2000000);
  assert.equal(ov.profit, ov.income - ov.costs);
  assert.equal(ov.balance, ov.profit - ov.investments);
  assert.ok(ov.owedByCustomers > 0);
  const line = ov.orders.find((o) => o.id === id);
  assert.deepEqual([line?.total, line?.paid, line?.costs, line?.profit], [500000, 500000, 300000, 200000]);
  const fin = await F.orderFinance(id);
  assert.deepEqual([fin.costTotal, fin.profit, fin.costs.length], [300000, 200000, 1]);
  assert.equal((await F.orderRef(id))?.number, line?.number);
  assert.equal(await F.orderRef("nepostoji"), null);
  const csv = await F.exportCsv("nalozi", period);
  assert.ok(csv.startsWith("﻿Završen;Nalog;Klijent"));
  assert.ok(csv.includes("Troškovi (RSD)"));
  assert.ok(csv.includes('"Pločice; zadnje 1 kom"'));
  assert.ok((await F.exportCsv("uplate", period)).includes("5000,00"));
  const tr = await F.exportCsv("troskovi", period);
  assert.ok(tr.includes("Struja") && tr.includes("Investicija") && tr.includes(line!.number));
  assert.ok((await F.paymentsInPeriod(period)).length >= 1);
});

test("narudžbenica: prijem dopunjuje deo koji je već na nalogu, bez duplikata", async () => {
  const orderId = await doneOrder([{ kind: "part", name: "EGR ventil", price: "28000" }], false);
  const po = await P.createPartsOrder({ orderId, raw: { lines: [{ name: "EGR ventil", partNumber: "A651 140 0602", qty: "1" }, { name: "Dihtung", qty: "1" }] } });
  assert.ok(po.ok);
  if (!po.ok) return;
  const lines = (await P.getPartsOrder(po.id))!.lines;
  assert.ok((await P.receiveParts(po.id, [{ lineId: lines[0].id, qty: "1", cost: "21000" }, { lineId: lines[1].id, qty: "1", cost: "400", price: "800" }], { addToOrder: true, createExpense: false, paid: false })).ok);
  const items = (await O.getOrder(orderId))!.items;
  const egr = items.filter((i) => i.name === "EGR ventil");
  assert.equal(egr.length, 1);
  assert.equal(egr[0].unitCost, 2100000);
  assert.equal(egr[0].unitPrice, 2800000); // prodajna cena ostaje kako je mehaničar upisao
  assert.equal(egr[0].partNumber, "A651 140 0602");
  assert.equal(items.filter((i) => i.name === "Dihtung").length, 1);
});
