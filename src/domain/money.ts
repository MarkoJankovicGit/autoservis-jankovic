/**
 * Novac se čuva kao ceo broj para (1 RSD = 100 para). Nikad float.
 * Količina se čuva u hiljaditim delovima (2,5 l = 2500), popust u baznim poenima (10 % = 1000).
 * Radnja nije obveznik PDV-a, pa nema obračuna poreza.
 */

export type Para = number;

const NF2 = new Intl.NumberFormat("sr-Latn-RS", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NF0 = new Intl.NumberFormat("sr-Latn-RS", { maximumFractionDigits: 0 });

/** 1245000 -> "12.450,00 RSD" (ili "12.450 RSD" bez decimala, za liste). */
export function formatMoney(para: Para, opts: { decimals?: boolean; currency?: boolean } = {}): string {
  const { decimals = true, currency = true } = opts;
  const value = para / 100;
  const s = decimals ? NF2.format(value) : NF0.format(Math.round(value));
  return currency ? `${s} RSD` : s;
}

/**
 * Parsira iznos kako ga korisnik kuca: "12.450,00", "12450", "12450,5", "12 450", "12450.50".
 * Zarez je decimalni separator; tačka je separator hiljada, osim kad je jedina i iza nje su 1–2 cifre.
 */
export function parseMoney(input: string): Para | null {
  let s = input.trim().replace(/\s|RSD|din\.?/gi, "");
  if (!s) return null;
  const negative = s.startsWith("-");
  if (negative) s = s.slice(1);
  let intPart: string;
  let fracPart = "";
  if (s.includes(",")) {
    const [i, f, ...rest] = s.split(",");
    if (rest.length) return null;
    intPart = i.replace(/\./g, "");
    fracPart = f;
  } else {
    const dots = s.split(".");
    if (dots.length === 2 && dots[1].length >= 1 && dots[1].length <= 2) {
      intPart = dots[0];
      fracPart = dots[1];
    } else {
      if (dots.length > 1 && dots.slice(1).some((g) => g.length !== 3)) return null;
      intPart = dots.join("");
    }
  }
  if (!/^\d+$/.test(intPart || "0") || !/^\d{0,2}$/.test(fracPart)) return null;
  const para = Number(intPart || "0") * 100 + Number((fracPart + "00").slice(0, 2));
  if (!Number.isSafeInteger(para)) return null;
  return negative ? -para : para;
}

/** "2,5" -> 2500 (hiljaditi delovi). Najviše 3 decimale. */
export function parseQuantity(input: string): number | null {
  const s = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(s)) return null;
  const [i, f = ""] = s.split(".");
  return Number(i) * 1000 + Number((f + "000").slice(0, 3));
}

export function formatQuantity(milli: number): string {
  return new Intl.NumberFormat("sr-Latn-RS", { maximumFractionDigits: 3 }).format(milli / 1000);
}

/** Zaokruživanje na najbliži ceo broj, polovina ide naviše (od nule). */
function roundDiv(n: bigint, d: bigint): bigint {
  const neg = n < 0n !== d < 0n;
  const an = n < 0n ? -n : n;
  const ad = d < 0n ? -d : d;
  const q = (an * 2n + ad) / (ad * 2n);
  return neg ? -q : q;
}

/** Iznos stavke: količina × cena × (1 − popust), zaokruženo na paru. */
export function lineTotal(qtyMilli: number, unitPrice: Para, discountBp = 0): Para {
  if (discountBp < 0 || discountBp > 10000) throw new RangeError("Popust mora biti između 0 i 100 %.");
  const n = BigInt(qtyMilli) * BigInt(unitPrice) * BigInt(10000 - discountBp);
  return Number(roundDiv(n, 1000n * 10000n));
}

export function sum(values: Para[]): Para {
  return values.reduce((a, b) => a + b, 0);
}
