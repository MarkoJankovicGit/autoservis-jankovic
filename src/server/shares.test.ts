import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

let dir: string;
let cwd: string;
let S: typeof import("./shares.ts");
let V: typeof import("./vehicles.ts");
let O: typeof import("./orders.ts");
let F: typeof import("./files.ts");
let DB: typeof import("./store/store.ts");

before(async () => {
  cwd = process.cwd();
  dir = await mkdtemp(path.join(tmpdir(), "jk-share-"));
  process.chdir(dir);
  S = await import("./shares.ts");
  V = await import("./vehicles.ts");
  O = await import("./orders.ts");
  F = await import("./files.ts");
  DB = await import("./store/store.ts");
});
after(async () => {
  process.chdir(cwd);
  await rm(dir, { recursive: true, force: true });
});

const jpeg = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const photo = async (orderId: string) => {
  const r = await F.addOrderPhoto(orderId, { main: jpeg(), thumb: jpeg(), category: "part" });
  assert.ok(r.ok);
  return r.ok ? r.id : "";
};
const raw = (over: Partial<import("../domain/shares.ts").ShareRaw> = {}) => ({ orderIds: [], photoIds: [], showPrices: false, showReminders: false, ...over });

let n = 0;
async function setup() {
  n++;
  const v = await V.createVehicle(
    { plate: `NI 77${n}-KK`, vin: `WVWZZZ1JZXW00077${n}`, make: "Volkswagen", model: "Passat", year: "2012" },
    { mode: "new", customer: { name: `Tajna Mušterija ${"ABCD"[n]}`, phones: [`064777077${n}`] } },
  );
  assert.ok(v.ok);
  if (!v.ok) throw new Error("vozilo");
  const intake = (complaint: string) => O.createOrderFromIntake({ vehicle: { mode: "existing", vehicleId: v.id }, owner: { mode: "keep" }, complaint, kmIn: "150000" });
  const done = await intake("Mali servis");
  const open = await intake("Kočnice");
  const cancelled = await intake("Buka");
  assert.ok(done.ok && open.ok && cancelled.ok);
  if (!done.ok || !open.ok || !cancelled.ok) throw new Error("nalozi");
  await O.addItem(done.id, { kind: "labor", name: "Zamena ulja", qty: "1", price: "1500" });
  await O.addItem(done.id, { kind: "material", name: "Ulje 5W30", qty: "4", price: "1000", cost: "777" });
  await O.updateOrderText(done.id, "internalNote", "INTERNO-NE-SME-NAPOLJE");
  assert.ok((await O.completeOrder(done.id, { date: "", kmOut: "150100", workDone: "Zamenjeno ulje i filter", reminders: [{ title: "Mali servis", months: "12", km: "10000" }], closeReminderIds: [] })).ok);
  assert.ok((await O.cancelOrder(cancelled.id, "Odustao")).ok);
  return { vehicleId: v.id, done: done.id, open: open.id, cancelled: cancelled.id, donePhoto: await photo(done.id), openPhoto: await photo(open.id) };
}

test("deljenje: provera izbora (prazno, tuđi i otkazan nalog, fotografija bez naloga, bez podsetnika)", async () => {
  const x = await setup();
  const other = await V.createVehicle({ plate: "NI 778-KK", make: "Fiat" }, { mode: "none" });
  assert.ok(other.ok);
  if (!other.ok) return;
  assert.equal((await S.createVehicleShare("nepostoji", raw({ orderIds: [x.done] }))).ok, false);
  assert.equal((await S.createVehicleShare(x.vehicleId, raw())).ok, false);
  assert.equal((await S.createVehicleShare(other.id, raw({ orderIds: [x.done] }))).ok, false);
  assert.equal((await S.createVehicleShare(x.vehicleId, raw({ orderIds: [x.cancelled] }))).ok, false);
  const wrongPhoto = await S.createVehicleShare(x.vehicleId, raw({ orderIds: [x.done], photoIds: [x.openPhoto] }));
  assert.ok(!wrongPhoto.ok && /Fotografija/.test(wrongPhoto.errors.form!));
  assert.equal((await S.createVehicleShare(x.vehicleId, raw({ orderIds: [x.done], photoIds: ["nema"] }))).ok, false);
  const noRem = await S.createVehicleShare(other.id, raw({ showReminders: true }));
  assert.ok(!noRem.ok && /podsetnika/.test(noRem.errors.form!));
  assert.equal(await S.shareOptions("nepostoji"), null);
});

