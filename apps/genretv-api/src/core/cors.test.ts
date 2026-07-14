import { describe, expect, test } from "bun:test";

import { allowedOriginsForRequest, withAllowedOriginCors } from "./cors";

describe("GenreTV CORS origins", () => {
  test("expands a localhost wildcard to the request's exact origin", () => {
    const request = new Request("https://api.example.test", {
      headers: { origin: "http://localhost:61234" },
    });

    expect(allowedOriginsForRequest(["https://genretv.github.io", "http://localhost:*"], request)).toEqual([
      "https://genretv.github.io",
      "http://localhost:61234",
    ]);
  });

  test("supports IPv4 loopback ports without allowing lookalike hosts", () => {
    const allowed = ["http://127.0.0.1:*", "http://localhost:*"];
    const loopbackRequest = new Request("https://api.example.test", {
      headers: { origin: "http://127.0.0.1:43991" },
    });
    const lookalikeRequest = new Request("https://api.example.test", {
      headers: { origin: "http://localhost.example.com:43991" },
    });

    expect(allowedOriginsForRequest(allowed, loopbackRequest)).toContain("http://127.0.0.1:43991");
    expect(allowedOriginsForRequest(allowed, lookalikeRequest)).toEqual([]);
  });

  test("does not let the HTTP localhost pattern authorize HTTPS or arbitrary origins", () => {
    const allowed = ["http://localhost:*"];
    const httpsRequest = new Request("https://api.example.test", {
      headers: { origin: "https://localhost:5660" },
    });
    const remoteRequest = new Request("https://api.example.test", {
      headers: { origin: "https://example.com" },
    });

    expect(allowedOriginsForRequest(allowed, httpsRequest)).toEqual([]);
    expect(allowedOriginsForRequest(allowed, remoteRequest)).toEqual([]);
  });

  test("reflects only an allowed concrete origin in the response", () => {
    const request = new Request("https://api.example.test", {
      headers: { origin: "http://localhost:61234" },
    });
    const response = withAllowedOriginCors(request, new Response("ok"), ["http://localhost:*"]);

    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:61234");
    expect(response.headers.get("vary")).toBe("Origin");
  });
});
