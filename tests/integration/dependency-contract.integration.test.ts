import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const pgxsinkitPackages = ["client", "contracts", "react", "server"] as const;

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

describe("dependency contract", () => {
  test("keeps all pgxsinkit packages on one dev-channel build", async () => {
    const lock = await readFile("bun.lock", "utf8");
    const versions = new Map<string, string>();

    for (const name of pgxsinkitPackages) {
      const match = lock.match(new RegExp(`"@pgxsinkit/${name}": \\["@pgxsinkit/${name}@([^"]+)"`));
      expect(match?.[1]).toStartWith("0.1.");
      versions.set(name, match?.[1] ?? "");
    }

    expect(new Set(versions.values()).size).toBe(1);
  });

  test("keeps workspace pgxsinkit manifests pinned to the dev spec", async () => {
    const packageJsonPaths = await workspacePackageJsonPaths();

    for (const path of packageJsonPaths) {
      const manifest = JSON.parse(await readFile(path, "utf8")) as PackageJson;
      const deps = { ...manifest.dependencies, ...manifest.devDependencies };

      for (const [name, spec] of Object.entries(deps)) {
        if (name.startsWith("@pgxsinkit/")) {
          expect(spec, `${path} ${name}`).toBe("dev");
        }
      }
    }
  });
});

async function workspacePackageJsonPaths(): Promise<string[]> {
  const paths = ["package.json"];

  for (const parent of ["apps", "packages"]) {
    for (const entry of await readdir(parent, { withFileTypes: true })) {
      if (entry.isDirectory()) paths.push(join(parent, entry.name, "package.json"));
    }
  }

  return paths;
}
