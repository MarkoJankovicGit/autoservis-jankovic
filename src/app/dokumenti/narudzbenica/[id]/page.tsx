import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartsOrderSheet } from "@/components/parts-order-sheet";
import { getPartsOrder } from "@/server/parts-orders";
import { PrintToolbar } from "../../print-toolbar";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await getPartsOrder((await params).id);
  return { title: p ? `Narudžbenica ${p.number}` : "Narudžbenica" };
}

export default async function NarudzbenicaDokumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPartsOrder(id);
  if (!p) notFound();
  return (
    <>
      <PrintToolbar backHref={`/dobavljaci/narudzbenice/${p.id}`} backLabel="Nazad na narudžbenicu" />
      <article className="doc-page">
        <PartsOrderSheet
          d={{
            number: p.number,
            createdDate: p.createdAt.slice(0, 10),
            neededBy: p.neededBy,
            note: p.note,
            supplierName: p.supplier?.name,
            vehicle: p.vehicle && { make: p.vehicle.make, model: p.vehicle.model, year: p.vehicle.year, vin: p.vehicle.vin, engine: p.vehicle.engine, powerKw: p.vehicle.powerKw, fuel: p.vehicle.fuel },
            lines: p.lines,
          }}
        />
      </article>
    </>
  );
}
