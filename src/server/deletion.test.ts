import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { todayIso } from "../domain/dates.ts";

let dir: string;
let cwd: string;
let O: typeof import("./orders.ts");
let V: typeof import("./vehicles.ts");
let R: typeof import("./reminders.ts");
let F: typeof import("./finance.ts");
let S: typeof import("./suppliers.ts");
let P: typeof import("./parts-orders.ts");
let A: typeof import("./appointments.ts");
let Sh: typeof import("./shares.ts");
let Fi: typeof import("./files.ts");
let D: typeof import("./deletion.ts");
let St: typeof import("./store/store.ts");

before(async () => {
  cwd = process.cwd();
  dir = await mkdtemp(path.join(tmpdir(), "jk-del-"));
  process.chdir(dir);
  O = await import("./orders.ts");
  V = await import("./vehicles.ts");
  R = await import("./reminders.ts");
  F = await import("./finance.ts");
  S = await import("./suppliers.ts");
  P = await import("./parts-orders.ts");
  A = await import("./appointments.ts");
  Sh = await import("./shares.ts");
  Fi = await import("./files.ts");
  D = await import("./deletion.ts");
  St = await import("./store/store.ts");
});
after(async () => {
  process.chdir(cwd);
  await rm(dir, { recursive: true, force: true });
});

const year = todayIso().slice(0, 4);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const ok = <T extends { ok: boolean }>(r: T) => {
  assert.ok(r.ok, JSON.stringify(r));
  return r as Extract<T, { ok: true }>;
};
const db = () => St.read((d) => d);

test("brisanje naloga: sa njim nestaje sve njegovo, ostalo ostaje bez veze, posledice se vraćaju", async () => {
  const appt = ok(await A.createAppointment({ date: todayIso(), time: "09:00", customerName: "Ana", vehicleText: "Golf", reason: "Kočnice" }));
  const order = ok(
    await O.createOrderFromIntake({
      vehicle: { mode: "new", raw: { plate: "BG 111-DL", make: "Volkswagen", model: "Golf" } },
      owner: { mode: "new", customer: { name: "Brisanje Jedan", phones: ["0641110001"] } },
      kmIn: "100000",
      complaint: "Kočnice",
      appointmentId: appt.id,
    }),
  );
  const vehicleId = (await db()).orders.find((o) => o.id === order.id)!.vehicleId;
  ok(await O.addItem(order.id, { kind: "labor", name: "Rad", price: "3000" }));
  ok(await O.addItem(order.id, { kind: "part", name: "Pločice", price: "5000", cost: "3000" }));
  ok(await R.addReminder(vehicleId, { title: "Kočiona tečnost", months: "6" }));
  const earlier = (await db()).reminders.find((r) => r.vehicleId === vehicleId)!;
  ok(await O.completeOrder(order.id, { date: "", kmOut: "100100", workDone: "Pločice", reminders: [{ title: "Mali servis", months: "12" }], closeReminderIds: [earlier.id] }));
  const photo = ok(await Fi.addOrderPhoto(order.id, { main: jpeg, thumb: jpeg, category: "before" }));
  const photoFile = path.join(dir, ".data", "uploads", (await db()).attachments[0]!.file);
  assert.ok(existsSync(photoFile));
  ok(await F.addPayment(order.id, { amount: "2000" }));
  ok(await F.issueInvoice(order.id));
  const sup = ok(await S.createSupplier({ name: "Delovi Brisanje" }));
  const exp = ok(await S.createExpense({ category: "parts", amount: "3000", description: "Pločice", supplierId: sup.id, orderId: order.id }));
  const po = ok(await P.createPartsOrder({ orderId: order.id, raw: { supplierId: sup.id, lines: [{ name: "Pločice", qty: "1" }] } }));
  const share = ok(await Sh.createVehicleShare(vehicleId, { orderIds: [order.id], photoIds: [photo.id], showPrices: true, showReminders: false, days: "30" }));

  const impact = await D.deletionImpact("order", order.id);
  assert.ok(impact);
  const deleted = impact.deleted.join(" | ");
  for (const s of ["2 stavke", "1 uplata", "1 račun", "1 fotografija", "1 podsetnik"]) assert.ok(deleted.includes(s), `${s} u: ${deleted}`);
  const kept = impact.kept.join(" | ");
  for (const s of ["1 trošak", "1 narudžbenica", "1 termin", "ponovo je otvoren", `broj ${year}-0001 dobiće sledeći nalog`, `broj R-${year}-0001 dobiće sledeći račun`]) assert.ok(kept.includes(s), `${s} u: ${kept}`);

  const r = await D.deleteEntity("order", order.id);
  assert.deepEqual(r, { ok: true, vehicleId });
  const after = await db();
  assert.equal(after.orders.length, 0);
  for (const k of ["orderItems", "payments", "invoices", "attachments"] as const) assert.equal(after[k].length, 0, k);
  assert.ok(!existsSync(photoFile), "fotografija je obrisana i iz skladišta");
  assert.ok(after.odometerReadings.every((x) => !x.orderId));
  // trošak i narudžbenica ostaju, samo bez naloga
  const e = after.expenses.find((x) => x.id === exp.id)!;
  assert.equal(e.orderId, undefined);
  assert.equal(e.supplierId, sup.id);
  const p = after.partsOrders.find((x) => x.id === po.id)!;
  assert.equal(p.orderId, undefined);
  assert.equal(p.vehicleId, vehicleId);
  // kao da nalog nije postojao
  assert.equal(after.appointments.find((x) => x.id === appt.id)?.status, "scheduled");
  assert.equal(after.reminders.find((x) => x.id === earlier.id)?.status, "open");
  assert.equal(after.reminders.length, 1, "podsetnik iz naloga je obrisan");
  assert.equal(after.sequences[`order:${year}`], 0);
  assert.equal(after.sequences[`invoice:${year}`], 0);
  assert.equal((await Sh.getPublicShare(share.token, { count: false }))?.snapshot.orders.length, 0);

  // sledeći nalog dobija oslobođen broj
  const next = ok(await O.createOrderFromIntake({ vehicle: { mode: "existing", vehicleId }, owner: { mode: "keep" }, complaint: "Ponovo" }));
  assert.equal((await O.getOrder(next.id))?.order.number, `${year}-0001`);

  assert.deepEqual(await D.deleteEntity("order", "nepostoji"), { ok: false });
  assert.equal(await D.deletionImpact("vehicle", "nepostoji"), null);
});

