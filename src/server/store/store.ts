/**
 * Skladište podataka u Postgresu: Supabase u produkciji (DATABASE_URL), PGlite lokalno (.data/pglite) i u testovima (memorija).
 * Ostatak koda radi kao i ranije, nad celim skupom podataka (`Db`) kroz read()/write():
 * - čitanje učitava sve tabele samo kad se promenila verzija podataka (red `meta`), inače koristi keš instance;
 * - upis zaključava red verzije, primenjuje izmenu na kopiju i u jednoj transakciji upisuje samo razliku
 *   (nove, izmenjene i obrisane redove), pa povećava verziju; druge instance servera tako znaju da im je keš star.
 * Za ovaj obim (jedna radnja) to je brzo; kad podaci porastu, česti upiti mogu da pređu na direktne SQL upite modul po modul.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq, getTableColumns, inArray, and } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT, PgTable } from "drizzle-orm/pg-core";
import { TENANT_ID, type Appointment, type Attachment, type Customer, type Expense, type Invoice, type OdometerReading, type OrderItem, type Ownership, type PartsOrder, type Payment, type Reminder, type ServiceOrder, type Supplier, type Vehicle, type VehicleShare } from "../../domain/model.ts";
import { COLLECTIONS, meta, sequences } from "./schema.ts";

export type Db = {
  version: 1;
  customers: Customer[];
  vehicles: Vehicle[];
  ownerships: Ownership[];
  odometerReadings: OdometerReading[];
  orders: ServiceOrder[];
  orderItems: OrderItem[];
  attachments: Attachment[];
  reminders: Reminder[];
  payments: Payment[];
  suppliers: Supplier[];
  expenses: Expense[];
  partsOrders: PartsOrder[];
  invoices: Invoice[];
  appointments: Appointment[];
  shares: VehicleShare[];
  /** brojači dokumenata: { "order:2026": 14 } */
  sequences: Record<string, number>;
};

type Key = keyof typeof COLLECTIONS;
type Entity = { id: string } & Record<string, unknown>;
export type Database = PgDatabase<PgQueryResultHKT>;
type Executor = Pick<Database, "select" | "insert" | "update" | "delete">;

const emptyDb = (): Db => ({
  version: 1,
  customers: [],
  vehicles: [],
  ownerships: [],
  odometerReadings: [],
  orders: [],
  orderItems: [],
  attachments: [],
  reminders: [],
  payments: [],
  suppliers: [],
  expenses: [],
  partsOrders: [],
  invoices: [],
  appointments: [],
  shares: [],
  sequences: {},
});

const keys = Object.keys(COLLECTIONS) as Key[];
const list = (db: Db, k: Key) => db[k] as unknown as Entity[];

// ---------- konekcija ----------

function migrationsDir(): string {
  const fromCwd = path.join(process.cwd(), "drizzle");
  if (existsSync(path.join(fromCwd, "meta", "_journal.json"))) return fromCwd;
  // testovi menjaju radni direktorijum na privremeni; tada se kod izvršava iz izvora, pa je folder relativan prema ovom fajlu
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "drizzle");
}

/**
 * Supabase pooler za aplikaciju: transaction mode (6543) umesto session mode (5432).
 * U session mode-u svaka veza drži mesto dok je klijent ne zatvori (besplatni plan: 15), a serverless instance
 * (i zaostale iz starih deploy-a) to brzo potroše. Ista adresa i korisnik, samo port; migracije i bekap ostaju na 5432.
 */
export function appDatabaseUrl(url: string): string {
  return url.replace(/(\.pooler\.supabase\.com):5432(?=[/?]|$)/, "$1:6543");
}

async function connect(): Promise<Database> {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    // transaction mode: bez pripremljenih upita, malo konekcija po instanci servera
    const client = postgres(appDatabaseUrl(url), { max: 3, idle_timeout: 20, prepare: false, ssl: local ? false : "require" });
    return drizzle(client, { casing: "snake_case" }) as unknown as Database;
  }
  if (process.env.VERCEL) throw new Error("Nedostaje DATABASE_URL (Vercel → Settings → Environment Variables).");
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // testovi: baza u memoriji (svaki test fajl je poseban proces); lokalno: fajl u .data/pglite
  const client = process.env.NODE_TEST_CONTEXT ? new PGlite() : new PGlite(path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "pglite"));
  const db = drizzle(client, { casing: "snake_case" });
  await migrate(db, { migrationsFolder: migrationsDir() });
  return db as unknown as Database;
}

let connection: Promise<Database> | null = null;

/** Deljena konekcija (jedna po instanci servera). */
export function database(): Promise<Database> {
  connection ??= connect().catch((e) => {
    connection = null;
    throw e;
  });
  return connection;
}

// ---------- red u tabeli <-> entitet ----------

const columnsOf = (t: PgTable) => Object.keys(getTableColumns(t)).filter((c) => c !== "seq");

/** Iz baze: bez interne kolone `seq` i bez praznih polja (u domenu prazno polje ne postoji, kao u JSON-u). */
function toEntity(row: Record<string, unknown>): Entity {
  const e: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (k !== "seq" && v !== null && v !== undefined) e[k] = v;
  return e as Entity;
}

/** U bazu: sva polja tabele (prazna kao NULL); polje koje tabela nema je greška, da se podatak ne izgubi tiho. */
function toRow(t: PgTable, name: string, e: Entity): Record<string, unknown> {
  const cols = columnsOf(t);
  for (const k of Object.keys(e)) if (e[k] !== undefined && !cols.includes(k)) throw new Error(`Polje „${k}“ ne postoji u tabeli ${name}.`);
  return Object.fromEntries(cols.map((c) => [c, e[c] ?? null]));
}

