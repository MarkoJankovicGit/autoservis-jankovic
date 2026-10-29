import { NextResponse } from "next/server";
import { blobs } from "@/server/blob-store";
import { meta } from "@/server/store/schema";
import { database } from "@/server/store/store";

export const dynamic = "force-dynamic";

/** Provera rada posle deploy-a: da li server dopire do baze i do skladišta fotografija. Javno, bez podataka i bez detalja greške. */
export async function GET() {
  const out: Record<string, "ok" | "lokalno" | "greška"> = {};
  try {
    await (await database()).select({ v: meta.version }).from(meta).limit(1);
    out.baza = "ok";
  } catch (e) {
    console.error("zdravlje: baza", e);
    out.baza = "greška";
  }
  try {
    const b = blobs();
    await b.check();
    out.fotografije = b.kind === "supabase" ? "ok" : "lokalno";
  } catch (e) {
    console.error("zdravlje: fotografije", e);
    out.fotografije = "greška";
  }
  const ok = !Object.values(out).includes("greška");
  return NextResponse.json(out, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