test("brisanje klijenta: vozilo sa ranijim vlasnikom se vraća njemu; vozilo bez drugog vlasnika nestaje", async () => {
  const v = ok(await V.createVehicle({ plate: "NS 222-DL", make: "Škoda", model: "Fabia" }, { mode: "new", customer: { name: "Prvi Vlasnik", phones: ["0641110002"] } }));
  ok(await V.changeOwner({ vehicleId: v.id, owner: { mode: "new", customer: { name: "Drugi Vlasnik", phones: ["0641110003"] } }, date: "", reason: "sale" }));
  const d0 = await db();
  const first = d0.customers.find((c) => c.name === "Prvi Vlasnik")!;
  const second = d0.customers.find((c) => c.name === "Drugi Vlasnik")!;
  const order = ok(await O.createOrderFromIntake({ vehicle: { mode: "existing", vehicleId: v.id }, owner: { mode: "keep" }, complaint: "Servis" }));
  ok(await F.addPayment(order.id, { amount: "1000" }));

  const impact = await D.deletionImpact("customer", second.id);
  assert.ok(impact);
  assert.ok(!impact.deleted.some((s) => s.startsWith("vozilo")), "vozilo ostaje");
  assert.ok(impact.deleted.some((s) => s.startsWith("1 nalog")));
  assert.ok(impact.kept.some((s) => s.includes("se vraća prethodnom vlasniku (Prvi Vlasnik)")));
  ok(await D.deleteEntity("customer", second.id));
  let d = await db();
  assert.ok(!d.customers.some((c) => c.id === second.id));
  assert.ok(!d.orders.some((o) => o.id === order.id));
  assert.ok(!d.payments.some((p) => p.orderId === order.id));
  const owners = d.ownerships.filter((o) => o.vehicleId === v.id);
  assert.equal(owners.length, 1);
  assert.equal(owners[0]!.customerId, first.id);
  assert.equal(owners[0]!.validTo, undefined, "prvi vlasnik je ponovo trenutni");

  // termin za vozilo i klijenta ostaje u kalendaru, sa podacima kao tekstom
  const appt = ok(await A.createAppointment({ date: todayIso(), time: "11:00", vehicleId: v.id, customerId: first.id, reason: "Gume" }));
  const impact2 = await D.deletionImpact("customer", first.id);
  assert.ok(impact2?.deleted.includes("vozilo NS 222-DL · Škoda Fabia"));
  ok(await D.deleteEntity("customer", first.id));
  d = await db();
  assert.ok(!d.vehicles.some((x) => x.id === v.id));
  assert.ok(!d.ownerships.some((x) => x.vehicleId === v.id));
  const a = d.appointments.find((x) => x.id === appt.id)!;
  assert.equal(a.vehicleId, undefined);
  assert.equal(a.customerId, undefined);
  assert.equal(a.vehicleText, "NS 222-DL · Škoda Fabia");
  assert.equal(a.customerName, "Prvi Vlasnik");
  assert.equal(a.phone, "+381641110002");
});

