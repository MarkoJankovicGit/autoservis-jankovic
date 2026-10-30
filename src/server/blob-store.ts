/**
 * Skladište fajlova (fotografije): privatan Supabase Storage bucket u produkciji, folder .data/uploads lokalno i u testovima.
 * Fajlovi se nikad ne dele direktnim linkom: čita ih samo server i šalje prijavljenom korisniku ili kroz link kartona.
 * Supabase se poziva običnim HTTP zahtevima (bez supabase-js); tajni ključ ide samo u zaglavlje `apikey`.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const BUCKET = "fotografije";
const TIMEOUT_MS = 15_000;

export type BlobStore = {
  kind: "supabase" | "local";
  put(rel: string, data: Uint8Array, type: string): Promise<void>;
  get(rel: string): Promise<Buffer | null>;
  remove(rels: string[]): Promise<void>;
  check(): Promise<void>;
};

// ---------- lokalno ----------

function uploadsDir(): string {
  return path.join(process.cwd(), ".data", "uploads");
}

/** Putanja u folderu; relativna putanja dolazi iz baze, ali izlazak iz foldera se proverava svakako. */
function localPath(rel: string): string | null {
  const full = path.join(/* turbopackIgnore: true */ uploadsDir(), rel);
  return full.startsWith(uploadsDir() + path.sep) ? full : null;
}

const local: BlobStore = {
  kind: "local",
  async put(rel, data) {
    const full = localPath(rel);
    if (!full) throw new Error("Neispravna putanja fajla.");
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  },
  async get(rel) {
    const full = localPath(rel);
    if (!full) return null;
    try {
      return await readFile(full);
    } catch {
      return null;
    }
  },
  async remove(rels) {
    await Promise.all(rels.map((r) => localPath(r)).filter((f): f is string => !!f).map((f) => rm(f, { force: true })));
  },
  async check() {},
};

// ---------- Supabase Storage ----------

function supabase(url: string, key: string): BlobStore {
  const base = url.replace(/\/+$/, "") + "/storage/v1";
  // novi ključevi (sb_secret_…) idu samo u `apikey`; stari service_role (JWT) i u Authorization
  const auth: Record<string, string> = key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
  const call = (p: string, init: RequestInit = {}) => fetch(base + p, { ...init, headers: { ...auth, ...init.headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const objectPath = (rel: string) => `/object/${BUCKET}/${rel.split("/").map(encodeURIComponent).join("/")}`;

  let ready: Promise<void> | null = null;
  /** Bucket se pravi sam pri prvoj upotrebi: privatan, samo JPEG, do 3 MB. */
  const ensureBucket = () =>
    (ready ??= (async () => {
      const r = await call(`/bucket/${BUCKET}`);
      if (r.ok) return;
      const c = await call("/bucket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: 3 * 1024 * 1024, allowed_mime_types: ["image/jpeg"] }),
      });
      if (!c.ok && c.status !== 409) throw new Error(`Supabase Storage: bucket nije napravljen (${c.status} ${await c.text()}).`);
    })().catch((e) => {
      ready = null;
      throw e;
    }));

  return {
    kind: "supabase",
    async put(rel, data, type) {
      await ensureBucket();
      const r = await call(objectPath(rel), { method: "POST", headers: { "content-type": type, "x-upsert": "false" }, body: Buffer.from(data) });
      if (!r.ok) throw new Error(`Supabase Storage: upis nije uspeo (${r.status} ${await r.text()}).`);
    },
    async get(rel) {
      const r = await call(objectPath(rel));
      if (r.status === 400 || r.status === 404) return null;
      if (!r.ok) throw new Error(`Supabase Storage: čitanje nije uspelo (${r.status}).`);
      return Buffer.from(await r.arrayBuffer());
    },
    async remove(rels) {
      if (!rels.length) return;
      const r = await call(`/object/${BUCKET}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ prefixes: rels }) });
      if (!r.ok) throw new Error(`Supabase Storage: brisanje nije uspelo (${r.status}).`);
    },
    check: ensureBucket,
  };
}

let store: BlobStore | null = null;

export function blobs(): BlobStore {
  if (store) return store;
  const url = process.env.SUPABASE_URL?.trim();
  // ključ nema razmake: novi red ili razmak iz lepljenja se uklanja; neispravan ključ se ne ispisuje (fetch bi ga stavio u poruku greške)
  const key = process.env.SUPABASE_SECRET_KEY?.replace(/\s+/g, "");
  if (key && !/^[\x21-\x7e]+$/.test(key)) throw new Error("SUPABASE_SECRET_KEY ima nedozvoljene znakove (nalepi ključ ponovo, u jednom redu).");
  if (url && key) return (store = supabase(url, key));
  if (process.env.VERCEL) throw new Error("Nedostaju SUPABASE_URL i SUPABASE_SECRET_KEY (Vercel → Settings → Environment Variables).");
  return (store = local);
}
