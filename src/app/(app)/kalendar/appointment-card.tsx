import Link from "next/link";
import { cn } from "@/lib/utils";
import { PlateBadge } from "@/components/plate-badge";
import { APPOINTMENT_STATUS_LABELS, formatDuration, formatTime } from "@/domain/appointments";
import type { AppointmentRow } from "@/server/appointments";

export const statusStyle: Record<string, string> = {
  scheduled: "border-l-primary bg-card",
  arrived: "border-l-success bg-success/5",
  no_show: "border-l-destructive bg-destructive/5 opacity-75",
  cancelled: "border-l-muted-foreground bg-muted opacity-60",
};

export function who(a: AppointmentRow): string {
  const vehicle = a.vehicle ? [a.vehicle.make, a.vehicle.model].filter(Boolean).join(" ") : a.vehicleText;
  const customer = a.customer?.name ?? a.customerName;
  return [vehicle, customer].filter(Boolean).join(" · ");
}

/** Kartica termina za nedeljni pregled i liste. */
export function AppointmentCard({ a, compact = false }: { a: AppointmentRow; compact?: boolean }) {
  return (
    <Link
      href={`/kalendar/${a.id}`}
      className={cn("block rounded-lg border border-l-4 p-2 text-sm hover:border-primary/40", statusStyle[a.status])}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-semibold tabular">
          {formatTime(a.startMin)}
          {!compact && <span className="font-normal text-muted-foreground"> · {formatDuration(a.durationMin)}</span>}
        </span>
        {a.status !== "scheduled" && <span className="text-[0.7rem] font-semibold uppercase">{APPOINTMENT_STATUS_LABELS[a.status]}</span>}
      </span>
      {a.vehicle?.plate && <PlateBadge plate={a.vehicle.plate} size="sm" className="mt-1" />}
      <span className={cn("mt-1 block font-medium", a.status === "cancelled" && "line-through")}>{a.reason}</span>
      <span className="block truncate text-xs text-muted-foreground">{who(a)}</span>
      {a.overlap > 0 && a.status === "scheduled" && <span className="mt-1 block text-xs font-medium text-warning">istovremeno još {a.overlap}</span>}
    </Link>
  );
}
