/**
 * Zaključavanje prijave: posle 5 pogrešnih lozinki sa iste adrese, 15 minuta pauze.
 * Brojač je u bazi, pa važi za sve instance servera na Vercelu (ranije je bio u memoriji jedne instance).
 */
import { eq } from "drizzle-orm";
import { loginAttempts } from "../store/schema.ts";
import { database } from "../store/store.ts";

export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;

/** Koliko minuta je adresa još zaključana (0 = nije). */
export async function lockedMinutes(ip: string, now = Date.now()): Promise<number> {
  const [r] = await (await database()).select().from(loginAttempts).where(eq(loginAttempts.ip, ip));
  if (!r) return 0;
  const until = Date.parse(r.until);
  return r.count >= MAX_ATTEMPTS && until > now ? Math.ceil((until - now) / 60_000) : 0;
}

/** Pogrešna lozinka: brojač raste u tekućem prozoru od 15 minuta, a posle njega kreće ispočetka. */
export async function recordFailure(ip: string, now = Date.now()): Promise<void> {
  const db = await database();
  const [r] = await db.select().from(loginAttempts).where(eq(loginAttempts.ip, ip));
  const fresh = !r || Date.parse(r.until) <= now;
  const count = fresh ? 1 : r.count + 1;
  const until = fresh ? new Date(now + WINDOW_MS).toISOString() : r.until;
  await db.insert(loginAttempts).values({ ip, count, until }).onConflictDoUpdate({ target: loginAttempts.ip, set: { count, until } });
}

/** Uspešna prijava briše brojač. */
export async function clearFailures(ip: string): Promise<void> {
  await (await database()).delete(loginAttempts).where(eq(loginAttempts.ip, ip));
}
