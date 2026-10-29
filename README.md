# Automehaničar Janković

Web aplikacija za evidenciju vozila, naloga, podsetnika i finansija radnje Automehaničar Janković. Plan i obim: `PLAN_RADA.md`. Brending: `brand/BRENDING.md`.

## Pokretanje lokalno

Potrebno: Node 24+, pnpm kroz corepack.

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
cp .env.example .env.local
```

U `.env.local` upiši:

```bash
pnpm hash-password "lozinka-servisa"
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Prva komanda daje vrednost za `APP_PASSWORD_HASH`, druga za `SESSION_SECRET`. Zatim:

```bash
pnpm dev
```

Aplikacija je na http://localhost:3000.

## Komande

| Komanda | Šta radi |
|---|---|
| `pnpm dev` | razvojni server |
| `pnpm build` | produkcioni build |
| `pnpm lint` / `pnpm typecheck` | provere koda |
| `pnpm hash-password` | heš lozinke za `APP_PASSWORD_HASH` |
| `pnpm icons` | ponovo generiše ikonice i kopira logo iz `brand/` |
| `pnpm test` / `pnpm test:coverage` | testovi (Node test runner), pokrivenost domain sloja mora biti 100 % linija |
| `pnpm seed` | briše lokalne podatke i puni izmišljene klijente i vozila |

## Podaci do uvođenja baze

Dok baza ne postoji, podaci se čuvaju u `.data/dev-db.json` (nije u gitu). To radi samo lokalno; na Vercelu skladište namerno javlja grešku. Ostatak koda koristi use-case funkcije iz `src/server/`, pa prelazak na Postgres ne menja ekrane.

## Pravila za zavisnosti

- Verzije mlađe od 7 dana se ne instaliraju (`minimumReleaseAge` u `pnpm-workspace.yaml`).
- Install skripte zavisnosti su blokirane (`strictDepBuilds`); izuzetak samo kroz `allowBuilds`, uz odobrenje.
- Novi paket van osnovnog steka se dodaje tek posle provere i odobrenja.
- shadcn komponente: `pnpm --config.minimumReleaseAge=10080 dlx shadcn@4.22.1 add <ime>`.

## Pristup

Jedna lozinka za servis. Sesija traje godinu dana po uređaju. Promena `APP_PASSWORD_HASH` odjavljuje sve uređaje. Javne strane bez prijave su samo `/k/<token>` (karton za mušteriju) i `/n/<token>` (narudžbenica za dobavljača).
