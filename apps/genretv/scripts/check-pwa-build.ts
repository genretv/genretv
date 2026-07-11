import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const distPath = resolve(process.cwd(), process.env["GENRETV_OUTDIR"] ?? "dist");
const dist = pathToFileURL(`${distPath}/`);
const assets = new URL("assets/", dist);
const serviceWorker = readFileSync(new URL("sw.js", dist), "utf8");
const manifest = JSON.parse(readFileSync(new URL("manifest.webmanifest", dist), "utf8")) as {
  display?: string;
  icons?: Array<{ sizes?: string; src?: string }>;
  scope?: string;
  start_url?: string;
};
const assetNames = readdirSync(assets);

assert(manifest.start_url === "/", "manifest start_url must be root");
assert(manifest.scope === "/", "manifest scope must be root");
assert(manifest.display === "standalone", "manifest must use standalone display");
for (const size of ["192x192", "512x512"]) {
  const icon = manifest.icons?.find((candidate) => candidate.sizes === size);
  assert(icon?.src != null, `manifest is missing its ${size} icon`);
  assert(existsSync(new URL(icon.src.replace(/^\//, ""), dist)), `${size} icon is missing from the build`);
}

for (const expected of [
  /^pglite-.*\.wasm$/,
  /^pglite-.*\.data$/,
  /^initdb-.*\.wasm$/,
  /^pg_dump-.*\.wasm$/,
  /^genretv-sync\.worker-.*\.js$/,
  /^canonical-export\.worker-.*\.js$/,
]) {
  const name = assetNames.find((candidate) => expected.test(candidate));
  assert(name != null, `build is missing essential PWA asset ${expected}`);
  assert(serviceWorker.includes(`assets/${name}`), `service worker does not precache ${name}`);
}

assert(serviceWorker.includes("docs(?:\\/|$)"), "service worker must exclude /docs from the app-shell fallback");
assert(serviceWorker.includes("genretv-docs-pages"), "service worker must retain visited documentation pages");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
