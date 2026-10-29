/**
 * Validacija unosa za klijente i vozila. Vraća normalizovane vrednosti ili greške po polju.
 * Ključ greške je ime polja u formi ("name", "phones.1", "plate"...).
 */
import { isIsoDate, type IsoDate } from "./dates.ts";
import { FUELS, type CustomerType, type Fuel, type Phone } from "./model.ts";
import { normalizePhone } from "./phone.ts";
import { isValidPib, normalizePib } from "./pib.ts";
import { normalizePlate } from "./plate.ts";
import { checkVin, normalizeVin } from "./vin.ts";

export type FieldErrors = Record<string, string>;
export type Validated<T> = { ok: true; value: T; warnings: FieldErrors } | { ok: false; errors: FieldErrors; warnings: FieldErrors };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const opt = (v: unknown) => str(v) || undefined;

function maxLen(errors: FieldErrors, field: string, value: string | undefined, max: number) {
  if (value && value.length > max) errors[field] = `Najviše ${max} znakova.`;
}

// ---------- klijent ----------

export type CustomerRaw = {
  type?: string;
  name?: string;
  phones?: string[];
  email?: string;
  taxId?: string;
  address?: string;
  note?: string;
};

export type CustomerValue = {
  type: CustomerType;
  name: string;
  phones: Phone[];
  email?: string;
  taxId?: string;
  address?: string;
  note?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateCustomer(raw: CustomerRaw): Validated<CustomerValue> {
  const errors: FieldErrors = {};
  const type: CustomerType = raw.type === "company" ? "company" : "person";
  const name = str(raw.name).replace(/\s+/g, " ");
  if (name.length < 2) errors.name = type === "company" ? "Unesi naziv firme." : "Unesi ime i prezime.";
  maxLen(errors, "name", name, 120);

  const phones: Phone[] = [];
  (raw.phones ?? []).forEach((p, i) => {
    if (!str(p)) return;
    const r = normalizePhone(p);
    if (!r.ok) errors[`phones.${i}`] = r.error;
    else if (!phones.some((x) => x.e164 === r.e164)) phones.push({ e164: r.e164 });
  });

  const email = opt(raw.email)?.toLowerCase();
  if (email && !EMAIL.test(email)) errors.email = "Email nije ispravan.";
  if (!phones.length && !email && !Object.keys(errors).some((k) => k.startsWith("phones."))) {
    errors["phones.0"] = "Unesi bar telefon ili email.";
  }

  let taxId: string | undefined;
  if (type === "company" && str(raw.taxId)) {
    taxId = normalizePib(str(raw.taxId));
    if (!isValidPib(taxId)) errors.taxId = "PIB nije ispravan (9 cifara, proveri prepis).";
  }

  const address = opt(raw.address);
  const note = opt(raw.note);
  maxLen(errors, "address", address, 200);
  maxLen(errors, "note", note, 2000);

  if (Object.keys(errors).length) return { ok: false, errors, warnings: {} };
  return { ok: true, value: { type, name, phones, email, taxId, address, note }, warnings: {} };
}

// ---------- vozilo ----------

export type VehicleRaw = {
  plate?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: string;
  fuel?: string;
  engine?: string;
  powerKw?: string;
  color?: string;
  registrationExpires?: string;
  note?: string;
  km?: string;
};

export type VehicleValue = {
  plate?: string;
  vin?: string;
  make: string;
  model?: string;
  year?: number;
  fuel?: Fuel;
  engine?: string;
  powerKw?: number;
  color?: string;
  registrationExpires?: IsoDate;
  note?: string;
  km?: number;
};

export function parseKm(input: string | undefined): number | null | undefined {
  const s = str(input).replace(/[.\s]/g, "");
  if (!s) return undefined;
  return /^\d{1,7}$/.test(s) ? Number(s) : null;
}

export function validateVehicle(raw: VehicleRaw, currentYear = new Date().getFullYear()): Validated<VehicleValue> {
  const errors: FieldErrors = {};
  const warnings: FieldErrors = {};

  const plate = normalizePlate(str(raw.plate)) || undefined;
  if (plate && (plate.length < 3 || plate.length > 12)) errors.plate = "Tablica nije ispravne dužine.";

  const vin = normalizeVin(str(raw.vin)) || undefined;
  if (vin) {
    const c = checkVin(vin);
    if (!c.ok) errors.vin = c.error!;
    else if (c.warnings.length) warnings.vin = c.warnings.join(" ");
  }
  if (!plate && !vin && !errors.plate) errors.plate = "Unesi tablicu ili VIN.";

  const make = str(raw.make);
  if (!make) errors.make = "Unesi marku.";
  maxLen(errors, "make", make, 40);
  const model = opt(raw.model);
  maxLen(errors, "model", model, 60);

  let year: number | undefined;
  if (str(raw.year)) {
    year = Number(str(raw.year));
    if (!Number.isInteger(year) || year < 1950 || year > currentYear + 1) errors.year = `Godište između 1950 i ${currentYear + 1}.`;
  }

  let fuel: Fuel | undefined;
  if (str(raw.fuel)) {
    if ((FUELS as readonly string[]).includes(str(raw.fuel))) fuel = str(raw.fuel) as Fuel;
    else errors.fuel = "Izaberi gorivo sa liste.";
  }

  const engine = opt(raw.engine);
  const color = opt(raw.color);
  maxLen(errors, "engine", engine, 60);
  maxLen(errors, "color", color, 30);

  let powerKw: number | undefined;
  const kw = str(raw.powerKw).replace(/\s*kw$/i, "");
  if (kw) {
    powerKw = Number(kw);
    if (!/^\d{1,4}$/.test(kw) || powerKw < 1 || powerKw > 1500) errors.powerKw = "Snaga u kW, ceo broj (npr. 77).";
  }

  const registrationExpires = opt(raw.registrationExpires);
  if (registrationExpires && !isIsoDate(registrationExpires)) errors.registrationExpires = "Datum nije ispravan.";

  const note = opt(raw.note);
  maxLen(errors, "note", note, 2000);

  const km = parseKm(raw.km);
  if (km === null) errors.km = "Kilometraža je ceo broj, do 9.999.999.";

  if (Object.keys(errors).length) return { ok: false, errors, warnings };
  return {
    ok: true,
    value: { plate, vin, make, model, year, fuel, engine, powerKw, color, registrationExpires, note, km: km ?? undefined },
    warnings,
  };
}
