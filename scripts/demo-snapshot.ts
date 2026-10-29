// Pravi demo/snapshot.json za granu demo: pokreće seed (izmišljeni klijenti i vozila) u privremenom folderu.
// Datumi se pri pokretanju demo-a pomeraju na tekući dan (src/server/demo.ts). Pokretanje: pnpm demo:snapshot
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { todayIso } from "../src/domain/dates.ts";

const root = process.cwd();
const tmp = await mkdtemp(path.join(tmpdir(), "jk-snap-"));
try {
  execFileSync(process.execPath, [path.join(root, "scripts", "seed.ts")], { cwd: tmp, stdio: "inherit", env: { ...process.env, DEMO: "", VERCEL: "" } });
  const db = JSON.parse(await readFile(path.join(tmp, ".data", "dev-db.json"), "utf8"));
  await mkdir(path.join(root, "demo"), { recursive: true });
  await writeFile(path.join(root, "demo", "snapshot.json"), JSON.stringify({ date: todayIso(), db }, null, 1) + "\n");
  console.log("demo/snapshot.json napravljen");
} finally {
  await rm(tmp, { recursive: true, force: true });
}