/** Kanonski zapis za poređenje: ključevi sortirani, prazna polja izostavljena. */
function canon(v: unknown): string {
  return JSON.stringify(v, (_k, x) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(Object.keys(x).sort().filter((k) => x[k] !== undefined && x[k] !== null).map((k) => [k, x[k]]))
      : x,
  );
}

// ---------- čitanje i upis ----------

async function loadAll(tx: Executor): Promise<{ version: number; db: Db }> {
  const [m] = await tx.select({ version: meta.version }).from(meta).where(eq(meta.id, 1));
  const db = emptyDb();
  for (const k of keys) {
    const t = COLLECTIONS[k];
    const rows = (await tx.select().from(t).orderBy(t.seq)) as Record<string, unknown>[];
    (db as unknown as Record<Key, Entity[]>)[k] = rows.map(toEntity);
  }
  for (const s of await tx.select().from(sequences).where(eq(sequences.tenantId, TENANT_ID))) db.sequences[s.key] = s.value;
  return { version: m!.version, db };
}

/**
 * Upisuje razliku između dva stanja. Redosled poštuje strane ključeve:
 * - uobičajeno: unos (roditelji pre dece), izmene, brisanje (deca pre roditelja); izmena tako može da pokaže na nov red
 *   i da ukloni vezu ka redu koji se briše (npr. termin bez obrisanog naloga);
 * - zamena celog sadržaja (`deletesFirst`): prvo brisanje, da novi redovi mogu da dobiju iste tablice i brojeve.
 */
async function persistDiff(tx: Executor, before: Db, after: Db, { deletesFirst = false } = {}): Promise<boolean> {
  let changed = false;
  const plan = keys.map((k) => {
    const prev = new Map(list(before, k).map((e) => [e.id, e]));
    const nextIds = new Set(list(after, k).map((e) => e.id));
    const inserts: Entity[] = [];
    const updates: Entity[] = [];
    for (const e of list(after, k)) {
      const p = prev.get(e.id);
      if (!p) inserts.push(e);
      else if (canon(p) !== canon(e)) updates.push(e);
    }
    const deletes = list(before, k).filter((e) => !nextIds.has(e.id)).map((e) => e.id);
    return { k, t: COLLECTIONS[k], inserts, updates, deletes };
  });

  const deletes = async () => {
    for (const p of [...plan].reverse()) {
      if (!p.deletes.length) continue;
      changed = true;
      for (let i = 0; i < p.deletes.length; i += 500) await tx.delete(p.t).where(inArray(p.t.id, p.deletes.slice(i, i + 500)));
    }
  };
  if (deletesFirst) await deletes();
  for (const p of plan) {
    if (!p.inserts.length) continue;
    changed = true;
    const rows = p.inserts.map((e) => toRow(p.t, p.k, e));
    for (let i = 0; i < rows.length; i += 500) await tx.insert(p.t).values(rows.slice(i, i + 500) as never);
  }
  for (const p of plan) {
    for (const e of p.updates) {
      changed = true;
      await tx.update(p.t).set(toRow(p.t, p.k, e) as never).where(eq(p.t.id, e.id));
    }
  }
  if (!deletesFirst) await deletes();

  for (const [key, value] of Object.entries(after.sequences)) {
    if (before.sequences[key] === value) continue;
    changed = true;
    await tx.insert(sequences).values({ tenantId: TENANT_ID, key, value }).onConflictDoUpdate({ target: [sequences.tenantId, sequences.key], set: { value } });
  }
  for (const key of Object.keys(before.sequences)) {
    if (key in after.sequences) continue;
    changed = true;
    await tx.delete(sequences).where(and(eq(sequences.tenantId, TENANT_ID), eq(sequences.key, key)));
  }
  return changed;
}

let cache: { version: number; db: Db } | null = null;
let queue: Promise<unknown> = Promise.resolve();

function remember(next: { version: number; db: Db }) {
  if (!cache || next.version >= cache.version) cache = next;
}

/** Čitanje: dobija kopiju, izmene se ne čuvaju. */
export async function read<T>(fn: (db: Db) => T): Promise<T> {
  await queue.catch(() => undefined);
  const conn = await database();
  const [m] = await conn.select({ version: meta.version }).from(meta).where(eq(meta.id, 1));
  if (cache?.version !== m!.version) remember(await conn.transaction((tx) => loadAll(tx), { isolationLevel: "repeatable read" }));
  return fn(structuredClone(cache!.db));
}

/** Upis: funkcija menja db; čuva se samo ako ne baci grešku (cela izmena je jedna transakcija). */
export function write<T>(fn: (db: Db) => T, opts: { deletesFirst?: boolean } = {}): Promise<T> {
  const run = queue
    .catch(() => undefined)
    .then(async () => {
      const conn = await database();
      let next: { version: number; db: Db } | null = null;
      const result = await conn.transaction(async (tx) => {
        const [m] = await tx.select({ version: meta.version }).from(meta).where(eq(meta.id, 1)).for("update");
        const before = cache?.version === m!.version ? cache.db : (await loadAll(tx)).db;
        const draft = structuredClone(before);
        const r = fn(draft);
        if (await persistDiff(tx, before, draft, opts)) {
          await tx.update(meta).set({ version: m!.version + 1 }).where(eq(meta.id, 1));
          next = { version: m!.version + 1, db: draft };
        } else next = { version: m!.version, db: before };
        return r;
      });
      remember(next!);
      return result;
    });
  queue = run;
  return run;
}

/** Za seed, uvoz i testove: zamena celog sadržaja. */
export function replaceAll(db: Db): Promise<void> {
  return write(
    (cur) => {
      Object.assign(cur, emptyDb(), structuredClone(db));
    },
    { deletesFirst: true },
  );
}

export const nowIso = () => new Date().toISOString();
