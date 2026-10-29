/** Čitanje FormData u server akcijama. */
export const fdStr = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

export const fdAll = (fd: FormData, key: string): string[] =>
  fd.getAll(key).filter((v): v is string => typeof v === "string");

/** Svi string unosi kao objekat, da forma posle greške prikaže ono što je korisnik uneo. */
export function fdValues(fd: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(fd.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const all = fdAll(fd, key);
    out[key] = all.length > 1 || key.endsWith("[]") ? all : (all[0] ?? "");
  }
  return out;
}

export type FormState = {
  errors?: Record<string, string>;
  warnings?: Record<string, string>;
  values?: Record<string, string | string[]>;
  duplicates?: { id: string; name: string; reason: string }[];
  conflictVehicleId?: string;
  message?: string;
};

export const val = (s: FormState, key: string, fallback = ""): string => {
  const v = s.values?.[key];
  return typeof v === "string" ? v : fallback;
};
