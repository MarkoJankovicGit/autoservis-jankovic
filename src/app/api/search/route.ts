import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/server/auth/session";
import { globalSearch } from "@/server/search";

export async function GET(request: NextRequest) {
  // proxy.ts već štiti /api, ali ruta proverava sesiju i sama
  if (!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Nisi prijavljen." }, { status: 401 });
  }
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await globalSearch(q);
  return NextResponse.json(results, { headers: { "Cache-Control": "private, no-store" } });
}
