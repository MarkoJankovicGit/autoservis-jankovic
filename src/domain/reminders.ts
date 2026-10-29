/**
 * Podsetnici za budući servis: „mali servis za 12 meseci ili 15.000 km, šta pre nastupi“.
 * Rok po kilometraži se pretvara u datum preko trenda kilometraže vozila.
 */
import { addMonths, daysBetween, type IsoDate } from "./dates.ts";
import { projectDateForKm, type Reading } from "./odometer.ts";
import type { FieldErrors, Validated } from "./validation.ts";

export type ReminderPreset = { title: string; months?: number; km?: number };

export const REMINDER_PRESETS: ReminderPreset[] = [
  { title: "Mali servis", months: 12, km: 15_000 },
  { title: "Veliki servis (zupčasti kaiš)", months: 60, km: 120_000 },
  { title: "Kočnice (pločice)", km: 30_000 },
  { title: "Kočiona tečnost", months: 24 },
  { title: "Antifriz", months: 36 },
  { title: "Klima (servis)", months: 12 },
  { title: "Tehnički pregled", months: 12 },
];

export type ReminderRaw = { title?: string; months?: string; km?: string };
export type ReminderValue = { title: string; months?: number; km?: number };

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function validateReminder(raw: ReminderRaw): Validated<ReminderValue> {
  const errors: FieldErrors = {};
  const title = s(raw.title).replace(/\s+/g, " ");
  if (!title) errors.title = "Unesi šta treba uraditi.";
  else if (title.length > 80) errors.title = "Najviše 80 znakova.";
  let months: number | undefined;
  let km: number | undefined;
  if (s(raw.months)) {
    months = Number(s(raw.months));
    if (!Number.isInteger(months) || months < 1 || months > 120) errors.months = "Meseci: ceo broj od 1 do 120.";
  }
  if (s(raw.km)) {
    km = Number(s(raw.km).replace(/[.\s]/g, ""));
    if (!Number.isInteger(km) || km < 100 || km > 500_000) errors.km = "Kilometri: od 100 do 500.000.";
  }
  if (!errors.months && !errors.km && months === undefined && km === undefined) errors.months = "Unesi za koliko meseci ili kilometara.";
  if (Object.keys(errors).length) return { ok: false, errors, warnings: {} };
  return { ok: true, value: { title, months, km }, warnings: {} };
}

/** Rok iz trenutka završetka naloga: datum = završetak + meseci; km = izlazna km + km. */
export function reminderTargets(v: ReminderValue, from: IsoDate, kmOut?: number): { dueDate?: IsoDate; dueKm?: number } {
  return {
    dueDate: v.months ? addMonths(from, v.months) : undefined,
    dueKm: v.km && kmOut !== undefined ? kmOut + v.km : undefined,
  };
}

export type DueInfo = {
  /** procenjeni dan dospeća: raniji od roka po datumu i po kilometraži */
  date: IsoDate | null;
  /** šta određuje rok */
  by: "date" | "km" | null;
  daysLeft: number | null;
  overdue: boolean;
  /** dospeva u narednih N dana (podrazumevano 30) */
  soon: boolean;
  /** km rok postoji ali nema trenda da se pretvori u datum */
  kmWithoutTrend: boolean;
};

export function reminderDue(r: { dueDate?: IsoDate; dueKm?: number }, readings: Reading[], today: IsoDate, soonDays = 30): DueInfo {
  const kmDate = r.dueKm !== undefined ? projectDateForKm(readings, r.dueKm) : null;
  const candidates: { date: IsoDate; by: "date" | "km" }[] = [];
  if (r.dueDate) candidates.push({ date: r.dueDate, by: "date" });
  if (kmDate) candidates.push({ date: kmDate, by: "km" });
  candidates.sort((a, b) => a.date.localeCompare(b.date));
  const first = candidates[0];
  const lastKm = readings.reduce((m, x) => Math.max(m, x.km), -1);
  const kmPassed = r.dueKm !== undefined && lastKm >= r.dueKm;
  if (!first) {
    return { date: null, by: null, daysLeft: null, overdue: kmPassed, soon: kmPassed, kmWithoutTrend: r.dueKm !== undefined };
  }
  const daysLeft = daysBetween(today, first.date);
  const overdue = daysLeft < 0 || kmPassed;
  return { date: first.date, by: first.by, daysLeft, overdue, soon: overdue || daysLeft <= soonDays, kmWithoutTrend: r.dueKm !== undefined && !kmDate };
}

export function describeTarget(r: { dueDate?: IsoDate; dueKm?: number }, fmtDate: (d: IsoDate) => string): string {
  const parts: string[] = [];
  if (r.dueDate) parts.push(fmtDate(r.dueDate));
  if (r.dueKm !== undefined) parts.push(`${r.dueKm.toLocaleString("sr-Latn-RS")} km`);
  return parts.join(" ili ");
}
