import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_ATTEMPTS, WINDOW_MS, clearFailures, lockedMinutes, recordFailure } from "./throttle.ts";

test("prijava: 5 pogrešnih pokušaja zaključava adresu 15 minuta, uspeh briše brojač", async () => {
  const t0 = Date.parse("2026-10-29T10:00:00.000Z");
  assert.equal(await lockedMinutes("1.2.3.4", t0), 0);
  for (let i = 0; i < MAX_ATTEMPTS - 1; i++) await recordFailure("1.2.3.4", t0 + i * 1000);
  assert.equal(await lockedMinutes("1.2.3.4", t0 + 5000), 0);
  await recordFailure("1.2.3.4", t0 + 6000);
  assert.equal(await lockedMinutes("1.2.3.4", t0 + 6000), 15);
  assert.equal(await lockedMinutes("5.6.7.8", t0 + 6000), 0);
  // posle prozora od 15 minuta brojač kreće ispočetka
  assert.equal(await lockedMinutes("1.2.3.4", t0 + WINDOW_MS + 1), 0);
  await recordFailure("1.2.3.4", t0 + WINDOW_MS + 1);
  assert.equal(await lockedMinutes("1.2.3.4", t0 + WINDOW_MS + 2), 0);
  await clearFailures("1.2.3.4");
  assert.equal(await lockedMinutes("1.2.3.4", t0), 0);
});
