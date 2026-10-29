"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/guard";
import { createAppointment, deleteAppointment, getAppointment, setAppointmentStatus, updateAppointment } from "@/server/appointments";
import { fdStr, fdValues, type FormState } from "@/lib/form-data";

function touch() {
  revalidatePath("/kalendar");
  revalidatePath("/");
}

export async function saveAppointment(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const id = fdStr(fd, "id");
  const raw = {
    date: fdStr(fd, "date"),
    time: fdStr(fd, "time"),
    duration: fdStr(fd, "duration"),
    vehicleId: fdStr(fd, "vehicleId"),
    customerId: fdStr(fd, "customerId"),
    vehicleText: fdStr(fd, "vehicleText"),
    customerName: fdStr(fd, "customerName"),
    phone: fdStr(fd, "phone"),
    reason: fdStr(fd, "reason"),
    note: fdStr(fd, "note"),
  };
  const r = id ? await updateAppointment(id, raw) : await createAppointment(raw);
  if (!r.ok) return { errors: r.errors, values: fdValues(fd) };
  touch();
  redirect(`/kalendar?pogled=dan&datum=${raw.date}${r.overlap ? `&preklapanje=${r.overlap}` : ""}`);
}

export async function changeAppointmentStatus(fd: FormData): Promise<void> {
  await requireSession();
  const id = fdStr(fd, "id");
  const status = fdStr(fd, "status");
  if (status === "scheduled" || status === "no_show" || status === "cancelled") await setAppointmentStatus(id, status);
  touch();
  revalidatePath(`/kalendar/${id}`);
}

export async function removeAppointment(fd: FormData): Promise<void> {
  await requireSession();
  const id = fdStr(fd, "id");
  const a = await getAppointment(id);
  await deleteAppointment(id);
  touch();
  redirect(`/kalendar?pogled=dan&datum=${a?.date ?? ""}`);
}
