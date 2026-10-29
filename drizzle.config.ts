import { defineConfig } from "drizzle-kit";

// Pravi SQL migracije iz šeme: pnpm db:generate. Bez pristupa bazi; migracije se primenjuju pri deploy-u (scripts/migrate.ts).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/store/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
});