test("deljenje: snimak bez cena i ličnih podataka, broji otvaranja, ne menja se posle izmene naloga", async () => {
  const x = await setup();
  const r = await S.createVehicleShare(x.vehicleId, raw({ orderIds: [x.done], photoIds: [x.donePhoto], showReminders: true }));
  assert.ok(r.ok);
  if (!r.ok) return;
  const p = await S.getPublicShare(r.token);
  assert.ok(p);
  if (!p) return;
  const json = JSON.stringify(p);
  for (const secret of ["Tajna", "064777077", "38164777077", "WVWZZZ1JZXW00077", "INTERNO", "77700"]) assert.ok(!json.includes(secret), secret);
  assert.match(p.snapshot.vehicle.plate ?? "", /^NI77\dKK$/);
  assert.equal(p.snapshot.showPrices, false);
  assert.equal(p.snapshot.orders.length, 1);
  const o = p.snapshot.orders[0]!;
  assert.equal(o.status, "done");
  assert.equal(o.km, 150100);
  assert.equal(o.workDone, "Zamenjeno ulje i filter");
  assert.equal(o.total, undefined);
  assert.deepEqual(o.items.map((i) => [i.name, i.total]), [["Zamena ulja", undefined], ["Ulje 5W30", undefined]]);
  assert.deepEqual(o.photos.map((f) => f.id), [x.donePhoto]);
  assert.deepEqual(p.snapshot.reminders?.map((m) => m.title), ["Mali servis"]);

  assert.equal(r.expiresAt > p.sharedDate, true);
  await S.getPublicShare(r.token, { count: false });
  await O.addItem(x.done, { kind: "part", name: "Dodato posle deljenja", qty: "1", price: "500" });
  const again = await S.getPublicShare(r.token);
  assert.equal(again?.snapshot.orders[0]!.items.length, 2);

  const opts = await S.shareOptions(x.vehicleId);
  assert.deepEqual(opts?.orders.map((n) => n.id).sort(), [x.done, x.open].sort());
  assert.equal(opts?.openReminders, 1);
  const item = opts?.shares.find((s) => s.id === r.id);
  assert.equal(item?.state, "active");
  assert.equal(item?.opens, 2);
  assert.equal(item?.photos, 1);
  assert.equal(item?.reminders, 1);
  assert.ok(item?.lastOpenedAt);
});

test("deljenje: sa cenama ukupno po stavci i nalogu; otvoren nalog ide kao „u radu“", async () => {
  const x = await setup();
  const r = await S.createVehicleShare(x.vehicleId, raw({ orderIds: [x.done, x.open], showPrices: true, days: "30" }));
  assert.ok(r.ok);
  if (!r.ok) return;
  const p = await S.getPublicShare(r.token);
  const done = p?.snapshot.orders.find((o) => o.id === x.done);
  assert.equal(done?.total, 550000);
  assert.deepEqual(done?.items.map((i) => i.total), [150000, 400000]);
  assert.equal(p?.snapshot.orders.find((o) => o.id === x.open)?.status, "open");
  assert.equal(p?.snapshot.reminders, undefined);
  assert.ok(!JSON.stringify(p).includes("77700"));
});

test("deljenje: fotografija samo iz snimka; obrisana nestaje; ugašen i istekao link ne rade", async () => {
  const x = await setup();
  const r = await S.createVehicleShare(x.vehicleId, raw({ orderIds: [x.done], photoIds: [x.donePhoto] }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.ok(await S.readSharedPhoto(r.token, x.donePhoto, "thumb"));
  assert.equal(await S.readSharedPhoto(r.token, x.openPhoto, "full"), null);
  assert.equal(await S.readSharedPhoto("kratak", x.donePhoto, "full"), null);
  assert.equal(await S.getPublicShare("kratak"), null);
  assert.equal(await S.getPublicShare("A".repeat(32)), null);

  assert.ok(await F.deleteAttachment(x.donePhoto));
  assert.deepEqual((await S.getPublicShare(r.token))?.snapshot.orders[0]!.photos, []);

  assert.ok(await S.revokeVehicleShare(r.id));
  assert.equal(await S.revokeVehicleShare(r.id), false);
  assert.equal(await S.revokeVehicleShare("nepostoji"), false);
  assert.equal(await S.getPublicShare(r.token), null);
  assert.equal((await S.shareOptions(x.vehicleId))?.shares.find((s) => s.id === r.id)?.state, "revoked");

  // PDF za majstora radi i posle gašenja linka, bez obrisane fotografije i bez brojanja otvaranja
  const pdf = await S.getSharePdf(r.id);
  assert.equal(pdf?.snapshot.orders[0]!.id, x.done);
  assert.deepEqual(pdf?.snapshot.orders[0]!.photos, []);
  assert.equal(await S.getSharePdf("nepostoji"), null);
  assert.equal((await S.shareOptions(x.vehicleId))?.shares.find((s) => s.id === r.id)?.opens, 1);

  const e = await S.createVehicleShare(x.vehicleId, raw({ orderIds: [x.open], photoIds: [x.openPhoto] }));
  assert.ok(e.ok);
  if (!e.ok) return;
  await DB.write((db) => {
    db.shares.find((s) => s.id === e.id)!.expiresAt = "2000-01-01";
  });
  assert.equal(await S.getPublicShare(e.token), null);
  assert.equal(await S.readSharedPhoto(e.token, x.openPhoto, "full"), null);
  assert.equal((await S.shareOptions(x.vehicleId))?.shares.find((s) => s.id === e.id)?.state, "expired");
});
