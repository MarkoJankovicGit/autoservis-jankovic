import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SHOP, isPlaceholder } from "@/config/shop";
import { addDays, formatDate, todayIso } from "@/domain/dates";
import { formatMoney, formatQuantity } from "@/domain/money";
import { ITEM_KIND_LABELS, ITEM_KIND_TOTAL_LABELS, itemTotal } from "@/domain/orders";
import { formatPhone } from "@/domain/phone";
import { formatPlate } from "@/domain/plate";
import { describeTarget } from "@/domain/reminders";
import { getOrder } from "@/server/orders";
import { PrintToolbar } from "../../../print-toolbar";

const TYPES = {
  predracun: "Predračun",
  "radni-nalog": "Radni nalog",
} as const;
type DocType = keyof typeof TYPES;

export async function generateMetadata({ params }: { params: Promise<{ id: string; tip: string }> }): Promise<Metadata> {
  const { id, tip } = await params;
  const d = await getOrder(id);
  const t = TYPES[tip as DocType];
  return { title: d && t ? `${t} ${d.order.number}` : "Dokument" };
}

const m = (p: number) => formatMoney(p);

export default async function DokumentPage({ params }: { params: Promise<{ id: string; tip: string }> }) {
  const { id, tip } = await params;
  if (!(tip in TYPES)) notFound();
  const type = tip as DocType;
  const d = await getOrder(id);
  if (!d) notFound();
  const { order: o, vehicle: v, customer: c, items, totals, createdReminders } = d;
  const title = TYPES[type];
  const issued = type === "predracun" ? todayIso() : (o.completedDate ?? todayIso());
  const shopLines = [SHOP.address, SHOP.city, `Tel. ${SHOP.phone}`, `PIB ${SHOP.taxId} · MB ${SHOP.registrationNo}`, `Račun ${SHOP.bankAccount}`];
  const placeholders = Object.values(SHOP).filter((x) => typeof x === "string" && isPlaceholder(x));

  return (
    <>
      <PrintToolbar
        backHref={`/nalozi/${o.id}`}
        warning={placeholders.length ? `Podaci radnje još nisu uneti (${placeholders.join(", ")}). Zamenjuju se u podešavanjima pre slanja dokumenata mušterijama.` : undefined}
      />
      <article className="doc-page text-[13px] leading-snug">
        {/* zaglavlje */}
        <header className="flex items-start justify-between gap-6 border-b pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- statičan SVG logo za štampu */}
          <img src="/brand/logo-light.svg" alt={SHOP.legalName} className="h-auto w-[52mm]" />
          <div className="text-right text-[12px] text-[var(--muted-foreground)]">
            <p className="text-[14px] font-semibold text-[var(--foreground)]">{SHOP.legalName}</p>
            {shopLines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
        </header>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
          <h1 className="font-heading text-[22px] font-bold tracking-tight uppercase">
            {title} <span className="tabular">br. {o.number}</span>
          </h1>
          <p className="tabular">
            Datum: {formatDate(issued)}
            {type === "predracun" && <> · Važi do: {formatDate(addDays(issued, SHOP.estimateValidDays))}</>}
          </p>
        </div>

        <section className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded border p-3">
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Klijent</p>
            <p className="font-semibold">{c?.name}</p>
            {c?.address && <p>{c.address}</p>}
            {c?.phones[0] && <p className="tabular">{formatPhone(c.phones[0].e164)}</p>}
            {c?.taxId && <p className="tabular">PIB {c.taxId}</p>}
          </div>
          <div className="rounded border p-3">
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Vozilo</p>
            <p className="font-semibold">
              {v.plate ? formatPlate(v.plate) : "bez tablica"} · {[v.make, v.model, v.year].filter(Boolean).join(" ")}
            </p>
            {v.vin && <p className="font-mono text-[12px]">VIN {v.vin}</p>}
            <p className="tabular">
              Kilometraža: {(type === "radni-nalog" ? (o.kmOut ?? o.kmIn) : o.kmIn)?.toLocaleString("sr-Latn-RS") ?? "—"} km
              {o.receivedDate && <> · Primljeno {formatDate(o.receivedDate)}</>}
            </p>
          </div>
        </section>

        <section className="mt-4">
          <p className="text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Prijavljeno</p>
          <p className="whitespace-pre-line">{o.complaint}</p>
        </section>

        {/* stavke */}
        <table className="doc-table mt-4 w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-y bg-neutral-100 text-left text-[11px] tracking-wide uppercase">
              <th className="w-8 px-2 py-1.5">Rb.</th>
              <th className="px-2 py-1.5">Naziv</th>
              <th className="px-2 py-1.5 text-right">Kol.</th>
              <th className="px-2 py-1.5">J.m.</th>
              <th className="px-2 py-1.5 text-right">Cena</th>
              {totals.discount > 0 && <th className="px-2 py-1.5 text-right">Popust</th>}
              <th className="px-2 py-1.5 text-right">Iznos</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-3 text-center text-[var(--muted-foreground)]">
                  Nema stavki.
                </td>
              </tr>
            )}
            {items.map((i, n) => (
              <tr key={i.id} className="border-b align-top">
                <td className="px-2 py-1.5 tabular">{n + 1}.</td>
                <td className="px-2 py-1.5">
                  {i.name}
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    {" "}
                    · {ITEM_KIND_LABELS[i.kind].toLowerCase()}
                    {i.partNumber && <span className="font-mono"> · {i.partNumber}</span>}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right tabular">{formatQuantity(i.qtyMilli)}</td>
                <td className="px-2 py-1.5">{i.unit}</td>
                <td className="px-2 py-1.5 text-right tabular">{formatMoney(i.unitPrice, { currency: false })}</td>
                {totals.discount > 0 && <td className="px-2 py-1.5 text-right tabular">{i.discountBp ? `${String(i.discountBp / 100).replace(".", ",")} %` : ""}</td>}
                <td className="px-2 py-1.5 text-right font-medium tabular">{formatMoney(itemTotal(i), { currency: false })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 ml-auto w-[80mm] max-w-full text-[13px] tabular">
          {(["labor", "part", "material"] as const).filter((k) => totals.byKind[k]).map((k) => (
            <div key={k} className="flex justify-between py-0.5">
              <span className="text-[var(--muted-foreground)]">{ITEM_KIND_TOTAL_LABELS[k]}</span>
              <span>{m(totals.byKind[k])}</span>
            </div>
          ))}
          {totals.discount > 0 && (
            <div className="flex justify-between py-0.5">
              <span className="text-[var(--muted-foreground)]">Odobren popust</span>
              <span>−{m(totals.discount)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t-2 border-[var(--foreground)] pt-1.5 text-[16px] font-bold">
            <span>Ukupno</span>
            <span>{m(totals.total)}</span>
          </div>
        </div>

        {type === "radni-nalog" && o.workDone && (
          <section className="mt-5">
            <p className="text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Urađeno</p>
            <p className="whitespace-pre-line">{o.workDone}</p>
          </section>
        )}
        {type === "radni-nalog" && createdReminders.length > 0 && (
          <section className="mt-4 rounded border p-3">
            <p className="text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Preporuka za sledeći servis</p>
            <ul>
              {createdReminders.map((r) => (
                <li key={r.id}>
                  {r.title}: <span className="tabular">{describeTarget(r, formatDate)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-6 text-[11.5px] text-[var(--muted-foreground)]">
          {type === "predracun" && <p>Cene su informativne. Konačan iznos se utvrđuje po završetku radova; dodatni radovi samo uz saglasnost klijenta.</p>}
          {type === "radni-nalog" && (
            <div className="mt-12 grid grid-cols-2 gap-10 text-[12px] text-[var(--foreground)]">
              <p className="border-t pt-1">{o.status === "done" ? "Vozilo preuzeo (klijent)" : "Vozilo predao (klijent)"}</p>
              <p className="border-t pt-1">Za servis</p>
            </div>
          )}
        </footer>
      </article>
    </>
  );
}
