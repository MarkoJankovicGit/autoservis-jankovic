import type { Metadata } from "next";
import Image from "next/image";
import { BellRing, Phone } from "lucide-react";
import { SHOP, isPlaceholder } from "@/config/shop";
import { PlateBadge } from "@/components/plate-badge";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { formatDate } from "@/domain/dates";
import { formatMoney, formatQuantity } from "@/domain/money";
import { FUEL_LABELS, type SharedOrder } from "@/domain/model";
import { describeTarget } from "@/domain/reminders";
import { hasSession } from "@/server/auth/guard";
import { getPublicShare } from "@/server/shares";

// bez dinamičkog naslova: učitavanje broji otvaranje linka, pa se podaci čitaju samo jednom
export const metadata: Metadata = { title: "Karton vozila", robots: { index: false, follow: false } };

const km = (n: number) => `${n.toLocaleString("sr-Latn-RS")} km`;
const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;

function Header() {
  const phone = !isPlaceholder(SHOP.phone) ? SHOP.phone : null;
  return (
    <header className="bg-brand-charcoal">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">
        <Image src="/brand/logo-on-dark.svg" alt={SHOP.legalName} width={996} height={376} priority unoptimized className="h-auto w-36 sm:w-44" />
        {phone && (
          <a href={telHref(phone)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground">
            <Phone className="size-5" aria-hidden />
            Pozovi servis
          </a>
        )}
      </div>
    </header>
  );
}

function Items({ title, items, prices }: { title: string; items: SharedOrder["items"]; prices: boolean }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">{title}</p>
      <ul className="divide-y rounded-lg border">
        {items.map((i, n) => (
          <li key={n} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
            <span className="min-w-0">
              {i.name}
              <span className="ml-2 text-muted-foreground tabular">
                {formatQuantity(i.qtyMilli)} {i.unit}
              </span>
            </span>
            {prices && i.total !== undefined && <span className="shrink-0 font-medium tabular">{formatMoney(i.total)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Order({ o, prices, photoBase }: { o: SharedOrder; prices: boolean; photoBase: string }) {
  const done = o.status === "done";
  return (
    <article className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground tabular">Nalog {o.number}</p>
          <h3 className="text-lg font-semibold tabular">{formatDate(done ? (o.completedDate ?? o.receivedDate) : o.receivedDate)}</h3>
        </div>
        <span className={done ? "rounded-full bg-success/12 px-2.5 py-1 text-xs font-semibold text-success" : "rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning"}>
          {done ? "Završeno" : "U radu"}
        </span>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
        <dt className="text-muted-foreground">Razlog dolaska</dt>
        <dd className="-mt-2 font-medium sm:mt-0">{o.complaint}</dd>
        {o.workDone && (
          <>
            <dt className="text-muted-foreground">Urađeno</dt>
            <dd className="-mt-2 whitespace-pre-line sm:mt-0">{o.workDone}</dd>
          </>
        )}
        {o.km !== undefined && (
          <>
            <dt className="text-muted-foreground">Kilometraža</dt>
            <dd className="-mt-2 tabular sm:mt-0">{km(o.km)}</dd>
          </>
        )}
      </dl>
      <Items title="Radovi" items={o.items.filter((i) => i.kind === "labor")} prices={prices} />
      <Items title="Delovi i materijal" items={o.items.filter((i) => i.kind !== "labor")} prices={prices} />
      {prices && o.total !== undefined && (
        <p className="flex items-baseline justify-between border-t pt-3">
          <span className="font-semibold">Ukupno</span>
          <span className="text-lg font-bold tabular">{formatMoney(o.total)}</span>
        </p>
      )}
      {o.photos.length > 0 && <PhotoGrid photos={o.photos} basePath={photoBase} />}
    </article>
  );
}

/** Javni karton za mušteriju: bez prijave, samo ono što je majstor izabrao pri deljenju. */
export default async function JavniKartonPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // pregled prijavljenog majstora se ne broji kao otvaranje
  const d = await getPublicShare(token, { count: !(await hasSession()) });

  if (!d) {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <main className="mx-auto max-w-md px-4 py-10 text-center">
          <h1 className="text-lg font-semibold">Link nije aktivan</h1>
          <p className="mt-2 text-muted-foreground">Link je istekao ili ga je servis ugasio. Za novi pregled kontaktirajte servis.</p>
          <p className="mt-4 font-semibold">{SHOP.legalName}</p>
          {!isPlaceholder(SHOP.phone) && <p className="text-muted-foreground">Tel. {SHOP.phone}</p>}
        </main>
      </div>
    );
  }

  const { snapshot: s } = d;
  const v = s.vehicle;
  const photoBase = `/k/${token}/foto`;
  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:p-5">
          <PlateBadge plate={v.plate} size="lg" className="w-fit" />
          <div>
            <h1 className="text-2xl font-bold">{[v.make, v.model, v.year].filter(Boolean).join(" ")}</h1>
            {(v.engine || v.fuel) && <p className="text-muted-foreground">{[v.engine, v.fuel && FUEL_LABELS[v.fuel]].filter(Boolean).join(" · ")}</p>}
          </div>
        </section>

        {s.reminders && s.reminders.length > 0 && (
          <section aria-labelledby="sledeci" className="rounded-2xl border border-primary/30 bg-accent/40 p-4 sm:p-5">
            <h2 id="sledeci" className="mb-2 flex items-center gap-2 font-semibold">
              <BellRing className="size-4 text-muted-foreground" aria-hidden />
              Sledeći servis
            </h2>
            <ul className="flex flex-col gap-1 text-sm">
              {s.reminders.map((r, n) => (
                <li key={n}>
                  <span className="font-medium">{r.title}</span>
                  {(r.dueDate || r.dueKm !== undefined) && (
                    <span className="text-muted-foreground tabular">
                      : do {describeTarget(r, formatDate)}
                      {r.dueDate && r.dueKm !== undefined && ", šta pre nastupi"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {s.orders.length > 0 && (
          <section aria-labelledby="radovi" className="flex flex-col gap-3">
            <h2 id="radovi" className="mt-2 text-lg font-semibold">
              {s.orders.length === 1 ? "Radovi na vozilu" : "Istorija radova"}
            </h2>
            {s.orders.map((o) => (
              <Order key={o.id} o={o} prices={s.showPrices} photoBase={photoBase} />
            ))}
          </section>
        )}

        <footer className="mt-4 border-t pt-4 text-sm text-muted-foreground">
          <p>
            Pregled je pripremio {SHOP.legalName}, {formatDate(d.sharedDate)} Link važi do {formatDate(d.expiresAt)}
          </p>
          {!isPlaceholder(SHOP.address) && (
            <p>
              {SHOP.address}
              {!isPlaceholder(SHOP.city) && `, ${SHOP.city}`}
            </p>
          )}
        </footer>
      </main>
    </div>
  );
}
