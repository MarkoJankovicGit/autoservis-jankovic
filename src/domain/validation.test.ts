import { test } from "node:test";
import assert from "node:assert/strict";
import { parseKm, validateCustomer, validateVehicle } from "./validation.ts";

test("klijent: fizičko lice sa telefonom", () => {
  const r = validateCustomer({ name: "  Petar   Petrović ", phones: ["064/123-45-67", "", "0641234567"] });
  assert.ok(r.ok);
  assert.equal(r.value.type, "person");
  assert.equal(r.value.name, "Petar Petrović");
  assert.deepEqual(r.value.phones, [{ e164: "+381641234567" }]); // duplikat izbačen
});

test("klijent: firma sa PIB-om i emailom", () => {
  const r = validateCustomer({ type: "company", name: "NIS a.d.", taxId: "104 052 135", email: "Flota@Primer.rs" });
  assert.ok(r.ok);
  assert.equal(r.value.taxId, "104052135");
  assert.equal(r.value.email, "flota@primer.rs");
  assert.deepEqual(r.value.phones, []);
});

test("klijent: PIB se ignoriše za fizičko lice", () => {
  const r = validateCustomer({ name: "Ana Anić", phones: ["0641234567"], taxId: "123" });
  assert.ok(r.ok);
  assert.equal(r.value.taxId, undefined);
});

test("klijent: greške", () => {
  const r = validateCustomer({ type: "company", name: "A", phones: ["123"], email: "nije-email", taxId: "123456789", note: "x".repeat(2001) });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.ok(r.errors.name);
  assert.ok(r.errors["phones.0"]);
  assert.ok(r.errors.email);
  assert.ok(r.errors.taxId);
  assert.ok(r.errors.note);
});

test("klijent: mora imati telefon ili email", () => {
  const r = validateCustomer({ name: "Bez Kontakta", phones: ["", " "] });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.errors["phones.0"], /telefon ili email/);
});

test("vozilo: ispravan unos sa normalizacijom", () => {
  const r = validateVehicle({ plate: "bg 123-ab", vin: "wvwzzz1jzxw000001", make: "Volkswagen", model: "Golf 4", year: "2003", fuel: "diesel", powerKw: "74 kW", km: "184.250", registrationExpires: "2027-03-15" }, 2026);
  assert.ok(r.ok);
  assert.equal(r.value.plate, "BG123AB");
  assert.equal(r.value.vin, "WVWZZZ1JZXW000001");
  assert.equal(r.value.year, 2003);
  assert.equal(r.value.km, 184250);
  assert.equal(r.value.powerKw, 74);
  assert.deepEqual(r.warnings, {});
});

test("vozilo: samo VIN, kratak broj šasije daje upozorenje", () => {
  const r = validateVehicle({ vin: "ZFA14600", make: "Fiat" });
  assert.ok(r.ok);
  assert.equal(r.value.plate, undefined);
  assert.ok(r.warnings.vin);
});

test("vozilo: greške", () => {
  const r = validateVehicle({ plate: "", vin: "", make: "", year: "1900", fuel: "kerozin", powerKw: "0", km: "-5", registrationExpires: "31.12.2026" }, 2026);
  assert.equal(r.ok, false);
  if (r.ok) return;
  for (const f of ["plate", "make", "year", "fuel", "powerKw", "km", "registrationExpires"]) assert.ok(r.errors[f], f);
});

test("vozilo: neispravan VIN i predugačka tablica", () => {
  const r = validateVehicle({ plate: "ABCDEFGHIJKLM1", vin: "WVW", make: "VW" });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.errors.plate);
    assert.ok(r.errors.vin);
  }
});

test("parseKm", () => {
  assert.equal(parseKm("184.250"), 184250);
  assert.equal(parseKm("184 250"), 184250);
  assert.equal(parseKm(""), undefined);
  assert.equal(parseKm(undefined), undefined);
  assert.equal(parseKm("12,5"), null);
  assert.equal(parseKm("99999999"), null);
});
