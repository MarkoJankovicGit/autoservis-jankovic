/**
 * Datumi kao "YYYY-MM-DD" (kalendarski dan, bez vremena). Prikaz: "28.10.2026."
 * Vremenska zona radnje: Europe/Belgrade.
 */

export const TIME_ZONE = "Europe/Belgrade";
export type IsoDate = string;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(s: string): s is IsoDate {
  const m = ISO.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Današnji datum u Beogradu. */
export function todayIso(now = new Date()): IsoDate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function toUtc(d: IsoDate): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export function addDays(d: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(d) + days * 86_400_000);
}

/** Dodaje mesece; 31.01. + 1 mesec = 28/29.02. */
export function addMonths(d: IsoDate, months: number): IsoDate {
  const [y, m, day] = d.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return fromUtc(target.getTime());
}

export function formatDate(d: IsoDate): string {
  const [y, m, day] = d.split("-");
  return `${Number(day)}.${Number(m)}.${y}.`;
}

/** Za vremenske oznake (ISO string sa vremenom) -> "28.10.2026. 14:05" u beogradskom vremenu. */
export function formatDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("sr-Latn-RS", {
    timeZone: TIME_ZONE, day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")}. ${get("hour")}:${get("minute")}`;
}
