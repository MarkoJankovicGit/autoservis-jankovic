import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  info: { icon: Info, cls: "border-primary/25 bg-accent text-accent-foreground" },
  success: { icon: CircleCheck, cls: "border-success/30 bg-success/10 text-success" },
  warning: { icon: TriangleAlert, cls: "border-warning/30 bg-warning/10 text-warning" },
  error: { icon: CircleAlert, cls: "border-destructive/30 bg-destructive/10 text-destructive" },
} as const;

export function Notice({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: keyof typeof variants;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, cls } = variants[variant];
  return (
    <div role={variant === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-4", cls, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn("text-foreground/85", title && "mt-1")}>{children}</div>}
      </div>
    </div>
  );
}
