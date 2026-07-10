import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

// PGlite boot-asset pre-warm needs to `?url`-import the wasm/data files, but
// PGlite's package `exports` field does not expose `./dist/*`, so a bare `@electric-sql/pglite/dist/…`
// specifier is rejected by the resolver. Resolve the dist directory from the package main and alias a
// `pglite-boot-asset/<file>` prefix onto the real absolute paths, so `pglite-boot-asset/pglite.wasm?url`
// resolves (with the `?url` query preserved) in both `vite dev` and `vite build`. The regex form keeps
// the trailing `?url` on the captured group.
const pgliteDistDir = dirname(createRequire(import.meta.url).resolve("@electric-sql/pglite"));
const pgliteAssetAlias = { find: /^pglite-boot-asset\/(.+)$/, replacement: `${pgliteDistDir}/$1` };

const appBase = process.env["GENRETV_BASE"];
const appOutDir = process.env["GENRETV_OUTDIR"];

export default defineConfig({
  envDir: workspaceRoot,
  base: appBase ?? "/",
  ...(appOutDir ? { build: { outDir: appOutDir, emptyOutDir: true } } : {}),
  plugins: [react()],
  resolve: {
    alias: [pgliteAssetAlias],
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    exclude: ["@electric-sql/pglite"],
  },
  worker: {
    format: "es",
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  server: {
    port: 5660,
    host: "0.0.0.0",
    allowedHosts: [
      "genretv.loc.delinin.com",
      "k3d-internal-service-genretv",
      "k3d-internal-service-genretv.genretv.svc",
    ],
  },
});
