import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Pretraga liste kroz URL (?q=), radi i bez JavaScript-a; Enter šalje. */
export function ListSearch({
  action,
  q,
  placeholder,
  hidden,
}: {
  action: string;
  q?: string;
  placeholder: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form action={action} role="search" className="relative mb-4">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        className="h-12 bg-card pr-11 pl-10 text-base md:text-base"
      />
      {q && (
        <Link
          href={action + (hidden && Object.keys(hidden).length ? "?" + new URLSearchParams(hidden).toString() : "")}
          aria-label="Obriši pretragu"
          className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="size-5" aria-hidden />
        </Link>
      )}
    </form>
  );
}
