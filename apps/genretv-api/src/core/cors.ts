const localhostAnyPort = "http://localhost:*";
const ipv4LoopbackAnyPort = "http://127.0.0.1:*";
const loopbackPatterns = new Set([localhostAnyPort, ipv4LoopbackAnyPort]);

export const localDevelopmentAllowedOrigins = [localhostAnyPort, ipv4LoopbackAnyPort] as const;

export function allowedOriginsForRequest(configuredOrigins: readonly string[], request: Request): string[] {
  const exactOrigins = configuredOrigins.filter((origin) => !loopbackPatterns.has(origin));
  const requestOrigin = request.headers.get("origin");

  if (requestOrigin && matchesConfiguredLoopbackOrigin(requestOrigin, configuredOrigins)) {
    exactOrigins.push(requestOrigin);
  }

  return exactOrigins;
}

export function corsPreflightResponse(request: Request, configuredOrigins: readonly string[]): Response {
  const headers = new Headers({
    "Access-Control-Allow-Headers":
      request.headers.get("access-control-request-headers") ?? "Content-Type,Authorization,apikey",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });

  return withAllowedOriginCors(request, new Response(null, { status: 204, headers }), configuredOrigins);
}

export function withAllowedOriginCors(
  request: Request,
  response: Response,
  configuredOrigins: readonly string[],
): Response {
  const requestOrigin = request.headers.get("origin");
  const allowedOrigins = allowedOriginsForRequest(configuredOrigins, request);
  if (!requestOrigin || (!allowedOrigins.includes("*") && !allowedOrigins.includes(requestOrigin))) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", requestOrigin);
  appendVaryOrigin(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function matchesConfiguredLoopbackOrigin(requestOrigin: string, configuredOrigins: readonly string[]): boolean {
  let parsed: URL;
  try {
    parsed = new URL(requestOrigin);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:") return false;
  if (parsed.hostname === "localhost") return configuredOrigins.includes(localhostAnyPort);
  if (parsed.hostname === "127.0.0.1") return configuredOrigins.includes(ipv4LoopbackAnyPort);
  return false;
}

function appendVaryOrigin(headers: Headers): void {
  const vary = headers.get("Vary");
  if (!vary) {
    headers.set("Vary", "Origin");
    return;
  }

  if (!vary.split(",").some((value) => value.trim().toLowerCase() === "origin")) {
    headers.append("Vary", "Origin");
  }
}
