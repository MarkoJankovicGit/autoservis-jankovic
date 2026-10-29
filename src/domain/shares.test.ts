import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SHARE_DAYS, shareExpiry, sharePdfFileName, shareState, validateShare } from "./shares.ts";

const base = { orderIds: [], photoIds: [], showPrices: false, showReminders: false };

test("deljenje: bar jedan nalog ili podsetnici", () => {
  const r = validateShare(base);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.errors.form! : "", /bar jedan nalog/);
  assert.equal(validateShare({ ...base, showReminders: true }).ok, true);
});

test("deljenje: fotografije samo uz nalog, duplikati i prazni ID-jevi se izbacuju", () => {
  const r = validateShare({ ...base, showReminders: true, photoIds: ["f1"] });
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.errors.form! : "", /uz nalog/);
  const ok = validateShare({ ...base, orderIds: ["a", " a ", "", "b"], photoIds: ["f1", "f1"], showPrices: true });
  assert.ok(ok.ok);
  assert.deepEqual(ok.value.orderIds, ["a", "b"]);
  assert.deepEqual(ok.value.photoIds, ["f1"]);
  assert.equal(ok.value.showPrices, true);
});

test("deljenje: rok važenja iz liste, podrazumevano 90 dana", () => {
  const d = validateShare({ ...base, orderIds: ["a"] });
  assert.ok(d.ok);
  assert.equal(d.value.days, DEFAULT_SHARE_DAYS);
  const y = validateShare({ ...base, orderIds: ["a"], days: "365" });
  assert.ok(y.ok);
  assert.equal(y.value.days, 365);
  const bad = validateShare({ ...base, orderIds: ["a"], days: "7" });
  assert.equal(bad.ok, false);
  assert.ok(!bad.ok && bad.errors.days);
});

test("deljenje: stanje linka i rok", () => {
  assert.equal(shareExpiry("2026-10-29", 30), "2026-11-28");
  const s = { expiresAt: "2026-11-28" };
  assert.equal(shareState(s, "2026-11-28"), "active");
  assert.equal(shareState(s, "2026-11-29"), "expired");
  assert.equal(shareState({ ...s, revokedAt: "2026-10-30T10:00:00Z" }, "2026-10-30"), "revoked");
});

test("deljenje: ime PDF fajla bez kvačica i razmaka", () => {
  assert.equal(sharePdfFileName({ plate: "BG482KM", make: "VW" }, "2026-10-29"), "Karton-BG482KM-2026-10-29.pdf");
  assert.equal(sharePdfFileName({ plate: "ČAŠ12ĐŽ", make: "VW" }, "2026-10-29"), "Karton-CAS12DjZ-2026-10-29.pdf");
  assert.equal(sharePdfFileName({ make: "Škoda", model: "Fabia 1.4" }, "2026-10-29"), "Karton-Skoda-Fabia-1-4-2026-10-29.pdf");
  assert.equal(sharePdfFileName({ make: "???" }, "2026-10-29"), "Karton-vozilo-2026-10-29.pdf");
});
