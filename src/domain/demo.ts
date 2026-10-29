/**
 * Demo podaci (grana `demo`): snimak seed-a se pri pokretanju pomera na današnji dan,
 * da kalendar, podsetnici i rokovi izgledaju živo bez obzira kad je snimak napravljen.
 */
import { addDays } from "./dates.ts";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Pomera sve datume (YYYY-MM-DD) i vremena (ISO, UTC) u vrednosti za `days` dana; ključevi i ostalo ostaju isti. */
export function shiftDates<T>(value: T, days: number): T {
  if (!days) return value;
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      if (DATE.test(v)) return addDays(v, days);
      if (DATE_TIME.test(v)) return new Date(Date.parse(v) + days * 86_400_000).toISOString();
      return v;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}
