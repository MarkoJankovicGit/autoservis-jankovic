"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/guard";
import { createVehicleShare, revokeVehicleShare } from "@/server/shares";
import { fdAll, fdStr } from "@/lib/form-data";

/** Vraća id (za PDF), token (jedini trenutak kad je poznat) i rok važenja za tekst poruke. */
export async function createShare(fd: FormData): Promise<{ id?: string; token?: string; expiresAt?: string; errors?: Record<string, string> }> {
  await requireSession();
  const vehicleId = fdStr(fd, "vehicleId");
  const r = await createVehicleShare(vehicleId, {
    orderIds: fdAll(fd, "orderId[]"),
    photoIds: fdAll(fd, "photoId[]"),
    showPrices: fdStr(fd, "showPrices") === "1",
    showReminders: fdStr(fd, "showReminders") === "1",
    days: fdStr(fd, "days"),
  });
  if (!r.ok) return { errors: r.errors };
  revalidatePath(`/vozila/${vehicleId}/podeli`);
  return { id: r.id, token: r.token, expiresAt: r.expiresAt };
}

export async function revokeShare(fd: FormData): Promise<void> {
  await requireSession();
  await revokeVehicleShare(fdStr(fd, "id"));
  revalidatePath(`/vozila/${fdStr(fd, "vehicleId")}/podeli`);
}
