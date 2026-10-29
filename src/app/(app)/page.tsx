import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CalendarClock, HandCoins, House, Phone, Plus, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PlateBadge } from "@/components/plate-badge";
import { ReminderList } from "@/components/reminder-list";
import { Button } from "@/components/ui/button";
import { daysBetween, formatDate, todayIso } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import { formatPhone, telHref } from "@/domain/phone";
import { listOrders } from "@/server/orders";
import { listOpenReminders } from "@/server/reminders";
import { registrationsExpiring } from "@/server/vehicles";
import { listDebts } from "@/server/finance";
import { InstallBanner } from "@/components/pwa";
import { todayAppointments } from "@/server/appointments";
import { formatTime } from "@/domain/appointments";
import { plural } from "@/domain/text";

export const metadata: Metadata = { title: "Početna" };

function Stat({ href, icon: Icon, label, value, tone }: { href: string; icon: typeof Wrench; label: string; value: number; tone?: "warn" | "danger" }) {
  return (
    <Link href={href} className="flex flex-col gap-3 rounded-2xl border bg-card p-3 hover:border-primary/40 sm:p-4">
      <span className={cn("flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground", tone === "warn" && "bg-warning/12 text-warning", tone === "danger" && "bg-destructive/10 text-destructive")}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span>
        <span className={cn("block text-3xl leading-none font-bold tabular", tone === "warn" && "text-warning", tone === "danger" && "text-destructive")}>{value}</span>
        <span className="mt-1.5 block text-sm leading-tight text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}

export default async function PocetnaPage() {
  const today = todayIso();
  const [open, reminders, regs, debts, appts] = await Promise.all([listOrders({ status: "open" }), listOpenReminders({ soonOnly: true, days: 30 }), registrationsExpiring(30), listDebts(), todayAppointments()]);
  const owed = debts.reduce((a, d) => a + d.balance, 0);
  const overdue = reminders.filter((r) => r.due.overdue).length;
  const nothing = !open.length && !reminders.length && !regs.length && !owed && !appts.length;

  return (
    <>
      <PageHeader
        title="Danas"
        description={formatDate(today)}
        actions={
          <Button asChild size="xl">
            <Link href="/nalozi/novi">
              <Plus aria-hidden />
              Novi prijem
            </Link>
          </Button>
        }
      />

      <InstallBanner />
      {nothing ? (
        <EmptyState icon={House} title="Sve je mirno" />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <Stat href="/nalozi" icon={Wrench} label="vozila u radu" value={open.length} />
            <Stat href="/podsetnici" icon={BellRing} label={overdue ? `podsetnika, ${overdue} prekoračeno` : "podsetnika uskoro"} value={reminders.length} tone={overdue ? "danger" : reminders.length ? "warn" : undefined} />
            <Stat href="#registracije" icon={CalendarClock} label="registracija ističe" value={regs.length} tone={regs.some((r) => r.daysLeft < 0) ? "danger" : regs.length ? "warn" : undefined} />
            <Link href="/finansije/dugovanja" className="flex flex-col gap-3 rounded-2xl border bg-card p-3 hover:border-primary/40 sm:p-4">
              <span className={cn("flex size-10 items-center justify-center rounded-xl", owed ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground")}>
                <HandCoins className="size-5" aria-hidden />
              </span>
              <span>
                <span className={cn("block text-xl leading-tight font-bold whitespace-nowrap tabular sm:text-2xl", owed > 0 && "text-destructive")}>
                  {formatMoney(owed, { decimals: false, currency: false })}
                  <span className="text-sm font-semibold"> RSD</span>
                </span>
                <span className="mt-1.5 block text-sm leading-tight text-muted-foreground">duguju mušterije ({debts.length})</span>
              </span>
            </Link>
          </div>

          {appts.length > 0 && (
            <section aria-labelledby="danas" className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="danas" className="text-lg font-semibold">
                  Danas dolaze
                </h2>
                <Link href="/kalendar?pogled=dan" className="text-sm font-medium text-primary">
                  Kalendar
                </Link>
              </div>
              <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                {appts.map((a) => (
                  <li key={a.id} className={cn("flex items-center gap-3 px-4 py-3", a.status !== "scheduled" && "opacity-60")}>
                    <span className="w-12 shrink-0 font-semibold tabular">{formatTime(a.startMin)}</span>
                    <Link href={`/kalendar/${a.id}`} className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        {a.vehicle?.plate && <PlateBadge plate={a.vehicle.plate} size="sm" />}
                        <span className="font-medium">{a.reason}</span>
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {[a.vehicle ? [a.vehicle.make, a.vehicle.model].filter(Boolean).join(" ") : a.vehicleText, a.customer?.name ?? a.customerName].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                    {a.status === "scheduled" ? (
                      <Button asChild size="sm" className="h-10 px-3">
                        <Link href={`/nalozi/novi?termin=${a.id}`}>Prijem</Link>
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">{a.status === "arrived" ? "primljen" : a.status === "no_show" ? "nije došao" : ""}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
            <section aria-labelledby="u-radu">
              <h2 id="u-radu" className="mb-3 text-lg font-semibold">
                U radu
              </h2>
              {open.length === 0 ? (
                <p className="rounded-2xl border border-dashed bg-card p-5 text-muted-foreground">Nema vozila u radu.</p>
              ) : (
                <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                  {open.slice(0, 10).map((o) => {
                    const days = daysBetween(o.receivedDate, today);
                    return (
                      <li key={o.id}>
                        <Link href={`/nalozi/${o.id}`} className="flex flex-col gap-1.5 px-4 py-3 hover:bg-muted/60">
                          <span className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2">
                              <PlateBadge plate={o.vehicle?.plate} vin={o.vehicle?.plate ? undefined : o.vehicle?.vin} size="sm" />
                              {o.waitingParts && <span className="rounded-full bg-warning/12 px-2 py-0.5 text-xs font-semibold text-warning">čeka deo</span>}
                            </span>
                            {o.total > 0 && <span className="text-sm font-semibold tabular">{formatMoney(o.total, { decimals: false })}</span>}
                          </span>
                          <span className="block font-medium">{o.complaint}</span>
                          <span className="block text-sm text-muted-foreground">
                            {[o.vehicle?.make, o.vehicle?.model].filter(Boolean).join(" ")} · {o.customer?.name} · {days === 0 ? "od danas" : `${days} ${plural(days, "dan", "dana", "dana")}`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby="pods">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="pods" className="text-lg font-semibold">
                  Podsetnici koji dospevaju
                </h2>
                <Link href="/podsetnici" className="text-sm font-medium text-primary">
                  Svi podsetnici
                </Link>
              </div>
              {reminders.length === 0 ? (
                <p className="rounded-2xl border border-dashed bg-card p-5 text-muted-foreground">Ništa ne dospeva u narednih 30 dana.</p>
              ) : (
                <ReminderList reminders={reminders.slice(0, 8)} withVehicle />
              )}
            </section>
          </div>

          {regs.length > 0 && (
            <section id="registracije" aria-labelledby="reg" className="mt-6">
              <h2 id="reg" className="mb-3 text-lg font-semibold">
                Registracija ističe
              </h2>
              <ul className="flex flex-col gap-2">
                {regs.map((r) => (
                  <li key={r.id} className={cn("flex items-start gap-2 rounded-xl border bg-card p-3", r.daysLeft < 0 ? "border-destructive/40" : "border-warning/50")}>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link href={`/vozila/${r.id}`} className="shrink-0">
                          <PlateBadge plate={r.plate} vin={r.plate ? undefined : r.vin} size="sm" />
                        </Link>
                        <span className="font-medium">{[r.make, r.model].filter(Boolean).join(" ")}</span>
                      </span>
                      <span className={cn("mt-1 block text-sm tabular", r.daysLeft < 0 ? "text-destructive" : "text-warning")}>
                        {r.daysLeft < 0 ? `istekla ${formatDate(r.registrationExpires!)}` : r.daysLeft === 0 ? "ističe danas" : `ističe ${formatDate(r.registrationExpires!)} (za ${r.daysLeft} d)`}
                        {r.owner && <span className="text-muted-foreground"> · {r.owner.name}</span>}
                      </span>
                    </span>
                    {r.owner?.phones[0] && (
                      <a href={telHref(r.owner.phones[0].e164)} aria-label={`Pozovi ${r.owner.name}, ${formatPhone(r.owner.phones[0].e164)}`} className="inline-flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <Phone className="size-4" aria-hidden />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
