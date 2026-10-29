"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/guard";
import { addReading, changeOwner, createVehicle, deleteReading, setVehicleArchived, updateVehicle, type OwnerChoice } from "@/server/vehicles";
import { parseKm } from "@/domain/validation";
import { fdAll, fdStr, fdValues, type FormState } from "@/lib/form-data";

function rawVehicle(fd: FormData) {
  const keys = ["plate", "vin", "make", "model", "year", "fuel", "engine", "powerKw", "color", "registrationExpires", "note", "km"] as const;
  return Object.fromEntries(keys.map((k) => [k, fdStr(fd, k)])) as Record<(typeof keys)[number], string>;
}

function ownerFrom(fd: FormData): OwnerChoice {
  const mode = fdStr(fd, "ownerMode");
  if (mode === "existing") return { mode, customerId: fdStr(fd, "customerId") };
  if (mode === "new") {
    return {
      mode,
      force: fdStr(fd, "force") === "1",
      customer: { type: fdStr(fd, "customer.type"), name: fdStr(fd, "customer.name"), phones: fdAll(fd, "customer.phones[]") },
    };
  }
  return { mode: "none" };
}

export async function saveVehicle(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const id = fdStr(fd, "id");
  const r = id ? await updateVehicle(id, rawVehicle(fd)) : await createVehicle(rawVehicle(fd), ownerFrom(fd));
  if (!r.ok) {
    return { errors: r.errors, warnings: r.warnings, duplicates: r.duplicates, conflictVehicleId: r.conflictVehicleId, values: fdValues(fd) };
  }
  revalidatePath("/vozila");
  revalidatePath("/klijenti");
  redirect(`/vozila/${r.id}`);
}

export async function saveOwnerChange(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const vehicleId = fdStr(fd, "vehicleId");
  const reason = fdStr(fd, "reason") === "correction" ? "correction" : "sale";
  const r = await changeOwner({ vehicleId, owner: ownerFrom(fd), date: fdStr(fd, "date"), reason });
  if (!r.ok) return { errors: r.errors, duplicates: r.duplicates, values: fdValues(fd) };
  revalidatePath(`/vozila/${vehicleId}`);
  revalidatePath("/klijenti");
  redirect(`/vozila/${vehicleId}`);
}

export async function saveReading(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const vehicleId = fdStr(fd, "vehicleId");
  const km = parseKm(fdStr(fd, "km"));
  const r = await addReading(vehicleId, km === undefined ? null : km, fdStr(fd, "date"), fdStr(fd, "note"));
  if (!r.ok) return { errors: r.errors, values: fdValues(fd) };
  revalidatePath(`/vozila/${vehicleId}`);
  return { message: r.warning ? `Sačuvano. ${r.warning}` : "Kilometraža je upisana." };
}

export async function removeReading(fd: FormData): Promise<void> {
  await requireSession();
  const vehicleId = fdStr(fd, "vehicleId");
  await deleteReading(vehicleId, fdStr(fd, "readingId"));
  revalidatePath(`/vozila/${vehicleId}`);
}

export async function archiveVehicle(fd: FormData): Promise<void> {
  await requireSession();
  const id = fdStr(fd, "id");
  await setVehicleArchived(id, fdStr(fd, "archived") === "1");
  revalidatePath("/vozila");
  revalidatePath(`/vozila/${id}`);
}
