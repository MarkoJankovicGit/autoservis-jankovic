// Test podaci za lokalni razvoj (izmišljeni klijenti i vozila). Briše postojeće podatke u .data/dev-db.json.
// Pokretanje: pnpm seed
import { addDays, addMonths, todayIso } from "../src/domain/dates.ts";
import { uuidv7 } from "../src/domain/id.ts";
import { TENANT_ID, type Customer, type Fuel, type OdometerReading, type OrderItem, type Ownership, type ServiceOrder, type Vehicle } from "../src/domain/model.ts";
import { formatOrderNumber, type ItemKind } from "../src/domain/orders.ts";
import { normalizePhone } from "../src/domain/phone.ts";
import { normalizePlate } from "../src/domain/plate.ts";
import { replaceAll, type Db } from "../src/server/store/json-store.ts";
import { rm } from "node:fs/promises";
import path from "node:path";

const today = todayIso();
const now = new Date().toISOString();
const base = () => ({ id: uuidv7(), tenantId: TENANT_ID, createdAt: now, updatedAt: now });
const phone = (p: string) => {
  const r = normalizePhone(p);
  if (!r.ok) throw new Error(p);
  return { e164: r.e164 };
};

const db: Db = { version: 1, customers: [], vehicles: [], ownerships: [], odometerReadings: [], orders: [], orderItems: [], attachments: [], reminders: [], payments: [], suppliers: [], expenses: [], partsOrders: [], invoices: [], appointments: [], shares: [], sequences: {} };

function customer(c: Partial<Customer> & Pick<Customer, "name">, phones: string[] = []): Customer {
  const x: Customer = { ...base(), type: "person", phones: phones.map(phone), ...c };
  db.customers.push(x);
  return x;
}

function vehicle(
  v: { plate?: string; vin?: string; make: string; model?: string; year?: number; fuel?: Fuel; engine?: string; color?: string; registrationExpires?: string; note?: string },
  owner: Customer | null,
  km: { daysAgo: number; km: number }[],
): Vehicle {
  const x: Vehicle = { ...base(), ...v, plate: v.plate ? normalizePlate(v.plate) : undefined };
  db.vehicles.push(x);
  if (owner) {
    const o: Ownership = { ...base(), vehicleId: x.id, customerId: owner.id, validFrom: addDays(today, -800), reason: "initial" };
    db.ownerships.push(o);
  }
  for (const r of km) {
    const reading: OdometerReading = { ...base(), vehicleId: x.id, km: r.km, date: addDays(today, -r.daysAgo), source: "manual" };
    db.odometerReadings.push(reading);
  }
  return x;
}

const petar = customer({ name: "Petar Petrović", email: "petar.petrovic@primer.rs", note: "Zove uveče, posle 17h." }, ["064 123 4567"]);
const jelena = customer({ name: "Jelena Đorđević" }, ["065 222 3344", "011 345 6789"]);
const milan = customer({ name: "Milan Nikolić" }, ["063 987 6543"]);
const ana = customer({ name: "Ana Stojanović", email: "ana.s@primer.rs" }, ["060 111 2233"]);
const firma = customer({ type: "company", name: "Agro Kolubara d.o.o.", taxId: "104052135", email: "flota@agrokolubara.primer", address: "Industrijska 12, Valjevo", note: "Fakturisati krajem meseca." }, ["014 222 333"]);
const dragan = customer({ name: "Dragan Marković" }, ["066 444 5566"]);
const stari = customer({ name: "Zoran Ilić" }, ["062 555 6677"]);

