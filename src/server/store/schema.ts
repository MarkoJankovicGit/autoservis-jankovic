/**
 * Šema baze (Postgres). Kolone prate entitete iz domain/model.ts jedan na jedan (imena u snake_case),
 * pa skladište može da čita i upisuje cele entitete bez prevođenja.
 * Iznosi su u parama (bigint), količine u hiljaditim delovima, datumi kao `date`, vremena kao `timestamptz`.
 * Ugnežđeni podaci koji se uvek čitaju zajedno (telefoni, stavke narudžbenice, snimci računa i kartona) su jsonb.
 */
import { sql } from "drizzle-orm";
import { bigint, customType, date, index, integer, jsonb, pgTable, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { InvoiceLine, PartsOrderLine, Phone, ShareSnapshot } from "../../domain/model.ts";

/** Vreme kao ISO string („2026-10-29T15:30:22.775Z“), isti oblik kao u domenu, bez obzira na drajver. */
const isoTime = customType<{ data: string; driverData: string | Date }>({
  dataType: () => "timestamp with time zone",
  toDriver: (v) => v,
  fromDriver: (v) => (v instanceof Date ? v : new Date(String(v).replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00"))).toISOString(),
});

const day = () => date({ mode: "string" });
const money = () => bigint({ mode: "number" });

/** Zajedničke kolone; `seq` čuva redosled unosa (isti redosled kao u ranijem JSON skladištu). */
const base = {
  seq: bigint({ mode: "number" }).generatedAlwaysAsIdentity(),
  id: uuid().primaryKey(),
  tenantId: text().notNull(),
  createdAt: isoTime().notNull(),
  updatedAt: isoTime().notNull(),
};

export const customers = pgTable("customers", {
  ...base,
  type: text().notNull(),
  name: text().notNull(),
  phones: jsonb().$type<Phone[]>().notNull(),
  email: text(),
  taxId: text(),
  address: text(),
  note: text(),
  archivedAt: isoTime(),
});

export const vehicles = pgTable(
  "vehicles",
  {
    ...base,
    plate: text(),
    vin: text(),
    make: text().notNull(),
    model: text(),
    year: integer(),
    fuel: text(),
    engine: text(),
    powerKw: integer(),
    color: text(),
    registrationExpires: day(),
    note: text(),
    archivedAt: isoTime(),
  },
  // tablica i VIN su jedinstveni među aktivnim vozilima (arhivirano vozilo ne blokira novo)
  (t) => [
    uniqueIndex("vehicles_plate_active").on(t.tenantId, t.plate).where(sql`${t.archivedAt} is null and ${t.plate} is not null`),
    uniqueIndex("vehicles_vin_active").on(t.tenantId, t.vin).where(sql`${t.archivedAt} is null and ${t.vin} is not null`),
  ],
);

export const suppliers = pgTable("suppliers", {
  ...base,
  name: text().notNull(),
  phone: text(),
  email: text(),
  contactPerson: text(),
  note: text(),
  archivedAt: isoTime(),
});

export const ownerships = pgTable(
  "ownerships",
  {
    ...base,
    vehicleId: uuid().notNull().references(() => vehicles.id),
    customerId: uuid().notNull().references(() => customers.id),
    validFrom: day().notNull(),
    validTo: day(),
    reason: text().notNull(),
  },
  (t) => [index("ownerships_vehicle").on(t.vehicleId), index("ownerships_customer").on(t.customerId)],
);

export const orders = pgTable(
  "orders",
  {
    ...base,
    number: text().notNull(),
    vehicleId: uuid().notNull().references(() => vehicles.id),
    customerId: uuid().notNull().references(() => customers.id),
    status: text().notNull(),
    receivedDate: day().notNull(),
    kmIn: integer(),
    complaint: text().notNull(),
    workDone: text(),
    internalNote: text(),
    completedDate: day(),
    kmOut: integer(),
    cancelledAt: isoTime(),
    cancelReason: text(),
  },
  (t) => [uniqueIndex("orders_number").on(t.tenantId, t.number), index("orders_vehicle").on(t.vehicleId), index("orders_customer").on(t.customerId)],
);

export const odometerReadings = pgTable(
  "odometer_readings",
  {
    ...base,
    vehicleId: uuid().notNull().references(() => vehicles.id),
    km: integer().notNull(),
    date: day().notNull(),
    source: text().notNull(),
    orderId: uuid().references(() => orders.id),
    note: text(),
  },
  (t) => [index("odometer_vehicle").on(t.vehicleId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    ...base,
    orderId: uuid().notNull().references(() => orders.id),
    sortOrder: integer().notNull(),
    kind: text().notNull(),
    name: text().notNull(),
    qtyMilli: integer().notNull(),
    unit: text().notNull(),
    unitPrice: money().notNull(),
    unitCost: money(),
    discountBp: integer().notNull(),
    partNumber: text(),
  },
  (t) => [index("order_items_order").on(t.orderId)],
);

export const attachments = pgTable(
  "attachments",
  {
    ...base,
    vehicleId: uuid().notNull().references(() => vehicles.id),
    orderId: uuid().references(() => orders.id),
    category: text().notNull(),
    mime: text().notNull(),
    size: integer().notNull(),
    width: integer(),
    height: integer(),
    file: text().notNull(),
    thumb: text().notNull(),
    originalName: text(),
  },
  (t) => [index("attachments_order").on(t.orderId)],
);

export const reminders = pgTable(
  "reminders",
  {
    ...base,
    vehicleId: uuid().notNull().references(() => vehicles.id),
    orderId: uuid().references(() => orders.id),
    title: text().notNull(),
    dueDate: day(),
    dueKm: integer(),
    status: text().notNull(),
    closedAt: isoTime(),
    closedByOrderId: uuid().references(() => orders.id),
    notifiedAt: isoTime(),
  },
  (t) => [index("reminders_vehicle").on(t.vehicleId)],
);

export const payments = pgTable(
  "payments",
  {
    ...base,
    orderId: uuid().notNull().references(() => orders.id),
    customerId: uuid().notNull().references(() => customers.id),
    amount: money().notNull(),
    date: day().notNull(),
    note: text(),
    cancelledAt: isoTime(),
    cancelReason: text(),
  },
  (t) => [index("payments_order").on(t.orderId)],
);

export const partsOrders = pgTable(
  "parts_orders",
  {
    ...base,
    number: text().notNull(),
    supplierId: uuid().references(() => suppliers.id),
    orderId: uuid().references(() => orders.id),
    vehicleId: uuid().references(() => vehicles.id),
    status: text().notNull(),
    neededBy: day(),
    note: text(),
    sentAt: isoTime(),
    lines: jsonb().$type<PartsOrderLine[]>().notNull(),
    shareTokenHash: text(),
    shareCreatedAt: isoTime(),
    shareOpens: integer().notNull(),
    shareLastOpenedAt: isoTime(),
  },
  (t) => [uniqueIndex("parts_orders_number").on(t.tenantId, t.number), uniqueIndex("parts_orders_token").on(t.shareTokenHash)],
);

export const expenses = pgTable(
  "expenses",
  {
    ...base,
    date: day().notNull(),
    category: text().notNull(),
    amount: money().notNull(),
    description: text().notNull(),
    supplierId: uuid().references(() => suppliers.id),
    orderId: uuid().references(() => orders.id),
    paidDate: day(),
    dueDate: day(),
    documentNo: text(),
    note: text(),
    partsOrderId: uuid().references(() => partsOrders.id),
  },
  (t) => [index("expenses_date").on(t.date), index("expenses_order").on(t.orderId)],
);

export const invoices = pgTable(
  "invoices",
  {
    ...base,
    number: text().notNull(),
    orderId: uuid().notNull().references(() => orders.id),
    customerId: uuid().notNull().references(() => customers.id),
    issuedDate: day().notNull(),
    customer: jsonb().$type<{ name: string; address?: string; taxId?: string; phone?: string }>().notNull(),
    vehicle: jsonb().$type<{ plate?: string; make: string; model?: string; year?: number; vin?: string; km?: number }>().notNull(),
    lines: jsonb().$type<InvoiceLine[]>().notNull(),
    total: money().notNull(),
    cancelledAt: isoTime(),
    cancelReason: text(),
  },
  (t) => [uniqueIndex("invoices_number").on(t.tenantId, t.number), index("invoices_order").on(t.orderId)],
);

export const appointments = pgTable(
  "appointments",
  {
    ...base,
    date: day().notNull(),
    startMin: integer().notNull(),
    durationMin: integer().notNull(),
    vehicleId: uuid().references(() => vehicles.id),
    customerId: uuid().references(() => customers.id),
    vehicleText: text(),
    customerName: text(),
    phone: text(),
    reason: text().notNull(),
    note: text(),
    status: text().notNull(),
    orderId: uuid().references(() => orders.id),
  },
  (t) => [index("appointments_date").on(t.date)],
);

export const shares = pgTable(
  "shares",
  {
    ...base,
    vehicleId: uuid().notNull().references(() => vehicles.id),
    customerId: uuid().references(() => customers.id),
    tokenHash: text(),
    expiresAt: day().notNull(),
    revokedAt: isoTime(),
    opens: integer().notNull(),
    lastOpenedAt: isoTime(),
    snapshot: jsonb().$type<ShareSnapshot>().notNull(),
  },
  (t) => [uniqueIndex("shares_token").on(t.tokenHash), index("shares_vehicle").on(t.vehicleId)],
);

/** Brojači dokumenata: { "order:2026": 14 }. */
export const sequences = pgTable("sequences", { tenantId: text().notNull(), key: text().notNull(), value: integer().notNull() }, (t) => [primaryKey({ columns: [t.tenantId, t.key] })]);

/** Verzija podataka: raste sa svakim upisom; po njoj instance servera znaju da li im je keš svež. */
export const meta = pgTable("meta", { id: integer().primaryKey(), version: bigint({ mode: "number" }).notNull() });

/** Neuspele prijave po adresi, za zaključavanje posle 5 pokušaja (važi i između instanci servera). */
export const loginAttempts = pgTable("login_attempts", { ip: text().primaryKey(), count: integer().notNull(), until: isoTime().notNull() });

/** Kolekcije u redosledu upisa: roditelji pre dece (brisanje ide obrnutim redom). */
export const COLLECTIONS = {
  customers,
  vehicles,
  suppliers,
  ownerships,
  orders,
  odometerReadings,
  orderItems,
  attachments,
  reminders,
  payments,
  partsOrders,
  expenses,
  invoices,
  appointments,
  shares,
} as const;
