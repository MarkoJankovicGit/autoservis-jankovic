/**
 * Demo režim (grana `demo`, za pregled kod vlasnika pre baze).
 * Na Vercelu podaci žive u privremenoj memoriji servera (/tmp) i kreću od snimka seed-a u `demo/snapshot.json`.
 * Kad se server ugasi (neaktivnost ili nov deploy), sve se vraća na snimak.
 * Lokalno se uključuje sa DEMO=1.
 */
import { tmpdir } from "node:os";
import path from "node:path";
import { daysBetween, todayIso } from "../domain/dates.ts";
import { shiftDates } from "../domain/demo.ts";

export const DEMO = !!process.env.VERCEL || process.env.DEMO === "1";

export const demoDir = () => path.join(tmpdir(), "jk-demo");

/** Početni podaci: snimak seed-a pomeren na današnji dan (ID-jevi su isti u svakoj kopiji servera). */
export async function demoStart<T>(): Promise<T> {
  const mod: unknown = await import("../../demo/snapshot.json", { with: { type: "json" } });
  const snap = (mod as { default: { date: string; db: T } }).default;
  return shiftDates(structuredClone(snap.db), daysBetween(snap.date, todayIso()));
}