const golf = vehicle({ plate: "VA 123-AB", vin: "WVWZZZ1JZ3W000001", make: "Volkswagen", model: "Golf 4", year: 2003, fuel: "diesel", engine: "1.9 TDI 74 kW", color: "Siva", registrationExpires: addDays(today, 21) }, petar, [
  { daysAgo: 720, km: 241_300 }, { daysAgo: 540, km: 249_800 }, { daysAgo: 360, km: 258_200 }, { daysAgo: 180, km: 266_900 }, { daysAgo: 12, km: 274_600 },
]);
const octavia = vehicle({ plate: "VA 456-CD", make: "Škoda", model: "Octavia", year: 2015, fuel: "diesel", engine: "1.6 TDI 77 kW", color: "Bela", registrationExpires: addDays(today, 140) }, jelena, [
  { daysAgo: 400, km: 188_000 }, { daysAgo: 30, km: 207_400 },
]);
vehicle({ plate: "BG 1234-ŽŠ", make: "Toyota", model: "Yaris", year: 2019, fuel: "hybrid", engine: "1.5 Hybrid", color: "Crvena" }, jelena, [{ daysAgo: 5, km: 61_250 }]);
const clio = vehicle({ plate: "VA 789-EF", vin: "VF1RFB00X56123456", make: "Renault", model: "Clio", year: 2011, fuel: "petrol", engine: "1.2 16V", registrationExpires: addDays(today, -10) }, milan, [
  { daysAgo: 600, km: 132_000 }, { daysAgo: 250, km: 139_500 }, { daysAgo: 60, km: 143_100 },
]);
vehicle({ plate: "LO 22-11", make: "Fiat", model: "Punto", year: 2007, fuel: "lpg", note: "Ugrađen TNG 2019." }, ana, [{ daysAgo: 90, km: 198_700 }]);
const sprinter = vehicle({ plate: "VA 100-AK", make: "Mercedes-Benz", model: "Sprinter 313", year: 2016, fuel: "diesel", engine: "2.1 CDI 95 kW" }, firma, [
  { daysAgo: 700, km: 310_000 }, { daysAgo: 350, km: 352_000 }, { daysAgo: 20, km: 391_500 },
]);
vehicle({ plate: "VA 101-AK", make: "Dacia", model: "Duster", year: 2021, fuel: "diesel", engine: "1.5 dCi" }, firma, [{ daysAgo: 300, km: 54_000 }, { daysAgo: 15, km: 79_800 }]);
vehicle({ plate: "UB 555-GH", make: "Opel", model: "Astra H", year: 2008, fuel: "petrol" }, dragan, []);

// vozilo sa promenom vlasnika: Zoran -> Dragan
const astra = vehicle({ plate: "VA 333-ZI", make: "Peugeot", model: "308", year: 2012, fuel: "diesel", engine: "1.6 HDi" }, null, [
  { daysAgo: 500, km: 160_000 }, { daysAgo: 100, km: 171_200 },
]);
db.ownerships.push({ ...base(), vehicleId: astra.id, customerId: stari.id, validFrom: addDays(today, -900), validTo: addDays(today, -200), reason: "initial" });
db.ownerships.push({ ...base(), vehicleId: astra.id, customerId: dragan.id, validFrom: addDays(today, -200), reason: "sale" });

// staro vozilo sa brojem šasije, bez tablica
vehicle({ vin: "ZFA14600", make: "Zastava", model: "Yugo 45", year: 1988, fuel: "petrol", note: "Oldtajmer, bez registracije." }, milan, []);


// ---------- nalozi, stavke, podsetnici ----------
type SeedItem = [ItemKind, string, number, string, number, number?]; // vrsta, naziv, kol., j.m., cena RSD, nabavna RSD
function order(v: Vehicle, c: Customer, o: { daysAgo: number; doneDaysAgo?: number; kmIn: number; kmOut?: number; complaint: string; workDone?: string }, items: SeedItem[], next?: { title: string; months?: number; km?: number }[]) {
  const received = addDays(today, -o.daysAgo);
  const year = Number(received.slice(0, 4));
  const seq = (db.sequences[`order:${year}`] ?? 0) + 1;
  db.sequences[`order:${year}`] = seq;
  const done = o.doneDaysAgo !== undefined ? addDays(today, -o.doneDaysAgo) : undefined;
  const x: ServiceOrder = {
    ...base(), number: formatOrderNumber(year, seq), vehicleId: v.id, customerId: c.id, status: done ? "done" : "open",
    receivedDate: received, kmIn: o.kmIn, complaint: o.complaint, workDone: o.workDone, completedDate: done, kmOut: o.kmOut,
  };
  db.orders.push(x);
  items.forEach(([kind, name, qty, unit, price, cost], i) => {
    const it: OrderItem = { ...base(), orderId: x.id, sortOrder: i + 1, kind, name, qtyMilli: Math.round(qty * 1000), unit, unitPrice: price * 100, unitCost: cost !== undefined ? cost * 100 : undefined, discountBp: 0 };
    db.orderItems.push(it);
  });
  for (const n of next ?? []) {
    db.reminders.push({ ...base(), vehicleId: v.id, orderId: x.id, title: n.title, dueDate: n.months && done ? addMonths(done, n.months) : undefined, dueKm: n.km ? (o.kmOut ?? o.kmIn) + n.km : undefined, status: "open" });
  }
  return x;
}

const maliServis: SeedItem[] = [
  ["labor", "Zamena ulja i filtera", 1, "h", 1500],
  ["material", "Ulje 5W40 dizel", 4.5, "l", 1150, 800],
  ["part", "Filter ulja", 1, "kom", 1200, 750],
  ["part", "Filter vazduha", 1, "kom", 1800, 1100],
  ["part", "Filter goriva", 1, "kom", 2400, 1500],
];

