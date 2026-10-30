import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CircleSlash, ClipboardList, LogIn, Pencil, Phone, RotateCcw, Trash2, UserRoundX } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlateBadge } from "@/components/plate-badge";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/domain/dates";
import { APPOINTMENT_STATUS_LABELS, dayName, formatDuration, formatTime } from "@/domain/appointments";
import { formatPhone, telHref } from "@/domain/phone";
import { getAppointment } from "@/server/appointments";
import { changeAppointmentStatus, removeAppointment } from "../actions";

export const metadata: Metadata = { title: "Termin" };

const badge: Record<string, string> = {
  scheduled: "bg-accent text-accent-foreground",
  arrived: "bg-success/12 text-success",
  no_show: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function StatusButton({ id, status, children, variant = "outline" }: { id: string; status: string; children: React.ReactNode; variant?: "outline" | "ghost" }) {
  return (
    <form action={changeAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant={variant} size="xl" className="w-full justify-start sm:w-auto">
        {children}
      </Button>
    </form>
  );
}

export default async function TerminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getAppointment(id);
  if (!a) notFound();
  const phone = a.customer?.phones[0]?.e164 ?? a.phone;
  const name = a.customer?.name ?? a.customerName;

  return (
    <div className="max-w-2xl">
      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", badge[a.status])}>{APPOINTMENT_STATUS_LABELS[a.status]}</span>
          <Link href={`/kalendar?pogled=dan&datum=${a.date}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            <CalendarDays className="size-4" aria-hidden />
            {dayName(a.date)}, {formatDate(a.date)}
          </Link>
        </div>
        <h1 className="mt-2 text-2xl font-bold tabular">
          {formatTime(a.startMin)} – {formatTime(a.startMin + a.durationMin)}
          <span className="ml-2 text-base font-normal text-muted-foreground">{formatDuration(a.durationMin)}</span>
        </h1>
        <p className="mt-1 text-lg font-semibold">{a.reason}</p>
        {a.note && <p className="mt-1 whitespace-pre-line text-muted-foreground">{a.note}</p>}

        <div className="mt-4 flex flex-col gap-2 border-t pt-4">
          {a.vehicle ? (
            <Link href={`/vozila/${a.vehicle.id}`} className="flex w-fit flex-wrap items-center gap-2">
              <PlateBadge plate={a.vehicle.plate} vin={a.vehicle.plate ? undefined : a.vehicle.vin} />
              <span className="font-semibold">{[a.vehicle.make, a.vehicle.model, a.vehicle.year].filter(Boolean).join(" ")}</span>
            </Link>
          ) : (
            a.vehicleText && <p className="font-semibold">{a.vehicleText} <span className="text-sm font-normal text-muted-foreground">(nije u evidenciji)</span></p>
          )}
          {name && (
            <p className="flex flex-wrap items-center gap-2">
              {a.customer ? (
                <Link href={`/klijenti/${a.customer.id}`} className="font-medium text-primary">
                  {name}
                </Link>
              ) : (
                <span className="font-medium">{name}</span>
              )}
              {phone && (
                <a href={telHref(phone)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 font-medium text-accent-foreground tabular">
                  <Phone className="size-4" aria-hidden />
                  {formatPhone(phone)}
                </a>
              )}
            </p>
          )}
        </div>
      </section>

      {a.overlap > 0 && a.status === "scheduled" && <Notice variant="warning" title={`U istom periodu je još ${a.overlap} ${a.overlap === 1 ? "termin" : "termina"}.`} className="mt-4" />}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {a.status === "arrived" && a.orderId && (
          <Button asChild size="xl">
            <Link href={`/nalozi/${a.orderId}`}>
              <ClipboardList aria-hidden />
              Nalog {a.orderNumber}
            </Link>
          </Button>
        )}
        {a.status === "scheduled" && (
          <>
            <Button asChild size="xl">
              <Link href={`/nalozi/novi?termin=${a.id}`}>
                <LogIn aria-hidden />
                Prijem vozila
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href={`/kalendar/${a.id}/uredi`}>
                <Pencil aria-hidden />
                Izmeni / pomeri
              </Link>
            </Button>
            <StatusButton id={a.id} status="no_show">
              <UserRoundX aria-hidden />
              Nije došao
            </StatusButton>
            <StatusButton id={a.id} status="cancelled" variant="ghost">
              <CircleSlash aria-hidden />
              Otkaži
            </StatusButton>
          </>
        )}
        {(a.status === "no_show" || a.status === "cancelled") && (
          <StatusButton id={a.id} status="scheduled">
            <RotateCcw aria-hidden />
            Vrati na zakazano
          </StatusButton>
        )}
      </div>

      <form action={removeAppointment} className="mt-6">
        <input type="hidden" name="id" value={a.id} />
        <ConfirmSubmit message={a.orderId ? "Obrisati termin iz kalendara? Nalog otvoren iz termina ostaje." : "Obrisati termin iz kalendara?"}>
          <Button type="submit" variant="ghost" className="text-muted-foreground hover:text-destructive">
            <Trash2 aria-hidden />
            Obriši termin
          </Button>
        </ConfirmSubmit>
      </form>
    </div>
  );
}
