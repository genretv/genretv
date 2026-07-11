import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

describe("managed cloud deployment contract", () => {
  test("deploys the sanctioned prebuilt Deno bundles", async () => {
    const config = await readFile("supabase/config.toml", "utf8");
    const cloudScript = await readFile("scripts/genretv-cloud.ts", "utf8");

    expect(config).toContain('entrypoint = "./functions-dist/genretv-write/index.js"');
    expect(config).toContain('entrypoint = "./functions-dist/genretv-sync/index.js"');
    expect(cloudScript).toContain('run("bun", ["run", "edge:build"])');
    expect(cloudScript).toContain('run(supabaseBin, ["functions", "deploy", "genretv-write", "genretv-sync"])');
  });

  test("keeps canonical seeding explicit and outside repeatable deploy", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8")) as { scripts?: Record<string, string> };
    const scripts = manifest.scripts ?? {};

    expect(scripts["cloud:deploy"]).toBe("bun scripts/genretv-cloud.ts deploy");
    expect(scripts["cloud:seed"]).toBe("bun scripts/genretv-cloud.ts seed");
    expect(scripts["cloud:dev"]).toBe("bun scripts/genretv-cloud.ts dev");
  });
});
