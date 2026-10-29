import { test } from "node:test";
import assert from "node:assert/strict";
import { shiftDates } from "./demo.ts";

test("demo: datumi i vremena se pomeraju, ostalo ostaje", () => {
  const snap = {
    date: "2026-10-29",
    at: "2026-10-29T15:30:22.775Z",
    list: [{ dueDate: "2026-12-31" }, "2026-0001", 2026],
    sequences: { "order:2026": 5 },
    plate: "BG482KM",
    none: null,
  };
  const s = shiftDates(snap, 3);
  assert.equal(s.date, "2026-11-01");
  assert.equal(s.at, "2026-11-01T15:30:22.775Z");
  assert.deepEqual(s.list, [{ dueDate: "2027-01-03" }, "2026-0001", 2026]);
  assert.deepEqual(s.sequences, { "order:2026": 5 });
  assert.equal(s.plate, "BG482KM");
  assert.equal(s.none, null);
  assert.equal(shiftDates(snap, 0), snap);
});
