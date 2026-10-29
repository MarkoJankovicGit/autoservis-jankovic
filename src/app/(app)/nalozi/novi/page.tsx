import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/domain/dates";
import { getIntakeVehicle } from "@/server/orders";
import { getAppointment } from "@/server/appointments";
import { formatTime } from "@/domain/appointments";
import { formatPhone } from "@/domain/phone";
import { IntakeForm } from "./intake-form";

export const metadata: Metadata = { title: "Novi prijem" };

export default async function NoviPrijemPage({ searchParams }: { searchParams: Promise<{ vozilo?: string; termin?: string }> }) {
  const { vozilo, termin } = await searchParams;
  const appt = termin ? await getAppointment(termin) : null;
  const usable = appt && appt.status === "scheduled" ? appt : null;
  const vehicleId = vozilo ?? usable?.vehicleId;
  const initial = vehicleId ? await getIntakeVehicle(vehicleId, formatDate) : null;
  const appointment = usable && {
    id: usable.id,
    when: `${formatDate(usable.date)} u ${formatTime(usable.startMin)}`,
    reason: usable.reason,
    vehicleText: usable.vehicleText,
    customerName: usable.customerName,
    phone: usable.phone ? formatPhone(usable.phone) : undefined,
  };
  return (
    <div className="max-w-3xl">
      <PageHeader title="Novi prijem" />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <IntakeForm initialVehicle={initial} appointment={appointment} />
      </div>
    </div>
  );
}
