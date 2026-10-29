import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/server/auth/session";

/** Druga linija odbrane posle proxy.ts: poziva se u zaštićenim layout-ima i u svakoj server akciji. */
export async function requireSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) redirect("/login");
}

/** Za javne strane: da li je otvara prijavljen majstor (npr. da se njegov pregled ne broji kao otvaranje). */
export async function hasSession(): Promise<boolean> {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}
