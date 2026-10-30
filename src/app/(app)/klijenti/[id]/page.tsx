import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Building2, Car, Mail, MapPin, Pencil, Phone, Plus, StickyNote } from "lucide-react";
import { PlateBadge } from "@/components/plate-badge";
import { Notice } from "@/components/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/domain/dates";
import { formatPhone, telHref } from "@/domain/phone";
import { getCustomer } from "@/server/customers";
import { ordersForCustomer } from "@/server/orders";
import { customerFinance } from "@/server/finance";
import { formatMoney } from "@/domain/money";
import { OrderHistory } from "@/components/order-history";
import { archiveCustomer } from "../actions";
import { DeleteDialog } from "@/components/delete-dialog";
import { deletionImpact } from "@/server/deletion";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await getCustomer((await params).id);
  return { title: p?.customer.name ?? "Klijent" };
}

export default async function KlijentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, orders, fin, impact] = await Promise.all([getCustomer(id), ordersForCustomer(id), customerFinance(id), deletionImpact("customer", id)]);
  if (!profile || !impact) notFound();
  const { customer: c, current, former } = profile;

  return (
    <>
      {c.archivedAt && (
        <Notice variant="warning" title="Klijent je arhiviran" className="mb-4" />
      )}

      <section className="mb-6 rounded-2xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold lg:text-3xl">{c.name}</h1>
              {c.type === "company" && (
                <Badge variant="secondary" className="gap-1">
                  <Building2 className="size-3.5" aria-hidden />
                  Firma
                </Badge>
              )}
            </div>
            {c.taxId && <p className="mt-1 text-sm text-muted-foreground tabular">PIB {c.taxId}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="xl">
              <Link href={`/klijenti/${c.id}/uredi`}>
                <Pencil aria-hidden />
                Izmeni
              </Link>
            </Button>
            <form action={archiveCustomer}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="archived" value={c.archivedAt ? "0" : "1"} />
              <Button type="submit" variant="ghost" size="xl">
                {c.archivedAt ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
                {c.archivedAt ? "Vrati iz arhive" : "Arhiviraj"}
              </Button>
            </form>
            <DeleteDialog kind="customer" id={c.id} what={`klijenta ${c.name}`} impact={impact} />
          </div>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {c.phones.map((p) => (
            <div key={p.e164} className="flex items-center gap-3">
              <dt className="sr-only">Telefon</dt>
              <Phone className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <dd>
                <a href={telHref(p.e164)} className="text-lg font-medium text-primary tabular underline-offset-4 hover:underline">
                  {formatPhone(p.e164)}
                </a>
              </dd>
            </div>
          ))}
          {c.email && (
            <div className="flex items-center gap-3">
              <dt className="sr-only">Email</dt>
              <Mail className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <dd className="min-w-0 truncate">
                <a href={`mailto:${c.email}`} className="text-primary underline-offset-4 hover:underline">
                  {c.email}
                </a>
              </dd>
            </div>
          )}
          {c.address && (
            <div className="flex items-center gap-3">
              <dt className="sr-only">Adresa</dt>
              <MapPin className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <dd>{c.address}</dd>
            </div>
          )}
          {c.note && (
            <div className="flex gap-3 sm:col-span-2">
              <dt className="sr-only">Napomena</dt>
              <StickyNote className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <dd className="whitespace-pre-line text-muted-foreground">{c.note}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mb-6" aria-labelledby="vozila">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="vozila" className="text-lg font-semibold">
            Vozila
          </h2>
          {!c.archivedAt && (
            <Button asChild variant="outline">
              <Link href={`/vozila/novo?klijent=${c.id}`}>
                <Plus aria-hidden />
                Dodaj vozilo
              </Link>
            </Button>
          )}
        </div>
        {current.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card p-5 text-muted-foreground">Klijent trenutno nema vozila.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {current.map((v) => (
              <li key={v.id}>
                <Link href={`/vozila/${v.id}`} className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:border-primary/40 hover:bg-muted/40">
                  <PlateBadge plate={v.plate} vin={v.vin} />
                  <span className="min-w-0 truncate font-medium">{[v.make, v.model, v.year].filter(Boolean).join(" ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {former.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Ranija vozila</h3>
            <ul className="flex flex-col gap-2">
              {former.map((v) => (
                <li key={v.id}>
                  <Link href={`/vozila/${v.id}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground">
                    <Car className="size-4" aria-hidden />
                    <PlateBadge plate={v.plate} vin={v.vin} size="sm" />
                    {[v.make, v.model].filter(Boolean).join(" ")} · do {formatDate(v.until)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {(fin.billed > 0 || fin.paid > 0) && (
        <section aria-label="Finansije klijenta" className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Fakturisano", value: fin.billed, cls: "" },
            { label: "Plaćeno", value: fin.paid, cls: "" },
            { label: "Duguje", value: fin.owed, cls: fin.owed > 0 ? "text-destructive" : "text-success" },
          ].map((x) => (
            <div key={x.label} className="rounded-2xl border bg-card p-3 sm:p-4">
              <p className="text-xs text-muted-foreground sm:text-sm">{x.label}</p>
              <p className={`text-base font-bold tabular sm:text-2xl ${x.cls}`}>{formatMoney(x.value, { decimals: false })}</p>
            </div>
          ))}
        </section>
      )}

      <section aria-labelledby="nalozi">
        <h2 id="nalozi" className="mb-3 text-lg font-semibold">
          Nalozi {orders.length > 0 && <span className="text-sm font-normal text-muted-foreground">({orders.length})</span>}
        </h2>
        <OrderHistory orders={orders} showVehicle empty="Klijent još nema naloga." />
      </section>
    </>
  );
}
