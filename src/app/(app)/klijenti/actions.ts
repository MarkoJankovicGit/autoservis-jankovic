"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/guard";
import { createCustomer, setCustomerArchived, updateCustomer } from "@/server/customers";
import { fdAll, fdStr, fdValues, type FormState } from "@/lib/form-data";

function rawCustomer(fd: FormData) {
  return {
    type: fdStr(fd, "type"),
    name: fdStr(fd, "name"),
    phones: fdAll(fd, "phones[]"),
    email: fdStr(fd, "email"),
    taxId: fdStr(fd, "taxId"),
    address: fdStr(fd, "address"),
    note: fdStr(fd, "note"),
  };
}

export async function saveCustomer(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const id = fdStr(fd, "id");
  const force = fdStr(fd, "force") === "1";
  const r = id ? await updateCustomer(id, rawCustomer(fd), { force }) : await createCustomer(rawCustomer(fd), { force });
  if (!r.ok) return { errors: r.errors, duplicates: r.duplicates, values: fdValues(fd) };
  revalidatePath("/klijenti");
  redirect(`/klijenti/${r.id}`);
}

export async function archiveCustomer(fd: FormData): Promise<void> {
  await requireSession();
  const id = fdStr(fd, "id");
  const archived = fdStr(fd, "archived") === "1";
  await setCustomerArchived(id, archived);
  revalidatePath("/klijenti");
  revalidatePath(`/klijenti/${id}`);
}
