import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/** Provera sesije u route handlerima (proxy.ts štiti i ove rute; ovo je druga linija). */
export function isAuthed(request: NextRequest): boolean {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}
