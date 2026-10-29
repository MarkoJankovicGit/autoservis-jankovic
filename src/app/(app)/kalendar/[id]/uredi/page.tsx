import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/domain/dates";
import { getAppointment } from "@/server/appointments";
import { getIntakeVehicle } from "@/server/orders";
import { AppointmentForm } from "../../appointment-form";

export const metadata: Metadata = { title: "Izmena termina" };

export default async function UrediTerminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getAppointment(id);
  if (!a) notFound();
  if (a.status === "arrived") redirect(`/kalendar/${id}`);
  const vehicle = a.vehicleId ? await getIntakeVehicle(a.vehicleId, formatDate) : null;
  return (
    <div className="max-w-2xl">
      <PageHeader title="Izmena termina" description={`${formatDate(a.date)} · ${a.reason}`} />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <AppointmentForm appointment={a} initialVehicle={vehicle} initialDate={a.date} cancelHref={`/kalendar/${id}`} />
      </div>
    </div>
  );
}
