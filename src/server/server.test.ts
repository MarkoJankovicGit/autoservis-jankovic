import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

let dir: string;
let cwd: string;
let C: typeof import("./customers.ts");
let V: typeof import("./vehicles.ts");
let S: typeof import("./search.ts");

before(async () => {
  // skladište piše u <cwd>/.data; test radi u privremenom folderu da ne dira razvojne podatke
  cwd = process.cwd();
  dir = await mkdtemp(path.join(tmpdir(), "jk-test-"));
  process.chdir(dir);
  C = await import("./customers.ts");
  V = await import("./vehicles.ts");
  S = await import("./search.ts");
});
after(async () => {
  process.chdir(cwd);
  await rm(dir, { recursive: true, force: true });
});

test("klijent: kreiranje, duplikat po telefonu, „ipak sačuvaj“", async () => {
  const a = await C.createCustomer({ name: "Petar Petrović", phones: ["064 123 4567"] });
  assert.ok(a.ok);
  const dup = await C.createCustomer({ name: "P. Petrović", phones: ["+381641234567"] });
  assert.equal(dup.ok, false);
  if (!dup.ok) assert.equal(dup.duplicates?.[0].reason, "isti telefon");
  const forced = await C.createCustomer({ name: "P. Petrović", phones: ["+381641234567"] }, { force: true });
  assert.ok(forced.ok);
});

test("klijent: izmena briše uklonjena polja, arhiviranje sakriva iz liste", async () => {
  const r = await C.createCustomer({ name: "Ana Anić", phones: ["0601112233"], email: "ana@primer.rs", note: "napomena" });
  assert.ok(r.ok);
  if (!r.ok) return;
  const u = await C.updateCustomer(r.id, { name: "Ana Anić", phones: ["0601112233"] });
  assert.ok(u.ok);
  const c = await C.getCustomerBasic(r.id);
  assert.equal(c?.email, undefined);
  assert.equal(c?.note, undefined);
  await C.setCustomerArchived(r.id, true);
  assert.equal((await C.listCustomers({ q: "Ana" })).length, 0);
  assert.equal((await C.listCustomers({ q: "Ana", archived: true })).length, 1);
});

test("vozilo: novi vlasnik u istoj formi, sukob tablice", async () => {
  const r = await V.createVehicle({ plate: "bg 123-ab", make: "Volkswagen", model: "Golf", km: "184250" }, { mode: "new", customer: { name: "Milan Milić", phones: ["063 111 222"] } });
  assert.ok(r.ok);
  if (!r.ok) return;
  const card = await V.getVehicleCard(r.id);
  assert.equal(card?.vehicle.plate, "BG123AB");
  assert.equal(card?.owner?.name, "Milan Milić");
  assert.equal(card?.readings[0].km, 184250);

  const again = await V.createVehicle({ plate: "BG-123-AB", make: "Opel" }, { mode: "none" });
  assert.equal(again.ok, false);
  if (!again.ok) {
    assert.match(again.errors.plate, /već postoji/);
    assert.equal(again.conflictVehicleId, r.id);
  }
});

test("vozilo: greške vozila i novog klijenta se vraćaju zajedno", async () => {
  const r = await V.createVehicle({ plate: "", make: "" }, { mode: "new", customer: { name: "", phones: [] } });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.errors.plate);
    assert.ok(r.errors.make);
    assert.ok(r.errors["customer.name"]);
  }
});

