/**
 * Entiteti aplikacije. Oblik prati buduće tabele u Postgresu (PLAN_RADA.md, deo 3),
 * pa prelazak sa privremenog JSON skladišta na bazu ne menja ekrane ni logiku.
 */
import type { IsoDate } from "./dates.ts";
import type { ItemKind, OrderStatus } from "./orders.ts";
import type { ExpenseValue } from "./finance.ts";
import type { PartsOrderStatus } from "./parts-orders.ts";
import type { AppointmentStatus, AppointmentValue } from "./appointments.ts";

/** Jedna radnja za sada; kolona postoji da SaaS kasnije ne traži migraciju. */
export const TENANT_ID = "jankovic";

export type Base = {
  id: string;
  tenantId: string;
  createdAt: string; // ISO vremenska oznaka
  updatedAt: string;
};

export type CustomerType = "person" | "company";

export type Phone = { e164: string };

export type Customer = Base & {
  type: CustomerType;
  name: string;
  phones: Phone[];
  email?: string;
  taxId?: string; // PIB, samo firma
  address?: string;
  note?: string;
  archivedAt?: string;
};

export const FUELS = ["petrol", "diesel", "lpg", "cng", "hybrid", "phev", "electric", "other"] as const;
export type Fuel = (typeof FUELS)[number];

export const FUEL_LABELS: Record<Fuel, string> = {
  petrol: "Benzin",
  diesel: "Dizel",
  lpg: "TNG (plin)",
  cng: "Metan",
  hybrid: "Hibrid",
  phev: "Plug-in hibrid",
  electric: "Električni",
  other: "Ostalo",
};

export type Vehicle = Base & {
  plate?: string; // normalizovano: "BG123AB"
  vin?: string; // normalizovano, do 17 znakova
  make: string;
  model?: string;
  year?: number;
  fuel?: Fuel;
  engine?: string; // npr. "1.9 TDI"
  powerKw?: number; // snaga motora u kW (treba prodavcu delova)
  color?: string;
  registrationExpires?: IsoDate;
  note?: string;
  archivedAt?: string;
};

export type OwnershipReason = "initial" | "sale" | "correction";

export type Ownership = Base & {
  vehicleId: string;
  customerId: string;
  validFrom: IsoDate;
  validTo?: IsoDate; // prazno = trenutni vlasnik
  reason: OwnershipReason;
};

export type OdometerSource = "manual" | "order";

export type OdometerReading = Base & {
  vehicleId: string;
  km: number;
  date: IsoDate;
  source: OdometerSource;
  orderId?: string; // upis iz naloga (prijem ili završetak)
  note?: string;
};

export const COMMON_MAKES = [
  "Alfa Romeo", "Audi", "BMW", "Chevrolet", "Citroën", "Dacia", "Fiat", "Ford", "Honda", "Hyundai",
  "Jeep", "Kia", "Lada", "Land Rover", "Mazda", "Mercedes-Benz", "Mini", "Mitsubishi", "Nissan", "Opel",
  "Peugeot", "Renault", "Seat", "Škoda", "Smart", "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen",
  "Volvo", "Zastava",
];

// ---------- nalozi (Iteracija 2) ----------

export type ServiceOrder = Base & {
  number: string; // "2026-0001"
  vehicleId: string;
  customerId: string; // klijent u trenutku prijema
  status: OrderStatus;
  receivedDate: IsoDate;
  kmIn?: number;
  complaint: string; // šta mušterija prijavljuje
  workDone?: string; // šta je urađeno
  internalNote?: string; // nikad na dokumentima
  completedDate?: IsoDate;
  kmOut?: number;
  cancelledAt?: string;
  cancelReason?: string;
};

export type OrderItem = Base & {
  orderId: string;
  sortOrder: number;
  kind: ItemKind;
  name: string;
  qtyMilli: number;
  unit: string;
  unitPrice: number; // para
  unitCost?: number; // para, nabavna; samo deo i materijal
  discountBp: number;
  partNumber?: string;
};

export const ATTACHMENT_CATEGORIES = ["before", "after", "part", "document", "other"] as const;
export type AttachmentCategory = (typeof ATTACHMENT_CATEGORIES)[number];
export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  before: "Prijem / pre",
  after: "Posle",
  part: "Zamenjeni deo",
  document: "Dokument",
  other: "Ostalo",
};

