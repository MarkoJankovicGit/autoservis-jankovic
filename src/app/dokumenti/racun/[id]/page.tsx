import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SHOP, isPlaceholder } from "@/config/shop";
import { formatDate } from "@/domain/dates";
import { formatMoney, formatQuantity } from "@/domain/money";
import { ITEM_KIND_LABELS } from "@/domain/orders";
import { formatPhone } from "@/domain/phone";
import { formatPlate } from "@/domain/plate";
import { getInvoice } from "@/server/finance";
import { PrintToolbar } from "../../print-toolbar";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const inv = await getInvoice((await params).id);
  return { title: inv ? `Račun ${inv.number}` : "Račun" };
}

/** Račun (nefiskalni) iz zamrznutog snimka; kasnije izmene naloga ili klijenta ga ne menjaju. */
export default async function RacunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await getInvoice(id);
  if (!inv) notFound();
  const due = inv.total - inv.paid;
  const discount = inv.lines.some((l) => l.discountBp > 0);
  const placeholders = Object.values(SHOP).filter((x) => typeof x === "string" && isPlaceholder(x));

  return (
    <>
      <PrintToolbar
        backHref={`/nalozi/${inv.orderId}`}
        warning={[
          inv.cancelledAt ? `Račun je poništen: ${inv.cancelReason}` : null,
          placeholders.length ? `Podaci radnje još nisu uneti (${placeholders.join(", ")}).` : null,
          "Izgled računa treba da potvrdi knjigovođa pre upotrebe.",
        ]
          .filter(Boolean)
          .join(" ")}
      />
      <article className="doc-page relative text-[13px] leading-snug">
        {inv.cancelledAt && (
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="-rotate-12 rounded border-4 border-red-600/50 px-6 py-2 text-[48px] font-black tracking-widest text-red-600/40">PONIŠTEN</span>
          </div>
        )}
        <header className="flex items-start justify-between gap-6 border-b pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- statičan SVG logo za štampu */}
          <img src="/brand/logo-light.svg" alt={SHOP.legalName} className="h-auto w-[52mm]" />
          <div className="text-right text-[12px] text-[var(--muted-foreground)]">
            <p className="text-[14px] font-semibold text-[var(--foreground)]">{SHOP.legalName}</p>
            <p>{SHOP.address}, {SHOP.city}</p>
            <p>Tel. {SHOP.phone}</p>
            <p>PIB {SHOP.taxId} · MB {SHOP.registrationNo}</p>
            <p>Tekući račun {SHOP.bankAccount}</p>
          </div>
        </header>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
          <h1 className="font-heading text-[22px] font-bold tracking-tight uppercase">
            Račun <span className="tabular">br. {inv.number}</span>
          </h1>
          <p className="text-right tabular">
            Datum izdavanja: {formatDate(inv.issuedDate)}
            <br />
            Nalog: {inv.orderNumber}
          </p>
        </div>

        <section className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded border p-3">
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Kupac</p>
            <p className="font-semibold">{inv.customer.name}</p>
            {inv.customer.address && <p>{inv.customer.address}</p>}
            {inv.customer.taxId && <p className="tabular">PIB {inv.customer.taxId}</p>}
            {inv.customer.phone && <p className="tabular">{formatPhone(inv.customer.phone)}</p>}
          </div>
          <div className="rounded border p-3">
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Vozilo</p>
            <p className="font-semibold">
              {inv.vehicle.plate ? formatPlate(inv.vehicle.plate) : "bez tablica"} · {[inv.vehicle.make, inv.vehicle.model, inv.vehicle.year].filter(Boolean).join(" ")}
            </p>
            {inv.vehicle.vin && <p className="font-mono text-[12px]">VIN {inv.vehicle.vin}</p>}
            {inv.vehicle.km !== undefined && <p className="tabular">Kilometraža: {inv.vehicle.km.toLocaleString("sr-Latn-RS")} km</p>}
          </div>
        </section>

        <table className="doc-table mt-4 w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-y bg-neutral-100 text-left text-[11px] tracking-wide uppercase">
              <th className="w-8 px-2 py-1.5">Rb.</th>
              <th className="px-2 py-1.5">Naziv</th>
              <th className="px-2 py-1.5 text-right">Kol.</th>
              <th className="px-2 py-1.5">J.m.</th>
              <th className="px-2 py-1.5 text-right">Cena</th>
              {discount && <th className="px-2 py-1.5 text-right">Popust</th>}
              <th className="px-2 py-1.5 text-right">Iznos</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, n) => (
              <tr key={n} className="border-b align-top">
                <td className="px-2 py-1.5 tabular">{n + 1}.</td>
                <td className="px-2 py-1.5">
                  {l.name}
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    {" "}
                    · {ITEM_KIND_LABELS[l.kind].toLowerCase()}
                    {l.partNumber && <span className="font-mono"> · {l.partNumber}</span>}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right tabular">{formatQuantity(l.qtyMilli)}</td>
                <td className="px-2 py-1.5">{l.unit}</td>
                <td className="px-2 py-1.5 text-right tabular">{formatMoney(l.unitPrice, { currency: false })}</td>
                {discount && <td className="px-2 py-1.5 text-right tabular">{l.discountBp ? `${String(l.discountBp / 100).replace(".", ",")} %` : ""}</td>}
                <td className="px-2 py-1.5 text-right font-medium tabular">{formatMoney(l.total, { currency: false })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 ml-auto w-[80mm] max-w-full text-[13px] tabular">
          <div className="flex justify-between border-t-2 border-[var(--foreground)] pt-1.5 text-[16px] font-bold">
            <span>Za uplatu</span>
            <span>{formatMoney(inv.total)}</span>
          </div>
          {inv.paid > 0 && (
            <>
              <div className="flex justify-between py-0.5">
                <span className="text-[var(--muted-foreground)]">Plaćeno</span>
                <span>{formatMoney(Math.min(inv.paid, inv.total))}</span>
              </div>
              <div className="flex justify-between py-0.5 font-semibold">
                <span>Preostalo</span>
                <span>{formatMoney(Math.max(0, due))}</span>
              </div>
            </>
          )}
        </div>

        <footer className="mt-6 flex flex-col gap-1 text-[11.5px] text-[var(--muted-foreground)]">
          {due > 0 && (
            <p>
              Uplata na tekući račun {SHOP.bankAccount}, poziv na broj: <span className="font-semibold tabular text-[var(--foreground)]">{inv.number}</span>.
            </p>
          )}
          <p>Ovo nije fiskalni račun.</p>
          <div className="mt-12 grid grid-cols-2 gap-10 text-[12px] text-[var(--foreground)]">
            <p className="border-t pt-1">Primio (kupac)</p>
            <p className="border-t pt-1">Izdao</p>
          </div>
        </footer>
      </article>
    </>
  );
}
