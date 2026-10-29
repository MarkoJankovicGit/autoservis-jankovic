/**
 * Kalendar: zakazani termini, statusi i prijem iz termina.
 */
import { todayIso, type IsoDate } from "../domain/dates.ts";
import { overlapCount, validateAppointment, type AppointmentRaw, type AppointmentStatus } from "../domain/appointments.ts";
import type { Appointment, Customer, Vehicle } from "../domain/model.ts";
import type { FieldErrors } from "../domain/validation.ts";
import { nowIso, read, write, type Db } from "./store/json-store.ts";
import { base, currentOwnership } from "./vehicles.ts";

export type ApptResult = { ok: true; id: string; overlap: number } | { ok: false; errors: FieldErrors };
const fail = (errors: FieldErrors) => ({ ok: false as const, errors });

const active = (a: Appointment) => a.status !== "cancelled";

function checkRefs(db: Db, vehicleId?: string, customerId?: string): FieldErrors {
  const e: FieldErrors = {};
  if (vehicleId && !db.vehicles.some((v) => v.id === vehicleId && !v.archivedAt)) e.vehicleId = "Vozilo ne postoji.";
  if (customerId && !db.customers.some((c) => c.id === customerId && !c.archivedAt)) e.customerId = "Klijent ne postoji.";
  return e;
}

/** Ako je izabrano vozilo bez klijenta, klijent je trenutni vlasnik iz kartona. */
function withOwner(db: Db, vehicleId?: string, customerId?: string): string | undefined {
  if (customerId || !vehicleId) return customerId;
  return currentOwnership(db, vehicleId)?.customerId;
}

function sameDayActive(db: Db, date: IsoDate, exceptId?: string) {
  return db.appointments.filter((a) => a.date === date && active(a) && a.id !== exceptId);
}

export function createAppointment(raw: AppointmentRaw): Promise<ApptResult> {
  return write((db) => {
    const r = validateAppointment(raw);
    if (!r.ok) return fail(r.errors);
    const refs = checkRefs(db, r.value.vehicleId, r.value.customerId);
    if (Object.keys(refs).length) return fail(refs);
    const a: Appointment = { ...base(), ...r.value, customerId: withOwner(db, r.value.vehicleId, r.value.customerId), status: "scheduled" };
    db.appointments.push(a);
    return { ok: true as const, id: a.id, overlap: overlapCount(a, sameDayActive(db, a.date, a.id)) };
  });
}

export function updateAppointment(id: string, raw: AppointmentRaw): Promise<ApptResult> {
  return write((db) => {
    const a = db.appointments.find((x) => x.id === id);
    if (!a) return fail({ form: "Termin ne postoji." });
    if (a.status === "arrived") return fail({ form: "Vozilo je već primljeno; termin se ne menja." });
    const r = validateAppointment(raw);
    if (!r.ok) return fail(r.errors);
    const refs = checkRefs(db, r.value.vehicleId, r.value.customerId);
    if (Object.keys(refs).length) return fail(refs);
    const v = r.value;
    Object.assign(a, {
      date: v.date, startMin: v.startMin, durationMin: v.durationMin, vehicleId: v.vehicleId, customerId: withOwner(db, v.vehicleId, v.customerId),
      vehicleText: v.vehicleText, customerName: v.customerName, phone: v.phone, reason: v.reason, note: v.note, updatedAt: nowIso(),
    });
    return { ok: true as const, id, overlap: overlapCount(a, sameDayActive(db, a.date, a.id)) };
  });
}

/** Ručna promena statusa: nije došao, otkazano ili vraćanje na zakazano. „Došao“ nastaje samo prijemom. */
export function setAppointmentStatus(id: string, status: Exclude<AppointmentStatus, "arrived">): Promise<ApptResult> {
  return write((db) => {
    const a = db.appointments.find((x) => x.id === id);
    if (!a) return fail({ form: "Termin ne postoji." });
    if (a.status === "arrived") return fail({ form: "Vozilo je primljeno; status se menja na nalogu." });
    a.status = status;
    a.updatedAt = nowIso();
    return { ok: true as const, id, overlap: 0 };
  });
}

export function deleteAppointment(id: string): Promise<boolean> {
  return write((db) => {
    const i = db.appointments.findIndex((x) => x.id === id && x.status !== "arrived");
    if (i < 0) return false;
    db.appointments.splice(i, 1);
    return true;
  });
}

/** Poziva se iz prijema u istoj transakciji: termin postaje „došao“ i vezuje se za nalog. */
export function markArrived(db: Db, appointmentId: string, orderId: string) {
  const a = db.appointments.find((x) => x.id === appointmentId);
  if (!a || a.status === "arrived" || a.status === "cancelled") return;
  Object.assign(a, { status: "arrived", orderId, updatedAt: nowIso() });
}

// ---------- čitanje ----------

export type AppointmentRow = Appointment & {
  vehicle?: Pick<Vehicle, "id" | "plate" | "vin" | "make" | "model" | "year">;
  customer?: Pick<Customer, "id" | "name" | "phones">;
  orderNumber?: string;
  overlap: number;
};

function enrich(db: Db, a: Appointment): AppointmentRow {
  const v = db.vehicles.find((x) => x.id === a.vehicleId);
  const c = db.customers.find((x) => x.id === a.customerId);
  return {
    ...a,
    vehicle: v && { id: v.id, plate: v.plate, vin: v.vin, make: v.make, model: v.model, year: v.year },
    customer: c && { id: c.id, name: c.name, phones: c.phones },
    orderNumber: db.orders.find((o) => o.id === a.orderId)?.number,
    overlap: active(a) ? overlapCount(a, sameDayActive(db, a.date, a.id)) : 0,
  };
}

export function listAppointments(from: IsoDate, to: IsoDate): Promise<AppointmentRow[]> {
  return read((db) =>
    db.appointments
      .filter((a) => a.date >= from && a.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)
      .map((a) => enrich(db, a)),
  );
}

export function todayAppointments(): Promise<AppointmentRow[]> {
  const d = todayIso();
  return listAppointments(d, d).then((rows) => rows.filter((r) => r.status !== "cancelled"));
}

export function getAppointment(id: string): Promise<AppointmentRow | null> {
  return read((db) => {
    const a = db.appointments.find((x) => x.id === id);
    return a ? enrich(db, a) : null;
  });
}

/** Sledeći zakazani termini vozila (za karton i prijem). */
export function upcomingForVehicle(vehicleId: string): Promise<AppointmentRow[]> {
  return read((db) => {
    const today = todayIso();
    return db.appointments
      .filter((a) => a.vehicleId === vehicleId && a.status === "scheduled" && a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)
      .map((a) => enrich(db, a));
  });
}
