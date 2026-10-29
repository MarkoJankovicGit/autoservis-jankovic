import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleSlash, ClipboardList, FileText, Mail, Pencil, Phone, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlateBadge } from "@/components/plate-badge";
import { CopyButton } from "@/components/copy-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Button } from "@/components/ui/button";
import { SHOP } from "@/config/shop";
import { formatDate, formatDateTime } from "@/domain/dates";
import { FUEL_LABELS } from "@/domain/model";
import { formatQuantity } from "@/domain/money";
import { PARTS_ORDER_STATUS_LABELS } from "@/domain/parts-orders";
import { formatPhone, telHref } from "@/domain/phone";
import { getPartsOrder } from "@/server/parts-orders";
import { abortPartsOrder, sendPartsOrder } from "../../actions";
import { SharePanel } from "./share-panel";
import { ReceiveForm } from "./receive-form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await getPartsOrder((await params).id);
  return { title: p ? `Narudžbenica ${p.number}` : "Narudžbenica" };
}

const statusCls: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-warning/12 text-warning",
  partial: "bg-warning/12 text-warning",
  received: "bg-success/12 text-success",
  cancelled: "bg-muted text-muted-foreground",
};

export default async function NarudzbenicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPartsOrder(id);
  if (!p) notFound();
  const v = p.vehicle;
  const editable = p.status !== "received" && p.status !== "cancelled" && !p.lines.some((l) => l.receivedMilli > 0);
  const receivable = p.status === "sent" || p.status === "partial" || p.status === "draft";

  return (
    <>
      <section className="mb-6 rounded-2xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tabular lg:text-3xl">Narudžbenica {p.number}</h1>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusCls[p.status])}>{PARTS_ORDER_STATUS_LABELS[p.status]}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Napravljena {formatDate(p.createdAt.slice(0, 10))}
              {p.sentAt && ` · poslata ${formatDateTime(p.sentAt)}`}
              {p.neededBy && (
                <>
                  {" "}
                  · <span className="font-semibold text-foreground">treba do {formatDate(p.neededBy)}</span>
                </>
              )}
            </p>
            {p.orderNumber && (
              <Link href={`/nalozi/${p.orderId}`} className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary">
                <ClipboardList className="size-4" aria-hidden />
                Nalog {p.orderNumber}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="xl">
              <Link href={`/dokumenti/narudzbenica/${p.id}`} target="_blank">
                <FileText aria-hidden />
                PDF / štampa
              </Link>
            </Button>
            {editable && (
              <Button asChild variant="outline" size="xl">
                <Link href={`/dobavljaci/narudzbenice/${p.id}/uredi`}>
                  <Pencil aria-hidden />
                  Izmeni
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Dobavljač</p>
            {p.supplier ? (
              <>
                <Link href={`/dobavljaci/${p.supplier.id}`} className="font-semibold text-primary">
                  {p.supplier.name}
                </Link>
                <div className="mt-1 flex flex-wrap gap-2">
                  {p.supplier.phone && (
                    <a href={telHref(p.supplier.phone)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground tabular">
                      <Phone className="size-4" aria-hidden />
                      {formatPhone(p.supplier.phone)}
                    </a>
                  )}
                  {p.supplier.email && (
                    <a href={`mailto:${p.supplier.email}`} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground">
                      <Mail className="size-4" aria-hidden />
                      {p.supplier.email}
                    </a>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Nije izabran</p>
            )}
          </div>
          {v && (
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Vozilo</p>
              <div className="flex flex-wrap items-center gap-2">
                <PlateBadge plate={v.plate} vin={v.plate ? undefined : v.vin} size="sm" />
                <span className="font-semibold">{[v.make, v.model, v.year].filter(Boolean).join(" ")}</span>
              </div>
              <p className="text-sm text-muted-foreground">{[v.engine, v.fuel && FUEL_LABELS[v.fuel]].filter(Boolean).join(" · ")}</p>
              {v.vin && (
                <p className="flex items-center gap-1 text-sm">
                  <span className="font-mono">VIN {v.vin}</span>
                  <CopyButton text={v.vin} label="Kopiraj VIN" />
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="delovi" className="rounded-2xl border bg-card p-4 sm:p-6">
            <h2 id="delovi" className="mb-3 text-lg font-semibold">
              Delovi
            </h2>
            <ul className="divide-y rounded-xl border">
              {p.lines.map((l) => (
                <li key={l.id} className="flex items-start gap-3 px-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{l.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {l.partNumber && <span className="font-mono">{l.partNumber}</span>}
                      {l.partNumber && l.note && " · "}
                      {l.note}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm tabular">
                    <span className="block font-semibold">{formatQuantity(l.qtyMilli)} kom</span>
                    {l.receivedMilli > 0 && <span className={cn("block text-xs", l.receivedMilli >= l.qtyMilli ? "text-success" : "text-warning")}>stiglo {formatQuantity(l.receivedMilli)}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {p.note && <p className="mt-3 text-sm whitespace-pre-line text-muted-foreground">{p.note}</p>}
          </section>

          {receivable && (
            <section aria-labelledby="prijem" className="rounded-2xl border bg-card p-4 sm:p-6">
              <h2 id="prijem" className="mb-3 text-lg font-semibold">
                Prijem robe
              </h2>
              <ReceiveForm id={p.id} orderId={p.orderId} orderOpen={p.orderStatus === "open"} orderNumber={p.orderNumber} hasSupplier={!!p.supplier} lines={p.lines} />
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <section aria-labelledby="slanje" className="rounded-2xl border bg-card p-4 sm:p-5">
            <h2 id="slanje" className="mb-3 flex items-center gap-2 font-semibold">
              <Send className="size-4 text-muted-foreground" aria-hidden />
              Slanje dobavljaču
            </h2>
            <SharePanel
              id={p.id}
              number={p.number}
              shopName={SHOP.legalName}
              supplierEmail={p.supplier?.email}
              hasLink={!!p.shareTokenHash}
              opens={p.shareOpens}
              lastOpenedAt={p.shareLastOpenedAt}
              cancelled={p.status === "cancelled"}
            />
            {p.status === "draft" && (
              <form action={sendPartsOrder} className="mt-3 border-t pt-3">
                <input type="hidden" name="id" value={p.id} />
                <Button type="submit" variant="outline" className="w-full justify-start">
                  <Send aria-hidden />
                  Poslato telefonom / PDF-om
                </Button>
              </form>
            )}
          </section>
          {p.status !== "received" && p.status !== "cancelled" && (
            <form action={abortPartsOrder}>
              <input type="hidden" name="id" value={p.id} />
              <ConfirmSubmit message={`Otkazati narudžbenicu ${p.number}? Link za dobavljača prestaje da važi.`}>
                <Button type="submit" variant="ghost" className="text-muted-foreground">
                  <CircleSlash aria-hidden />
                  Otkaži narudžbenicu
                </Button>
              </ConfirmSubmit>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}
