import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPhone, normalizePhone, phoneSearchKey, telHref } from "./phone.ts";

const ok = (input: string) => {
  const r = normalizePhone(input);
  assert.ok(r.ok, `očekivan ispravan broj za "${input}"`);
  return r.e164;
};

test("normalizePhone: isti broj u različitim zapisima", () => {
  for (const input of ["064/123-45-67", "+381641234567", "0641234567", "064 123 4567", "00381 64 123 4567", "381641234567", "641234567"]) {
    assert.equal(ok(input), "+381641234567", input);
  }
});

test("normalizePhone: fiksni brojevi", () => {
  assert.equal(ok("011 234 5678"), "+381112345678");
  assert.equal(ok("021/123-456"), "+38121123456");
});

test("normalizePhone: strani brojevi", () => {
  assert.equal(ok("+49 151 2345 6789"), "+4915123456789");
  assert.equal(ok("0049 151 23456789"), "+4915123456789");
});

test("normalizePhone: greške", () => {
  assert.equal(normalizePhone("").ok, false);
  assert.equal(normalizePhone("123").ok, false);
  assert.equal(normalizePhone("064 abc").ok, false);
  assert.equal(normalizePhone("1234567").ok, false);
  assert.equal(normalizePhone("+1 23").ok, false);
  assert.equal(normalizePhone("06412345678901").ok, false);
});

test("formatPhone", () => {
  assert.equal(formatPhone("+381641234567"), "064 123 4567");
  assert.equal(formatPhone("+38121123456"), "021 123 456");
  assert.equal(formatPhone("+4915123456789"), "+4915123456789");
});

test("phoneSearchKey", () => {
  assert.equal(phoneSearchKey("064 123"), "64123");
  assert.equal(phoneSearchKey("+381 64"), "64");
  assert.equal(phoneSearchKey("0038164"), "64");
  assert.equal(phoneSearchKey("4567"), "4567");
});

test("telHref", () => {
  assert.equal(telHref("+381641234567"), "tel:+381641234567");
});
