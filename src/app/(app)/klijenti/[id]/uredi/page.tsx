import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCustomerBasic } from "@/server/customers";
import { CustomerForm } from "../../customer-form";

export const metadata: Metadata = { title: "Izmena klijenta" };

export default async function UrediKlijentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerBasic(id);
  if (!customer) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Izmena klijenta" description={customer.name} />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <CustomerForm customer={customer} cancelHref={`/klijenti/${id}`} />
      </div>
    </div>
  );
}
