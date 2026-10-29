"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/guard";
import { createExpense, deleteExpense, payExpense, updateExpense } from "@/server/suppliers";
import { fdStr, fdValues, type FormState } from "@/lib/form-data";

function touch() {
  revalidatePath("/finansije");
  revalidatePath("/dobavljaci");
  revalidatePath("/nalozi");
}

function rawExpense(fd: FormData) {
  const keys = ["date", "category", "amount", "description", "supplierId", "orderId", "paid", "paidDate", "dueDate", "documentNo", "note"] as const;
  return Object.fromEntries(keys.map((k) => [k, fdStr(fd, k)])) as Record<(typeof keys)[number], string>;
}

export async function saveExpense(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const id = fdStr(fd, "id");
  const r = id ? await updateExpense(id, rawExpense(fd)) : await createExpense(rawExpense(fd));
  if (!r.ok) return { errors: r.errors, values: fdValues(fd) };
  touch();
  const back = fdStr(fd, "back");
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/finansije/troskovi");
}

export async function markExpensePaid(fd: FormData): Promise<void> {
  await requireSession();
  await payExpense(fdStr(fd, "id"));
  touch();
}

export async function removeExpense(fd: FormData): Promise<void> {
  await requireSession();
  await deleteExpense(fdStr(fd, "id"));
  touch();
  redirect("/finansije/troskovi");
}
