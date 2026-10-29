"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/guard";
import { createSupplier, setSupplierArchived, updateSupplier } from "@/server/suppliers";
import { cancelPartsOrder, createPartsOrder, createShareLink, markSent, receiveParts, revokeShareLink, updatePartsOrder } from "@/server/parts-orders";
import { fdAll, fdStr, fdValues, type FormState } from "@/lib/form-data";

function touch(extra?: string) {
  revalidatePath("/dobavljaci");
  revalidatePath("/finansije");
  revalidatePath("/nalozi");
  revalidatePath("/");
  if (extra) revalidatePath(extra);
}

// ---------- dobavljači ----------

export async function saveSupplier(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const id = fdStr(fd, "id");
  const raw = { name: fdStr(fd, "name"), phone: fdStr(fd, "phone"), email: fdStr(fd, "email"), contactPerson: fdStr(fd, "contactPerson"), note: fdStr(fd, "note") };
  const r = id ? await updateSupplier(id, raw) : await createSupplier(raw);
  if (!r.ok) return { errors: r.errors, values: fdValues(fd) };
  touch();
  redirect(`/dobavljaci/${r.id}`);
}

export async function archiveSupplier(fd: FormData): Promise<void> {
  await requireSession();
  const id = fdStr(fd, "id");
  await setSupplierArchived(id, fdStr(fd, "archived") === "1");
  touch(`/dobavljaci/${id}`);
}

// ---------- narudžbenice ----------

function rawPartsOrder(fd: FormData) {
  const names = fdAll(fd, "line.name[]");
  const pns = fdAll(fd, "line.partNumber[]");
  const qtys = fdAll(fd, "line.qty[]");
  const notes = fdAll(fd, "line.note[]");
  return {
    supplierId: fdStr(fd, "supplierId"),
    neededBy: fdStr(fd, "neededBy"),
    note: fdStr(fd, "note"),
    lines: names.map((name, i) => ({ name, partNumber: pns[i] ?? "", qty: qtys[i] ?? "", note: notes[i] ?? "" })),
  };
}

export async function savePartsOrder(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const id = fdStr(fd, "id");
  const r = id
    ? await updatePartsOrder(id, rawPartsOrder(fd))
    : await createPartsOrder({ orderId: fdStr(fd, "orderId") || undefined, vehicleId: fdStr(fd, "vehicleId") || undefined, raw: rawPartsOrder(fd) });
  if (!r.ok) return { errors: r.errors, values: fdValues(fd) };
  touch(`/dobavljaci/narudzbenice/${r.id}`);
  const orderId = fdStr(fd, "orderId");
  if (orderId) revalidatePath(`/nalozi/${orderId}`);
  redirect(`/dobavljaci/narudzbenice/${r.id}`);
}

export async function sendPartsOrder(fd: FormData): Promise<void> {
  await requireSession();
  const id = fdStr(fd, "id");
  await markSent(id);
  touch(`/dobavljaci/narudzbenice/${id}`);
}

export async function abortPartsOrder(fd: FormData): Promise<void> {
  await requireSession();
  const id = fdStr(fd, "id");
  await cancelPartsOrder(id);
  touch(`/dobavljaci/narudzbenice/${id}`);
}

/** Vraća novi token (jedini trenutak kad je token poznat); stari link prestaje da važi. */
export async function newPartsOrderLink(id: string): Promise<{ token?: string; error?: string }> {
  await requireSession();
  const r = await createShareLink(id);
  touch(`/dobavljaci/narudzbenice/${id}`);
  return r.ok ? { token: r.token } : { error: Object.values(r.errors)[0] };
}

export async function revokePartsOrderLink(id: string): Promise<void> {
  await requireSession();
  await revokeShareLink(id);
  touch(`/dobavljaci/narudzbenice/${id}`);
}

export async function saveReceipt(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const id = fdStr(fd, "id");
  const ids = fdAll(fd, "rcv.lineId[]");
  const qtys = fdAll(fd, "rcv.qty[]");
  const costs = fdAll(fd, "rcv.cost[]");
  const prices = fdAll(fd, "rcv.price[]");
  const r = await receiveParts(
    id,
    ids.map((lineId, i) => ({ lineId, qty: qtys[i] ?? "", cost: costs[i] ?? "", price: prices[i] ?? "" })),
    { addToOrder: fdStr(fd, "addToOrder") === "1", createExpense: fdStr(fd, "createExpense") === "1", paid: fdStr(fd, "paid") === "1" },
  );
  if (!r.ok) return { errors: r.errors, values: fdValues(fd) };
  touch(`/dobavljaci/narudzbenice/${id}`);
  const orderId = fdStr(fd, "orderId");
  if (orderId) revalidatePath(`/nalozi/${orderId}`);
  return { message: "Prijem je evidentiran." };
}
