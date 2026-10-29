/**
 * Deljivi karton za mušteriju: majstor čekira šta mušterija vidi, a link pokazuje snimak
 * u trenutku deljenja. Kasnije izmene naloga ne menjaju poslat link; za novo stanje pravi se novi link.
 */
import { addDays, type IsoDate } from "./dates.ts";
import type { FieldErrors, Validated } from "./validation.ts";

/** Rok važenja linka u danima; podrazumevano 90. */
export const SHARE_DAYS = [30, 90, 365] as const;
export type ShareDays = (typeof SHARE_DAYS)[number];
export const DEFAULT_SHARE_DAYS: ShareDays = 90;
export const SHARE_DAYS_LABELS: Record<ShareDays, string> = { 30: "30 dana", 90: "90 dana", 365: "1 godina" };

export type ShareRaw = {
  orderIds: string[];
  photoIds: string[];
  showPrices: boolean;
  showReminders: boolean;
  days?: string;
};

export type ShareValue = {
  orderIds: string[];
  photoIds: string[];
  showPrices: boolean;
  showReminders: boolean;
  days: ShareDays;
};

const unique = (ids: string[]) => [...new Set(ids.map((s) => s.trim()).filter(Boolean))];

/**
 * Bar jedan nalog ili podsetnici; fotografije bez naloga ne idu (svaka pripada nekom nalogu).
 * Pripadnost naloga i fotografija vozilu proverava server, jer domen ne zna podatke.
 */
export function validateShare(raw: ShareRaw): Validated<ShareValue> {
  const errors: FieldErrors = {};
  const orderIds = unique(raw.orderIds);
  const photoIds = unique(raw.photoIds);
  const days = Number(raw.days || DEFAULT_SHARE_DAYS);
  if (!(SHARE_DAYS as readonly number[]).includes(days)) errors.days = "Izaberi rok važenja.";
  if (!orderIds.length && !raw.showReminders) errors.form = "Izaberi bar jedan nalog ili podsetnike.";
  if (photoIds.length && !orderIds.length) errors.form = "Fotografije se šalju uz nalog; izaberi i nalog.";
  if (Object.keys(errors).length) return { ok: false, errors, warnings: {} };
  return { ok: true, value: { orderIds, photoIds, showPrices: raw.showPrices, showReminders: raw.showReminders, days: days as ShareDays }, warnings: {} };
}

/** Poslednji dan važenja (uključivo). */
export const shareExpiry = (from: IsoDate, days: ShareDays): IsoDate => addDays(from, days);

export type ShareState = "active" | "expired" | "revoked";
export const SHARE_STATE_LABELS: Record<ShareState, string> = { active: "Aktivan", expired: "Istekao", revoked: "Ugašen" };

export function shareState(s: { revokedAt?: string; expiresAt: IsoDate }, today: IsoDate): ShareState {
  if (s.revokedAt) return "revoked";
  return today > s.expiresAt ? "expired" : "active";
}

const ASCII: Record<string, string> = { Š: "S", š: "s", Đ: "Dj", đ: "dj", Č: "C", č: "c", Ć: "C", ć: "c", Ž: "Z", ž: "z" };

/** Ime PDF fajla bez kvačica i razmaka, da prođe kroz Viber, mejl i Windows: „Karton-BG482KM-2026-10-29.pdf“. */
export function sharePdfFileName(v: { plate?: string; make: string; model?: string }, date: IsoDate): string {
  const label = v.plate || [v.make, v.model].filter(Boolean).join(" ");
  const safe = [...label]
    .map((ch) => ASCII[ch] ?? ch)
    .join("")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `Karton-${safe || "vozilo"}-${date}.pdf`;
}
