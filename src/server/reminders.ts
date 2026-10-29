/**
 * Podsetnici za budući servis: ručno dodavanje na kartonu, odbacivanje, liste za početnu i karton.
 * Automatski nastaju pri završetku naloga (orders.ts).
 */
import { todayIso } from "../domain/dates.ts";
import type { Customer, Reminder, Vehicle } from "../domain/model.ts";
import { latest, type Reading } from "../domain/odometer.ts";
import { reminderDue, reminderTargets, validateReminder, type ReminderRaw } from "../domain/reminders.ts";
import type { FieldErrors } from "../domain/validation.ts";
import { nowIso, read, write, type Db } from "./store/json-store.ts";
import { base, currentOwnership } from "./vehicles.ts";
import type { ReminderWithDue } from "./orders.ts";

const readingsOf = (db: Db, vehicleId: string): Reading[] =>
  db.odometerReadings.filter((r) => r.vehicleId === vehicleId).map(({ date, km }) => ({ date, km }));

export type ReminderResult = { ok: true } | { ok: false; errors: FieldErrors };

/** Ručni podsetnik na kartonu: rok se računa od danas i poslednje kilometraže. */
export function addReminder(vehicleId: string, raw: ReminderRaw): Promise<ReminderResult> {
  return write((db) => {
    if (!db.vehicles.some((v) => v.id === vehicleId)) return { ok: false as const, errors: { form: "Vozilo ne postoji." } };
    const r = validateReminder(raw);
    if (!r.ok) return { ok: false as const, errors: r.errors };
    const lastKm = latest(readingsOf(db, vehicleId))?.km;
    if (r.value.km && lastKm === undefined && !r.value.months) {
      return { ok: false as const, errors: { km: "Vozilo nema upisanu kilometražu. Upiši je ili zadaj rok u mesecima." } };
    }
    const t = reminderTargets(r.value, todayIso(), lastKm);
    db.reminders.push({ ...base(), vehicleId, title: r.value.title, ...t, status: "open" });
    return { ok: true as const };
  });
}

export function closeReminder(id: string, status: "done" | "dismissed"): Promise<boolean> {
  return write((db) => {
    const r = db.reminders.find((x) => x.id === id && x.status === "open");
    if (!r) return false;
    Object.assign(r, { status, closedAt: nowIso(), updatedAt: nowIso() });
    return true;
  });
}

export function reopenReminder(id: string): Promise<boolean> {
  return write((db) => {
    const r = db.reminders.find((x) => x.id === id && x.status !== "open");
    if (!r) return false;
    Object.assign(r, { status: "open", closedAt: undefined, closedByOrderId: undefined, updatedAt: nowIso() });
    return true;
  });
}

const byDue = (a: ReminderWithDue, b: ReminderWithDue) =>
  Number(b.due.overdue) - Number(a.due.overdue) || (a.due.date ?? "9999").localeCompare(b.due.date ?? "9999");

export function remindersForVehicle(vehicleId: string): Promise<{ open: ReminderWithDue[]; closed: Reminder[] }> {
  return read((db) => {
    const readings = readingsOf(db, vehicleId);
    const today = todayIso();
    const all = db.reminders.filter((r) => r.vehicleId === vehicleId);
    return {
      open: all.filter((r) => r.status === "open").map((r) => ({ ...r, due: reminderDue(r, readings, today) })).sort(byDue),
      closed: all.filter((r) => r.status !== "open").sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? "")),
    };
  });
}

export type DueReminder = ReminderWithDue & {
  vehicle: Pick<Vehicle, "id" | "plate" | "vin" | "make" | "model">;
  owner?: Pick<Customer, "id" | "name" | "phones">;
};

/** Otvoreni podsetnici svih vozila; `soonOnly` = prekoračeni i oni u narednih `days` dana. */
export function listOpenReminders({ soonOnly = false, days = 30 } = {}): Promise<DueReminder[]> {
  return read((db) => {
    const today = todayIso();
    const out: DueReminder[] = [];
    for (const r of db.reminders) {
      if (r.status !== "open") continue;
      const v = db.vehicles.find((x) => x.id === r.vehicleId && !x.archivedAt);
      if (!v) continue;
      const due = reminderDue(r, readingsOf(db, v.id), today, days);
      if (soonOnly && !due.soon) continue;
      const own = currentOwnership(db, v.id);
      const c = own ? db.customers.find((x) => x.id === own.customerId) : undefined;
      out.push({ ...r, due, vehicle: { id: v.id, plate: v.plate, vin: v.vin, make: v.make, model: v.model }, owner: c && { id: c.id, name: c.name, phones: c.phones } });
    }
    return out.sort(byDue);
  });
}
