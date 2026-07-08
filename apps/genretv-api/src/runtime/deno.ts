import { createGenretvClaimsResolver } from "../core/auth";
import { createGenretvSyncHandler, createGenretvWriteHandler } from "../core/handlers";
import { createDenoGenretvDb } from "./deno-db";
import { parseAllowedOrigins, requireEnv } from "./env";

interface DenoRuntime {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (request: Request) => Promise<Response>) => void;
}

const deno = (globalThis as { Deno?: DenoRuntime }).Deno;

export function serveGenretvWrite(): void {
  requireDeno().serve(createDenoGenretvWriteHandler());
}

export function serveGenretvSync(): void {
  requireDeno().serve(createDenoGenretvSyncHandler());
}

export function createDenoGenretvWriteHandler() {
  const env = readDenoEnv();
  return createGenretvWriteHandler({
    db: createDenoGenretvDb(
      requireEnv(env, ["SUPABASE_DB_URL"], "SUPABASE_DB_URL is not set — genretv-write cannot reach Postgres."),
    ),
    resolveAuthClaims: createGenretvClaimsResolver({
      supabaseUrl: requireEnv(
        env,
        ["SUPABASE_URL"],
        "SUPABASE_URL is not set — genretv functions cannot resolve the GoTrue JWKS.",
      ),
      logTimings: true,
    }),
    allowedOrigins: parseAllowedOrigins(env["GENRETV_ALLOWED_ORIGINS"]),
  });
}

export function createDenoGenretvSyncHandler() {
  const env = readDenoEnv();
  return createGenretvSyncHandler({
    electricUrl: env["ELECTRIC_SHAPE_URL"] ?? "http://electric:3000/v1/shape",
    resolveAuthClaims: createGenretvClaimsResolver({
      supabaseUrl: requireEnv(
        env,
        ["SUPABASE_URL"],
        "SUPABASE_URL is not set — genretv functions cannot resolve the GoTrue JWKS.",
      ),
      logTimings: true,
    }),
    allowedOrigins: parseAllowedOrigins(env["GENRETV_ALLOWED_ORIGINS"]),
  });
}

function readDenoEnv(): Record<string, string | undefined> {
  const runtime = requireDeno();
  return {
    ELECTRIC_SHAPE_URL: runtime.env.get("ELECTRIC_SHAPE_URL"),
    GENRETV_ALLOWED_ORIGINS: runtime.env.get("GENRETV_ALLOWED_ORIGINS"),
    SUPABASE_DB_URL: runtime.env.get("SUPABASE_DB_URL"),
    SUPABASE_URL: runtime.env.get("SUPABASE_URL"),
  };
}

function requireDeno(): DenoRuntime {
  if (!deno) {
    throw new Error("Deno runtime is required for this adapter.");
  }

  return deno;
}
