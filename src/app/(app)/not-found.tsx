import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Nalog, vozilo, klijent ili dokument ne postoji (obrisan, pogrešan link ili resetovani test podaci). */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <SearchX className="size-7" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold">Ovo ne postoji</h1>
      <p className="mt-1 max-w-md text-muted-foreground">Nalog, vozilo, klijent ili dokument sa ovog linka nije pronađen. Možda je obrisan ili je link star.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild size="xl">
          <Link href="/">Početna</Link>
        </Button>
        <Button asChild variant="outline" size="xl">
          <Link href="/nalozi">Nalozi</Link>
        </Button>
        <Button asChild variant="outline" size="xl">
          <Link href="/vozila">Vozila</Link>
        </Button>
      </div>
    </div>
  );
}
