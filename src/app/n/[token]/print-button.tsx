"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 font-semibold text-neutral-900">
      <Printer className="size-5" aria-hidden />
      Štampaj / PDF
    </button>
  );
}
