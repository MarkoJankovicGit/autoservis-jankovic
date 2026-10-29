import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PlateBadge } from "@/components/plate-badge";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { addDays, formatDate, isIsoDate, todayIso } from "@/domain/dates";
import { DAY_END_MIN, DAY_START_MIN, dayName, formatDuration, formatTime, layoutDay, weekDays } from "@/domain/appointments";
import { listAppointments, type AppointmentRow } from "@/server/appointments";
import { AppointmentCard, statusStyle, who } from "./appointment-card";

export const metadata: Metadata = { title: "Kalendar" };

const HOUR_PX = 64;
const short = (d: string) => `${Number(d.slice(8, 10))}.${Number(d.slice(5, 7))}.`;

export default async function KalendarPage({ searchParams }: { searchParams: Promise<{ pogled?: string; datum?: string; preklapanje?: string }> }) {
  const sp = await searchParams;
  const today = todayIso();
  const date = sp.datum && isIsoDate(sp.datum) ? sp.datum : today;
  const view = sp.pogled === "dan" ? "dan" : "nedelja";
  const days = view === "dan" ? [date] : weekDays(date);
  const rows = await listAppointments(days[0], days.at(-1)!);
  const step = view === "dan" ? 1 : 7;
  const href = (d: string, v = view) => `/kalendar?pogled=${v}&datum=${d}`;
  const label = view === "dan" ? `${dayName(date)}, ${formatDate(date)}` : `${short(days[0])} – ${formatDate(days[6])}`;

  return (
    <>
      <PageHeader
        title="Kalendar"
        actions={
          <Button asChild size="xl">
            <Link href={`/kalendar/novi?datum=${view === "dan" ? date : days.includes(today) ? today : days[0]}`}>
              <Plus aria-hidden />
              Novi termin
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="icon-lg" className="size-11">
            <Link href={href(addDays(date, -step))} aria-label={view === "dan" ? "Prethodni dan" : "Prethodna nedelja"}>
              <ChevronLeft aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-4">
            <Link href={href(today)}>Danas</Link>
          </Button>
          <Button asChild variant="outline" size="icon-lg" className="size-11">
            <Link href={href(addDays(date, step))} aria-label={view === "dan" ? "Sledeći dan" : "Sledeća nedelja"}>
              <ChevronRight aria-hidden />
            </Link>
          </Button>
        </div>
        <h2 className="order-first w-full text-lg font-semibold tabular sm:order-none sm:w-auto sm:min-w-0 sm:flex-1">{label}</h2>
        <nav aria-label="Pogled" className="inline-flex gap-1 rounded-xl border bg-card p-1">
          {(["dan", "nedelja"] as const).map((v) => (
            <Link
              key={v}
              href={href(date, v)}
              aria-current={view === v ? "page" : undefined}
              className={cn("flex min-h-9 items-center rounded-lg px-4 text-sm font-medium", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
            >
              {v === "dan" ? "Dan" : "Nedelja"}
            </Link>
          ))}
        </nav>
      </div>

      {Number(sp.preklapanje) > 0 && (
        <Notice variant="warning" title={`Termin se preklapa sa još ${sp.preklapanje}.`} className="mb-4" />
      )}
      {view === "nedelja" ? <Week days={days} rows={rows} today={today} /> : <Day date={date} rows={rows} />}
    </>
  );
}

function Week({ days, rows, today }: { days: string[]; rows: AppointmentRow[]; today: string }) {
  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-7">
      {days.map((d) => {
        const list = rows.filter((r) => r.date === d);
        const isToday = d === today;
        return (
          <section key={d} aria-label={`${dayName(d)} ${formatDate(d)}`} className={cn("flex flex-col gap-2 rounded-2xl border bg-card/60 p-2 lg:min-h-48", isToday && "border-primary ring-1 ring-primary/30", !list.length && "max-lg:py-1")}>
            <div className="flex items-center justify-between gap-2 px-1">
              <Link href={`/kalendar?pogled=dan&datum=${d}`} className={cn("text-sm font-semibold", isToday && "text-primary")}>
                {dayName(d, true)} <span className="tabular">{short(d)}</span>
                {isToday && <span className="ml-1 text-xs font-normal">danas</span>}
              </Link>
              <Link href={`/kalendar/novi?datum=${d}`} aria-label={`Novi termin ${dayName(d)} ${formatDate(d)}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                <Plus className="size-4" aria-hidden />
              </Link>
            </div>
            {list.length === 0 ? <p className="px-1 text-xs text-muted-foreground lg:hidden">nema termina</p> : list.map((a) => <AppointmentCard key={a.id} a={a} compact />)}
          </section>
        );
      })}
    </div>
  );
}

function Day({ date, rows }: { date: string; rows: AppointmentRow[] }) {
  const shown = rows.filter((r) => r.status !== "cancelled");
  const inside = shown.filter((r) => r.startMin < DAY_END_MIN && r.startMin + r.durationMin > DAY_START_MIN);
  const outside = shown.filter((r) => !inside.includes(r));
  const cancelled = rows.filter((r) => r.status === "cancelled");
  const laid = layoutDay(inside);
  const hours = Array.from({ length: (DAY_END_MIN - DAY_START_MIN) / 60 }, (_, i) => DAY_START_MIN + i * 60);
  const height = ((DAY_END_MIN - DAY_START_MIN) / 60) * HOUR_PX;
  const y = (min: number) => ((Math.max(min, DAY_START_MIN) - DAY_START_MIN) / 60) * HOUR_PX;

  return (
    <div className="flex flex-col gap-4">
      {outside.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Van radnog vremena</p>
          {outside.map((a) => (
            <AppointmentCard key={a.id} a={a} />
          ))}
        </div>
      )}
      <div className="flex rounded-2xl border bg-card p-2">
        <div className="relative w-12 shrink-0" style={{ height }} aria-hidden>
          {hours.map((h) => (
            <span key={h} className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground tabular" style={{ top: y(h) }}>
              {formatTime(h)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }}>
          {hours.map((h) => (
            <div key={h} className="absolute inset-x-0 border-t" style={{ top: y(h) }} aria-hidden />
          ))}
          {/* slobodni polučasovi: klik otvara novi termin u tom vremenu */}
          {Array.from({ length: (DAY_END_MIN - DAY_START_MIN) / 30 }, (_, i) => DAY_START_MIN + i * 30).map((t) => (
            <Link
              key={t}
              href={`/kalendar/novi?datum=${date}&vreme=${formatTime(t)}`}
              aria-label={`Novi termin u ${formatTime(t)}`}
              className="absolute inset-x-0 rounded-md hover:bg-accent/60 focus-visible:bg-accent focus-visible:outline-none"
              style={{ top: y(t), height: HOUR_PX / 2 }}
            />
          ))}
          {laid.map((a) => (
            <Link
              key={a.id}
              href={`/kalendar/${a.id}`}
              className={cn("absolute overflow-hidden rounded-lg border border-l-4 px-2 py-1 text-xs hover:z-10 hover:ring-2 hover:ring-primary/40", statusStyle[a.status])}
              style={{
                top: y(a.startMin) + 1,
                height: Math.max(26, y(Math.min(a.startMin + a.durationMin, DAY_END_MIN)) - y(a.startMin) - 2),
                left: `calc(${(a.col / a.cols) * 100}% + 2px)`,
                width: `calc(${100 / a.cols}% - 4px)`,
              }}
            >
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold tabular">{formatTime(a.startMin)}</span>
                {a.vehicle?.plate && <PlateBadge plate={a.vehicle.plate} size="sm" className="h-5 text-[0.7rem]" />}
                <span className="font-medium">{a.reason}</span>
              </span>
              <span className="block truncate text-muted-foreground">
                {who(a)} · {formatDuration(a.durationMin)}
              </span>
            </Link>
          ))}
        </div>
      </div>
      {cancelled.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Otkazani</p>
          {cancelled.map((a) => (
            <AppointmentCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}
