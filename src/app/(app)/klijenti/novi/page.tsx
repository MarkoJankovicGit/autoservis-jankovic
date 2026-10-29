import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "Novi klijent" };

export default function NoviKlijentPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Novi klijent" />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <CustomerForm cancelHref="/klijenti" />
      </div>
    </div>
  );
}
