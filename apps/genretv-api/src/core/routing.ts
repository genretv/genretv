// Supabase Edge Functions receive `/functions/v1/<function-name>/...` as `/<function-name>/...`.
// The shared handlers normalize that function prefix before handing requests to pgxsinkit.
export function stripFunctionPrefix(request: Request, functionName: string): Request {
  const url = new URL(request.url);
  const prefix = `/${functionName}`;

  if (url.pathname === prefix) {
    url.pathname = "/";
  } else if (url.pathname.startsWith(`${prefix}/`)) {
    url.pathname = url.pathname.slice(prefix.length);
  }

  return new Request(url.toString(), request);
}

/**
 * The client posts to the function root (`/functions/v1/genretv-write`), while the sync server's
 * batch mutation route is `/mutations`. Keep `/genretv-write/mutations` working too for explicit callers.
 */
export function routeToMutations(request: Request, functionName: string): Request {
  const stripped = stripFunctionPrefix(request, functionName);
  const url = new URL(stripped.url);

  if (stripped.method !== "OPTIONS" && url.pathname === "/") {
    url.pathname = "/mutations";
    return new Request(url.toString(), stripped);
  }

  return stripped;
}
