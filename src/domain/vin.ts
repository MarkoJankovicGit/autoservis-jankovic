/**
 * VIN ili broj šasije. Standardni VIN ima 17 znakova bez slova I, O i Q.
 * Starija vozila imaju kraće brojeve šasije, pa se odstupanja prijavljuju kao upozorenja, ne greške.
 * Kontrolna cifra (9. znak) se ne proverava: kod evropskih vozila nije obavezna i davala bi lažna upozorenja.
 */

export type VinCheck = { ok: boolean; error?: string; warnings: string[] };

export function normalizeVin(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export function checkVin(normalized: string): VinCheck {
  const warnings: string[] = [];
  if (!normalized) return { ok: true, warnings };
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return { ok: false, error: "VIN sme da sadrži samo slova i cifre.", warnings };
  }
  if (normalized.length < 5 || normalized.length > 17) {
    return { ok: false, error: `VIN ima najviše 17 znakova (uneto ${normalized.length}).`, warnings };
  }
  if (normalized.length !== 17) {
    warnings.push(`Standardni VIN ima 17 znakova, uneto ${normalized.length}. Sačuvaće se kao broj šasije.`);
  }
  if (/[IOQ]/.test(normalized)) {
    warnings.push("VIN ne sadrži slova I, O i Q. Proveri da li je to 1 ili 0.");
  }
  return { ok: true, warnings };
}
