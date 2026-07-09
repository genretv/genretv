import { spawnSync } from "node:child_process";

function runScript(script: string): void {
  const result = spawnSync("bun", ["run", script], { env: process.env, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`E2E setup failed while running ${script}`);
  }
}

export default function globalSetup() {
  runScript("infra:e2e:down");
  runScript("infra:e2e:up");
}
