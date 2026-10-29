import { test } from "node:test";
import assert from "node:assert/strict";
import { checkReading, latest, projectDateForKm, projectKmAt, trend, type Reading } from "./odometer.ts";
import { addDays, addMonths, daysBetween, formatDate, formatDateTime, isIsoDate, todayIso } from "./dates.ts";

const readings: Reading[] = [
  { date: "2025-10-28", km: 150_000 },
  { date: "2026-04-28", km: 157_500 },
  { date: "2026-10-28", km: 165_000 },
];

test("trend: prosek od prvog do poslednjeg upisa", () => {
  const t = trend(readings);
  assert.ok(t);
  assert.equal(t.kmPerMonth, 1251); // 15.000 km / 365 dana × 30,4375
  assert.equal(t.deltaKm, 15_000);
  assert.equal(t.spanDays, 365);
  assert.equal(t.from.km, 150_000);
  assert.equal(t.to.km, 165_000);
});

test("trend: nema trenda bez dovoljno podataka", () => {
  assert.equal(trend([]), null);
  assert.equal(trend([{ date: "2026-01-01", km: 1000 }]), null);
  assert.equal(trend([{ date: "2026-01-01", km: 1000 }, { date: "2026-01-10", km: 2000 }]), null); // < 30 dana
  assert.equal(trend([{ date: "2025-01-01", km: 5000 }, { date: "2026-01-01", km: 4000 }]), null); // pad
});

test("trend: gleda samo poslednje 24 meseca", () => {
  const t = trend([{ date: "2020-01-01", km: 10_000 }, ...readings]);
  assert.equal(t?.from.date, "2025-10-28");
});

test("projekcije", () => {
  assert.equal(projectKmAt(readings, "2027-10-28"), 180_000);
  assert.equal(projectKmAt(readings, "2026-01-01"), 165_000); // ne ide unazad
  assert.equal(projectDateForKm(readings, 180_000), "2027-10-28");
  assert.equal(projectDateForKm(readings, 100_000), "2026-10-28");
  assert.equal(projectKmAt([], "2027-01-01"), null);
  assert.equal(projectDateForKm([], 1), null);
});

test("latest", () => {
  assert.equal(latest(readings)?.km, 165_000);
  assert.equal(latest([]), null);
});

test("checkReading", () => {
  assert.deepEqual(checkReading(readings, 166_000, "2026-11-01"), { ok: true });
  assert.equal(checkReading(readings, 160_000, "2026-11-01").ok, true);
  assert.match(checkReading(readings, 160_000, "2026-11-01").warning ?? "", /Manje od ranijeg upisa/);
  assert.equal(checkReading(readings, -1, "2026-11-01").ok, false);
  assert.equal(checkReading(readings, 1.5, "2026-11-01").ok, false);
  assert.equal(checkReading(readings, 10_000_000, "2026-11-01").ok, false);
});

test("datumi", () => {
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(isIsoDate("2028-02-29"), true);
  assert.equal(isIsoDate("28.10.2026"), false);
  assert.equal(daysBetween("2026-10-01", "2026-10-28"), 27);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2026-10-28", 12), "2027-10-28");
  assert.equal(formatDate("2026-10-08"), "8.10.2026.");
  assert.match(todayIso(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(todayIso(new Date("2026-10-28T23:30:00Z")), "2026-10-29"); // Beograd je UTC+1
  assert.equal(formatDateTime("2026-10-28T13:05:00Z"), "28.10.2026. 14:05");
});
