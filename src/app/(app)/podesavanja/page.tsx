import type { Metadata } from "next";
import { LogOut, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { InstallCard } from "@/components/pwa";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/actions";

export const metadata: Metadata = { title: "Podešavanja" };

export default function PodesavanjaPage() {
  return (
    <>
      <PageHeader title="Podešavanja" />
      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <section aria-labelledby="app-tel" className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5">
          <h2 id="app-tel" className="flex items-center gap-2 font-semibold">
            <Smartphone className="size-5 text-primary" aria-hidden />
            Aplikacija na telefonu
          </h2>
          <InstallCard />
        </section>
        <section aria-label="Odjava" className="flex items-center rounded-2xl border bg-card p-4 sm:p-5">
          <form action={logout}>
            <Button type="submit" variant="outline" size="xl">
              <LogOut aria-hidden />
              Odjavi ovaj uređaj
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}
