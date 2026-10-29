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
try {
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  console.log("migracije: primenjene");
} finally {
  await client.end();
}
