// Generiše ikonice aplikacije i kopira logo iz brand/ u public/ i src/app/.
// Pokretanje: node scripts/generate-icons.mjs
// sharp stiže uz Next kao gotov binarni modul; učitava se iz Next-ovih zavisnosti.
import { createRequire } from "node:module";
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const requireFromNext = createRequire(createRequire(import.meta.url).resolve("next/package.json"));
const sharp = requireFromNext("sharp");

const brand = (f) => path.join(root, "brand", f);
const iconSvg = await readFile(brand("icon-j.svg"));

await mkdir(path.join(root, "public", "brand"), { recursive: true });
await mkdir(path.join(root, "public", "icons"), { recursive: true });

for (const f of ["logo-dark.svg", "logo-on-dark.svg", "logo-light.svg", "logo-mono.svg", "icon-j.svg"]) {
  await copyFile(brand(f), path.join(root, "public", "brand", f));
}

// favicon kao SVG (Next app/icon.svg) + PNG varijante
await writeFile(path.join(root, "src", "app", "icon.svg"), iconSvg);
const png = (size, out, { maskable = false } = {}) => {
  // maskable: ikonica sa većom marginom (Android krug/zaobljeni kvadrat seče ivice)
  const pad = maskable ? Math.round(size * 0.1) : 0;
  const inner = size - 2 * pad;
  return sharp(iconSvg, { density: 400 })
    .resize(inner, inner)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: "#3e3e3f" })
    .flatten({ background: "#3e3e3f" })
    .png()
    .toFile(out);
};
await png(180, path.join(root, "src", "app", "apple-icon.png"));
await png(192, path.join(root, "public", "icons", "icon-192.png"));
await png(512, path.join(root, "public", "icons", "icon-512.png"));
await png(512, path.join(root, "public", "icons", "icon-maskable-512.png"), { maskable: true });
console.log("ikonice i logo generisani");
