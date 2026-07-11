import { spawnSync } from "node:child_process";

const COMPOSE_FILE = "infra/compose/genretv-compose.yml";
const ENV_FILE = process.env["GENRETV_INFRA_ENV_FILE"] ?? "infra/compose/genretv.env";
const LABEL = process.env["GENRETV_INFRA_LABEL"] ?? "infra:local:down";

const args = ["compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE, "down", "--remove-orphans"];
if (process.argv.includes("--volumes")) args.push("-v");

const maxAttempts = 3;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const result = spawnSync("podman", args, { env: process.env, stdio: "inherit" });
  if (result.status === 0) process.exit(0);
  if (attempt < maxAttempts) {
    console.warn(`[${LABEL}] Teardown attempt ${attempt} failed; retrying the idempotent compose down.`);
    await Bun.sleep(attempt * 1_000);
  }
}

throw new Error(`[${LABEL}] Command failed after ${maxAttempts} attempts: podman ${args.join(" ")}`);
