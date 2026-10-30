import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BellRing, Camera, CheckCircle2, FileText, PackageSearch, Phone, Plus, Printer, RotateCcw, Share2, UserRound, Wallet } from "lucide-react";
import { PlateBadge } from "@/components/plate-badge";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/domain/dates";
import { formatPhone, telHref } from "@/domain/phone";
import { describeTarget } from "@/domain/reminders";
import { getOrder, itemSuggestions } from "@/server/orders";
import { orderFinance } from "@/server/finance";
import { listPartsOrders } from "@/server/parts-orders";
import { PARTS_ORDER_STATUS_LABELS } from "@/domain/parts-orders";
import { PaymentPanel } from "./payment-panel";
import { reopen } from "../actions";
import { ItemsEditor } from "./items-editor";
import { TextBlock } from "./text-block";
import { CancelDialog } from "./cancel-dialog";
import { OrderPhotos } from "./order-photos";
import { plural } from "@/domain/text";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const d = await getOrder((await params).id);
  return { title: d ? `Nalog ${d.order.number}` : "Nalog" };
}

const km = (n?: number) => (n === undefined ? "—" : `${n.toLocaleString("sr-Latn-RS")} km`);

export default async function NalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novi?: string; km?: string; zavrsen?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [d, suggestions, fin, partsOrders] = await Promise.all([getOrder(id), itemSuggestions(), orderFinance(id), listPartsOrders({ orderId: id })]);
  if (!d) notFound();
  const { order: o, vehicle: v, customer: c, items, attachments, openReminders, createdReminders, closedReminders } = d;
  const open = o.status === "open";
  const photos = attachments.map((a) => ({ id: a.id, category: a.category, width: a.width, height: a.height }));

  return (
    <>
      {sp.novi && open && (
        <Notice variant="success" title={`Nalog ${o.number} je otvoren.`} className="mb-4">
          {sp.km === "nize" && "Kilometraža je manja od ranijeg upisa."}
        </Notice>
      )}
      {sp.zavrsen && o.status === "done" && <Notice variant="success" title={`Nalog ${o.number} je završen.`} className="mb-4" />}
      {o.status === "cancelled" && (
        <Notice variant="warning" title="Nalog je otkazan" className="mb-4">
          {o.cancelReason} · {o.cancelledAt && formatDateTime(o.cancelledAt)}
        </Notice>
      )}

      {/* zaglavlje */}
      <section className="mb-6 rounded-2xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tabular lg:text-3xl">Nalog {o.number}</h1>
              <OrderStatusBadge status={o.status} />
            </div>
            <Link href={`/vozila/${v.id}`} className="flex w-fit flex-wrap items-center gap-3 hover:opacity-80">
              <PlateBadge plate={v.plate} vin={v.plate ? undefined : v.vin} />
              <span className="font-semibold">{[v.make, v.model, v.year].filter(Boolean).join(" ")}</span>
            </Link>
            <p className="text-sm text-muted-foreground tabular">
              Primljeno {formatDate(o.receivedDate)} · {km(o.kmIn)}
              {o.completedDate && ` · Završeno ${formatDate(o.completedDate)}${o.kmOut !== undefined ? ` · ${km(o.kmOut)}` : ""}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {open && (
              <Button asChild size="xl">
                <Link href={`/nalozi/${o.id}/zavrsi`}>
                  <CheckCircle2 aria-hidden />
                  Završi nalog
                </Link>
              </Button>
            )}
            {o.status !== "open" && !fin.invoice && (
              <form action={reopen}>
                <input type="hidden" name="orderId" value={o.id} />
                <input type="hidden" name="vehicleId" value={v.id} />
                <Button type="submit" variant="outline" size="xl">
                  <RotateCcw aria-hidden />
                  Vrati u rad
                </Button>
              </form>
            )}
          </div>
        </div>
        {c && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
            <UserRound className="size-5 text-muted-foreground" aria-hidden />
            <Link href={`/klijenti/${c.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">
              {c.name}
            </Link>
            {c.phones[0] && (
              <a href={telHref(c.phones[0].e164)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 font-medium text-accent-foreground tabular">
                <Phone className="size-4" aria-hidden />
                {formatPhone(c.phones[0].e164)}
              </a>
            )}
            {d.owner && d.owner.id !== c.id && <span className="text-sm text-muted-foreground">vlasnik u kartonu: {d.owner.name}</span>}
          </div>
        )}
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-5 rounded-2xl border bg-card p-4 sm:p-6">
            <TextBlock orderId={o.id} field="complaint" title="Prijavljeno / šta treba uraditi" value={o.complaint} placeholder="Šta mušterija prijavljuje" />
            <TextBlock orderId={o.id} field="workDone" title="Šta je urađeno" value={o.workDone} placeholder="Zamenjene pločice i diskovi napred" empty="Još nije upisano." />
          </section>

          <section aria-labelledby="stavke" className="rounded-2xl border bg-card p-4 sm:p-6">
            <h2 id="stavke" className="mb-3 text-lg font-semibold">
              Stavke
            </h2>
            <ItemsEditor orderId={o.id} items={items} editable={open} suggestions={suggestions} />
          </section>

          <section aria-labelledby="foto" className="rounded-2xl border bg-card p-4 sm:p-6">
            <h2 id="foto" className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Camera className="size-5 text-muted-foreground" aria-hidden />
              Fotografije {photos.length > 0 && <span className="text-sm font-normal text-muted-foreground">({photos.length})</span>}
            </h2>
            <OrderPhotos orderId={o.id} photos={photos} defaultCategory={open && photos.length === 0 ? "before" : "after"} />
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section aria-labelledby="naplata" className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 id="naplata" className="mb-3 flex items-center gap-2 font-semibold">
              <Wallet className="size-4 text-muted-foreground" aria-hidden />
              Finansije
            </h2>
            <PaymentPanel
              orderId={o.id}
              orderStatus={o.status}
              total={fin.total}
              paid={fin.paid}
              status={fin.status}
              payments={fin.payments}
              costs={fin.costs}
              costTotal={fin.costTotal}
              invoice={fin.invoice && { id: fin.invoice.id, number: fin.invoice.number, issuedDate: fin.invoice.issuedDate, total: fin.invoice.total }}
            />
          </section>

          <section aria-labelledby="narudzbenice" className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 id="narudzbenice" className="mb-3 flex items-center gap-2 font-semibold">
              <PackageSearch className="size-4 text-muted-foreground" aria-hidden />
              Delovi od dobavljača
            </h2>
            {partsOrders.length > 0 && (
              <ul className="mb-3 flex flex-col gap-2 text-sm">
                {partsOrders.map((p) => (
                  <li key={p.id}>
                    <Link href={`/dobavljaci/narudzbenice/${p.id}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 hover:bg-muted/60">
                      <span className="min-w-0">
                        <span className="block font-medium tabular">{p.number}</span>
                        <span className="block truncate text-xs text-muted-foreground">{p.supplier?.name ?? "bez dobavljača"} · {p.lines.length} {plural(p.lines.length, "deo", "dela", "delova")}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold">{PARTS_ORDER_STATUS_LABELS[p.status]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {o.status !== "cancelled" && (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/dobavljaci/narudzbenice/nova?nalog=${o.id}`}>
                  <Plus aria-hidden />
                  Naruči delove
                </Link>
              </Button>
            )}
          </section>

          <section aria-labelledby="dok" className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 id="dok" className="mb-3 flex items-center gap-2 font-semibold">
              <Printer className="size-4 text-muted-foreground" aria-hidden />
              Dokumenti
            </h2>
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" className="justify-start">
                <Link href={`/dokumenti/nalog/${o.id}/predracun`} target="_blank">
                  <FileText aria-hidden />
                  Predračun
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href={`/dokumenti/nalog/${o.id}/radni-nalog`} target="_blank">
                  <FileText aria-hidden />
                  Radni nalog
                </Link>
              </Button>
            </div>
            {o.status !== "cancelled" && (
              <Button asChild variant="outline" className="mt-3 w-full justify-start">
                <Link href={`/vozila/${o.vehicleId}/podeli?nalog=${o.id}`}>
                  <Share2 aria-hidden />
                  Podeli s mušterijom
                </Link>
              </Button>
            )}
          </section>

          {(openReminders.length > 0 || createdReminders.length > 0 || closedReminders.length > 0) && (
            <section aria-labelledby="pods" className="rounded-2xl border bg-card p-4 sm:p-5">
              <h2 id="pods" className="mb-3 flex items-center gap-2 font-semibold">
                <BellRing className="size-4 text-muted-foreground" aria-hidden />
                Podsetnici
              </h2>
              {createdReminders.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Sledeći put</p>
                  <ul className="flex flex-col gap-1 text-sm">
                    {createdReminders.map((r) => (
                      <li key={r.id}>
                        <span className="font-medium">{r.title}</span> · <span className="tabular">{describeTarget(r, formatDate)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {closedReminders.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Urađeno u ovom nalogu</p>
                  <ul className="flex flex-col gap-1 text-sm">
                    {closedReminders.map((r) => (
                      <li key={r.id} className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 text-success" aria-hidden />
                        {r.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {openReminders.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Otvoreni za vozilo</p>
                  <ul className="flex flex-col gap-1 text-sm">
                    {openReminders.map((r) => (
                      <li key={r.id} className={r.due.overdue ? "font-medium text-destructive" : undefined}>
                        {r.title} · <span className="tabular">{r.due.overdue ? "prekoračen" : describeTarget(r, formatDate)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border bg-card p-4 sm:p-5">
            <TextBlock orderId={o.id} field="internalNote" title="Interna napomena" value={o.internalNote} placeholder="Vidi je samo servis; ne ide na dokumente." emphasize={!!o.internalNote} />
          </section>

          {open && (
            <div className="flex justify-start">
              <CancelDialog orderId={o.id} number={o.number} />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
