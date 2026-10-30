// Primena migracija (folder drizzle/) na produkcionu bazu. Pokreće je Vercel pre build-a (package.json: vercel-build);
// ako migracija ne uspe, deploy se prekida i ostaje prethodna verzija. Lokalni PGlite primenjuje migracije sam.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("migracije: nema DATABASE_URL, preskačem");
  process.exit(0);
}
if (process.env.VERCEL && process.env.VERCEL_ENV !== "production") {
  console.log(`migracije: okruženje ${process.env.VERCEL_ENV}, preskačem (samo production menja bazu)`);
  process.exit(0);
}

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const client = postgres(url, { max: 1, prepare: false, ssl: local ? false : "require", onnotice: () => {} });
// adresa za poruku o grešci, bez korisnika i lozinke
const target = (() => {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || 5432}`;
  } catch {
    return "neispravna adresa (specijalni znakovi u lozinci moraju biti kodirani)";
  }
})();

/** Opis adrese za log, bez lozinke: samo ono što pomaže da se nađe greška pri lepljenju. */
function shape(raw: string): string {
  const notes: string[] = [];
  if (raw !== raw.trim()) notes.push("razmak ili novi red na početku/kraju adrese");
  if (/^["']|["']$/.test(raw.trim())) notes.push("navodnici oko adrese");
  if ((raw.match(/@/g) ?? []).length !== 1) notes.push("znak @ se javlja više puta (u lozinci mora biti %40)");
  try {
    const u = new URL(raw.trim());
    const pass = decodeURIComponent(u.password);
    notes.push(`korisnik ${decodeURIComponent(u.username)}`, `lozinka ${pass.length} znakova`);
    if (pass.includes("YOUR-PASSWORD")) notes.push("lozinka je i dalje šablon YOUR-PASSWORD");
    else if (/[[\]]/.test(pass)) notes.push("lozinka sadrži [ ili ] (zagrade iz šablona treba obrisati)");
    if (/\s/.test(pass)) notes.push("lozinka sadrži razmak");
    if (/[^A-Za-z0-9]/.test(pass)) notes.push("lozinka ima znakove osim slova i brojeva");
    notes.push(`baza ${u.pathname.slice(1) || "(prazno)"}`);
  } catch {
    notes.push("adresa se ne može pročitati");
  }
  return notes.join("; ");
}

try {
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  console.log("migracije: primenjene");
} catch (e) {
  const c = ((e as { cause?: unknown }).cause ?? e) as { code?: string; message?: string };
  console.error(`migracije: GREŠKA (${target}): ${c.code ?? ""} ${c.message ?? String(c)}`);
  console.error(`DATABASE_URL: ${shape(url)}`);
  console.error("Proveri DATABASE_URL: Supabase → Connect → Session pooler (port 5432), lozinka umesto [YOUR-PASSWORD] bez zagrada.");
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}
