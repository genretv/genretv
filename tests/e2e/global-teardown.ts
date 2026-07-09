import { spawnSync } from "node:child_process";

export default function globalTeardown() {
  if (process.env["GENRETV_E2E_KEEP_STACK"] === "1") return;

  const result = spawnSync("bun", ["run", "infra:e2e:down"], { env: process.env, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error("E2E teardown failed while stopping the disposable stack");
  }
}
