import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

let dir: string;
let cwd: string;
let A: typeof import("./appointments.ts");
let V: typeof import("./vehicles.ts");
let O: typeof import("./orders.ts");

before(async () => {
  cwd = process.cwd();
  dir = await mkdtemp(path.join(tmpdir(), "jk-appt-"));
  process.chdir(dir);
  A = await import("./appointments.ts");
  V = await import("./vehicles.ts");
  O = await import("./orders.ts");
});
after(async () => {
  process.chdir(cwd);
  await rm(dir, { recursive: true, force: true });
});

test("termin za vozilo: klijent je vlasnik iz kartona, preklapanje se broji", async () => {
  const v = await V.createVehicle({ plate: "VA 900-TT", make: "Opel" }, { mode: "new", customer: { name: "Vlasnik Termina", phones: ["0649009000"] } });
  assert.ok(v.ok);
  if (!v.ok) return;
  const a = await A.createAppointment({ date: "2026-11-02", time: "09:00", duration: "60", vehicleId: v.id, reason: "Mali servis" });
  assert.ok(a.ok);
  if (!a.ok) return;
  assert.equal(a.overlap, 0);
  const row = await A.getAppointment(a.id);
  assert.equal(row?.customer?.name, "Vlasnik Termina");
  assert.equal(row?.status, "scheduled");
  const b = await A.createAppointment({ date: "2026-11-02", time: "09:30", customerName: "Marko", phone: "064 111 2222", vehicleText: "Golf BG 1", reason: "Kočnice" });
  assert.ok(b.ok);
  if (b.ok) assert.equal(b.overlap, 1);
  assert.equal((await A.listAppointments("2026-11-02", "2026-11-02")).length, 2);
  assert.equal((await A.createAppointment({ date: "2026-11-02", time: "10:00", vehicleId: "nepostoji", reason: "x" })).ok, false);
});

test("izmena, nije došao, otkazano ne broji preklapanje, brisanje", async () => {
  const a = await A.createAppointment({ date: "2026-11-03", time: "10:00", customerName: "Ana", reason: "Pregled" });
  const b = await A.createAppointment({ date: "2026-11-03", time: "10:00", customerName: "Bojan", reason: "Gume" });
  assert.ok(a.ok && b.ok);
  if (!a.ok || !b.ok) return;
  assert.ok((await A.setAppointmentStatus(b.id, "cancelled")).ok);
  assert.equal((await A.getAppointment(a.id))?.overlap, 0);
  const u = await A.updateAppointment(a.id, { date: "2026-11-04", time: "11:15", duration: "30", customerName: "Ana", reason: "Pregled" });
  assert.ok(u.ok);
  assert.equal((await A.getAppointment(a.id))?.startMin, 675);
  assert.ok((await A.setAppointmentStatus(a.id, "no_show")).ok);
  assert.ok(await A.deleteAppointment(b.id));
  assert.equal(await A.getAppointment(b.id), null);
});

test("prijem iz termina: termin postaje „došao“ i vezan je za nalog; više se ne menja", async () => {
  const v = await V.createVehicle({ plate: "VA 901-TT", make: "Fiat" }, { mode: "new", customer: { name: "Klijent Prijema", phones: ["0649009001"] } });
  assert.ok(v.ok);
  if (!v.ok) return;
  const a = await A.createAppointment({ date: "2026-11-05", time: "08:00", vehicleId: v.id, reason: "Klima" });
  assert.ok(a.ok);
  if (!a.ok) return;
  const o = await O.createOrderFromIntake({ vehicle: { mode: "existing", vehicleId: v.id }, owner: { mode: "keep" }, complaint: "Klima", appointmentId: a.id });
  assert.ok(o.ok);
  const row = await A.getAppointment(a.id);
  assert.equal(row?.status, "arrived");
  assert.ok(row?.orderNumber);
  assert.equal((await A.updateAppointment(a.id, { date: "2026-11-06", time: "08:00", vehicleId: v.id, reason: "Klima" })).ok, false);
  assert.equal((await A.setAppointmentStatus(a.id, "cancelled")).ok, false);
  assert.equal(await A.deleteAppointment(a.id), false);
});
