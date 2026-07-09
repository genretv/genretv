import { spawnSync } from "node:child_process";

const COMPOSE_FILE = "infra/compose/genretv-compose.yml";
const ENV_FILE = process.env["GENRETV_INFRA_ENV_FILE"] ?? "infra/compose/genretv.env";
const LABEL = process.env["GENRETV_INFRA_LABEL"] ?? "infra:local:down";

const args = ["compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE, "down", "--remove-orphans"];
if (process.argv.includes("--volumes")) args.push("-v");

const result = spawnSync("podman", args, { env: process.env, stdio: "inherit" });
if (result.status !== 0) {
  throw new Error(`[${LABEL}] Command failed: podman ${args.join(" ")}`);
}
