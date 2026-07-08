import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { builtinModules, createRequire } from "node:module";
import { join, resolve } from "node:path";

import type { BunPlugin } from "bun";

const root = resolve(import.meta.dir, "../../..");
const requireFromApi = createRequire(join(root, "apps/genretv-api/package.json"));
const sourceRoot = "supabase/functions";
const distRoot = "supabase/functions-dist";

const functions = [
  {
    name: "genretv-sync",
  },
  {
    name: "genretv-write",
  },
] as const;

const externalLibs = ["drizzle-orm", "jose", "postgres", "zod"] as const;

function installedVersion(lib: string): string {
  const manifestPath = requireFromApi.resolve(`${lib}/package.json`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { version?: string };
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    throw new Error(`Cannot read installed version of '${lib}' from node_modules.`);
  }
  return manifest.version;
}

const npmExternals: Record<string, string> = Object.fromEntries(
  externalLibs.map((lib) => [lib, `npm:${lib}@${installedVersion(lib)}`]),
);

const externalsPlugin: BunPlugin = {
  name: "deno-externals",
  setup(build) {
    const externalNames = [...Object.keys(npmExternals), ...builtinModules];
    build.onResolve({ filter: /.*/ }, (args) => {
      const base = args.path.replace(/^node:/, "").split("/")[0]!;
      if (externalNames.includes(base)) return { path: args.path, external: true };
      return undefined;
    });
  },
};

const builtinSet = new Set(builtinModules);

function rewriteExternals(code: string): string {
  return code.replace(/(\bfrom\s*|\bimport\s*\(\s*)(["'])([^"']+)\2/g, (match, head, quote, spec) => {
    const base = spec.replace(/^node:/, "").split("/")[0];
    if (npmExternals[base]) {
      const remainder = spec.slice(base.length);
      return `${head}${quote}${npmExternals[base]}${remainder}${quote}`;
    }
    if (builtinSet.has(base) && !spec.startsWith("node:")) {
      return `${head}${quote}node:${spec}${quote}`;
    }
    return match;
  });
}

rmSync(resolve(root, distRoot), { recursive: true, force: true });

for (const { name } of functions) {
  const outdir = resolve(root, distRoot, name);
  const result = await Bun.build({
    entrypoints: [resolve(root, sourceRoot, name, "index.ts")],
    outdir,
    target: "node",
    format: "esm",
    splitting: false,
    sourcemap: "none",
    minify: false,
    plugins: [externalsPlugin],
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }

  const outFile = join(outdir, "index.js");
  const rewritten = rewriteExternals(readFileSync(outFile, "utf8"));
  writeFileSync(outFile, rewritten);
  // The self-hosted Supabase edge-runtime worker loader resolves a function directory by looking for
  // index.ts. The bundled code is plain ESM JavaScript, but Deno accepts it under this extension.
  writeFileSync(join(outdir, "index.ts"), rewritten);
}

const mainOutDir = resolve(root, distRoot, "main");
mkdirSync(mainOutDir, { recursive: true });
copyFileSync(resolve(root, sourceRoot, "main/index.ts"), join(mainOutDir, "index.ts"));

console.log("Built genretv edge functions into supabase/functions-dist");
