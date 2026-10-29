import { test } from "node:test";
import assert from "node:assert/strict";
import { ageBucket, csvMoney, expenseCategory, expenseKind, formatDocNumber, inPeriod, monthOf, paymentStatus, periodPresets, summarize, toCsv, validateExpense, validatePayment } from "./finance.ts";
import { statusAfterReceive, validatePartsOrder, validateReceive, isWaiting } from "./parts-orders.ts";

const today = "2026-10-28";

test("status naplate", () => {
  assert.equal(paymentStatus(0, 0), "none");
  assert.equal(paymentStatus(0, 100), "overpaid");
  assert.equal(paymentStatus(1000, 0), "unpaid");
  assert.equal(paymentStatus(1000, 400), "partial");
  assert.equal(paymentStatus(1000, 1000), "paid");
  assert.equal(paymentStatus(1000, 1200), "overpaid");
});

test("uplata: validacija", () => {
  assert.deepEqual(validatePayment({ amount: "5.000" }, today), { ok: true, value: { amount: 500000, date: today, note: undefined }, warnings: {} });
  const bad = validatePayment({ amount: "0", date: "2026-11-01", note: "x".repeat(201) }, today);
  assert.equal(bad.ok, false);
  if (!bad.ok) for (const f of ["amount", "date", "note"]) assert.ok(bad.errors[f], f);
  assert.equal(validatePayment({ amount: "100", date: "31.10.2026" }, today).ok, false);
});

test("trošak: plaćen, neplaćen sa rokom, greške", () => {
  const paid = validateExpense({ date: "2026-10-05", category: "rent", amount: "40.000", description: "Kirija oktobar", paid: "1" }, today);
  assert.ok(paid.ok);
  if (paid.ok) {
    assert.equal(paid.value.paidDate, "2026-10-05");
    assert.equal(paid.value.dueDate, undefined);
  }
  const unpaid = validateExpense({ category: "parts", amount: "12000", description: "Delovi Auto Plus", dueDate: "2026-11-15", supplierId: "s1", orderId: "o1", documentNo: "R-123" }, today);
  assert.ok(unpaid.ok);
  if (unpaid.ok) {
    assert.equal(unpaid.value.date, today);
    assert.equal(unpaid.value.paidDate, undefined);
    assert.equal(unpaid.value.dueDate, "2026-11-15");
    assert.equal(unpaid.value.supplierId, "s1");
    assert.equal(unpaid.value.orderId, "o1");
  }
  const bad = validateExpense({ date: "x", category: "zabava", amount: "-1", description: "", paid: "1", paidDate: "y", dueDate: "z", documentNo: "x".repeat(41), note: "x".repeat(501) }, today);
  assert.equal(bad.ok, false);
  if (!bad.ok) for (const f of ["date", "category", "amount", "description", "paidDate", "dueDate", "documentNo", "note"]) assert.ok(bad.errors[f], f);
  assert.equal(validateExpense({ category: "tools", amount: "1", description: "x".repeat(121) }, today).ok, false);
  assert.equal(expenseKind("rent"), "cost");
  assert.equal(expenseKind("equipment"), "investment");
  assert.equal(expenseKind("nepoznato"), "cost");
  assert.equal(expenseCategory("other_fixed")?.key, "other");
});

test("starost duga", () => {
  assert.equal(ageBucket("2026-10-01", today), "0-30");
  assert.equal(ageBucket("2026-09-15", today), "31-60");
  assert.equal(ageBucket("2026-08-15", today), "61-90");
  assert.equal(ageBucket("2026-01-01", today), "90+");
});

test("periodi", () => {
  assert.deepEqual(monthOf("2026-02-14"), { from: "2026-02-01", to: "2026-02-28" });
  const p = periodPresets(today);
  assert.deepEqual(p.map((x) => x.key), ["mesec", "prosli", "90", "godina"]);
  assert.deepEqual(p[1].period, { from: "2026-09-01", to: "2026-09-30" });
  assert.deepEqual(p[2].period, { from: "2026-07-31", to: today });
  assert.equal(inPeriod("2026-10-01", p[0].period), true);
  assert.equal(inPeriod("2026-09-30", p[0].period), false);
  assert.equal(inPeriod(undefined, p[0].period), false);
});

test("zbir perioda", () => {
  const sm = summarize({
    payments: [{ amount: 1000000 }, { amount: 500000 }, { amount: 250000 }],
    expenses: [{ amount: 400000, category: "rent" }, { amount: 300000, category: "parts" }, { amount: 50000, category: "nepoznato" }, { amount: 600000, category: "equipment" }],
  });
  assert.deepEqual(sm, { income: 1750000, costs: 750000, investments: 600000, profit: 1000000, balance: 400000 });
});

test("CSV za Excel", () => {
  const out = toCsv([["Klijent", "Iznos"], ['Petar "Pera"', csvMoney(1245050)], ["A;B", null], ["red\nnovi", undefined]]);
  assert.ok(out.startsWith("﻿"));
  assert.equal(out.slice(1), 'Klijent;Iznos\r\n"Petar ""Pera""";12450,50\r\n"A;B";\r\n"red\nnovi";\r\n');
  assert.equal(csvMoney(-500), "-5,00");
});

test("brojevi dokumenata", () => {
  assert.equal(formatDocNumber("R", 2026, 3), "R-2026-0003");
  assert.equal(formatDocNumber("N", 2026, 12), "N-2026-0012");
});

test("narudžbenica: validacija i prazni redovi", () => {
  const r = validatePartsOrder({ supplierId: "s1", neededBy: "2026-10-30", note: "Hitno", lines: [{ name: "Krajnik spone desni", partNumber: "TRW JTE123", qty: "1" }, { name: "", qty: "" }, { name: "Pločice zadnje", qty: "1" }] });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.lines.length, 2);
    assert.equal(r.value.lines[0].qtyMilli, 1000);
  }
  const empty = validatePartsOrder({ lines: [{}] });
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.ok(empty.errors["lines.0.name"]);
  const bad = validatePartsOrder({ neededBy: "sutra", note: "x".repeat(1001), lines: [{ partNumber: "X", qty: "0" }, { name: "x".repeat(121), partNumber: "y".repeat(41), note: "z".repeat(201) }] });
  assert.equal(bad.ok, false);
  if (!bad.ok) for (const f of ["neededBy", "note", "lines.0.name", "lines.0.qty", "lines.1.name", "lines.1.partNumber", "lines.1.note"]) assert.ok(bad.errors[f], f);
});

test("prijem robe i status", () => {
  const r = validateReceive([{ lineId: "a", qty: "1", cost: "2.900", price: "4.200" }, { lineId: "b", qty: "" }]);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value, [{ lineId: "a", qtyMilli: 1000, unitCost: 290000, unitPrice: 420000 }]);
  const none = validateReceive([{ lineId: "a" }]);
  assert.equal(none.ok, false);
  const bad = validateReceive([{ lineId: "a", qty: "x", cost: "y", price: "-1" }]);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.ok(bad.errors["rows.0.qty"] && bad.errors["rows.0.cost"] && bad.errors["rows.0.price"]);
  assert.equal(statusAfterReceive([{ qtyMilli: 1000, receivedMilli: 1000 }, { qtyMilli: 2000, receivedMilli: 0 }]), "partial");
  assert.equal(statusAfterReceive([{ qtyMilli: 1000, receivedMilli: 1000 }]), "received");
  assert.equal(statusAfterReceive([{ qtyMilli: 1000, receivedMilli: 0 }]), "sent");
  assert.equal(isWaiting("sent") && isWaiting("partial") && !isWaiting("received") && !isWaiting("draft"), true);
});
