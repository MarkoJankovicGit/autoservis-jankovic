import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { orderRef } from "@/server/finance";
import { supplierOptions } from "@/server/suppliers";
import { ExpenseForm } from "../expense-form";

export const metadata: Metadata = { title: "Novi trošak" };

export default async function NoviTrosakPage({ searchParams }: { searchParams: Promise<{ dobavljac?: string; nalog?: string; vrsta?: string }> }) {
  const { dobavljac, nalog, vrsta } = await searchParams;
  const [suppliers, order] = await Promise.all([supplierOptions(), nalog ? orderRef(nalog) : null]);
  const supplierId = suppliers.some((s) => s.id === dobavljac) ? dobavljac : undefined;
  const back = order ? `/nalozi/${order.id}` : supplierId ? `/dobavljaci/${supplierId}` : "/finansije/troskovi";
  return (
    <div className="max-w-2xl">
      <PageHeader title={vrsta === "investicija" ? "Nova investicija" : "Novi trošak"} />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <ExpenseForm suppliers={suppliers} defaultSupplierId={supplierId} defaultKind={vrsta === "investicija" ? "investment" : "cost"} order={order ?? undefined} back={back} />
      </div>
    </div>
  );
}
