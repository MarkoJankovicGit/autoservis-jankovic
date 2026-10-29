import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-7" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {text && <p className="mt-1 max-w-md text-muted-foreground">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
