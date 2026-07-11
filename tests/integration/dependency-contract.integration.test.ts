import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const pgxsinkitPackages = ["client", "contracts", "react", "server"] as const;

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

describe("dependency contract", () => {
  test("keeps all installed pgxsinkit packages on one release", async () => {
    const lock = await readFile("bun.lock", "utf8");
    const versions = new Map<string, string>();

    for (const name of pgxsinkitPackages) {
      const match = lock.match(new RegExp(`"@pgxsinkit/${name}": \\["@pgxsinkit/${name}@([^"]+)"`));
      expect(match?.[1]).toStartWith("0.1.");
      versions.set(name, match?.[1] ?? "");
    }

    expect(new Set(versions.values()).size).toBe(1);
  });

  test("keeps workspace pgxsinkit manifests on one exact stable release pin", async () => {
    const packageJsonPaths = await workspacePackageJsonPaths();
    const versions = new Set<string>();

    for (const path of packageJsonPaths) {
      const manifest = JSON.parse(await readFile(path, "utf8")) as PackageJson;
      const deps = { ...manifest.dependencies, ...manifest.devDependencies };

      for (const [name, spec] of Object.entries(deps)) {
        if (name.startsWith("@pgxsinkit/")) {
          expect(spec, `${path} ${name}`).toMatch(/^0\.1\.\d+$/);
          versions.add(spec);
        }
      }
    }

    expect(versions.size).toBe(1);
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
