import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransition, formatOrderNumber, itemCost, itemTotal, orderTotals, validateItem } from "./orders.ts";
import { describeTarget, reminderDue, reminderTargets, validateReminder } from "./reminders.ts";
import { formatDate } from "./dates.ts";

test("statusi: dozvoljeni prelazi", () => {
  assert.ok(canTransition("open", "done"));
  assert.ok(canTransition("open", "cancelled"));
  assert.ok(canTransition("done", "open"));
  assert.ok(canTransition("cancelled", "open"));
  assert.equal(canTransition("done", "cancelled"), false);
  assert.equal(canTransition("cancelled", "done"), false);
  assert.equal(canTransition("open", "open"), false);
});

test("broj naloga", () => {
  assert.equal(formatOrderNumber(2026, 7), "2026-0007");
  assert.equal(formatOrderNumber(2026, 12345), "2026-12345");
});

test("stavka: rad sa podrazumevanim vrednostima", () => {
  const r = validateItem({ kind: "labor", name: " Zamena  ulja ", price: "1.500" });
  assert.ok(r.ok);
  assert.deepEqual(r.value, { kind: "labor", name: "Zamena ulja", qtyMilli: 1000, unit: "h", unitPrice: 150000, unitCost: undefined, discountBp: 0, partNumber: undefined });
});

test("stavka: deo sa nabavnom cenom, kataloškim brojem i popustom", () => {
  const r = validateItem({ kind: "part", name: "Filter ulja", qty: "2", price: "1200", cost: "800", discount: "10", partNumber: "W712/95" });
  assert.ok(r.ok);
  assert.equal(r.value.unit, "kom");
  assert.equal(r.value.unitCost, 80000);
  assert.equal(r.value.discountBp, 1000);
  assert.equal(itemTotal(r.value), 216000);
  assert.equal(itemCost(r.value), 160000);
});

test("stavka: rad ne čuva nabavnu cenu ni kataloški broj", () => {
  const r = validateItem({ kind: "labor", name: "Dijagnostika", cost: "500", partNumber: "X" });
  assert.ok(r.ok);
  assert.equal(r.value.unitCost, undefined);
  assert.equal(r.value.partNumber, undefined);
});

test("stavka: greške", () => {
  const r = validateItem({ kind: "part", name: "", qty: "0", price: "abc", cost: "-1", discount: "150", unit: "predugačkajedinica", partNumber: "x".repeat(41) });
  assert.equal(r.ok, false);
  if (!r.ok) for (const f of ["name", "qty", "price", "cost", "discount", "unit", "partNumber"]) assert.ok(r.errors[f], f);
  assert.equal(validateItem({ name: "x".repeat(121) }).ok, false);
  assert.equal(validateItem({ kind: "nepoznato", name: "Nešto" }).ok, true); // pada na „rad“
});

test("zbirovi naloga i zarada", () => {
  const t = orderTotals([
    { kind: "labor", qtyMilli: 1500, unitPrice: 200000, discountBp: 0 }, // 3.000,00
    { kind: "part", qtyMilli: 1000, unitPrice: 240000, unitCost: 160000, discountBp: 0 }, // 2.400 / 1.600
    { kind: "material", qtyMilli: 4500, unitPrice: 115000, unitCost: 80000, discountBp: 1000 }, // 4.657,50 / 3.600
    { kind: "part", qtyMilli: 1000, unitPrice: 50000, discountBp: 0 }, // bez nabavne
  ]);
  assert.equal(t.byKind.labor, 300000);
  assert.equal(t.byKind.part, 290000);
  assert.equal(t.byKind.material, 465750);
  assert.equal(t.total, 1055750);
  assert.equal(t.discount, 51750);
  assert.equal(t.cost, 520000);
  assert.equal(t.profit, 535750);
  assert.equal(t.missingCost, 1);
  assert.equal(orderTotals([]).total, 0);
});

test("podsetnik: validacija", () => {
  assert.deepEqual(validateReminder({ title: "Mali servis", months: "12", km: "15.000" }), { ok: true, value: { title: "Mali servis", months: 12, km: 15000 }, warnings: {} });
  const bad = validateReminder({ title: "", months: "0", km: "50" });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.ok(bad.errors.title && bad.errors.months && bad.errors.km);
  const none = validateReminder({ title: "Nešto" });
  assert.equal(none.ok, false);
  assert.equal(validateReminder({ title: "x".repeat(81), km: "1000" }).ok, false);
});

test("podsetnik: rokovi iz završetka naloga", () => {
  assert.deepEqual(reminderTargets({ title: "Mali servis", months: 12, km: 15000 }, "2026-10-28", 184000), { dueDate: "2027-10-28", dueKm: 199000 });
  assert.deepEqual(reminderTargets({ title: "Kočnice", km: 30000 }, "2026-10-28"), { dueDate: undefined, dueKm: undefined });
});

const readings = [
  { date: "2025-10-28", km: 150_000 },
  { date: "2026-10-28", km: 165_000 }, // ≈ 41 km dnevno
];

test("podsetnik: šta pre nastupi (km pre datuma)", () => {
  const d = reminderDue({ dueDate: "2027-10-28", dueKm: 172_500 }, readings, "2026-10-28");
  assert.equal(d.by, "km");
  assert.equal(d.date, "2027-04-29"); // pola godine
  assert.equal(d.overdue, false);
  assert.equal(d.soon, false);
});

test("podsetnik: uskoro, prekoračen i bez trenda", () => {
  assert.equal(reminderDue({ dueDate: "2026-11-15" }, [], "2026-10-28").soon, true);
  const over = reminderDue({ dueDate: "2026-10-01" }, [], "2026-10-28");
  assert.equal(over.overdue, true);
  assert.equal(over.daysLeft, -27);
  const kmPassed = reminderDue({ dueKm: 160_000 }, [{ date: "2026-10-28", km: 161_000 }], "2026-10-28");
  assert.equal(kmPassed.overdue, true);
  assert.equal(kmPassed.kmWithoutTrend, true);
  assert.equal(kmPassed.date, null);
  const noTrend = reminderDue({ dueKm: 200_000 }, [{ date: "2026-10-28", km: 161_000 }], "2026-10-28");
  assert.equal(noTrend.overdue, false);
  assert.equal(noTrend.kmWithoutTrend, true);
});

test("podsetnik: opis roka", () => {
  assert.equal(describeTarget({ dueDate: "2027-10-28", dueKm: 199000 }, formatDate), "28.10.2027. ili 199.000 km");
  assert.equal(describeTarget({ dueKm: 199000 }, formatDate), "199.000 km");
});
