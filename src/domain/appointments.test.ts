import { test } from "node:test";
import assert from "node:assert/strict";
import { dayName, formatDuration, formatTime, layoutDay, overlapCount, parseTime, timeOptions, validateAppointment, weekDays, weekStart } from "./appointments.ts";

test("vreme", () => {
  assert.equal(parseTime("9:30"), 570);
  assert.equal(parseTime("09:30"), 570);
  assert.equal(parseTime("23:59"), 1439);
  assert.equal(parseTime("24:00"), null);
  assert.equal(parseTime("9.30"), null);
  assert.equal(formatTime(570), "09:30");
  assert.equal(formatDuration(90), "1 h 30 min");
  assert.equal(formatDuration(45), "45 min");
  assert.equal(formatDuration(120), "2 h");
  assert.equal(formatDuration(480), "ceo dan");
  const opts = timeOptions();
  assert.equal(opts[0], "06:00");
  assert.equal(opts.at(-1), "21:45");
});

test("nedelja počinje ponedeljkom", () => {
  assert.equal(weekStart("2026-10-28"), "2026-10-26"); // sreda -> ponedeljak
  assert.equal(weekStart("2026-11-01"), "2026-10-26"); // nedelja -> prethodni ponedeljak
  assert.equal(weekStart("2026-10-26"), "2026-10-26");
  assert.deepEqual(weekDays("2026-12-31"), ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  assert.equal(dayName("2026-10-28"), "Sreda");
  assert.equal(dayName("2026-11-01", true), "Ned");
});

test("termin: vozilo iz evidencije", () => {
  const r = validateAppointment({ date: "2026-10-29", time: "09:00", duration: "90", vehicleId: "v1", customerId: "c1", vehicleText: "ignoriše se", customerName: "ignoriše se", phone: "nije broj", reason: " Mali  servis " });
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value, { date: "2026-10-29", startMin: 540, durationMin: 90, vehicleId: "v1", customerId: "c1", vehicleText: undefined, customerName: undefined, phone: undefined, reason: "Mali servis", note: undefined });
});

test("termin: novi klijent telefonom", () => {
  const r = validateAppointment({ date: "2026-10-29", time: "14:15", vehicleText: "Golf 5 BG 123-XY", customerName: "Marko", phone: "064 111 2222", reason: "Kočnice" });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.durationMin, 60); // podrazumevano
    assert.equal(r.value.phone, "+381641112222");
  }
});

test("termin: greške", () => {
  const r = validateAppointment({ date: "29.10.", time: "9:10", duration: "7", phone: "12", reason: "", note: "x".repeat(1001) });
  assert.equal(r.ok, false);
  if (!r.ok) for (const f of ["date", "time", "duration", "phone", "vehicleText", "reason", "note"]) assert.ok(r.errors[f], f);
  const long = validateAppointment({ date: "2026-10-29", time: "x", vehicleText: "x".repeat(61), customerName: "y".repeat(81), reason: "z".repeat(201) });
  assert.equal(long.ok, false);
  if (!long.ok) for (const f of ["time", "vehicleText", "customerName", "reason"]) assert.ok(long.errors[f], f);
  assert.equal(validateAppointment({ date: "2026-10-29", time: "10:00", duration: "615", customerName: "A", reason: "B" }).ok, false);
});

test("preklapanja i raspored dana", () => {
  const items = [
    { id: "a", startMin: 540, durationMin: 60 }, // 9-10
    { id: "b", startMin: 570, durationMin: 60 }, // 9:30-10:30
    { id: "c", startMin: 600, durationMin: 30 }, // 10-10:30 (preklapa b, ne a)
    { id: "d", startMin: 720, durationMin: 60 }, // 12-13, sam
  ];
  assert.equal(overlapCount({ id: "a", startMin: 540, durationMin: 60 }, items), 1);
  assert.equal(overlapCount({ startMin: 585, durationMin: 30 }, items), 3);
  assert.equal(overlapCount({ startMin: 660, durationMin: 60 }, items), 0);
  const l = Object.fromEntries(layoutDay(items).map((x) => [x.id, [x.col, x.cols]]));
  assert.deepEqual(l, { a: [0, 2], b: [1, 2], c: [0, 2], d: [0, 1] });
});
