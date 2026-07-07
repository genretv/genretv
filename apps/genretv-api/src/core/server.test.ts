import { describe, expect, test } from "bun:test";

import { createGenretvBackendFetch } from "./server";

describe("genretv backend fetch", () => {
  test("dispatches canonical genretv function paths", async () => {
    const fetch = createGenretvBackendFetch({
      genretvWrite: async () => new Response("write"),
      genretvSync: async () => new Response("sync"),
    });

    expect(await (await fetch(new Request("http://localhost/genretv-write"))).text()).toBe("write");
    expect(await (await fetch(new Request("http://localhost/genretv-sync?table=show"))).text()).toBe("sync");
  });

  test("serves the Supabase chart health path", async () => {
    const fetch = createGenretvBackendFetch({
      genretvWrite: async () => new Response("write"),
      genretvSync: async () => new Response("sync"),
    });

    expect((await fetch(new Request("http://localhost/_internal/health"))).status).toBe(200);
  });
});
