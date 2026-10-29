/**
 * Kilometraža: trend, projekcija i provera novog upisa.
 * Trend je prosek od prvog do poslednjeg upisa u poslednje 24 meseca. Jednostavno i lako objašnjivo:
 * „vozi oko 1.250 km mesečno“.
 */
import { addDays, daysBetween, type IsoDate } from "./dates.ts";

export type Reading = { date: IsoDate; km: number };

const WINDOW_DAYS = 730;
const MIN_SPAN_DAYS = 30;
const DAYS_PER_MONTH = 30.4375;

export function sortReadings(readings: Reading[]): Reading[] {
  return [...readings].sort((a, b) => (a.date === b.date ? a.km - b.km : a.date < b.date ? -1 : 1));
}

export function latest(readings: Reading[]): Reading | null {
  const s = sortReadings(readings);
  return s.at(-1) ?? null;
}

export type Trend = {
  kmPerDay: number;
  kmPerMonth: number;
  from: Reading;
  to: Reading;
  /** celobrojni delta i raspon, da projekcije ne gube dan na zaokruživanju */
  deltaKm: number;
  spanDays: number;
};

export function trend(readings: Reading[]): Trend | null {
  const s = sortReadings(readings);
  const last = s.at(-1);
  if (!last) return null;
  const window = s.filter((r) => daysBetween(r.date, last.date) <= WINDOW_DAYS);
  const first = window[0];
  const spanDays = daysBetween(first.date, last.date);
  const deltaKm = last.km - first.km;
  if (spanDays < MIN_SPAN_DAYS || deltaKm <= 0) return null;
  const kmPerDay = deltaKm / spanDays;
  return { kmPerDay, kmPerMonth: Math.round(kmPerDay * DAYS_PER_MONTH), from: first, to: last, deltaKm, spanDays };
}

/** Procena kilometraže na dati dan (zaokruženo na 100 km). */
export function projectKmAt(readings: Reading[], date: IsoDate): number | null {
  const t = trend(readings);
  if (!t) return null;
  const km = t.to.km + (daysBetween(t.to.date, date) * t.deltaKm) / t.spanDays;
  return Math.max(t.to.km, Math.round(km / 100) * 100);
}

/** Procena dana kad vozilo dostiže zadatu kilometražu. */
export function projectDateForKm(readings: Reading[], targetKm: number): IsoDate | null {
  const t = trend(readings);
  if (!t) return null;
  if (targetKm <= t.to.km) return t.to.date;
  return addDays(t.to.date, Math.ceil(((targetKm - t.to.km) * t.spanDays) / t.deltaKm));
}

export type ReadingCheck = { ok: boolean; error?: string; warning?: string };

/** Novi upis: mora biti ceo broj 0–9.999.999; manji od ranijeg je upozorenje (zamena table ili greška). */
export function checkReading(readings: Reading[], km: number, date: IsoDate): ReadingCheck {
  if (!Number.isInteger(km) || km < 0 || km > 9_999_999) {
    return { ok: false, error: "Kilometraža mora biti ceo broj između 0 i 9.999.999." };
  }
  const before = readings.filter((r) => r.date <= date);
  const max = before.reduce((m, r) => Math.max(m, r.km), -1);
  if (max > km) {
    return { ok: true, warning: `Manje od ranijeg upisa (${max.toLocaleString("sr-Latn-RS")} km). Proveri da li je zamenjena tabla.` };
  }
  return { ok: true };
}
