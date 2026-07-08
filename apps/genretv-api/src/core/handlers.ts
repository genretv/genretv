import type { JwtClaims } from "@pgxsinkit/contracts";
import { proxyElectricShapeRequest } from "@pgxsinkit/server";

import { genretvSyncRegistry } from "../domain/registry";
import { routeToMutations } from "./routing";

export type GenretvClaimsResolver = (request: Request) => Promise<JwtClaims | null> | JwtClaims | null;
export type FetchHandler = (request: Request) => Promise<Response>;

export interface GenretvHandlerOptions {
  resolveAuthClaims: GenretvClaimsResolver;
  allowedOrigins: string[];
}

export interface GenretvSyncHandlerOptions extends GenretvHandlerOptions {
  electricUrl: string;
}

export function createGenretvWriteHandler(options: GenretvHandlerOptions): FetchHandler {
  return async (request) => {
    await options.resolveAuthClaims(request);
    const routed = routeToMutations(request, "genretv-write");
    return notImplemented("genretv-write", routed, options.allowedOrigins);
  };
}

export function createGenretvSyncHandler(options: GenretvSyncHandlerOptions): FetchHandler {
  return async (request) => {
    const claims = await options.resolveAuthClaims(request);
    return proxyElectricShapeRequest(request, claims, {
      registry: genretvSyncRegistry,
      electricUrl: options.electricUrl,
      cors: { origins: options.allowedOrigins },
      logTimings: true,
    });
  };
}

function notImplemented(
  route: string,
  request: Request,
  allowedOrigins: readonly string[],
  extra: Record<string, string> = {},
): Response {
  const headers = corsHeaders(request, allowedOrigins);
  return Response.json(
    {
      error: "genretv_registry_not_implemented",
      route,
      ...extra,
    },
    { status: 501, headers },
  );
}

function corsHeaders(request: Request, allowedOrigins: readonly string[]): Headers {
  const headers = new Headers();
  const origin = request.headers.get("origin");
  if (origin != null && allowedOrigins.includes(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "origin");
  }
  headers.set("access-control-allow-headers", "authorization, content-type, apikey");
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  return headers;
}
