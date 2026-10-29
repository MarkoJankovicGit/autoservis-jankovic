import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PlateBadge } from "@/components/plate-badge";
import { getOrder } from "@/server/orders";
import { supplierOptions } from "@/server/suppliers";
import { PartsOrderForm } from "../parts-order-form";

export const metadata: Metadata = { title: "Nova narudžbenica" };

export default async function NovaNarudzbenicaPage({ searchParams }: { searchParams: Promise<{ nalog?: string; dobavljac?: string }> }) {
  const { nalog, dobavljac } = await searchParams;
  const [order, suppliers] = await Promise.all([nalog ? getOrder(nalog) : null, supplierOptions()]);
  const v = order?.vehicle;
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nova narudžbenica" />
      {v && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
          <PlateBadge plate={v.plate} vin={v.plate ? undefined : v.vin} />
          <span className="font-semibold">{[v.make, v.model, v.year, v.engine].filter(Boolean).join(" ")}</span>
          {v.vin && <span className="font-mono text-sm text-muted-foreground">VIN {v.vin}</span>}
          <span className="text-sm text-muted-foreground">· nalog {order!.order.number}</span>
          {!v.vin && <p className="w-full text-sm text-warning">Vozilo nema upisan VIN.</p>}
        </div>
      )}
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <PartsOrderForm orderId={order?.order.id} suppliers={suppliers} defaultSupplierId={suppliers.some((s) => s.id === dobavljac) ? dobavljac : undefined} cancelHref={order ? `/nalozi/${order.order.id}` : "/dobavljaci/narudzbenice"} />
      </div>
    </div>
  );
}
