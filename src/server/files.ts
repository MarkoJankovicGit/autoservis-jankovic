/**
 * Fotografije naloga. PRIVREMENO lokalno skladište (.data/uploads) dok ne stigne Supabase Storage;
 * ostatak koda koristi samo ove funkcije.
 * Browser šalje već smanjenu sliku (≤ 2048 px, JPEG, bez EXIF/GPS) i sličicu; server proverava tip i veličinu.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ATTACHMENT_CATEGORIES, type Attachment, type AttachmentCategory } from "../domain/model.ts";
import { nowIso, read, write } from "./store/json-store.ts";
import { base } from "./vehicles.ts";

export const MAX_PHOTO_BYTES = 2.5 * 1024 * 1024;
export const MAX_THUMB_BYTES = 300 * 1024;

function uploadsDir(): string {
  if (process.env.VERCEL) throw new Error("Lokalno skladište fajlova ne radi na Vercelu.");
  return path.join(process.cwd(), ".data", "uploads");
}

const isJpeg = (b: Uint8Array) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

export type PhotoInput = {
  main: Uint8Array;
  thumb: Uint8Array;
  width?: number;
  height?: number;
  category: string;
  originalName?: string;
};

export type PhotoResult = { ok: true; id: string } | { ok: false; error: string };

export async function addOrderPhoto(orderId: string, p: PhotoInput): Promise<PhotoResult> {
  if (!isJpeg(p.main) || !isJpeg(p.thumb)) return { ok: false, error: "Fajl nije JPEG slika." };
  if (p.main.length > MAX_PHOTO_BYTES) return { ok: false, error: "Slika je prevelika (najviše 2,5 MB posle smanjenja)." };
  if (p.thumb.length > MAX_THUMB_BYTES) return { ok: false, error: "Sličica je prevelika." };
  const category: AttachmentCategory = (ATTACHMENT_CATEGORIES as readonly string[]).includes(p.category) ? (p.category as AttachmentCategory) : "other";

  const meta = await read((db) => db.orders.find((o) => o.id === orderId));
  if (!meta) return { ok: false, error: "Nalog ne postoji." };

  const b = base();
  const month = b.createdAt.slice(0, 7);
  const rel = (suffix: string) => path.posix.join(month, `${b.id}${suffix}.jpg`);
  const dir = path.join(uploadsDir(), month);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(uploadsDir(), rel("")), p.main);
  await writeFile(path.join(uploadsDir(), rel("_t")), p.thumb);

  const att: Attachment = {
    ...b,
    vehicleId: meta.vehicleId,
    orderId,
    category,
    mime: "image/jpeg",
    size: p.main.length,
    width: p.width && p.width > 0 && p.width < 10000 ? Math.round(p.width) : undefined,
    height: p.height && p.height > 0 && p.height < 10000 ? Math.round(p.height) : undefined,
    file: rel(""),
    thumb: rel("_t"),
    originalName: p.originalName?.slice(0, 120),
  };
  const saved = await write((db) => {
    if (!db.orders.some((o) => o.id === orderId)) return false;
    db.attachments.push(att);
    return true;
  });
  if (!saved) {
    await Promise.all([rm(path.join(uploadsDir(), att.file), { force: true }), rm(path.join(uploadsDir(), att.thumb), { force: true })]);
    return { ok: false, error: "Nalog ne postoji." };
  }
  return { ok: true, id: att.id };
}

export async function readAttachmentFile(id: string, variant: "full" | "thumb"): Promise<{ data: Buffer; mime: string } | null> {
  const att = await read((db) => db.attachments.find((a) => a.id === id));
  if (!att) return null;
  const rel = variant === "thumb" ? att.thumb : att.file;
  const full = path.join(uploadsDir(), rel);
  // zaštita od izlaska iz foldera (putanja dolazi iz baze, ali proverava se svakako)
  if (!full.startsWith(uploadsDir() + path.sep)) return null;
  try {
    return { data: await readFile(full), mime: att.mime };
  } catch {
    return null;
  }
}

export async function deleteAttachment(id: string): Promise<boolean> {
  const att = await write((db) => {
    const i = db.attachments.findIndex((a) => a.id === id);
    if (i < 0) return null;
    return db.attachments.splice(i, 1)[0];
  });
  if (!att) return false;
  await Promise.all([rm(path.join(uploadsDir(), att.file), { force: true }), rm(path.join(uploadsDir(), att.thumb), { force: true })]);
  return true;
}

export function setAttachmentCategory(id: string, category: string): Promise<boolean> {
  return write((db) => {
    const a = db.attachments.find((x) => x.id === id);
    if (!a || !(ATTACHMENT_CATEGORIES as readonly string[]).includes(category)) return false;
    a.category = category as AttachmentCategory;
    a.updatedAt = nowIso();
    return true;
  });
}

/** Sve fotografije vozila kroz naloge (galerija na kartonu). */
export function photosForVehicle(vehicleId: string): Promise<(Attachment & { orderNumber?: string; orderDate?: string })[]> {
  return read((db) =>
    db.attachments
      .filter((a) => a.vehicleId === vehicleId)
      .map((a) => {
        const o = db.orders.find((x) => x.id === a.orderId);
        return { ...a, orderNumber: o?.number, orderDate: o?.completedDate ?? o?.receivedDate };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}