const g1 = order(golf, petar, { daysAgo: 722, doneDaysAgo: 720, kmIn: 241_300, kmOut: 241_300, complaint: "Mali servis", workDone: "Urađen mali servis. Primećeno curenje ulja na poklopcu ventila, za praćenje." }, maliServis);
void g1;
order(golf, petar, { daysAgo: 362, doneDaysAgo: 360, kmIn: 258_200, kmOut: 258_200, complaint: "Škripe kočnice napred", workDone: "Zamenjeni prednji diskovi i pločice. Zadnje pločice 40 %." }, [
  ["labor", "Zamena diskova i pločica napred", 1.5, "h", 2000],
  ["part", "Disk kočioni prednji", 2, "kom", 4200, 2900],
  ["part", "Pločice prednje (set)", 1, "kompl.", 3900, 2600],
], [{ title: "Kočnice zadnje (pločice)", km: 25_000 }]);
order(golf, petar, { daysAgo: 182, doneDaysAgo: 180, kmIn: 266_900, kmOut: 266_900, complaint: "Mali servis + lampica", workDone: "Mali servis. Lampica: senzor temperature, zamenjen." }, [
  ...maliServis.slice(0, 3),
  ["part", "Senzor temperature rashladne tečnosti", 1, "kom", 2600, 1700],
  ["labor", "Dijagnostika", 0.5, "h", 2000],
], [{ title: "Mali servis", months: 6, km: 10_000 }]);
order(golf, petar, { daysAgo: 1, kmIn: 274_600, complaint: "Lupka nešto napred desno na rupama" }, [
  ["labor", "Pregled trapa", 0.5, "h", 2000],
]);

order(octavia, jelena, { daysAgo: 402, doneDaysAgo: 400, kmIn: 188_000, kmOut: 188_000, complaint: "Veliki servis", workDone: "Zamenjen set zupčastog kaiša sa pumpom vode, mali servis." }, [
  ["labor", "Zamena zupčastog kaiša i pumpe", 3, "h", 2000],
  ["part", "Set zupčastog kaiša sa pumpom", 1, "kompl.", 18500, 13200],
  ["material", "Antifriz G13", 5, "l", 650, 420],
  ...maliServis.slice(1, 3),
], [{ title: "Mali servis", months: 12, km: 15_000 }, { title: "Veliki servis (zupčasti kaiš)", months: 60, km: 120_000 }]);

order(clio, milan, { daysAgo: 62, doneDaysAgo: 60, kmIn: 143_100, kmOut: 143_100, complaint: "Klima ne hladi", workDone: "Dopunjena klima, zamenjen filter kabine. Nema curenja." }, [
  ["labor", "Servis klime", 1, "h", 2500],
  ["material", "Freon R134a", 0.6, "kg", 4000, 2600],
  ["part", "Filter kabine", 1, "kom", 1300, 700],
], [{ title: "Klima (servis)", months: 12 }]);

order(sprinter, firma, { daysAgo: 3, kmIn: 391_500, complaint: "Ne vuče, dimi crno. Hitno, vozilo je potrebno firmi." }, [
  ["labor", "Dijagnostika", 1, "h", 2000],
  ["part", "EGR ventil", 1, "kom", 28000],
]);

// ručni podsetnik koji je prekoračen (registracija/tehnički)
db.reminders.push({ ...base(), vehicleId: clio.id, title: "Tehnički pregled", dueDate: addDays(today, -10), status: "open" });

// ---------- dobavljači, troškovi, uplate, narudžbenica ----------
const sup = (name: string, phone?: string, email?: string, note?: string) => {
  const x = { ...base(), name, phone: phone ? normalizePhone(phone).ok ? (normalizePhone(phone) as { e164: string }).e164 : undefined : undefined, email, note };
  db.suppliers.push(x);
  return x;
};
const autoPlus = sup("Auto Delovi Plus", "014 222 444", "prodaja@autoplus.primer", "Dostava do 14h isti dan.");
const kolubara = sup("Delovi Kolubara", "014 333 555");
sup("Mazivo Valjevo", "063 111 000", undefined, "Ulja i tečnosti, popust 10 % na 20 l.");

