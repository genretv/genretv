import { describe, expect, test } from "bun:test";

import { routeToMutations, stripFunctionPrefix } from "./routing";

describe("genretv function routing", () => {
  test("strips the Supabase function prefix", () => {
    const request = new Request("http://localhost/genretv-sync?table=show");
    expect(new URL(stripFunctionPrefix(request, "genretv-sync").url).pathname).toBe("/");
  });

  test("keeps explicit genretv-write mutation subpath", () => {
    const request = new Request("http://localhost/genretv-write/mutations", { method: "POST" });
    expect(new URL(routeToMutations(request, "genretv-write").url).pathname).toBe("/mutations");
  });

  test("rewrites bare genretv-write POSTs to mutations", () => {
    const request = new Request("http://localhost/genretv-write", { method: "POST" });
    expect(new URL(routeToMutations(request, "genretv-write").url).pathname).toBe("/mutations");
  });
});
