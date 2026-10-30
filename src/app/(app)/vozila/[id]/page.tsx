import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, BellRing, CalendarDays, CalendarPlus, Camera, Pencil, Phone, Plus, Share2, UserRound, UserRoundPen, Wrench } from "lucide-react";
import { PlateBadge } from "@/components/plate-badge";
import { KmChart } from "@/components/km-chart";
import { CopyButton } from "@/components/copy-button";
import { Notice } from "@/components/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { daysBetween, formatDate, todayIso, addMonths } from "@/domain/dates";
import { FUEL_LABELS } from "@/domain/model";
import { formatPhone, telHref } from "@/domain/phone";
import { formatPlate } from "@/domain/plate";
import { getVehicleCard } from "@/server/vehicles";
import { ordersForVehicle } from "@/server/orders";
import { remindersForVehicle } from "@/server/reminders";
import { photosForVehicle } from "@/server/files";
import { OrderHistory } from "@/components/order-history";
import { ReminderList } from "@/components/reminder-list";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { ReminderForm } from "./reminder-form";
import { upcomingForVehicle } from "@/server/appointments";
import { dayName, formatTime } from "@/domain/appointments";
import { archiveVehicle } from "../actions";
import { DeleteDialog } from "@/components/delete-dialog";
import { deletionImpact } from "@/server/deletion";
import { ReadingForm } from "./reading-form";
import { DeleteReadingButton } from "./delete-reading-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = await getVehicleCard((await params).id);
  if (!c) return { title: "Vozilo" };
  return { title: [c.vehicle.plate && formatPlate(c.vehicle.plate), c.vehicle.make, c.vehicle.model].filter(Boolean).join(" ") };
}

const km = (n: number) => `${n.toLocaleString("sr-Latn-RS")} km`;

function RegistrationBadge({ date }: { date?: string }) {
  if (!date) return null;
  const left = daysBetween(todayIso(), date);
  if (left < 0) return <Badge variant="destructive">Registracija istekla {formatDate(date)}</Badge>;
  if (left <= 30) return <Badge className="bg-warning text-warning-foreground">Registracija ističe {formatDate(date)}</Badge>;
  return <Badge variant="secondary">Registracija do {formatDate(date)}</Badge>;
}

