import { daysBetween, formatDate, type IsoDate } from "@/domain/dates";

/**
 * Linijski grafikon kilometraže bez biblioteke.
 * Linije crta SVG koji se rasteže po širini; oznake osa i tačke su HTML, pa ostaju iste veličine
 * na telefonu i na desktopu. Isprekidana linija je procena do datuma projekcije.
 */
export function KmChart({
  readings,
  projection,
}: {
  readings: { date: IsoDate; km: number }[];
  projection?: { date: IsoDate; km: number } | null;
}) {
  const pts = [...readings].sort((a, b) => a.date.localeCompare(b.date));
  if (pts.length < 2) return null;

  const all = projection ? [...pts, projection] : pts;
  const d0 = all[0].date;
  const span = Math.max(1, daysBetween(d0, all.at(-1)!.date));
  let min = Math.min(...all.map((p) => p.km));
  let max = Math.max(...all.map((p) => p.km));
  if (max === min) {
    max += 1000;
    min = Math.max(0, min - 1000);
  }
  const pad = (max - min) * 0.1;
  min = Math.max(0, min - pad);
  max += pad;

  // koordinate u procentima površine grafikona
  const x = (d: IsoDate) => (daysBetween(d0, d) / span) * 100;
  const y = (km: number) => (1 - (km - min) / (max - min)) * 100;
  const fmt = (km: number) => `${(km / 1000).toLocaleString("sr-Latn-RS", { maximumFractionDigits: 0 })}k`;
  const last = pts.at(-1)!;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${(x(p.date) * 10).toFixed(1)},${(y(p.km) * 10).toFixed(1)}`).join(" ");
  const ticks = [max - pad, (min + max) / 2, min + pad];
  const summary = `Kilometraža ${last.km.toLocaleString("sr-Latn-RS")} km na dan ${formatDate(last.date)}, ${pts.length} upisa od ${formatDate(pts[0].date)}.`;

  const dot = "absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-card";

  return (
    <figure role="img" aria-label={summary} className="text-xs text-muted-foreground tabular">
      <div className="flex">
        <div className="relative w-11 shrink-0" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-2 -translate-y-1/2" style={{ top: `${y(t)}%` }}>
              {fmt(t)}
            </span>
          ))}
        </div>
        <div className="relative h-44 flex-1 sm:h-52" aria-hidden>
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {ticks.map((t) => (
              <line key={t} x1={0} x2={1000} y1={y(t) * 10} y2={y(t) * 10} stroke="currentColor" strokeOpacity={0.18} vectorEffect="non-scaling-stroke" />
            ))}
            {projection && (
              <line
                x1={x(last.date) * 10}
                y1={y(last.km) * 10}
                x2={x(projection.date) * 10}
                y2={y(projection.km) * 10}
                stroke="var(--color-primary)"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.7}
                vectorEffect="non-scaling-stroke"
              />
            )}
            <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {pts.map((p) => (
            <span key={p.date + p.km} className={dot} style={{ left: `${x(p.date)}%`, top: `${y(p.km)}%` }} title={`${formatDate(p.date)}: ${p.km.toLocaleString("sr-Latn-RS")} km`} />
          ))}
          {projection && <span className={`${dot} border-dashed`} style={{ left: `${x(projection.date)}%`, top: `${y(projection.km)}%` }} />}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-11" aria-hidden>
        <span>{formatDate(pts[0].date)}</span>
        {projection ? <span>procena {formatDate(projection.date)}</span> : <span>{formatDate(last.date)}</span>}
      </div>
    </figure>
  );
}
