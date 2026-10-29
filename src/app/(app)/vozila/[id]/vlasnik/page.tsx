import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PlateBadge } from "@/components/plate-badge";
import { getVehicleCard } from "@/server/vehicles";
import { OwnerChangeForm } from "./owner-change-form";

export const metadata: Metadata = { title: "Promena vlasnika" };

export default async function PromenaVlasnikaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getVehicleCard(id);
  if (!card) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={card.owner ? "Promena vlasnika" : "Dodaj vlasnika"} description={[card.vehicle.make, card.vehicle.model].filter(Boolean).join(" ")} actions={<PlateBadge plate={card.vehicle.plate} vin={card.vehicle.vin} />} />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <OwnerChangeForm vehicleId={id} currentOwner={card.owner?.name} />
      </div>
    </div>
  );
}
