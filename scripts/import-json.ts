// Jednokratni prenos ranijih lokalnih podataka iz .data/dev-db.json u lokalnu bazu (.data/pglite).
// Polja koja više ne postoje u šemi (npr. način plaćanja kod uplata) se izostavljaju i ispisuju.
// Fotografije ostaju gde su (.data/uploads). Zaustavi `pnpm dev` pre pokretanja: lokalnu bazu drži jedan proces.
// Pokretanje: pnpm db:import-json
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTableColumns } from "drizzle-orm";
import { COLLECTIONS } from "../src/server/store/schema.ts";
import { replaceAll, type Db } from "../src/server/store/store.ts";

const file = path.join(process.cwd(), ".data", "dev-db.json");
const db = JSON.parse(await readFile(file, "utf8")) as Db;

const dropped = new Map<string, number>();
for (const [k, table] of Object.entries(COLLECTIONS)) {
  const cols = new Set(Object.keys(getTableColumns(table)));
  const rows = ((db as unknown as Record<string, Record<string, unknown>[]>)[k] ??= []);
  for (const r of rows) {
    for (const f of Object.keys(r)) {
      if (cols.has(f)) continue;
      delete r[f];
      dropped.set(`${k}.${f}`, (dropped.get(`${k}.${f}`) ?? 0) + 1);
    }
  }
}

await replaceAll(db);
const count = (k: keyof Db) => (Array.isArray(db[k]) ? (db[k] as unknown[]).length : 0);
console.log(`uvoz: ${count("customers")} klijenata, ${count("vehicles")} vozila, ${count("orders")} naloga, ${count("expenses")} troškova, ${count("attachments")} fotografija`);
for (const [f, n] of dropped) console.log(`  izostavljeno zastarelo polje ${f} (${n})`);
process.exit(0);
