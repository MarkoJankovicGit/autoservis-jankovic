"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/guard";
import {
  addItem,
  cancelOrder,
  completeOrder,
  createOrderFromIntake,
  deleteItem,
  reopenOrder,
  updateItem,
  updateOrderText,
  type IntakeInput,
  type OrderTextField,
} from "@/server/orders";
import { deleteAttachment } from "@/server/files";
import { addReminder, closeReminder, reopenReminder } from "@/server/reminders";
import { addPayment, cancelInvoice, cancelPayment, issueInvoice } from "@/server/finance";
import { fdAll, fdStr, fdValues, type FormState } from "@/lib/form-data";

function touch(orderId?: string, vehicleId?: string) {
  revalidatePath("/nalozi");
  revalidatePath("/");
  if (orderId) revalidatePath(`/nalozi/${orderId}`);
  if (vehicleId) revalidatePath(`/vozila/${vehicleId}`);
}

export async function saveIntake(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const vehicleMode = fdStr(fd, "vehicleMode");
  const ownerMode = fdStr(fd, "ownerMode");
  const input: IntakeInput = {
    vehicle:
      vehicleMode === "existing"
        ? { mode: "existing", vehicleId: fdStr(fd, "vehicleId") }
        : {
            mode: "new",
            raw: { plate: fdStr(fd, "vehicle.plate"), vin: fdStr(fd, "vehicle.vin"), make: fdStr(fd, "vehicle.make"), model: fdStr(fd, "vehicle.model"), year: fdStr(fd, "vehicle.year") },
          },
    owner:
      ownerMode === "keep"
        ? { mode: "keep" }
        : ownerMode === "existing"
          ? { mode: "existing", customerId: fdStr(fd, "customerId") }
          : ownerMode === "new"
            ? { mode: "new", force: fdStr(fd, "force") === "1", customer: { type: fdStr(fd, "customer.type"), name: fdStr(fd, "customer.name"), phones: fdAll(fd, "customer.phones[]") } }
            : { mode: "none" },
    kmIn: fdStr(fd, "kmIn"),
    complaint: fdStr(fd, "complaint"),
    appointmentId: fdStr(fd, "appointmentId") || undefined,
  };
  const r = await createOrderFromIntake(input);
  if (!r.ok) return { errors: r.errors, duplicates: r.duplicates, conflictVehicleId: r.conflictVehicleId, values: fdValues(fd) };
  touch(r.id);
  revalidatePath("/kalendar");
  redirect(`/nalozi/${r.id}?novi=1${r.warning ? "&km=nize" : ""}`);
}

export async function saveOrderText(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const id = fdStr(fd, "orderId");
  const field = fdStr(fd, "field") as OrderTextField;
  if (!["complaint", "workDone", "internalNote"].includes(field)) return { errors: { form: "Nepoznato polje." } };
  const r = await updateOrderText(id, field, fdStr(fd, "value"));
  if (!r.ok) return { errors: r.errors, values: fdValues(fd) };
  touch(id);
  return { message: "Sačuvano." };
}

function itemRaw(fd: FormData) {
  return {
    kind: fdStr(fd, "kind"),
    name: fdStr(fd, "name"),
    qty: fdStr(fd, "qty"),
    unit: fdStr(fd, "unit"),
    price: fdStr(fd, "price"),
    cost: fdStr(fd, "cost"),
    discount: fdStr(fd, "discount"),
    partNumber: fdStr(fd, "partNumber"),
  };
}

export async function saveItem(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const orderId = fdStr(fd, "orderId");
  const itemId = fdStr(fd, "itemId");
  const r = itemId ? await updateItem(orderId, itemId, itemRaw(fd)) : await addItem(orderId, itemRaw(fd));
  if (!r.ok) return { errors: r.errors, values: fdValues(fd) };
  touch(orderId);
  return { message: itemId ? "Stavka je izmenjena." : "Stavka je dodata." };
}

