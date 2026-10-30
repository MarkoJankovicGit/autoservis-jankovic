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
| `pnpm db:generate` | posle izmene `src/server/store/schema.ts`: nova SQL migracija u `drizzle/` |
| `pnpm db:import-json` | jednokratno: prenosi stari `.data/dev-db.json` u lokalnu bazu |

## Baza i fotografije

| | Lokalno i testovi | Produkcija (Vercel) |
|---|---|---|
| Baza | PGlite (pravi Postgres u Node-u) u `.data/pglite`; testovi u memoriji | Supabase Postgres, Frankfurt (`DATABASE_URL`, Session pooler 5432; aplikacija sama ide na transaction pooler 6543); funkcije u `fra1` (`vercel.json`) |
| Fotografije | `.data/uploads` | privatan Supabase Storage bucket `fotografije` (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`) |
| Migracije | primenjuju se same pri pokretanju | `vercel-build` ih primenjuje pre build-a (samo Production) |

- Šema: `src/server/store/schema.ts`; migracije: `drizzle/`. Kolone prate entitete iz `src/domain/model.ts`.
- `src/server/store/store.ts` daje ostatku koda isti `read()`/`write()` kao ranije; upis ide kao jedna transakcija sa samo izmenjenim redovima.
- Lokalnu bazu drži jedan proces: zaustavi `pnpm dev` pre `pnpm seed` ili `pnpm db:import-json`.
- Provera posle deploy-a: `/api/zdravlje` (javno, samo „ok“ ili „greška“ za bazu i fotografije).
- Brisanje (`src/server/deletion.ts`): sa klijentom, vozilom ili nalogom nestaje sve što bez njih ne postoji (nalozi, uplate, računi, fotografije); trošak, narudžbenica i termin ostaju bez veze. Pre potvrde dijalog prikazuje tačan spisak. Brisanje je trajno; trag ostaje samo u noćnom bekapu.
- Noćni bekap: GitHub Actions `Noćni bekap baze` (tajna `SUPABASE_DB_URL`), čuva se 30 dana kao artifact.

## Pravila za zavisnosti

- Verzije mlađe od 7 dana se ne instaliraju (`minimumReleaseAge` u `pnpm-workspace.yaml`).
- Install skripte zavisnosti su blokirane (`strictDepBuilds`); izuzetak samo kroz `allowBuilds`, uz odobrenje.
- Novi paket van osnovnog steka se dodaje tek posle provere i odobrenja.
- shadcn komponente: `pnpm --config.minimumReleaseAge=10080 dlx shadcn@4.22.1 add <ime>`.

## Pristup

Jedna lozinka za servis. Sesija traje godinu dana po uređaju. Promena `APP_PASSWORD_HASH` odjavljuje sve uređaje. Posle 5 pogrešnih lozinki sa iste adrese prijava je zaključana 15 minuta (brojač je u bazi). Javne strane bez prijave su samo `/k/<token>` (karton za mušteriju) i `/n/<token>` (narudžbenica za dobavljača).