export type Attachment = Base & {
  vehicleId: string;
  orderId?: string;
  category: AttachmentCategory;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  file: string; // relativna putanja u skladištu fajlova
  thumb: string;
  originalName?: string;
};

export type ReminderStatus = "open" | "done" | "dismissed";

export type Reminder = Base & {
  vehicleId: string;
  orderId?: string; // nalog iz kog je nastao
  title: string;
  dueDate?: IsoDate;
  dueKm?: number;
  status: ReminderStatus;
  closedAt?: string;
  closedByOrderId?: string; // nalog u kom je urađeno
  notifiedAt?: string; // za buduće SMS podsetnike
};

// ---------- finansije i dobavljači (Iteracija 3) ----------

export type Payment = Base & {
  orderId: string;
  customerId: string;
  amount: number; // para
  date: IsoDate;
  note?: string;
  cancelledAt?: string; // poništena uplata ostaje vidljiva
  cancelReason?: string;
};

export type Supplier = Base & {
  name: string;
  phone?: string; // E.164
  email?: string;
  contactPerson?: string;
  note?: string;
  archivedAt?: string;
};

export type Expense = Base & ExpenseValue & {
  partsOrderId?: string; // trošak nastao prijemom robe po narudžbenici
};

export type PartsOrderLine = {
  id: string;
  name: string;
  partNumber?: string;
  qtyMilli: number;
  note?: string;
  receivedMilli: number;
  receivedCost?: number; // para, poslednja nabavna cena pri prijemu
};

export type PartsOrder = Base & {
  number: string; // "N-2026-0001"
  supplierId?: string;
  orderId?: string; // radni nalog za koji se naručuje
  vehicleId?: string;
  status: PartsOrderStatus;
  neededBy?: IsoDate;
  note?: string;
  sentAt?: string;
  lines: PartsOrderLine[];
  /** javni link za dobavljača: u bazi samo heš tokena */
  shareTokenHash?: string;
  shareCreatedAt?: string;
  shareOpens: number;
  shareLastOpenedAt?: string;
};

export type InvoiceLine = {
  kind: ItemKind;
  name: string;
  partNumber?: string;
  qtyMilli: number;
  unit: string;
  unitPrice: number;
  discountBp: number;
  total: number;
};

/** Račun (nefiskalni): zamrznut snimak naloga u trenutku izdavanja. */
export type Invoice = Base & {
  number: string; // "R-2026-0001"
  orderId: string;
  customerId: string;
  issuedDate: IsoDate;
  customer: { name: string; address?: string; taxId?: string; phone?: string };
  vehicle: { plate?: string; make: string; model?: string; year?: number; vin?: string; km?: number };
  lines: InvoiceLine[];
  total: number;
  cancelledAt?: string;
  cancelReason?: string;
};

// ---------- kalendar (Iteracija 4) ----------

export type Appointment = Base & AppointmentValue & {
  status: AppointmentStatus;
  orderId?: string; // nalog otvoren prijemom iz termina
};

// ---------- deljivi karton za mušteriju (Iteracija 4) ----------

/** Nalog kako ga mušterija vidi: bez nabavnih cena, internih napomena i podataka o naplati. */
export type SharedOrder = {
  id: string;
  number: string;
  status: "open" | "done";
  receivedDate: IsoDate;
  completedDate?: IsoDate;
  km?: number;
  complaint: string;
  workDone?: string;
  items: { kind: ItemKind; name: string; qtyMilli: number; unit: string; total?: number }[];
  total?: number;
  photos: { id: string; category: AttachmentCategory; width?: number; height?: number }[];
};

/** Zamrznut sadržaj linka; namerno bez imena i telefona klijenta i bez VIN-a (link može biti prosleđen). */
export type ShareSnapshot = {
  vehicle: { plate?: string; make: string; model?: string; year?: number; fuel?: Fuel; engine?: string };
  showPrices: boolean;
  orders: SharedOrder[];
  reminders?: { title: string; dueDate?: IsoDate; dueKm?: number }[];
};

export type VehicleShare = Base & {
  vehicleId: string;
  customerId?: string; // vlasnik u trenutku deljenja
  tokenHash?: string; // brisanjem heša link trajno prestaje da važi
  expiresAt: IsoDate;
  revokedAt?: string;
  opens: number;
  lastOpenedAt?: string;
  snapshot: ShareSnapshot;
};
