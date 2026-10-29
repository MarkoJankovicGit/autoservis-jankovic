import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { normalizePlate } from "@/domain/plate";
import { getCustomerBasic } from "@/server/customers";
import { VehicleForm } from "../vehicle-form";

export const metadata: Metadata = { title: "Novo vozilo" };

export default async function NovoVoziloPage({ searchParams }: { searchParams: Promise<{ klijent?: string; tablica?: string }> }) {
  const { klijent, tablica } = await searchParams;
  const c = klijent ? await getCustomerBasic(klijent) : null;
  const owner = c && !c.archivedAt ? { id: c.id, name: c.name, phone: c.phones[0]?.e164 } : null;
  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo vozilo" />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <VehicleForm initialOwner={owner} initialPlate={tablica ? normalizePlate(tablica) : undefined} cancelHref={owner ? `/klijenti/${owner.id}` : "/vozila"} />
      </div>
    </div>
  );
}
