"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/server/env";
import { verifyPassword } from "@/server/auth/password";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/server/auth/session";
import { clearFailures, lockedMinutes, recordFailure } from "@/server/auth/throttle";

export type LoginState = { error?: string };

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/login") ? n : "/";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // ograničenje pokušaja po IP adresi; brojač je u bazi (važi za sve instance servera)
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const min = await lockedMinutes(ip);
  if (min > 0) return { error: `Previše pogrešnih pokušaja. Pokušaj ponovo za ${min} min.` };

  const password = String(formData.get("password") ?? "");
  const ok = password.length > 0 && (await verifyPassword(password, env.appPasswordHash));
  if (!ok) {
    await recordFailure(ip);
    await new Promise((r) => setTimeout(r, 400));
    return { error: "Pogrešna lozinka." };
  }

  await clearFailures(ip);
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
  redirect(safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
