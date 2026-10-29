import { SHOP, isPlaceholder } from "@/config/shop";
import { formatDate } from "@/domain/dates";
import { FUEL_LABELS, type Fuel } from "@/domain/model";
import { formatQuantity } from "@/domain/money";

export type SheetData = {
  number: string;
  createdDate: string;
  neededBy?: string;
  note?: string;
  supplierName?: string;
  vehicle?: { make: string; model?: string; year?: number; vin?: string; engine?: string; powerKw?: number; fuel?: Fuel };
  lines: { name: string; qtyMilli: number; note?: string }[];
};

/**
 * Narudžbenica za prodavca delova (javni link i PDF): podaci auta koji mu trebaju da nađe deo
 * i spisak delova po nazivu. Namerno bez mušterije, tablice i cena.
 */
export function PartsOrderSheet({ d }: { d: SheetData }) {
  const v = d.vehicle;
  const car: [string, string | undefined][] = v
    ? [
        ["Vozilo", [v.make, v.model].filter(Boolean).join(" ")],
        ["Godište", v.year?.toString()],
        ["Motor", v.engine],
        ["Snaga", v.powerKw ? `${v.powerKw} kW` : undefined],
        ["Gorivo", v.fuel && FUEL_LABELS[v.fuel]],
      ]
    : [];
  return (
    <div className="text-[13px] leading-snug text-neutral-900">
      <header className="flex items-start justify-between gap-6 border-b pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- statičan SVG logo za štampu */}
        <img src="/brand/logo-light.svg" alt={SHOP.legalName} className="h-auto w-[44mm] max-w-[45%]" />
        <div className="text-right text-[12px] text-neutral-600">
          <p className="text-[14px] font-semibold text-neutral-900">{SHOP.legalName}</p>
          {!isPlaceholder(SHOP.address) && (
            <p>
              {SHOP.address}
              {!isPlaceholder(SHOP.city) && `, ${SHOP.city}`}
            </p>
          )}
          {!isPlaceholder(SHOP.phone) && <p>Tel. {SHOP.phone}</p>}
        </div>
      </header>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-heading text-[20px] font-bold tracking-tight uppercase">
          Narudžbenica <span className="tabular">{d.number}</span>
        </h1>
        <p className="tabular">{formatDate(d.createdDate)}</p>
      </div>
      {d.supplierName && (
        <p className="mt-1">
          Za: <span className="font-semibold">{d.supplierName}</span>
        </p>
      )}
      {d.neededBy && <p className="mt-3 inline-block rounded border-2 border-neutral-900 px-3 py-1.5 text-[15px] font-bold">Potrebno do: {formatDate(d.neededBy)}</p>}

      {v && (
        <section className="mt-4 rounded border p-3">
          <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-[14px]">
            {car
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-neutral-500">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            <dt className="text-neutral-500">VIN</dt>
            <dd className="font-mono text-[16px] font-semibold tracking-wide">{v.vin ?? "—"}</dd>
          </dl>
        </section>
      )}

      <table className="doc-table mt-4 w-full border-collapse text-[14px]">
        <thead>
          <tr className="border-y bg-neutral-100 text-left text-[11px] tracking-wide uppercase">
            <th className="w-8 px-2 py-1.5">Rb.</th>
            <th className="px-2 py-1.5">Deo</th>
            <th className="w-16 px-2 py-1.5 text-right">Kol.</th>
          </tr>
        </thead>
        <tbody>
          {d.lines.map((l, i) => (
            <tr key={i} className="border-b align-top">
              <td className="px-2 py-2 tabular">{i + 1}.</td>
              <td className="px-2 py-2">
                <span className="font-medium">{l.name}</span>
                {l.note && <span className="block text-[12px] text-neutral-600">{l.note}</span>}
              </td>
              <td className="px-2 py-2 text-right font-semibold tabular">{formatQuantity(l.qtyMilli)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {d.note && <p className="mt-4 whitespace-pre-line">{d.note}</p>}
    </div>
  );
}
