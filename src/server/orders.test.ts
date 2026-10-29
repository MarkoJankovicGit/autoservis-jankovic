import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { todayIso } from "../domain/dates.ts";

let dir: string;
let cwd: string;
let O: typeof import("./orders.ts");
let V: typeof import("./vehicles.ts");
let R: typeof import("./reminders.ts");

before(async () => {
  cwd = process.cwd();
  dir = await mkdtemp(path.join(tmpdir(), "jk-orders-"));
  process.chdir(dir);
  O = await import("./orders.ts");
  V = await import("./vehicles.ts");
  R = await import("./reminders.ts");
});
after(async () => {
  process.chdir(cwd);
  await rm(dir, { recursive: true, force: true });
});

const year = todayIso().slice(0, 4);

test("prijem: novo vozilo i novi klijent u jednoj transakciji, broj naloga po godini", async () => {
  const r = await O.createOrderFromIntake({
    vehicle: { mode: "new", raw: { plate: "VA 111-AA", make: "Volkswagen", model: "Passat" } },
    owner: { mode: "new", customer: { name: "Marko Marković", phones: ["064 999 1111"] } },
    kmIn: "210.000",
    complaint: "Mali servis",
  });
  assert.ok(r.ok);
  if (!r.ok) return;
  const d = await O.getOrder(r.id);
  assert.equal(d?.order.number, `${year}-0001`);
  assert.equal(d?.order.status, "open");
  assert.equal(d?.customer?.name, "Marko Marković");
  assert.equal(d?.owner?.name, "Marko Marković"); // vozilo dobilo vlasnika
  const card = await V.getVehicleCard(d!.vehicle.id);
  assert.equal(card?.readings[0].km, 210000);
  assert.equal(card?.readings[0].source, "order");
});

test("prijem: postojeće vozilo sa vlasnikom iz kartona, drugi broj naloga", async () => {
  const v = await V.createVehicle({ plate: "VA 222-BB", make: "Opel", km: "100000" }, { mode: "new", customer: { name: "Ana Anić", phones: ["065 222 3333"] } });
  assert.ok(v.ok);
  if (!v.ok) return;
  const r = await O.createOrderFromIntake({ vehicle: { mode: "existing", vehicleId: v.id }, owner: { mode: "keep" }, kmIn: "90000", complaint: "Kočnice" });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.match(r.warning ?? "", /Manje od ranijeg/);
  const d = await O.getOrder(r.id);
  assert.equal(d?.order.number, `${year}-0002`);
  assert.equal(d?.customer?.name, "Ana Anić");
});

test("prijem: greške se vraćaju zajedno, sukob tablice daje link", async () => {
  const r = await O.createOrderFromIntake({
    vehicle: { mode: "new", raw: { plate: "VA-111-AA", make: "" } },
    owner: { mode: "none" },
    kmIn: "abc",
    complaint: "",
  });
  assert.equal(r.ok, false);
  if (r.ok) return;
  for (const k of ["vehicle.plate", "vehicle.make", "owner", "kmIn", "complaint"]) assert.ok(r.errors[k], k);
  assert.ok(r.conflictVehicleId);
  const noOwner = await V.createVehicle({ plate: "VA 333-CC", make: "Fiat" }, { mode: "none" });
  assert.ok(noOwner.ok);
  if (!noOwner.ok) return;
  const keep = await O.createOrderFromIntake({ vehicle: { mode: "existing", vehicleId: noOwner.id }, owner: { mode: "keep" }, complaint: "Pregled" });
  assert.equal(keep.ok, false);
  if (!keep.ok) assert.match(keep.errors.owner, /nema vlasnika/);
});

async function freshOrder(plate: string) {
  const r = await O.createOrderFromIntake({
    vehicle: { mode: "new", raw: { plate, make: "Škoda", model: "Octavia" } },
    owner: { mode: "new", customer: { name: `Klijent ${plate}`, phones: [`06${plate.replace(/\D/g, "").padEnd(7, "1")}`] } },
    kmIn: "150000",
    complaint: "Mali servis",
  });
  assert.ok(r.ok, JSON.stringify(r));
  return (r as { id: string }).id;
}

test("stavke: dodavanje, izmena, brisanje i zbirovi", async () => {
  const id = await freshOrder("BG 444-DD");
  assert.ok((await O.addItem(id, { kind: "labor", name: "Zamena ulja i filtera", qty: "1", price: "1500" })).ok);
  assert.ok((await O.addItem(id, { kind: "material", name: "Ulje 5W30", qty: "4,5", price: "1150", cost: "800" })).ok);
  const p = await O.addItem(id, { kind: "part", name: "Filter ulja", price: "1200", cost: "700" });
  assert.ok(p.ok);
  const bad = await O.addItem(id, { kind: "part", name: "", price: "x" });
  assert.equal(bad.ok, false);

  let d = await O.getOrder(id);
  assert.equal(d?.items.length, 3);
  assert.deepEqual(d?.items.map((i) => i.sortOrder), [1, 2, 3]);
  assert.equal(d?.totals.total, 150000 + 517500 + 120000);
  assert.equal(d?.totals.cost, 360000 + 70000);

  if (!p.ok) return;
  assert.ok((await O.updateItem(id, p.id, { kind: "part", name: "Filter ulja Mann", price: "1300" })).ok);
  d = await O.getOrder(id);
  const filter = d?.items.find((i) => i.id === p.id);
  assert.equal(filter?.name, "Filter ulja Mann");
  assert.equal(filter?.unitCost, undefined); // obrisana nabavna cena zaista nestaje
  assert.ok((await O.deleteItem(id, p.id)).ok);
  assert.equal((await O.getOrder(id))?.items.length, 2);
});

