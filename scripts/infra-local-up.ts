import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { waitForHttpOk, waitForPgReady, waitForTcpService } from "./lib";

const COMPOSE_FILE = "infra/compose/genretv-compose.yml";
const ENV_FILE = "infra/compose/genretv.env";
const CERT_DIR = "infra/compose/certs";
const DATABASE_URL =
  process.env["DATABASE_URL"] ??
  "postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:54322/postgres?sslmode=disable";

function run(command: string, args: string[], env: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function ensureLocalCert(): boolean {
  const certFile = path.join(CERT_DIR, "localhost.pem");
  const keyFile = path.join(CERT_DIR, "localhost-key.pem");
  if (existsSync(certFile) && existsSync(keyFile)) return true;

  if (spawnSync("mkcert", ["-CAROOT"], { stdio: "ignore" }).status !== 0) {
    console.warn(
      "[infra:local:up] mkcert not found; https://localhost:54343 will be unavailable. " +
        "The plain gateway on http://localhost:54331 still works.",
    );
    return false;
  }

  mkdirSync(CERT_DIR, { recursive: true });
  const result = spawnSync("mkcert", ["-cert-file", certFile, "-key-file", keyFile, "localhost", "127.0.0.1", "::1"], {
    stdio: "inherit",
  });
  return result.status === 0;
}

function dumpComposeStateOnFailure(env: NodeJS.ProcessEnv): void {
  console.error("\n[infra:local:up] readiness failed; dumping compose state:");
  for (const args of [
    ["compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE, "ps"],
    ["compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE, "logs", "--tail", "100", "db", "auth", "envoy"],
  ]) {
    spawnSync("podman", args, { env, stdio: "inherit" });
  }
}

async function main(): Promise<void> {
  const env = { ...process.env, DATABASE_URL };
  const certReady = ensureLocalCert();

  run("bun", ["run", "edge:build"], env);
  run("podman", ["compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE, "up", "-d", "db"], env);
  await waitForTcpService("127.0.0.1", 54322, "GenreTV Postgres");
  await waitForPgReady(DATABASE_URL);

  run("bun", ["run", "db:migrate:local"], env);
  run("bun", ["run", "db:seed:canonical:local"], env);

  run("podman", ["compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE, "up", "-d"], env);

  const readiness = [
    waitForTcpService("127.0.0.1", 54331, "GenreTV Envoy gateway"),
    waitForTcpService("127.0.0.1", 54330, "GenreTV Electric"),
  ];
  if (certReady) {
    readiness.push(waitForTcpService("127.0.0.1", 54343, "GenreTV Caddy"));
  }

  try {
    await Promise.all(readiness);
    await waitForHttpOk("http://localhost:54331/auth/v1/health", "GenreTV GoTrue");
  } catch (error) {
    dumpComposeStateOnFailure(env);
    throw error;
  }

  run(
    "podman",
    ["compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE, "--profile", "seed", "up", "-d", "user-seed"],
    env,
  );

  console.log("\nGenreTV local stack is up:");
  if (certReady) console.log("  Browser gateway: https://localhost:54343");
  console.log("  Plain gateway:   http://localhost:54331");
  console.log("  Studio:          http://localhost:54333");
  console.log("  Postgres:        localhost:54322");
}

await main();
