/**
 * Registarske oznake. Čuva se normalizovan oblik (velika slova, bez razmaka i crtica,
 * ćirilica preslovljena u latinicu) i oblik za prikaz "BG 123-AB".
 */

const CYRILLIC: Record<string, string> = {
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Ђ: "Đ", Е: "E", Ж: "Ž", З: "Z", И: "I",
  Ј: "J", К: "K", Л: "L", Љ: "LJ", М: "M", Н: "N", Њ: "NJ", О: "O", П: "P", Р: "R",
  С: "S", Т: "T", Ћ: "Ć", У: "U", Ф: "F", Х: "H", Ц: "C", Ч: "Č", Џ: "DŽ", Ш: "Š",
};

const PLATE_LETTERS = "A-ZČĆŠĐŽ";
const SERBIAN_PLATE = new RegExp(`^([${PLATE_LETTERS}]{2})(\\d{3,5})([${PLATE_LETTERS}]{1,2})$`);

export function normalizePlate(input: string): string {
  const upper = input.toLocaleUpperCase("sr");
  let out = "";
  for (const ch of upper) out += CYRILLIC[ch] ?? ch;
  return out.replace(new RegExp(`[^${PLATE_LETTERS}0-9]`, "g"), "");
}

/** Ključ za pretragu: bez dijakritika, da "ca123" nađe "ČA 123-AB". */
export function plateSearchKey(input: string): string {
  return normalizePlate(input)
    .replace(/[ČĆ]/g, "C")
    .replace(/Š/g, "S")
    .replace(/Đ/g, "D")
    .replace(/Ž/g, "Z");
}

/** "BG123AB" -> "BG 123-AB". Strane i stare tablice ostaju kako su unete (normalizovano). */
export function formatPlate(normalized: string): string {
  const m = SERBIAN_PLATE.exec(normalized);
  return m ? `${m[1]} ${m[2]}-${m[3]}` : normalized;
}

/** Da li unos u pretrazi liči na tablicu (za ponudu „Novo vozilo sa ovom tablicom“). */
export function looksLikePlate(input: string): boolean {
  const n = normalizePlate(input);
  return n.length >= 5 && n.length <= 10 && /\d/.test(n) && new RegExp(`[${PLATE_LETTERS}]`).test(n);
}
