import Link from "next/link";
import { CalendarPlus, Check, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlateBadge } from "@/components/plate-badge";
import { formatDate } from "@/domain/dates";
import { formatPhone, telHref } from "@/domain/phone";
import { describeTarget, type DueInfo } from "@/domain/reminders";
import { setReminderStatus } from "@/app/(app)/nalozi/actions";

type Item = {
  id: string;
  title: string;
  dueDate?: string;
  dueKm?: number;
  vehicleId: string;
  due: DueInfo;
  vehicle?: { id: string; plate?: string; vin?: string; make: string; model?: string };
  owner?: { id: string; name: string; phones: { e164: string }[] };
};

function dueText(r: Item) {
  if (r.due.overdue) return r.due.daysLeft !== null && r.due.daysLeft < 0 ? `prekoračen ${-r.due.daysLeft} d` : "prekoračen";
  if (r.due.date && r.due.daysLeft !== null) {
    const when = r.due.daysLeft === 0 ? "danas" : r.due.daysLeft <= 60 ? `za ${r.due.daysLeft} d` : formatDate(r.due.date);
    return r.due.by === "km" ? `${when} (procena po km)` : when;
  }
  return r.due.kmWithoutTrend ? "na km, bez procene datuma" : "";
}

/** Lista otvorenih podsetnika sa akcijama „Urađeno“ i „Odbaci“; na početnoj sa vozilom i pozivom vlasnika. */
export function ReminderList({ reminders, withVehicle = false }: { reminders: Item[]; withVehicle?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {reminders.map((r) => (
        <li key={r.id} className={cn("flex items-start gap-2 rounded-xl border bg-card p-3", r.due.overdue && "border-destructive/40", !r.due.overdue && r.due.soon && "border-warning/50")}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {withVehicle && r.vehicle && (
                <Link href={`/vozila/${r.vehicle.id}`} className="shrink-0">
                  <PlateBadge plate={r.vehicle.plate} vin={r.vehicle.plate ? undefined : r.vehicle.vin} size="sm" />
                </Link>
              )}
              <p className="font-medium">{r.title}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground tabular">
              {describeTarget(r, formatDate)}
              {dueText(r) && <span className={cn(r.due.overdue ? "font-medium text-destructive" : r.due.soon ? "font-medium text-warning" : undefined)}> · {dueText(r)}</span>}
            </p>
            {withVehicle && r.owner && (
              <p className="text-sm text-muted-foreground">
                {[r.vehicle?.make, r.vehicle?.model].filter(Boolean).join(" ")} · {r.owner.name}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {withVehicle && r.owner?.phones[0] && (
              <a href={telHref(r.owner.phones[0].e164)} aria-label={`Pozovi ${r.owner.name}, ${formatPhone(r.owner.phones[0].e164)}`} className="inline-flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Phone className="size-4" aria-hidden />
              </a>
            )}
            <Link
              href={`/kalendar/novi?vozilo=${r.vehicleId}&razlog=${encodeURIComponent(r.title)}`}
              aria-label={`Zakaži termin: ${r.title}`}
              title="Zakaži termin"
              className="inline-flex size-10 items-center justify-center rounded-lg text-primary hover:bg-accent"
            >
              <CalendarPlus className="size-5" aria-hidden />
            </Link>
            <form action={setReminderStatus}>
              <input type="hidden" name="reminderId" value={r.id} />
              <input type="hidden" name="vehicleId" value={r.vehicleId} />
              <input type="hidden" name="status" value="done" />
              <button type="submit" aria-label={`Urađeno: ${r.title}`} title="Urađeno" className="inline-flex size-10 items-center justify-center rounded-lg text-success hover:bg-success/10">
                <Check className="size-5" aria-hidden />
              </button>
            </form>
            <form action={setReminderStatus}>
              <input type="hidden" name="reminderId" value={r.id} />
              <input type="hidden" name="vehicleId" value={r.vehicleId} />
              <input type="hidden" name="status" value="dismissed" />
              <button type="submit" aria-label={`Odbaci: ${r.title}`} title="Odbaci" className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                <X className="size-5" aria-hidden />
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
