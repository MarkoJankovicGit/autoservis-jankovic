/**
 * PRIVREMENO skladište za razvoj bez baze: jedan JSON fajl u .data/ (nije u gitu).
 * Zamenjuje ga Postgres; ostatak koda koristi samo read()/write() i ne zna kako se čuva.
 * Upisi su serijalizovani (jedan po jedan) i atomski (privremeni fajl + rename).
 * Demo režim (grana `demo`): fajl je u privremenoj memoriji servera i kreće od snimka seed-a (vidi server/demo.ts).
 */
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEMO, demoDir, demoStart } from "../demo.ts";
import type { Appointment, Attachment, Customer, Expense, Invoice, OdometerReading, OrderItem, Ownership, PartsOrder, Payment, Reminder, ServiceOrder, Supplier, Vehicle, VehicleShare } from "../../domain/model.ts";

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

function dataFile(): string {
  if (DEMO) return path.join(demoDir(), "dev-db.json");
  // statična putanja ispod radnog direktorijuma (testovi menjaju radni direktorijum na privremeni);
  // dinamička putanja bi naterala build da u serverski paket uključi ceo projekat
  return path.join(process.cwd(), ".data", "dev-db.json");
}

let cache: { mtimeMs: number; db: Db } | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<Db> {
  const file = dataFile();
  try {
    const s = await stat(file);
    if (cache && cache.mtimeMs === s.mtimeMs) return structuredClone(cache.db);
    const db = { ...emptyDb(), ...(JSON.parse(await readFile(file, "utf8")) as Db) };
    cache = { mtimeMs: s.mtimeMs, db };
    return structuredClone(db);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return DEMO ? { ...emptyDb(), ...(await demoStart<Db>()) } : emptyDb();
    throw e;
  }
}

async function save(db: Db): Promise<void> {
  const file = dataFile();
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 1), "utf8");
  await rename(tmp, file);
  const s = await stat(file);
  cache = { mtimeMs: s.mtimeMs, db: structuredClone(db) };
}

/** Čitanje: dobija kopiju, izmene se ne čuvaju. */
export async function read<T>(fn: (db: Db) => T): Promise<T> {
  await queue.catch(() => undefined);
  return fn(await load());
}

/** Upis: funkcija menja db; čuva se samo ako ne baci grešku. */
export function write<T>(fn: (db: Db) => T): Promise<T> {
  const run = queue.catch(() => undefined).then(async () => {
    const db = await load();
    const result = fn(db);
    await save(db);
    return result;
  });
  queue = run;
  return run;
}

/** Za seed i testove: zamena celog sadržaja. */
export function replaceAll(db: Db): Promise<void> {
  return write((cur) => {
    Object.assign(cur, db);
  });
}

export const nowIso = () => new Date().toISOString();
