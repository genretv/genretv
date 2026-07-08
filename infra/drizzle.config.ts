import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: ["./packages/domain/src/schema.ts"],
  out: "./infra/drizzle",
  dbCredentials: {
    url:
      process.env["DATABASE_URL"] ??
      "postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:54322/postgres?sslmode=disable",
  },
  // Supabase owns anon/authenticated/service_role; our Drizzle schema only references them in policies.
  entities: {
    roles: {
      provider: "supabase",
    },
  },
});
