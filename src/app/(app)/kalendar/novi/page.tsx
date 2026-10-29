import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { formatDate, isIsoDate, todayIso } from "@/domain/dates";
import { parseTime } from "@/domain/appointments";
import { getIntakeVehicle } from "@/server/orders";
import { AppointmentForm } from "../appointment-form";

export const metadata: Metadata = { title: "Novi termin" };

export default async function NoviTerminPage({ searchParams }: { searchParams: Promise<{ datum?: string; vreme?: string; vozilo?: string; razlog?: string }> }) {
  const sp = await searchParams;
  const date = sp.datum && isIsoDate(sp.datum) ? sp.datum : todayIso();
  const time = sp.vreme && parseTime(sp.vreme) !== null ? sp.vreme : undefined;
  const vehicle = sp.vozilo ? await getIntakeVehicle(sp.vozilo, formatDate) : null;
  return (
    <div className="max-w-2xl">
      <PageHeader title="Novi termin" />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <AppointmentForm initialDate={date} initialTime={time} initialVehicle={vehicle} initialReason={sp.razlog?.slice(0, 200)} cancelHref={`/kalendar?pogled=dan&datum=${date}`} />
      </div>
    </div>
  );
}