test("promena vlasnika: prodaja zatvara period, ispravka menja klijenta", async () => {
  const a = await C.createCustomer({ name: "Prvi Vlasnik", phones: ["0621000001"] });
  const b = await C.createCustomer({ name: "Drugi Vlasnik", phones: ["0621000002"] });
  assert.ok(a.ok && b.ok);
  if (!a.ok || !b.ok) return;
  const v = await V.createVehicle({ plate: "NI 999-XY", make: "Fiat" }, { mode: "existing", customerId: a.id });
  assert.ok(v.ok);
  if (!v.ok) return;

  const same = await V.changeOwner({ vehicleId: v.id, owner: { mode: "existing", customerId: a.id }, date: "", reason: "sale" });
  assert.equal(same.ok, false);

  const future = await V.changeOwner({ vehicleId: v.id, owner: { mode: "existing", customerId: b.id }, date: "2999-01-01", reason: "sale" });
  assert.equal(future.ok, false);

  const sale = await V.changeOwner({ vehicleId: v.id, owner: { mode: "existing", customerId: b.id }, date: "", reason: "sale" });
  assert.ok(sale.ok);
  let card = await V.getVehicleCard(v.id);
  assert.equal(card?.owner?.name, "Drugi Vlasnik");
  assert.equal(card?.ownerships.length, 2);
  assert.ok(card?.ownerships.find((o) => o.customerId === a.id)?.validTo);
  const profileA = await C.getCustomer(a.id);
  assert.equal(profileA?.former.length, 1);

  const fix = await V.changeOwner({ vehicleId: v.id, owner: { mode: "new", customer: { name: "Pravi Vlasnik", phones: ["0621000003"] } }, date: "", reason: "correction" });
  assert.ok(fix.ok);
  card = await V.getVehicleCard(v.id);
  assert.equal(card?.owner?.name, "Pravi Vlasnik");
  assert.equal(card?.ownerships.length, 2); // ispravka ne pravi novi period
});

test("kilometraža: upozorenje na manju vrednost, brisanje ručnog upisa", async () => {
  const v = await V.createVehicle({ plate: "KG 555-AA", make: "Opel", km: "100000" }, { mode: "none" });
  assert.ok(v.ok);
  if (!v.ok) return;
  const lower = await V.addReading(v.id, 90000, "", "zamena table?");
  assert.ok(lower.ok);
  if (lower.ok) assert.match(lower.warning ?? "", /Manje od ranijeg/);
  const bad = await V.addReading(v.id, null, "2999-01-01");
  assert.equal(bad.ok, false);
  const card = await V.getVehicleCard(v.id);
  assert.equal(card?.readings.length, 2);
  assert.ok(await V.deleteReading(v.id, card!.readings[0].id));
  assert.equal((await V.getVehicleCard(v.id))?.readings.length, 1);
});

test("pretraga: tablica bez dijakritika, telefon, ime, ponuda nove tablice", async () => {
  await V.createVehicle({ plate: "ČA 777-ŠŽ", make: "Škoda", model: "Fabia" }, { mode: "new", customer: { name: "Đorđe Đurić", phones: ["069 777 8888"] } });
  assert.equal((await S.globalSearch("ca777")).vehicles[0]?.plate, "ČA777ŠŽ");
  assert.equal((await S.globalSearch("069 777")).customers[0]?.name, "Đorđe Đurić");
  assert.ok((await S.globalSearch("069")).customers.some((c) => c.name === "Đorđe Đurić")); // samo pozivni broj
  assert.equal((await S.globalSearch("69")).customers.length, 0); // dve cifre su premalo
  const p062 = (await S.globalSearch("062")).customers.map((c) => c.name);
  assert.ok(p062.includes("Prvi Vlasnik"));
  assert.ok(!p062.includes("Đorđe Đurić")); // 069 777 8888 ne počinje sa 062
  assert.ok((await S.globalSearch("8888")).customers.some((c) => c.name === "Đorđe Đurić")); // kraj broja
  assert.equal((await S.globalSearch("djordje")).customers[0]?.name, "Đorđe Đurić");
  assert.equal((await S.globalSearch("fabia")).vehicles.length, 1);
  assert.equal((await S.globalSearch("ZR 100-AB")).newPlate, "ZR100AB");
  assert.equal((await S.globalSearch("ČA 777-ŠŽ")).newPlate, undefined);
  assert.equal((await S.globalSearch("ca777")).newPlate, undefined); // deo postojeće tablice
  assert.deepEqual(await S.globalSearch("a"), { vehicles: [], customers: [] });
});
