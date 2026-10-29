/**
 * Zakazani termini: kad vozilo dolazi, koliko traje, zašto.
 * Vreme je lokalno (Beograd), "HH:MM" u koracima od 15 minuta. Termin može biti za vozilo iz evidencije
 * ili samo kao tekst (novi klijent koji je zvao telefonom).
 */
import { addDays, isIsoDate, type IsoDate } from "./dates.ts";
import { normalizePhone } from "./phone.ts";
import type { FieldErrors, Validated } from "./validation.ts";

export const APPOINTMENT_STATUSES = ["scheduled", "arrived", "no_show", "cancelled"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Zakazano",
  arrived: "Došao",
  no_show: "Nije došao",
  cancelled: "Otkazano",
};

/** Radno vreme za prikaz dana; termin može i van njega. */
export const DAY_START_MIN = 7 * 60;
export const DAY_END_MIN = 19 * 60;
export const STEP_MIN = 15;
export const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240, 480];

export function parseTime(t: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(t.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function formatTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDuration(min: number): string {
  if (min >= 480) return "ceo dan";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}

/** Vremena za izbor u formi: 06:00–21:45 na 15 minuta. */
export function timeOptions(): string[] {
  const out: string[] = [];
  for (let t = 6 * 60; t < 22 * 60; t += STEP_MIN) out.push(formatTime(t));
  return out;
}

// ---------- nedelja ----------

/** Ponedeljak nedelje u kojoj je dati dan. */
export function weekStart(d: IsoDate): IsoDate {
  const [y, m, day] = d.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, day)).getUTCDay(); // 0 = nedelja
  return addDays(d, -((dow + 6) % 7));
}

export function weekDays(d: IsoDate): IsoDate[] {
  const start = weekStart(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const DAY_NAMES = ["Nedelja", "Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota"];
const DAY_SHORT = ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"];

export function dayName(d: IsoDate, short = false): string {
  const [y, m, day] = d.split("-").map(Number);
  const i = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
  return (short ? DAY_SHORT : DAY_NAMES)[i];
}

// ---------- validacija ----------

export type AppointmentRaw = {
  date?: string;
  time?: string;
  duration?: string;
  vehicleId?: string;
  customerId?: string;
  vehicleText?: string;
  customerName?: string;
  phone?: string;
  reason?: string;
  note?: string;
};

export type AppointmentValue = {
  date: IsoDate;
  startMin: number;
  durationMin: number;
  vehicleId?: string;
  customerId?: string;
  vehicleText?: string;
  customerName?: string;
  phone?: string; // E.164
  reason: string;
  note?: string;
};

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function validateAppointment(raw: AppointmentRaw): Validated<AppointmentValue> {
  const errors: FieldErrors = {};
  const date = s(raw.date);
  if (!isIsoDate(date)) errors.date = "Izaberi datum.";
  const startMin = parseTime(s(raw.time));
  if (startMin === null) errors.time = "Izaberi vreme (npr. 09:30).";
  else if (startMin % STEP_MIN !== 0) errors.time = "Vreme je na svakih 15 minuta.";
  const durationMin = Number(s(raw.duration) || 60);
  if (!Number.isInteger(durationMin) || durationMin < STEP_MIN || durationMin > 600 || durationMin % STEP_MIN !== 0) errors.duration = "Trajanje od 15 minuta do 10 sati.";

  const vehicleId = s(raw.vehicleId) || undefined;
  const customerId = s(raw.customerId) || undefined;
  const vehicleText = vehicleId ? undefined : s(raw.vehicleText).replace(/\s+/g, " ") || undefined;
  const customerName = customerId ? undefined : s(raw.customerName).replace(/\s+/g, " ") || undefined;
  if (vehicleText && vehicleText.length > 60) errors.vehicleText = "Najviše 60 znakova.";
  if (customerName && customerName.length > 80) errors.customerName = "Najviše 80 znakova.";
  let phone: string | undefined;
  if (!customerId && s(raw.phone)) {
    const p = normalizePhone(s(raw.phone));
    if (!p.ok) errors.phone = p.error;
    else phone = p.e164;
  }
  if (!vehicleId && !vehicleText && !customerId && !customerName) errors.vehicleText = "Izaberi vozilo ili upiši tablicu / ime klijenta.";

  const reason = s(raw.reason).replace(/\s+/g, " ");
  if (!reason) errors.reason = "Upiši razlog dolaska.";
  else if (reason.length > 200) errors.reason = "Najviše 200 znakova.";
  const note = s(raw.note) || undefined;
  if (note && note.length > 1000) errors.note = "Najviše 1.000 znakova.";

  if (Object.keys(errors).length) return { ok: false, errors, warnings: {} };
  return { ok: true, value: { date, startMin: startMin!, durationMin, vehicleId, customerId, vehicleText, customerName, phone, reason, note }, warnings: {} };
}

// ---------- preklapanja i raspored ----------

type Span = { id: string; startMin: number; durationMin: number };

export const overlaps = (a: Span, b: Span) => a.startMin < b.startMin + b.durationMin && b.startMin < a.startMin + a.durationMin;

/** Koliko drugih termina se preklapa sa datim. */
export function overlapCount(target: Omit<Span, "id"> & { id?: string }, others: Span[]): number {
  return others.filter((o) => o.id !== target.id && overlaps({ id: target.id ?? "", ...target }, o)).length;
}

/**
 * Raspored za prikaz dana: termini koji se preklapaju dele širinu kolone.
 * Vraća za svaki termin indeks kolone i ukupan broj kolona u njegovoj grupi.
 */
export function layoutDay<T extends Span>(items: T[]): (T & { col: number; cols: number })[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.durationMin - a.durationMin);
  const out: (T & { col: number; cols: number })[] = [];
  let group: (T & { col: number; cols: number })[] = [];
  let groupEnd = -1;
  const flush = () => {
    const cols = group.reduce((m, g) => Math.max(m, g.col + 1), 0);
    for (const g of group) g.cols = cols;
    out.push(...group);
    group = [];
  };
  for (const it of sorted) {
    if (group.length && it.startMin >= groupEnd) {
      flush();
      groupEnd = -1;
    }
    const used = new Set(group.filter((g) => overlaps(g, it)).map((g) => g.col));
    let col = 0;
    while (used.has(col)) col++;
    group.push({ ...it, col, cols: 1 });
    groupEnd = Math.max(groupEnd, it.startMin + it.durationMin);
  }
  if (group.length) flush();
  return out;
}
