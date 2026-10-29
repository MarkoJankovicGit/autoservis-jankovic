import { cn } from "@/lib/utils";
import { formatPlate } from "@/domain/plate";

const SERBIAN = /^[A-ZČĆŠĐŽ]{2}\d{3,5}[A-ZČĆŠĐŽ]{1,2}$/;

const sizes = {
  sm: "text-sm h-7",
  md: "text-base h-9",
  lg: "text-2xl h-12 sm:text-3xl sm:h-14",
} as const;

/** Registarska tablica u obliku srpske tablice. Bez tablice prikazuje VIN ili „bez tablica“. */
export function PlateBadge({
  plate,
  vin,
  size = "md",
  className,
}: {
  plate?: string;
  vin?: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  if (!plate) {
    return (
      <span className={cn("inline-flex items-center rounded-md border border-dashed px-2 font-mono text-muted-foreground", sizes[size], className)}>
        {vin ? `VIN ${vin}` : "bez tablica"}
      </span>
    );
  }
  const serbian = SERBIAN.test(plate);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-stretch overflow-hidden rounded-md border-2 border-neutral-900 bg-white font-heading leading-none font-bold whitespace-nowrap text-neutral-900 uppercase",
        sizes[size],
        className,
      )}
      aria-label={`Tablica ${formatPlate(plate)}`}
    >
      {serbian && (
        <span aria-hidden className="flex items-end bg-[#1f4ea8] px-[0.3em] pb-[0.25em] text-[0.42em] font-semibold text-white">
          SRB
        </span>
      )}
      <span className="flex items-center px-[0.45em] tracking-wide tabular">{formatPlate(plate)}</span>
    </span>
  );
}
