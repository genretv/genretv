import { describe, expect, test } from "bun:test";

import { createGenretvSyncHandler, createGenretvWriteHandler, type GenretvDb } from "./handlers";

const preflight = new Request("https://api.example.test/functions/v1/genretv-sync", {
  method: "OPTIONS",
  headers: {
    origin: "http://localhost:61234",
    "access-control-request-headers": "authorization,apikey",
    "access-control-request-method": "GET",
  },
});

describe("GenreTV handler CORS", () => {
  test("allows an arbitrary localhost port on the Electric proxy", async () => {
    const handler = createGenretvSyncHandler({
      electricUrl: "https://electric.example.test/v1/shape",
      resolveAuthClaims: () => null,
      allowedOrigins: ["http://localhost:*"],
    });

    const response = await handler(preflight);

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:61234");
  });

  test("allows an arbitrary localhost port on mutations", async () => {
    const handler = createGenretvWriteHandler({
      db: {} as GenretvDb,
      resolveAuthClaims: () => null,
      allowedOrigins: ["http://localhost:*"],
    });

    const response = await handler(preflight);

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:61234");
  });
});
