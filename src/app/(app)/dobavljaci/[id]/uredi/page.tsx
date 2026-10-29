import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getSupplier } from "@/server/suppliers";
import { SupplierForm } from "../../supplier-form";

export const metadata: Metadata = { title: "Izmena dobavljača" };

export default async function UrediDobavljacaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getSupplier(id);
  if (!d) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Izmena dobavljača" description={d.supplier.name} />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <SupplierForm supplier={d.supplier} cancelHref={`/dobavljaci/${id}`} />
      </div>
    </div>
  );
}
