import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Link2Off } from "lucide-react";
import { cn } from "@/lib/utils";
import { SHOP } from "@/config/shop";
import { PlateBadge } from "@/components/plate-badge";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/domain/dates";
import { formatPlate } from "@/domain/plate";
import { SHARE_STATE_LABELS, type ShareState } from "@/domain/shares";
import { plural } from "@/domain/text";
import { shareOptions } from "@/server/shares";
import { revokeShare } from "./actions";
import { ShareForm } from "./share-form";

export const metadata: Metadata = { title: "Podeli s mušterijom" };

const stateCls: Record<ShareState, string> = {
  active: "bg-success/12 text-success",
  expired: "bg-muted text-muted-foreground",
  revoked: "bg-muted text-muted-foreground",
};

export default async function PodeliPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nalog?: string }> }) {
  const [{ id }, { nalog }] = await Promise.all([params, searchParams]);
  const d = await shareOptions(id);
  if (!d) notFound();
  const v = d.vehicle;
  const vehicleLabel = v.plate ? formatPlate(v.plate) : [v.make, v.model].filter(Boolean).join(" ");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={`/vozila/${v.id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          <ArrowLeft className="size-4" aria-hidden />
          Karton vozila
        </Link>
        <h1 className="text-2xl font-bold">Podeli s mušterijom</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2">
          <PlateBadge plate={v.plate} size="sm" />
          <span className="font-medium">{[v.make, v.model, v.year].filter(Boolean).join(" ")}</span>
        </p>
      </div>

      <section className="rounded-2xl border bg-card/60 p-4 sm:p-6">
        <ShareForm vehicleId={v.id} vehicleLabel={vehicleLabel} shopName={SHOP.legalName} orders={d.orders} openReminders={d.openReminders} preselect={nalog} />
      </section>

      {d.shares.length > 0 && (
        <section aria-labelledby="poslato">
          <h2 id="poslato" className="mb-3 text-lg font-semibold">
            Poslato
          </h2>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {d.shares.map((s) => {
              const what = [
                s.orderNumbers.length ? `${plural(s.orderNumbers.length, "nalog", "naloga", "naloga")} ${s.orderNumbers.join(", ")}` : "",
                s.photos ? `${s.photos} ${plural(s.photos, "fotografija", "fotografije", "fotografija")}` : "",
                s.showPrices ? "sa cenama" : "bez cena",
                s.reminders ? "podsetnici" : "",
              ].filter(Boolean);
              return (
                <li key={s.id} className={cn("flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center", s.state !== "active" && "opacity-70")}>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", stateCls[s.state])}>{SHARE_STATE_LABELS[s.state]}</span>
                      <span className="text-sm font-medium tabular">{formatDateTime(s.createdAt)}</span>
                    </p>
                    <p className="mt-1 text-sm">{what.join(" · ")}</p>
                    <p className="text-xs text-muted-foreground tabular">
                      {s.opens ? `Otvoren ${s.opens} ${plural(s.opens, "put", "puta", "puta")}${s.lastOpenedAt ? `, poslednji put ${formatDateTime(s.lastOpenedAt)}` : ""}` : "Mušterija ga još nije otvorila"}
                      {s.state === "active" && ` · važi do ${formatDate(s.expiresAt)}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline">
                      <a href={`/api/podeli/${s.id}/pdf`} target="_blank" rel="noreferrer">
                        <FileText aria-hidden />
                        PDF
                      </a>
                    </Button>
                    {s.state === "active" && (
                      <form action={revokeShare}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="vehicleId" value={v.id} />
                        <ConfirmSubmit message="Ugasiti link? Mušterija više neće moći da ga otvori.">
                          <Button type="submit" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <Link2Off aria-hidden />
                            Ugasi
                          </Button>
                        </ConfirmSubmit>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