export async function removeItem(fd: FormData): Promise<void> {
  await requireSession();
  const orderId = fdStr(fd, "orderId");
  await deleteItem(orderId, fdStr(fd, "itemId"));
  touch(orderId);
}

export async function saveCompletion(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const id = fdStr(fd, "orderId");
  const titles = fdAll(fd, "rem.title[]");
  const months = fdAll(fd, "rem.months[]");
  const kms = fdAll(fd, "rem.km[]");
  const r = await completeOrder(id, {
    date: fdStr(fd, "date"),
    kmOut: fdStr(fd, "kmOut"),
    workDone: fdStr(fd, "workDone"),
    reminders: titles.map((title, i) => ({ title, months: months[i] ?? "", km: kms[i] ?? "" })),
    closeReminderIds: fdAll(fd, "closeReminder[]"),
  });
  if (!r.ok) return { errors: r.errors, values: fdValues(fd) };
  touch(id, fdStr(fd, "vehicleId"));
  redirect(`/nalozi/${id}?zavrsen=1`);
}

export async function reopen(fd: FormData): Promise<void> {
  await requireSession();
  const id = fdStr(fd, "orderId");
  await reopenOrder(id);
  touch(id, fdStr(fd, "vehicleId"));
}

export async function saveCancel(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const id = fdStr(fd, "orderId");
  const r = await cancelOrder(id, fdStr(fd, "reason"));
  if (!r.ok) return { errors: r.errors, values: fdValues(fd) };
  touch(id);
  return { message: "Nalog je otkazan." };
}

export async function removePhoto(orderId: string, attachmentId: string): Promise<void> {
  await requireSession();
  await deleteAttachment(attachmentId);
  touch(orderId);
}

export async function saveReminder(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const vehicleId = fdStr(fd, "vehicleId");
  const r = await addReminder(vehicleId, { title: fdStr(fd, "title"), months: fdStr(fd, "months"), km: fdStr(fd, "km") });
  if (!r.ok) return { errors: r.errors, values: fdValues(fd) };
  touch(undefined, vehicleId);
  revalidatePath("/podsetnici");
  return { message: "Podsetnik je dodat." };
}

export async function setReminderStatus(fd: FormData): Promise<void> {
  await requireSession();
  const id = fdStr(fd, "reminderId");
  const status = fdStr(fd, "status");
  if (status === "open") await reopenReminder(id);
  else await closeReminder(id, status === "done" ? "done" : "dismissed");
  touch(undefined, fdStr(fd, "vehicleId"));
  revalidatePath("/podsetnici");
}

// ---------- naplata i račun ----------


function touchFinance(orderId: string) {
  touch(orderId);
  revalidatePath("/finansije");
  revalidatePath("/klijenti");
}

export async function savePayment(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const orderId = fdStr(fd, "orderId");
  const r = await addPayment(orderId, { amount: fdStr(fd, "amount"), date: fdStr(fd, "date"), note: fdStr(fd, "note") });
  if (!r.ok) return { errors: r.errors, values: fdValues(fd) };
  touchFinance(orderId);
  return { message: "Uplata je evidentirana." };
}

export async function voidPayment(orderId: string, paymentId: string, reason: string): Promise<string | null> {
  await requireSession();
  const r = await cancelPayment(paymentId, reason);
  if (!r.ok) return Object.values(r.errors)[0] ?? "Greška.";
  touchFinance(orderId);
  return null;
}

export async function makeInvoice(orderId: string): Promise<string | null> {
  await requireSession();
  const r = await issueInvoice(orderId);
  if (!r.ok) return Object.values(r.errors)[0] ?? "Greška.";
  touchFinance(orderId);
  return null;
}

export async function voidInvoice(orderId: string, invoiceId: string, reason: string): Promise<string | null> {
  await requireSession();
  const r = await cancelInvoice(invoiceId, reason);
  if (!r.ok) return Object.values(r.errors)[0] ?? "Greška.";
  touchFinance(orderId);
  return null;
}
