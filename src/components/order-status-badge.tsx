import { CheckCircle2, CircleSlash, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/domain/orders";

const styles: Record<OrderStatus, { cls: string; icon: typeof Wrench }> = {
  open: { cls: "bg-accent text-accent-foreground", icon: Wrench },
  done: { cls: "bg-success/12 text-success", icon: CheckCircle2 },
  cancelled: { cls: "bg-muted text-muted-foreground", icon: CircleSlash },
};

/** Status naloga: boja + ikona + tekst (nikad samo boja). */
export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const { cls, icon: Icon } = styles[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", cls, className)}>
      <Icon className="size-3.5" aria-hidden />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