test("završetak: podsetnici, zatvaranje starog podsetnika, zaključane stavke, vraćanje u rad", async () => {
  const id = await freshOrder("NI 555-EE");
  const d0 = await O.getOrder(id);
  const vehicleId = d0!.vehicle.id;
  assert.ok((await R.addReminder(vehicleId, { title: "Kočnice", km: "5000" })).ok);
  const oldRem = (await R.remindersForVehicle(vehicleId)).open[0];

  const empty = await O.completeOrder(id, { date: "", reminders: [], closeReminderIds: [] });
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.ok(empty.errors.workDone);

  const badRem = await O.completeOrder(id, { date: "", workDone: "Zamenjene pločice", reminders: [{ title: "", months: "12" }], closeReminderIds: [] });
  assert.equal(badRem.ok, false);
  if (!badRem.ok) assert.ok(badRem.errors["reminders.0.title"]);

  const done = await O.completeOrder(id, {
    date: "",
    kmOut: "150050",
    workDone: "Zamenjene prednje pločice",
    reminders: [{ title: "Mali servis", months: "12", km: "15000" }, { title: "", months: "", km: "" }],
    closeReminderIds: [oldRem.id],
  });
  assert.ok(done.ok, JSON.stringify(done));
  const d = await O.getOrder(id);
  assert.equal(d?.order.status, "done");
  assert.equal(d?.createdReminders.length, 1);
  assert.equal(d?.createdReminders[0].dueKm, 165050);
  assert.equal(d?.closedReminders[0]?.id, oldRem.id);
  assert.equal((await O.addItem(id, { name: "Kasno dodato", price: "100" })).ok, false);
  assert.equal((await V.getVehicleCard(vehicleId))?.readings[0].km, 150050);

  const re = await O.reopenOrder(id);
  assert.ok(re.ok);
  const back = await O.getOrder(id);
  assert.equal(back?.order.status, "open");
  assert.equal(back?.createdReminders.length, 0);
  assert.equal(back?.closedReminders.length, 0);
  assert.equal((await R.remindersForVehicle(vehicleId)).open.length, 1); // stari podsetnik ponovo otvoren
  assert.equal((await V.getVehicleCard(vehicleId))?.readings[0].km, 150000); // izlazna km uklonjena
});

test("otkazivanje i lista naloga sa filterima i pretragom", async () => {
  const id = await freshOrder("KG 666-FF");
  assert.equal((await O.cancelOrder(id, "")).ok, false);
  assert.ok((await O.cancelOrder(id, "Klijent odustao")).ok);
  assert.equal((await O.completeOrder(id, { date: "", workDone: "x", reminders: [], closeReminderIds: [] })).ok, false);

  const cancelled = await O.listOrders({ status: "cancelled" });
  assert.ok(cancelled.some((o) => o.id === id));
  assert.ok((await O.listOrders({ status: "all", q: "kg666" })).some((o) => o.id === id));
  assert.ok((await O.listOrders({ status: "all", q: "Klijent KG" })).some((o) => o.id === id));
  assert.equal((await O.listOrders({ status: "open", q: "kg666" })).length, 0);
  const counts = await O.countOrders();
  assert.ok(counts.cancelled >= 1 && counts.open >= 1);

  assert.ok((await O.reopenOrder(id)).ok);
  assert.equal((await O.getOrder(id))?.order.cancelReason, undefined);
});

test("istorija vozila i predlozi stavki", async () => {
  const id = await freshOrder("SM 777-GG");
  await O.addItem(id, { kind: "material", name: "Ulje 5W30", qty: "4", price: "1200", cost: "850" });
  const d = await O.getOrder(id);
  const hist = await O.ordersForVehicle(d!.vehicle.id);
  assert.equal(hist.length, 1);
  assert.equal(hist[0].items[0].name, "Ulje 5W30");
  const sug = await O.itemSuggestions();
  const ulje = sug.find((s) => s.name === "Ulje 5W30");
  assert.equal(ulje?.uses, 2);
  assert.equal(ulje?.unitPrice, 120000); // poslednja cena
  assert.equal((await O.ordersForCustomer(d!.customer!.id)).length, 1);
});

test("podsetnici: ručni, odbačen, ponovo otvoren, lista za početnu", async () => {
  const v = await V.createVehicle({ plate: "PA 888-HH", make: "Kia" }, { mode: "none" });
  assert.ok(v.ok);
  if (!v.ok) return;
  const noKm = await R.addReminder(v.id, { title: "Kočnice", km: "30000" });
  assert.equal(noKm.ok, false);
  assert.ok((await R.addReminder(v.id, { title: "Registracija", months: "1" })).ok);
  const { open } = await R.remindersForVehicle(v.id);
  assert.equal(open.length, 1);
  assert.ok((await R.listOpenReminders({ soonOnly: true, days: 40 })).some((r) => r.id === open[0].id));
  assert.ok(await R.closeReminder(open[0].id, "dismissed"));
  assert.equal((await R.remindersForVehicle(v.id)).closed[0].status, "dismissed");
  assert.ok(await R.reopenReminder(open[0].id));
  assert.equal(await R.closeReminder("nepostoji", "done"), false);
});
