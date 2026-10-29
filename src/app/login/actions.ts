"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/server/env";
import { verifyPassword } from "@/server/auth/password";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/server/auth/session";

export type LoginState = { error?: string };

// Ograničenje pokušaja po IP adresi. Važi po instanci servera (best effort na Vercelu);
// trajno zaključavanje u bazi dolazi kad baza postoji (Iteracija 1).
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/login") ? n : "/";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && rec.until > now && rec.count >= MAX_ATTEMPTS) {
    const min = Math.ceil((rec.until - now) / 60000);
    return { error: `Previše pogrešnih pokušaja. Pokušaj ponovo za ${min} min.` };
  }

  const password = String(formData.get("password") ?? "");
  const ok = password.length > 0 && (await verifyPassword(password, env.appPasswordHash));
  if (!ok) {
    const cur = rec && rec.until > now ? rec : { count: 0, until: now + WINDOW_MS };
    attempts.set(ip, { count: cur.count + 1, until: cur.until });
    await new Promise((r) => setTimeout(r, 400));
    return { error: "Pogrešna lozinka." };
  }

  attempts.delete(ip);
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
  redirect(safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
