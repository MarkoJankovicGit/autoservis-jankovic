import { test } from "node:test";
import assert from "node:assert/strict";
import { appDatabaseUrl } from "./store.ts";

test("aplikacija ide kroz Supabase transaction pooler (6543), ostale adrese se ne menjaju", () => {
  const session = "postgresql://postgres.abc:Lozinka123@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";
  assert.equal(appDatabaseUrl(session), "postgresql://postgres.abc:Lozinka123@aws-1-eu-central-1.pooler.supabase.com:6543/postgres");
  assert.equal(appDatabaseUrl(session + "?sslmode=require"), "postgresql://postgres.abc:Lozinka123@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require");

  const unchanged = [
    "postgresql://postgres.abc:Lozinka123@aws-1-eu-central-1.pooler.supabase.com:6543/postgres",
    "postgresql://postgres:Lozinka123@db.abc.supabase.co:5432/postgres",
    "postgresql://postgres:x@localhost:5432/autoservis",
    // lozinka koja liči na adresu ne sme da se menja
    "postgresql://postgres.abc:a.pooler.supabase.com:5432x@aws-1-eu-central-1.pooler.supabase.com:6543/postgres",
  ];
  for (const u of unchanged) assert.equal(appDatabaseUrl(u), u);
});
