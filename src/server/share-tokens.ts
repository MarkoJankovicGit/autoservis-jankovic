/**
 * Tokeni za javne linkove (narudžbenica za dobavljača, kasnije karton za mušteriju).
 * 24 bajta iz kriptografskog generatora (192 bita), base64url; u bazi se čuva samo SHA-256 heš.
 */
import { createHash, randomBytes } from "node:crypto";

export function newToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Brza provera oblika pre upita (sprečava besmislene upite sa ogromnim ulazom). */
export const looksLikeToken = (t: string) => /^[A-Za-z0-9_-]{20,64}$/.test(t);
