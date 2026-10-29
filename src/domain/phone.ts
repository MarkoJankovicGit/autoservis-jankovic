/**
 * Telefoni: čuvaju se u E.164 (+381641234567), prikazuju u domaćem obliku (064 123 4567).
 * Podrazumevana zemlja je Srbija; strani brojevi se unose sa + ili 00.
 */

export type PhoneResult = { ok: true; e164: string } | { ok: false; error: string };

const RS = "381";

export function normalizePhone(input: string): PhoneResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Unesi broj telefona." };
  if (/[^\d\s+()./-]/.test(raw)) return { ok: false, error: "Broj sme da sadrži samo cifre, razmake, +, / i -." };

  let digits = raw.replace(/\D/g, "");
  const international = raw.startsWith("+") || digits.startsWith("00");
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (international) {
    if (digits.startsWith(RS)) return rs(digits.slice(RS.length));
    if (digits.length < 8 || digits.length > 15) return { ok: false, error: "Strani broj nije ispravne dužine." };
    return { ok: true, e164: "+" + digits };
  }
  if (digits.startsWith(RS) && digits.length >= 10) return rs(digits.slice(RS.length));
  if (digits.startsWith("0")) return rs(digits.slice(1));
  if (digits.startsWith("6")) return rs(digits);
  return { ok: false, error: "Unesi broj sa pozivnim brojem, npr. 064 123 4567." };
}

function rs(national: string): PhoneResult {
  const n = national.replace(/^0+/, "");
  if (n.length < 7 || n.length > 10) return { ok: false, error: "Broj nije ispravne dužine." };
  return { ok: true, e164: "+" + RS + n };
}

/** +381641234567 -> "064 123 4567"; +38111234567 -> "011 234 567". */
export function formatPhone(e164: string): string {
  if (!e164.startsWith("+" + RS)) return e164;
  const n = e164.slice(1 + RS.length);
  const area = "0" + n.slice(0, 2);
  const rest = n.slice(2);
  return `${area} ${rest.slice(0, 3)} ${rest.slice(3)}`.trim();
}

/** Ključ za pretragu po delu broja: samo cifre, bez 00/381/0 na početku. */
export function phoneSearchKey(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith(RS)) d = d.slice(RS.length);
  else if (d.startsWith("0")) d = d.slice(1);
  return d;
}

/** Link za poziv sa telefona. */
export function telHref(e164: string): string {
  return "tel:" + e164;
}
