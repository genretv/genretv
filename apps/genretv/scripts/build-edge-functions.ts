import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const distRoot = resolve(root, "supabase/functions-dist");

const functions = [
  {
    entrypoint: "supabase/functions/genretv-sync/index.ts",
    outdir: "supabase/functions-dist/genretv-sync",
  },
  {
    entrypoint: "supabase/functions/genretv-write/index.ts",
    outdir: "supabase/functions-dist/genretv-write",
  },
] as const;

for (const fn of functions) {
  const result = await Bun.build({
    entrypoints: [resolve(root, fn.entrypoint)],
    outdir: resolve(root, fn.outdir),
    target: "browser",
    format: "esm",
    splitting: false,
    sourcemap: "none",
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
}

const mainOut = resolve(distRoot, "main/index.ts");
await mkdir(dirname(mainOut), { recursive: true });
await copyFile(resolve(root, "supabase/functions/main/index.ts"), mainOut);

console.log("Built genretv edge functions into supabase/functions-dist");
