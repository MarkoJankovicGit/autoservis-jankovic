/**
 * Podaci radnje za dokumente, PDF i javne strane. PLACEHOLDERI u [uglastim zagradama] treba zameniti stvarnim podacima;
 * menjaju se ovde u kodu (bez ekrana za izmenu).
 * Elemente dokumenata potvrđuje knjigovođa radnje pre upotrebe.
 */
export const SHOP = {
  name: "Janković",
  legalName: "Automehaničar Janković",
  address: "[ADRESA RADNJE]",
  city: "[MESTO]",
  phone: "[TELEFON]",
  email: "",
  taxId: "[PIB]",
  registrationNo: "[MATIČNI BROJ]",
  bankAccount: "[TEKUĆI RAČUN]",
  estimateValidDays: 7,
} as const;

export const isPlaceholder = (s: string) => /^\[.*\]$/.test(s);
