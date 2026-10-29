import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server } from "node:http";

// lažni Supabase Storage: beleži zahteve i čuva fajlove u memoriji
type Seen = { method: string; url: string; apikey?: string; authorization?: string; body: Buffer };
const seen: Seen[] = [];
const files = new Map<string, Buffer>();
let bucket = false;
let server: Server;
let B: typeof import("./blob-store.ts");

const body = (req: IncomingMessage) =>
  new Promise<Buffer>((res) => {
    const parts: Buffer[] = [];
    req.on("data", (c: Buffer) => parts.push(c)).on("end", () => res(Buffer.concat(parts)));
  });

before(async () => {
  server = createServer(async (req, res) => {
    const b = await body(req);
    seen.push({ method: req.method!, url: req.url!, apikey: req.headers.apikey as string, authorization: req.headers.authorization, body: b });
    const url = req.url!;
    if (url === "/storage/v1/bucket/fotografije") return res.writeHead(bucket ? 200 : 404).end("{}");
    if (url === "/storage/v1/bucket" && req.method === "POST") {
      bucket = true;
      return res.writeHead(200).end("{}");
    }
    if (url === "/storage/v1/object/fotografije" && req.method === "DELETE") {
      for (const p of JSON.parse(b.toString()).prefixes as string[]) files.delete(p);
      return res.writeHead(200).end("[]");
    }
    const m = /^\/storage\/v1\/object\/fotografije\/(.+)$/.exec(url);
    if (m && req.method === "POST") {
      files.set(decodeURIComponent(m[1]!), b);
      return res.writeHead(200).end("{}");
    }
    if (m && req.method === "GET") {
      const f = files.get(decodeURIComponent(m[1]!));
      return f ? res.writeHead(200).end(f) : res.writeHead(400).end('{"error":"not_found"}');
    }
    res.writeHead(500).end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address() as { port: number };
  process.env.SUPABASE_URL = `http://127.0.0.1:${addr.port}/`;
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
  B = await import("./blob-store.ts");
});
after(() => new Promise<void>((r) => server.close(() => r())));

test("fotografije u Supabase Storage: bucket se pravi sam, ključ samo u apikey, upis, čitanje, brisanje", async () => {
  const s = B.blobs();
  assert.equal(s.kind, "supabase");
  await s.put("2026-10/a.jpg", new Uint8Array([0xff, 0xd8, 0xff, 1]), "image/jpeg");
  await s.put("2026-10/a_t.jpg", new Uint8Array([0xff, 0xd8, 0xff, 2]), "image/jpeg");
  assert.deepEqual([...(await s.get("2026-10/a.jpg"))!], [0xff, 0xd8, 0xff, 1]);
  assert.equal(await s.get("2026-10/nema.jpg"), null);
  await s.remove(["2026-10/a.jpg", "2026-10/a_t.jpg"]);
  assert.equal(await s.get("2026-10/a_t.jpg"), null);
  await s.remove([]);
  await s.check();

  // bucket je proveren i napravljen samo jednom, privatan
  const created = seen.filter((x) => x.url === "/storage/v1/bucket");
  assert.equal(created.length, 1);
  assert.equal(JSON.parse(created[0]!.body.toString()).public, false);
  assert.ok(seen.every((x) => x.apikey === "sb_secret_test" && x.authorization === undefined));
});
