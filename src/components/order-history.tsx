import Link from "next/link";
import { Camera, ChevronRight } from "lucide-react";
import { PlateBadge } from "@/components/plate-badge";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { formatDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import type { OrderSummary } from "@/server/orders";

/** Hronologija naloga (karton vozila, profil klijenta): šta je rađeno, kada, na kojoj kilometraži. */
export function OrderHistory({ orders, showVehicle = false, empty }: { orders: OrderSummary[]; showVehicle?: boolean; empty: string }) {
  if (!orders.length) return <p className="text-muted-foreground">{empty}</p>;
  return (
    <ol className="relative flex flex-col gap-3">
      {orders.map((o) => {
        const names = o.items.map((i) => i.name);
        const km = o.kmOut ?? o.kmIn;
        return (
          <li key={o.id}>
            <Link href={`/nalozi/${o.id}`} className="flex gap-3 rounded-xl border bg-card p-3 hover:border-primary/40 hover:bg-muted/40 sm:p-4">
              <div className="w-20 shrink-0 text-sm tabular">
                <p className="font-semibold">{formatDate(o.completedDate ?? o.receivedDate)}</p>
                {km !== undefined && <p className="text-muted-foreground">{km.toLocaleString("sr-Latn-RS")} km</p>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {showVehicle && o.vehicle && <PlateBadge plate={o.vehicle.plate} vin={o.vehicle.plate ? undefined : o.vehicle.vin} size="sm" />}
                  <span className="text-sm text-muted-foreground tabular">{o.number}</span>
                  {o.status !== "done" && <OrderStatusBadge status={o.status} />}
                  {o.photos > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Camera className="size-3.5" aria-hidden />
                      {o.photos}
                    </span>
                  )}
                </div>
                <p className="mt-1 font-medium">{names.length ? names.slice(0, 4).join(", ") + (names.length > 4 ? ` i još ${names.length - 4}` : "") : o.complaint}</p>
                {o.workDone && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{o.workDone}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end justify-between">
                {o.total > 0 && <span className="font-semibold tabular">{formatMoney(o.total, { decimals: false })}</span>}
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
