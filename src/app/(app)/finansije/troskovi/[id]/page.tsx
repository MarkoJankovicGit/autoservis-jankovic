import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getExpense, supplierOptions } from "@/server/suppliers";
import { orderRef } from "@/server/finance";
import { removeExpense } from "../../actions";
import { ExpenseForm } from "../expense-form";
import { ConfirmSubmit } from "@/components/confirm-submit";

export const metadata: Metadata = { title: "Izmena troška" };

export default async function TrosakPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [expense, suppliers] = await Promise.all([getExpense(id), supplierOptions()]);
  if (!expense) notFound();
  const order = expense.orderId ? await orderRef(expense.orderId) : null;
  return (
    <div className="max-w-2xl">
      <PageHeader title={expense.description} />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <ExpenseForm expense={expense} suppliers={suppliers} order={order ?? undefined} back={order ? `/nalozi/${order.id}` : "/finansije/troskovi"} />
      </div>
      <form action={removeExpense} className="mt-4">
        <input type="hidden" name="id" value={expense.id} />
        <ConfirmSubmit message={`Obrisati trošak „${expense.description}“?`}>
          <Button type="submit" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 aria-hidden />
            Obriši
          </Button>
        </ConfirmSubmit>
      </form>
    </div>
  );
}
