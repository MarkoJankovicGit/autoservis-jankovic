/**
 * Tekst za pretragu: mala slova, bez dijakritika, "đ" i "dj" se izjednačavaju.
 * "Đorđević", "Djordjevic" i "dordevic" daju isti ključ.
 */
export function foldText(input: string): string {
  return input
    .toLocaleLowerCase("sr-Latn")
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/dj/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

/** Da li tekst sadrži sve reči iz upita (redosled nije bitan). */
export function matchesAllWords(haystack: string, query: string): boolean {
  const h = foldText(haystack);
  const words = foldText(query).split(" ").filter(Boolean);
  return words.length > 0 && words.every((w) => h.includes(w));
}

/** Srpska množina: 1 deo, 2–4 dela, 5+ delova (11–14 uvek „mnogo“). */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a >= 11 && a <= 14) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}
