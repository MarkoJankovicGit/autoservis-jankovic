import { formatDate, isIsoDate, todayIso } from "@/domain/dates";
import { periodPresets, type Period } from "@/domain/finance";

export type ResolvedPeriod = { key: string; label: string; period: Period; query: string };

/** Period iz URL-a: ?p=mesec|prosli|90|godina ili ?od=2026-01-01&do=2026-03-31. Podrazumevano: ovaj mesec. */
export function resolvePeriod(sp: { p?: string; od?: string; do?: string }): ResolvedPeriod {
  const today = todayIso();
  const presets = periodPresets(today);
  if (sp.od && sp.do && isIsoDate(sp.od) && isIsoDate(sp.do) && sp.od <= sp.do) {
    return { key: "custom", label: `${formatDate(sp.od)} – ${formatDate(sp.do)}`, period: { from: sp.od, to: sp.do }, query: `od=${sp.od}&do=${sp.do}` };
  }
  const p = presets.find((x) => x.key === sp.p) ?? presets[0];
  return { key: p.key, label: p.label, period: p.period, query: `p=${p.key}` };
}

export const PERIOD_OPTIONS = () => periodPresets(todayIso()).map(({ key, label }) => ({ key, label }));
