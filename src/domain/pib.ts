/**
 * PIB (poreski identifikacioni broj): 9 cifara, kontrolna cifra po ISO 7064 MOD 11,10.
 * Algoritam proveren na stvarnim PIB-ovima (NIS 104052135, EPS 103920327, Telekom 100002887).
 */
export function normalizePib(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidPib(pib: string): boolean {
  if (!/^\d{9}$/.test(pib)) return false;
  let p = 10;
  for (let i = 0; i < 8; i++) {
    let s = (Number(pib[i]) + p) % 10;
    if (s === 0) s = 10;
    p = (2 * s) % 11;
  }
  return (11 - p) % 10 === Number(pib[8]);
}
