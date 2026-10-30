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
try {
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  console.log("migracije: primenjene");
} catch (e) {
  const c = ((e as { cause?: unknown }).cause ?? e) as { code?: string; message?: string };
  console.error(`migracije: GREŠKA (${target}): ${c.code ?? ""} ${c.message ?? String(c)}`);
  console.error("Proveri DATABASE_URL: Supabase → Connect → Session pooler (port 5432), lozinka umesto [YOUR-PASSWORD] bez zagrada.");
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}
