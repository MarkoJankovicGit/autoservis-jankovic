/**
 * Serverske env promenljive. Nikad se ne uvoze u klijentske komponente.
 * Vrednosti za lokalni rad: .env.local (nije u gitu), šablon: .env.example.
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Nedostaje env promenljiva ${name}. Pogledaj .env.example.`);
  }
  return v;
}

export const env = {
  /** scrypt heš lozinke servisa, format: scrypt:N:r:p:salt:hash (base64url). Generiše: pnpm hash-password */
  get appPasswordHash() {
    return required("APP_PASSWORD_HASH");
  },
  /** nasumična tajna za potpis sesije, najmanje 32 bajta. */
  get sessionSecret() {
    const s = required("SESSION_SECRET");
    if (s.length < 32) throw new Error("SESSION_SECRET mora imati najmanje 32 znaka.");
    return s;
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