test("brisanje dobavljača, uplate i računa; raniji broj računa ostaje preskočen", async () => {
  const v = ok(await V.createVehicle({ plate: "KG 333-DL", make: "Opel" }, { mode: "new", customer: { name: "Treći Klijent", phones: ["0641110004"] } }));
  const orders: string[] = [];
  for (const name of ["Prvi", "Drugi"]) {
    const o = ok(await O.createOrderFromIntake({ vehicle: { mode: "existing", vehicleId: v.id }, owner: { mode: "keep" }, complaint: name }));
    ok(await O.addItem(o.id, { kind: "labor", name: "Rad", price: "1000" }));
    ok(await O.completeOrder(o.id, { date: "", reminders: [], closeReminderIds: [] }));
    ok(await F.issueInvoice(o.id));
    orders.push(o.id);
  }
  const invoices = (await db()).invoices.filter((i) => orders.includes(i.orderId));
  const [inv1, inv2] = [invoices.find((i) => i.orderId === orders[0])!, invoices.find((i) => i.orderId === orders[1])!];
  const counter = (await db()).sequences[`invoice:${year}`];

  // raniji račun: broj ostaje preskočen
  assert.deepEqual((await D.deletionImpact("invoice", inv1.id))?.kept, []);
  assert.deepEqual(await D.deleteEntity("invoice", inv1.id), { ok: true, orderId: orders[0] });
  assert.equal((await db()).sequences[`invoice:${year}`], counter);
  // poslednji račun: broj dobija sledeći račun
  ok(await D.deleteEntity("invoice", inv2.id));
  assert.equal((await db()).sequences[`invoice:${year}`], counter! - 2);

  const pay = ok(await F.addPayment(orders[0]!, { amount: "500" }));
  assert.deepEqual(await D.deleteEntity("payment", pay.id), { ok: true, orderId: orders[0] });
  assert.ok(!(await db()).payments.some((p) => p.id === pay.id));

  const sup = ok(await S.createSupplier({ name: "Dobavljač Za Brisanje" }));
  const exp = ok(await S.createExpense({ category: "parts", amount: "100", description: "Sitno", supplierId: sup.id }));
  const po = ok(await P.createPartsOrder({ raw: { supplierId: sup.id, lines: [{ name: "Filter", qty: "1" }] } }));
  const impact = await D.deletionImpact("supplier", sup.id);
  assert.deepEqual(impact?.deleted, []);
  assert.equal(impact?.kept.length, 2);
  ok(await D.deleteEntity("supplier", sup.id));
  const d = await db();
  assert.ok(!d.suppliers.some((x) => x.id === sup.id));
  assert.equal(d.expenses.find((x) => x.id === exp.id)?.supplierId, undefined);
  assert.equal(d.partsOrders.find((x) => x.id === po.id)?.supplierId, undefined);

  // narudžbenica: trošak nastao prijemom ostaje
  ok(await D.deleteEntity("partsOrder", po.id));
  assert.ok(!(await db()).partsOrders.some((x) => x.id === po.id));

  // vozilo: nalozi idu sa njim
  const impactV = await D.deletionImpact("vehicle", v.id);
  assert.ok(impactV?.deleted.some((s) => s.startsWith("2 naloga")));
  ok(await D.deleteEntity("vehicle", v.id));
  assert.ok(!(await db()).orders.some((o) => orders.includes(o.id)));
});
