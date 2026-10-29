import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Check, Mail, Pencil, Phone, Plus, StickyNote, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { formatDate, todayIso } from "@/domain/dates";
import { expenseCategory } from "@/domain/finance";
import { formatMoney } from "@/domain/money";
import { PARTS_ORDER_STATUS_LABELS } from "@/domain/parts-orders";
import { formatPhone, telHref } from "@/domain/phone";
import { getSupplier } from "@/server/suppliers";
import { markExpensePaid } from "../../finansije/actions";
import { archiveSupplier } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const d = await getSupplier((await params).id);
  return { title: d?.supplier.name ?? "Dobavljač" };
}

export default async function DobavljacPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getSupplier(id);
  if (!d) notFound();
  const { supplier: s, expenses, partsOrders } = d;
  const unpaid = expenses.filter((e) => !e.paidDate);
  const owed = unpaid.reduce((a, e) => a + e.amount, 0);
  const today = todayIso();

  return (
    <>
      {s.archivedAt && <Notice variant="warning" title="Dobavljač je arhiviran" className="mb-4" />}
      <section className="mb-6 rounded-2xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">{s.name}</h1>
            {owed > 0 ? <p className="mt-1 font-semibold text-destructive tabular">Dugujemo {formatMoney(owed)}</p> : <p className="mt-1 text-success">Ništa ne dugujemo</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="xl">
              <Link href={`/dobavljaci/narudzbenice/nova?dobavljac=${s.id}`}>
                <Plus aria-hidden />
                Narudžbenica
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href={`/dobavljaci/${s.id}/uredi`}>
                <Pencil aria-hidden />
                Izmeni
              </Link>
            </Button>
          </div>
        </div>
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          {s.phone && (
            <div className="flex items-center gap-3">
              <dt className="sr-only">Telefon</dt>
              <Phone className="size-5 text-muted-foreground" aria-hidden />
              <dd>
                <a href={telHref(s.phone)} className="text-lg font-medium text-primary tabular">
                  {formatPhone(s.phone)}
                </a>
              </dd>
            </div>
          )}
          {s.email && (
            <div className="flex items-center gap-3">
              <dt className="sr-only">Email</dt>
              <Mail className="size-5 text-muted-foreground" aria-hidden />
              <dd>
                <a href={`mailto:${s.email}`} className="text-primary">
                  {s.email}
                </a>
              </dd>
            </div>
          )}
          {s.contactPerson && (
            <div className="flex items-center gap-3">
              <dt className="sr-only">Kontakt osoba</dt>
              <UserRound className="size-5 text-muted-foreground" aria-hidden />
              <dd>{s.contactPerson}</dd>
            </div>
          )}
          {s.note && (
            <div className="flex gap-3 sm:col-span-2">
              <dt className="sr-only">Napomena</dt>
              <StickyNote className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
              <dd className="whitespace-pre-line text-muted-foreground">{s.note}</dd>
            </div>
          )}
        </dl>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <section aria-labelledby="racuni">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="racuni" className="text-lg font-semibold">
              Računi i troškovi
            </h2>
            <Button asChild variant="outline">
              <Link href={`/finansije/troskovi/novi?dobavljac=${s.id}`}>
                <Plus aria-hidden />
                Unesi račun
              </Link>
            </Button>
          </div>
          {expenses.length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-card p-5 text-muted-foreground">Nema unetih računa ovog dobavljača.</p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {expenses.map((e) => {
                const overdue = !e.paidDate && !!e.dueDate && e.dueDate < today;
                return (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/finansije/troskovi/${e.id}`} className="min-w-0 flex-1 hover:opacity-80">
                      <span className="block font-medium">{e.description}</span>
                      <span className="block text-sm text-muted-foreground">
                        {formatDate(e.date)} · {expenseCategory(e.category)?.label}
                        {e.documentNo && ` · račun ${e.documentNo}`}
                      </span>
                      <span className={cn("block text-sm", e.paidDate ? "text-success" : overdue ? "font-medium text-destructive" : "font-medium text-warning")}>
                        {e.paidDate ? `Plaćeno ${formatDate(e.paidDate)}` : `Nije plaćeno${e.dueDate ? ` · rok ${formatDate(e.dueDate)}` : ""}`}
                      </span>
                    </Link>
                    <span className="shrink-0 font-semibold tabular">{formatMoney(e.amount, { decimals: false })}</span>
                    {!e.paidDate && (
                      <form action={markExpensePaid}>
                        <input type="hidden" name="id" value={e.id} />
                        <button type="submit" title="Plaćeno danas" aria-label={`Plaćeno: ${e.description}`} className="inline-flex size-10 items-center justify-center rounded-lg text-success hover:bg-success/10">
                          <Check className="size-5" aria-hidden />
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="po">
          <h2 id="po" className="mb-3 text-lg font-semibold">
            Narudžbenice
          </h2>
          {partsOrders.length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-card p-5 text-muted-foreground">Još nema narudžbenica.</p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {partsOrders.map((p) => (
                <li key={p.id}>
                  <Link href={`/dobavljaci/narudzbenice/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium tabular">{p.number}</span>
                      <span className="block truncate text-sm text-muted-foreground">{p.lines.map((l) => l.name).join(", ")}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold">{PARTS_ORDER_STATUS_LABELS[p.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <form action={archiveSupplier} className="mt-6">
        <input type="hidden" name="id" value={s.id} />
        <input type="hidden" name="archived" value={s.archivedAt ? "0" : "1"} />
        <Button type="submit" variant="ghost" className="text-muted-foreground">
          {s.archivedAt ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
          {s.archivedAt ? "Vrati iz arhive" : "Arhiviraj dobavljača"}
        </Button>
      </form>
    </>
  );
}
