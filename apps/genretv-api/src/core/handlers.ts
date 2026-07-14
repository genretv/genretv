import type { PgAsyncDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type { JwtClaims, RegistryRelations } from "@pgxsinkit/contracts";
import { createSyncServer, proxyElectricShapeRequest } from "@pgxsinkit/server";

import { genretvSyncRegistry } from "../domain/registry";
import { allowedOriginsForRequest, corsPreflightResponse, withAllowedOriginCors } from "./cors";
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
    allowedOrigins: [],
  });

  return async (request) => {
    if (request.method === "OPTIONS") {
      return corsPreflightResponse(request, options.allowedOrigins);
    }

    const response = await server.fetch(routeToMutations(request, "genretv-write"));
    return withAllowedOriginCors(request, response, options.allowedOrigins);
  };
}

export function createGenretvSyncHandler(options: GenretvSyncHandlerOptions): FetchHandler {
  return async (request) => {
    const claims = await options.resolveAuthClaims(request);
    const response = await proxyElectricShapeRequest(request, claims, {
      registry: genretvSyncRegistry,
      electricUrl: options.electricUrl,
      cors: { origins: allowedOriginsForRequest(options.allowedOrigins, request) },
      logTimings: true,
    });
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };
}
