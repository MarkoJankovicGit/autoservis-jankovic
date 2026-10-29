import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/server/auth/request";
import { exportCsv, type ExportKind } from "@/server/finance";
import { resolvePeriod } from "@/lib/period";

const KINDS: ExportKind[] = ["uplate", "troskovi", "nalozi"];

/** CSV za Excel (knjigovođa): /api/izvoz?vrsta=uplate|troskovi|nalozi&p=mesec ili &od=..&do=.. */
export async function GET(request: NextRequest) {
  if (!isAuthed(request)) return new NextResponse("Nisi prijavljen.", { status: 401 });
  const sp = request.nextUrl.searchParams;
  const kind = sp.get("vrsta") as ExportKind;
  if (!KINDS.includes(kind)) return new NextResponse("Nepoznata vrsta izvoza.", { status: 400 });
  const period = resolvePeriod({ p: sp.get("p") ?? undefined, od: sp.get("od") ?? undefined, do: sp.get("do") ?? undefined });
  const csv = await exportCsv(kind, period.period);
  const name = `jankovic-${kind}-${period.period.from}_${period.period.to}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