const expense = (daysAgo: number, category: string, amount: number, description: string, supplierId?: string, paid = true, dueInDays?: number, documentNo?: string, orderNumber?: string) => {
  const date = addDays(today, -daysAgo);
  const orderId = orderNumber ? db.orders.find((o) => o.number === orderNumber)?.id : undefined;
  db.expenses.push({ ...base(), date, category: category as never, amount: amount * 100, description, supplierId, orderId, paidDate: paid ? date : undefined, dueDate: !paid && dueInDays !== undefined ? addDays(today, dueInDays) : undefined, documentNo });
};
for (const back of [0, 1, 2]) {
  const d = 5 + back * 30;
  expense(d, "rent", 40000, "Kirija radionice");
  expense(d - 2, "utilities", 9500 + back * 700, "Struja i voda");
  expense(d - 3, "salaries", 85000, "Plata pomoćnika");
}
expense(12, "parts", 18400, "Diskovi, pločice, filteri", autoPlus.id, false, 18, "AP-2026-1182");
expense(40, "parts", 23100, "Set zupčastog kaiša, pumpa", autoPlus.id, true, undefined, "AP-2026-0994");
expense(181, "parts", 6100, "Ulje, filter, senzor temperature", autoPlus.id, true, undefined, "AP-2026-0410", "2026-0001");
expense(7, "material", 21600, "Ulje 5W40 20 l, antifriz", undefined, true);
expense(3, "tools", 12900, "Moment ključ", undefined, true);
expense(9, "equipment", 145000, "Uređaj za dijagnostiku", undefined, true);
expense(20, "parts", 9800, "Krajnici, manžetne", kolubara.id, false, -5, "DK-554");

const pay = (orderNumber: string, amount: number, daysAgo: number) => {
  const o = db.orders.find((x) => x.number === orderNumber)!;
  db.payments.push({ ...base(), orderId: o.id, customerId: o.customerId, amount: amount * 100, date: addDays(today, -daysAgo) });
};
pay("2024-0001", 12075, 720);
pay("2025-0001", 15300, 360);
pay("2026-0001", 6000, 180); // delimično: duguje ostatak
pay("2025-0002", 34125, 395);
// Clio (2026-0003) nije plaćen: dug

// narudžbenica za Sprinter (nalog u radu) koja još nije stigla
const sprinterOrder = db.orders.find((o) => o.vehicleId === sprinter.id && o.status === "open")!;
db.sequences[`parts:${today.slice(0, 4)}`] = 1;
db.partsOrders.push({
  ...base(), number: `N-${today.slice(0, 4)}-0001`, supplierId: autoPlus.id, orderId: sprinterOrder.id, vehicleId: sprinter.id, status: "sent",
  neededBy: addDays(today, 1), note: "Original ili Pierburg.", sentAt: new Date().toISOString(),
  lines: [{ id: uuidv7(), name: "EGR ventil", partNumber: "A6511400602", qtyMilli: 1000, receivedMilli: 0 }, { id: uuidv7(), name: "Dihtung EGR ventila", qtyMilli: 1000, receivedMilli: 0 }],
  shareOpens: 0,
});

// termini u kalendaru: danas i narednih dana (jedan bez vozila u bazi, mušterija dolazi prvi put)
const appt = (dayOffset: number, start: string, durationMin: number, a: { vehicle?: Vehicle; owner?: Customer; vehicleText?: string; customerName?: string; phone?: string; reason: string }) => {
  const [h, m] = start.split(":").map(Number);
  db.appointments.push({
    ...base(), date: addDays(today, dayOffset), startMin: h * 60 + m, durationMin, status: "scheduled",
    vehicleId: a.vehicle?.id, customerId: a.owner?.id, vehicleText: a.vehicleText, customerName: a.customerName, phone: a.phone && phone(a.phone).e164, reason: a.reason,
  });
};
appt(0, "08:00", 60, { vehicle: octavia, owner: jelena, reason: "Mali servis" });
appt(0, "10:30", 90, { vehicle: clio, owner: milan, reason: "Kočnice napred" });
appt(0, "14:00", 30, { vehicleText: "Fiat Punto 1.2", customerName: "Nikola Jovanović", phone: "064 123 4000", reason: "Dijagnostika, lampica motora" });
appt(1, "09:00", 120, { vehicle: sprinter, owner: firma, reason: "Zamena kvačila" });
appt(2, "11:00", 60, { vehicle: golf, owner: petar, reason: "Priprema za registraciju" });

await rm(path.join(process.cwd(), ".data", "uploads"), { recursive: true, force: true }); // fotografije bez zapisa
await replaceAll(db);
console.log(`seed: ${db.customers.length} klijenata, ${db.vehicles.length} vozila, ${db.orders.length} naloga, ${db.orderItems.length} stavki, ${db.reminders.length} podsetnika, ${db.suppliers.length} dobavljača, ${db.expenses.length} troškova, ${db.payments.length} uplata`);
