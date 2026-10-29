import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getPartsOrder } from "@/server/parts-orders";
import { supplierOptions } from "@/server/suppliers";
import { PartsOrderForm } from "../../parts-order-form";

export const metadata: Metadata = { title: "Izmena narudžbenice" };

export default async function UrediNarudzbenicuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [po, suppliers] = await Promise.all([getPartsOrder(id), supplierOptions()]);
  if (!po) notFound();
  if (po.lines.some((l) => l.receivedMilli > 0) || po.status === "received" || po.status === "cancelled") redirect(`/dobavljaci/narudzbenice/${id}`);
  return (
    <div className="max-w-3xl">
      <PageHeader title={`Izmena narudžbenice ${po.number}`} />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <PartsOrderForm partsOrder={po} suppliers={suppliers} cancelHref={`/dobavljaci/narudzbenice/${id}`} />
      </div>
    </div>
  );
}
