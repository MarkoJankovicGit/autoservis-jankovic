import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { formatPlate } from "@/domain/plate";
import { getVehicleBasic } from "@/server/vehicles";
import { VehicleForm } from "../../vehicle-form";

export const metadata: Metadata = { title: "Izmena vozila" };

export default async function UrediVoziloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await getVehicleBasic(id);
  if (!vehicle) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Izmena vozila" description={[vehicle.plate && formatPlate(vehicle.plate), vehicle.make, vehicle.model].filter(Boolean).join(" · ")} />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <VehicleForm vehicle={vehicle} cancelHref={`/vozila/${id}`} />
      </div>
    </div>
  );
}
