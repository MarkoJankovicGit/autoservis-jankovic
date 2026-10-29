import type { Metadata } from "next";
import { BellRing } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ReminderList } from "@/components/reminder-list";
import { listOpenReminders } from "@/server/reminders";

export const metadata: Metadata = { title: "Podsetnici" };

export default async function PodsetniciPage() {
  const all = await listOpenReminders();
  const groups = [
    { title: "Prekoračeni", items: all.filter((r) => r.due.overdue) },
    { title: "U narednih 30 dana", items: all.filter((r) => !r.due.overdue && r.due.soon) },
    { title: "Kasnije", items: all.filter((r) => !r.due.overdue && !r.due.soon) },
  ].filter((g) => g.items.length);

  return (
    <>
      <PageHeader title="Podsetnici" />
      {all.length === 0 ? (
        <EmptyState icon={BellRing} title="Nema podsetnika" />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h2 className="mb-3 text-lg font-semibold">
                {g.title} <span className="text-sm font-normal text-muted-foreground">({g.items.length})</span>
              </h2>
              <ReminderList reminders={g.items} withVehicle />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
