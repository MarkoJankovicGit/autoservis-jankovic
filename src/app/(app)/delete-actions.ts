"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/guard";
import { deleteEntity, type DeleteKind } from "@/server/deletion";
import { fdStr } from "@/lib/form-data";

/** Lista na koju se korisnik vraća; uplata i račun vraćaju na svoj nalog. */
const AFTER: Record<DeleteKind, string> = {
  customer: "/klijenti",
  vehicle: "/vozila",
  order: "/nalozi",
  supplier: "/dobavljaci",
  partsOrder: "/dobavljaci/narudzbenice",
  payment: "/nalozi",
  invoice: "/nalozi",
};

export async function removeEntity(fd: FormData): Promise<void> {
  await requireSession();
  const kind = fdStr(fd, "kind") as DeleteKind;
  if (!Object.hasOwn(AFTER, kind)) return;
  const r = await deleteEntity(kind, fdStr(fd, "id"));
  // brisanje menja više strana odjednom (nalozi, vozila, finansije, kalendar)
  revalidatePath("/", "layout");
  redirect(r.ok && r.orderId ? `/nalozi/${r.orderId}` : AFTER[kind]);
}

/** Za panel naplate: isti oblik kao poništavanje (poruka greške ili null). */
export async function removeFromOrder(kind: "payment" | "invoice", id: string): Promise<string | null> {
  await requireSession();
  const r = await deleteEntity(kind, id);
  revalidatePath("/", "layout");
  return r.ok ? null : kind === "payment" ? "Uplata ne postoji." : "Račun ne postoji.";
}
