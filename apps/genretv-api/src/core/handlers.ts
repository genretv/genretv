import type { PgAsyncDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type { JwtClaims, RegistryRelations } from "@pgxsinkit/contracts";
import { createSyncServer, proxyElectricShapeRequest } from "@pgxsinkit/server";

import { genretvSyncRegistry } from "../domain/registry";
import { routeToMutations } from "./routing";

export type GenretvClaimsResolver = (request: Request) => Promise<JwtClaims | null> | JwtClaims | null;
export type GenretvDb = PgAsyncDatabase<PgQueryResultHKT, RegistryRelations<typeof genretvSyncRegistry>>;
export type FetchHandler = (request: Request) => Promise<Response>;

export interface GenretvHandlerOptions {
  resolveAuthClaims: GenretvClaimsResolver;
  allowedOrigins: string[];
}

export interface GenretvWriteHandlerOptions extends GenretvHandlerOptions {
  db: GenretvDb;
}

export interface GenretvSyncHandlerOptions extends GenretvHandlerOptions {
  electricUrl: string;
}

export function createGenretvWriteHandler(options: GenretvWriteHandlerOptions): FetchHandler {
  const server = createSyncServer({
    registry: genretvSyncRegistry,
    db: options.db,
    resolveAuthClaims: options.resolveAuthClaims,
    deployment: {
      startupVerification: "deploy-time",
      operationsLog: "disabled",
    },
    logTimings: true,
    allowedOrigins: options.allowedOrigins,
  });

  return (request) => server.fetch(routeToMutations(request, "genretv-write"));
}

export function createGenretvSyncHandler(options: GenretvSyncHandlerOptions): FetchHandler {
  return async (request) => {
    const claims = await options.resolveAuthClaims(request);
    const response = await proxyElectricShapeRequest(request, claims, {
      registry: genretvSyncRegistry,
      electricUrl: options.electricUrl,
      cors: { origins: options.allowedOrigins },
      logTimings: true,
    });
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };
}
