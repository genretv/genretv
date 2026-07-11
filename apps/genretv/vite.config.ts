import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

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
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "GenreTV",
        short_name: "GenreTV",
        description: "Discover and manage science-fiction and fantasy television schedules.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#eeeeee",
        theme_color: "#075b64",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/docs(?:\/|$)/],
        globPatterns: ["**/*.{html,js,css,ico,png,svg,webp,avif,wasm,data}"],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.mode === "navigate" && url.pathname.startsWith("/docs/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "genretv-docs-pages",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: ({ request, url }) =>
              url.pathname.startsWith("/docs/") && ["script", "style", "font", "image"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "genretv-docs-assets",
              expiration: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
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
