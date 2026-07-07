import type { FetchHandler } from "./handlers";

export interface GenretvBackendFetchOptions {
  genretvWrite: FetchHandler;
  genretvSync: FetchHandler;
}

export function createGenretvBackendFetch(options: GenretvBackendFetchOptions): FetchHandler {
  return async (request) => {
    const { pathname } = new URL(request.url);

    if (pathname === "/genretv-write" || pathname.startsWith("/genretv-write/")) {
      return options.genretvWrite(request);
    }

    if (pathname === "/genretv-sync" || pathname.startsWith("/genretv-sync/")) {
      return options.genretvSync(request);
    }

    if (pathname === "/health" || pathname === "/_internal/health") {
      return Response.json({ ok: true });
    }

    return Response.json({ message: "Not found" }, { status: 404 });
  };
}
