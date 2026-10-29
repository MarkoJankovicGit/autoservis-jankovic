// Pravi vrednost za APP_PASSWORD_HASH.
// Upotreba: pnpm hash-password "lozinka"   (ili bez argumenta: čita iz stdin)
import { scrypt, randomBytes } from "node:crypto";

const pw = process.argv[2] ?? (await new Promise((res) => {
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => res(s.trim()));
}));
if (!pw || pw.length < 8) {
  console.error("Lozinka mora imati najmanje 8 znakova.");
  process.exit(1);
}
const N = 2 ** 15, r = 8, p = 1, salt = randomBytes(16);
scrypt(pw, salt, 32, { N, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) => {
  if (err) throw err;
  console.log(["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join(":"));
});
