"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintToolbar({ backHref, backLabel = "Nazad na nalog", warning }: { backHref: string; backLabel?: string; warning?: string }) {
  return (
    <div className="no-print mx-auto mb-4 flex w-[210mm] max-w-full flex-col gap-2 px-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="xl" className="bg-white">
          <Link href={backHref}>
            <ArrowLeft aria-hidden />
            {backLabel}
          </Link>
        </Button>
        <Button type="button" size="xl" onClick={() => window.print()} className="ml-auto">
          <Printer aria-hidden />
          Štampaj / Sačuvaj PDF
        </Button>
      </div>
      {warning && <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">{warning}</p>}
    </div>
  );
}
