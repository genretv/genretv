import { describe, expect, test } from "bun:test";

import { defaultAllowedOrigins, parseAllowedOrigins, requireEnv } from "./env";

describe("GenreTV runtime environment", () => {
  test("allows the real local Vite origins by default", () => {
    expect(defaultAllowedOrigins).toContain("http://localhost:*");
    expect(defaultAllowedOrigins).toContain("http://127.0.0.1:*");
  });

  test("parses an explicit cloud CORS allow-list", () => {
    expect(parseAllowedOrigins("https://genretv.github.io, http://localhost:5660")).toEqual([
      "https://genretv.github.io",
      "http://localhost:5660",
    ]);
  });

  test("requires the first available runtime value", () => {
    expect(requireEnv({ PRIMARY: undefined, FALLBACK: "value" }, ["PRIMARY", "FALLBACK"], "missing")).toBe("value");
    expect(() => requireEnv({}, ["PRIMARY"], "missing")).toThrow("missing");
  });
});
