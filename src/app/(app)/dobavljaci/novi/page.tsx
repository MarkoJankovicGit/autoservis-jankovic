import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SupplierForm } from "../supplier-form";

export const metadata: Metadata = { title: "Novi dobavljač" };

export default function NoviDobavljacPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Novi dobavljač" />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <SupplierForm cancelHref="/dobavljaci" />
      </div>
    </div>
  );
}
