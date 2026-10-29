import { test } from "node:test";
import assert from "node:assert/strict";
import { checkVin, normalizeVin } from "./vin.ts";
import { isValidPib, normalizePib } from "./pib.ts";
import { foldText, matchesAllWords, plural } from "./text.ts";
import { isUuid, uuidv7 } from "./id.ts";

test("VIN: normalizacija i ispravan VIN", () => {
  assert.equal(normalizeVin(" wvw zzz 1jz xw 000001 "), "WVWZZZ1JZXW000001");
  assert.deepEqual(checkVin("WVWZZZ1JZXW000001"), { ok: true, warnings: [] });
  assert.deepEqual(checkVin(""), { ok: true, warnings: [] });
});

test("VIN: upozorenja ne blokiraju", () => {
  const short = checkVin("ZFA14600");
  assert.equal(short.ok, true);
  assert.equal(short.warnings.length, 1);
  const ioq = checkVin("WVWZZZ1JZXW00O001");
  assert.equal(ioq.ok, true);
  assert.match(ioq.warnings.join(" "), /I, O i Q/);
});

test("VIN: greške", () => {
  assert.equal(checkVin("WVW-ZZZ").ok, false);
  assert.equal(checkVin("ABC").ok, false);
  assert.equal(checkVin("WVWZZZ1JZXW0000012").ok, false);
});

test("PIB: stvarni PIB-ovi i greške", () => {
  for (const pib of ["104052135", "103920327", "100002887"]) assert.equal(isValidPib(pib), true, pib);
  assert.equal(isValidPib("123456789"), false);
  assert.equal(isValidPib("10405213"), false);
  assert.equal(isValidPib("10405213a"), false);
  assert.equal(normalizePib("104 052 135"), "104052135");
});

test("foldText: dijakritici i đ/dj", () => {
  assert.equal(foldText("Đorđević"), "dordevic");
  assert.equal(foldText("Djordjević"), "dordevic");
  assert.equal(foldText("  ČAĆAK  Šabac "), "cacak sabac");
});

test("matchesAllWords", () => {
  assert.equal(matchesAllWords("Petar Petrović Golf 4", "petrovic golf"), true);
  assert.equal(matchesAllWords("Petar Petrović", "marko"), false);
  assert.equal(matchesAllWords("Petar", "   "), false);
});

test("uuidv7: oblik, verzija i redosled", () => {
  const a = uuidv7(1_700_000_000_000);
  const b = uuidv7(1_700_000_000_001);
  assert.ok(isUuid(a));
  assert.equal(a[14], "7");
  assert.ok("89ab".includes(a[19]));
  assert.ok(a < b);
  assert.equal(isUuid("nije-uuid"), false);
});

test("srpska množina", () => {
  const d = (n: number) => `${n} ${plural(n, "deo", "dela", "delova")}`;
  assert.deepEqual([1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111, 0].map(d), ["1 deo", "2 dela", "4 dela", "5 delova", "11 delova", "12 delova", "14 delova", "21 deo", "22 dela", "25 delova", "101 deo", "111 delova", "0 delova"]);
});
