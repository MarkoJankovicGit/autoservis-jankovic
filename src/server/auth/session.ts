import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";

export const SESSION_COOKIE = "jk_session";
export const SESSION_MAX_AGE_S = 365 * 24 * 60 * 60;

type Payload = { v: 1; iat: number; exp: number };

/**
 * Ključ potpisa zavisi i od heša lozinke: promena lozinke poništava sve postojeće sesije.
 */
function signingKey(): Buffer {
  return createHmac("sha256", env.sessionSecret).update("session:" + env.appPasswordHash).digest();
}

function sign(data: string): string {
  return createHmac("sha256", signingKey()).update(data).digest("base64url");
}

export function createSessionToken(now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const payload: Payload = { v: 1, iat, exp: iat + SESSION_MAX_AGE_S };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const body = token.slice(0, dot);
  const sig = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = Buffer.from(sign(body), "base64url");
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return false;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    return p.v === 1 && p.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

export const sessionCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_S,
});
