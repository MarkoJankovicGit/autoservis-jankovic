import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/server/auth/session";

/**
 * Prva linija zaštite: sve rute osim javnih traže važeću sesiju.
 * Javne: /login, deljivi karton /k/<token>, narudžbenica /n/<token>, statički fajlovi.
 * Druga linija: requireSession() u layout-u i server akcijama.
 */
const PUBLIC_PREFIXES = ["/login", "/k/", "/n/"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
  const authed = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (!authed && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (authed && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // sve osim Next statike, ikonica, manifesta, logoa i fajlova sa ekstenzijom
    "/((?!_next/static|_next/image|icons/|brand/|manifest.webmanifest|sw.js|offline.html|icon.svg|apple-icon.png|favicon.ico|robots.txt).*)",
  ],
};
