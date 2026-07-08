import { createGenretvClaimsResolver } from "../core/auth";
import { createGenretvSyncHandler, createGenretvWriteHandler } from "../core/handlers";
import { createGenretvBackendFetch } from "../core/server";
import { createBunGenretvDb } from "./bun-db";
import { parseAllowedOrigins, requireEnv } from "./env";

const env = process.env;

const databaseUrl = requireEnv(
  env,
  ["DATABASE_URL", "SUPABASE_DB_URL"],
  "DATABASE_URL or SUPABASE_DB_URL is required for genretv-api.",
);
const supabaseUrl = requireEnv(
  env,
  ["SUPABASE_URL", "SUPABASE_PUBLIC_URL"],
  "SUPABASE_URL or SUPABASE_PUBLIC_URL is required for genretv-api.",
);
const electricUrl = env["ELECTRIC_SHAPE_URL"] ?? env["ELECTRIC_URL"] ?? "http://electric:3000/v1/shape";
const allowedOrigins = parseAllowedOrigins(env["GENRETV_ALLOWED_ORIGINS"]);
const port = Number(env["PORT"] ?? "3001");
const idleTimeout = Number(env["FUNCS_IDLE_TIMEOUT_SEC"] ?? "120");

const resolveAuthClaims = createGenretvClaimsResolver({ supabaseUrl, logTimings: true });
const fetch = createGenretvBackendFetch({
  genretvWrite: createGenretvWriteHandler({
    db: createBunGenretvDb(databaseUrl),
    resolveAuthClaims,
    allowedOrigins,
  }),
  genretvSync: createGenretvSyncHandler({
    electricUrl,
    resolveAuthClaims,
    allowedOrigins,
  }),
});

console.log("Starting genretv-api...", {
  port,
  electricUrl,
  allowedOrigins,
  databaseHost: redactDatabaseHost(databaseUrl),
});

Bun.serve({
  hostname: "0.0.0.0",
  port,
  idleTimeout,
  fetch,
});

function redactDatabaseHost(raw: string): string {
  try {
    const url = new URL(raw);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}`;
  } catch {
    return "<unparseable database url>";
  }
}