export default async function KartonVozilaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [card, history, reminders, photos, upcoming, impact] = await Promise.all([getVehicleCard(id), ordersForVehicle(id), remindersForVehicle(id), photosForVehicle(id), upcomingForVehicle(id), deletionImpact("vehicle", id)]);
  if (!card) notFound();
  const { vehicle: v, owner, ownerships, readings, trend, kmInYear } = card;
  const last = readings[0];
  const title = [v.make, v.model, v.year].filter(Boolean).join(" ");
  const details: [string, string | undefined][] = [
    ["Marka i model", [v.make, v.model].filter(Boolean).join(" ")],
    ["Godište", v.year?.toString()],
    ["Gorivo", v.fuel && FUEL_LABELS[v.fuel]],
    ["Motor", v.engine],
    ["Snaga", v.powerKw ? `${v.powerKw} kW` : undefined],
    ["Boja", v.color],
    ["Registracija ističe", v.registrationExpires && formatDate(v.registrationExpires)],
  ];

  return (
    <>
      {v.archivedAt && (
        <Notice variant="warning" title="Vozilo je arhivirano" className="mb-4" />
      )}

      {/* zaglavlje */}
      <section className="mb-6 rounded-2xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-3">
            <PlateBadge plate={v.plate} vin={v.plate ? undefined : v.vin} size="lg" className="w-fit" />
            <div>
              <h1 className="text-2xl font-bold lg:text-3xl">{title}</h1>
              <p className="text-muted-foreground">{[v.engine, v.powerKw && `${v.powerKw} kW`, v.fuel && FUEL_LABELS[v.fuel], v.color].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <RegistrationBadge date={v.registrationExpires} />
              {last && <Badge variant="secondary" className="tabular">{km(last.km)}</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!v.archivedAt && (
              <Button asChild size="xl">
                <Link href={`/nalozi/novi?vozilo=${v.id}`}>
                  <Plus aria-hidden />
                  Novi nalog
                </Link>
              </Button>
            )}
            {!v.archivedAt && (
              <Button asChild variant="outline" size="xl">
                <Link href={`/kalendar/novi?vozilo=${v.id}`}>
                  <CalendarPlus aria-hidden />
                  Zakaži
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="xl">
              <Link href={`/vozila/${v.id}/podeli`}>
                <Share2 aria-hidden />
                Podeli
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href={`/vozila/${v.id}/uredi`}>
                <Pencil aria-hidden />
                Izmeni
              </Link>
            </Button>
          </div>
        </div>

        {v.vin && (
          <div className="mt-4 flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">VIN</span>
            <span className="ml-2 font-mono tracking-wide">{v.vin}</span>
            <CopyButton text={v.vin} label="Kopiraj VIN" />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
          <UserRound className="size-5 text-muted-foreground" aria-hidden />
          {owner ? (
            <>
              <Link href={`/klijenti/${owner.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">
                {owner.name}
              </Link>
              {owner.phones[0] && (
                <a href={telHref(owner.phones[0].e164)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 font-medium text-accent-foreground tabular">
                  <Phone className="size-4" aria-hidden />
                  {formatPhone(owner.phones[0].e164)}
                </a>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">Bez poznatog vlasnika</span>
          )}
          <Button asChild variant="ghost" className="ml-auto">
            <Link href={`/vozila/${v.id}/vlasnik`}>
              <UserRoundPen aria-hidden />
              {owner ? "Promeni vlasnika" : "Dodaj vlasnika"}
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* kilometraža */}
          <section aria-labelledby="km" className="rounded-2xl border bg-card p-4 sm:p-6">
            <h2 id="km" className="mb-4 text-lg font-semibold">
              Kilometraža
            </h2>
            {last ? (
              <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2">
                <div>
                  <p className="text-3xl font-bold tabular">{km(last.km)}</p>
                  <p className="text-sm text-muted-foreground">poslednji upis {formatDate(last.date)}</p>
                </div>
                {trend && (
                  <div>
                    <p className="text-3xl font-bold tabular">≈ {trend.kmPerMonth.toLocaleString("sr-Latn-RS")}</p>
                    <p className="text-sm text-muted-foreground">km mesečno</p>
                  </div>
                )}
                {kmInYear && (
                  <div>
                    <p className="text-3xl font-bold tabular">≈ {km(kmInYear)}</p>
                    <p className="text-sm text-muted-foreground">za godinu dana</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="mb-4 text-muted-foreground">Još nema upisa kilometraže.</p>
            )}
            {readings.length >= 2 && (
              <div className="mb-4">
                <KmChart readings={readings} projection={trend && kmInYear ? { date: addMonths(todayIso(), 12), km: kmInYear } : null} />
              </div>
            )}
            <ReadingForm vehicleId={v.id} />
            {readings.length > 0 && (
              <details className="mt-4 group">
                <summary className="cursor-pointer text-sm font-medium text-primary">Svi upisi ({readings.length})</summary>
                <ul className="mt-2 divide-y">
                  {readings.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="w-24 text-muted-foreground tabular">{formatDate(r.date)}</span>
                      <span className="flex-1 font-medium tabular">{km(r.km)}</span>
                      <span className="text-muted-foreground">{r.source === "order" ? "nalog" : r.note || "ručno"}</span>
                      <DeleteReadingButton vehicleId={v.id} readingId={r.id} label={`${formatDate(r.date)} ${km(r.km)}`} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          {/* istorija popravki */}
          <section aria-labelledby="istorija" className="rounded-2xl border bg-card p-4 sm:p-6">
            <h2 id="istorija" className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Wrench className="size-5 text-muted-foreground" aria-hidden />
              Istorija popravki {history.length > 0 && <span className="text-sm font-normal text-muted-foreground">({history.length})</span>}
            </h2>
            <OrderHistory orders={history} empty="Još nema naloga za ovo vozilo." />
          </section>

          {photos.length > 0 && (
            <section aria-labelledby="galerija" className="rounded-2xl border bg-card p-4 sm:p-6">
              <h2 id="galerija" className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Camera className="size-5 text-muted-foreground" aria-hidden />
                Galerija <span className="text-sm font-normal text-muted-foreground">({photos.length})</span>
              </h2>
              <PhotoGrid photos={photos.map((p) => ({ id: p.id, category: p.category, caption: [p.orderNumber, p.orderDate && formatDate(p.orderDate)].filter(Boolean).join(" · ") }))} />
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          {upcoming.length > 0 && (
            <section aria-labelledby="termini" className="rounded-2xl border border-primary/30 bg-accent/40 p-4 sm:p-5">
              <h2 id="termini" className="mb-2 flex items-center gap-2 font-semibold">
                <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
                Zakazano
              </h2>
              <ul className="flex flex-col gap-1 text-sm">
                {upcoming.map((a) => (
                  <li key={a.id}>
                    <Link href={`/kalendar/${a.id}`} className="font-medium text-primary">
                      {dayName(a.date, true)} {formatDate(a.date)} u {formatTime(a.startMin)}
                    </Link>{" "}
                    · {a.reason}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="podsetnici" className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 id="podsetnici" className="mb-3 flex items-center gap-2 font-semibold">
              <BellRing className="size-4 text-muted-foreground" aria-hidden />
              Sledeći servisi
            </h2>
            {reminders.open.length > 0 ? (
              <ReminderList reminders={reminders.open} />
            ) : (
              <p className="mb-3 text-sm text-muted-foreground">Nema otvorenih podsetnika.</p>
            )}
            <div className="mt-3 flex flex-col">
              <ReminderForm vehicleId={v.id} />
            </div>
          </section>

          <section aria-labelledby="podaci" className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 id="podaci" className="mb-3 font-semibold">
              Podaci
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {details.filter(([, value]) => value).map(([k, value]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {v.note && <p className="mt-3 border-t pt-3 text-sm whitespace-pre-line text-muted-foreground">{v.note}</p>}
          </section>

          <section aria-labelledby="vlasnici" className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 id="vlasnici" className="mb-3 font-semibold">
              Vlasnici
            </h2>
            {ownerships.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nema podataka o vlasništvu.</p>
            ) : (
              <ol className="flex flex-col gap-3 text-sm">
                {ownerships.map((o) => (
                  <li key={o.id} className="flex flex-col">
                    {o.customer ? (
                      <Link href={`/klijenti/${o.customer.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                        {o.customer.name}
                      </Link>
                    ) : (
                      <span className="font-medium">Nepoznat klijent</span>
                    )}
                    <span className="text-muted-foreground tabular">
                      od {formatDate(o.validFrom)} {o.validTo ? `do ${formatDate(o.validTo)}` : "· trenutni"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <form action={archiveVehicle}>
            <input type="hidden" name="id" value={v.id} />
            <input type="hidden" name="archived" value={v.archivedAt ? "0" : "1"} />
            <Button type="submit" variant="ghost" className="w-full justify-start text-muted-foreground">
              {v.archivedAt ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
              {v.archivedAt ? "Vrati vozilo iz arhive" : "Arhiviraj vozilo (otpisano, prodato van servisa)"}
            </Button>
          </form>
          {impact && (
            <DeleteDialog
              kind="vehicle"
              id={v.id}
              what={`vozilo ${[v.plate ? formatPlate(v.plate) : undefined, v.make, v.model].filter(Boolean).join(" ")}`}
              label="Obriši vozilo (pogrešan unos)"
              impact={impact}
              size="default"
              className="w-full justify-start"
            />
          )}
        </aside>
      </div>
    </>
  );
}
