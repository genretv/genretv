import { spawnSync } from "node:child_process";
import { createPrivateKey, sign } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { waitForHttpOk, waitForPgReady, waitForTcpService } from "./lib";

const COMPOSE_FILE = "infra/compose/genretv-compose.yml";
const ENV_FILE = process.env["GENRETV_INFRA_ENV_FILE"] ?? "infra/compose/genretv.env";
const CERT_DIR = "infra/compose/certs";
const LABEL = process.env["GENRETV_INFRA_LABEL"] ?? "infra:local:up";
const postgresPort = Number(process.env["GENRETV_POSTGRES_PORT"] ?? 54322);
const envoyPort = Number(process.env["GENRETV_ENVOY_PORT"] ?? 54331);
const electricPort = Number(process.env["GENRETV_ELECTRIC_PORT"] ?? 54330);
const caddyPort = Number(process.env["GENRETV_CADDY_PORT"] ?? 54343);
const userSeedContainer = process.env["GENRETV_USER_SEED_CONTAINER"] ?? "genretv-user-seed";
const publishableKey = process.env["GENRETV_PUBLISHABLE_KEY"] ?? "sb_publishable_genretvLOCALxxxxxxxxxxx_demo0000";
const localUserPassword = process.env["GENRETV_LOCAL_USER_PASSWORD"] ?? "genretv-local-password";
const DATABASE_URL =
  process.env["DATABASE_URL"] ??
  `postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:${postgresPort}/postgres?sslmode=disable`;

interface LocalJwtKey {
  alg?: string;
  kid?: string;
  [key: string]: unknown;
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function localServiceRoleKey(): string {
  const rawKeys = process.env["GOTRUE_JWT_KEYS"];
  if (rawKeys == null || rawKeys.trim() === "") {
    return process.env["GENRETV_SECRET_KEY"] ?? "sb_secret_genretvLOCALxxxxxxxxxxxxxx_demo0000";
  }

  const keys = JSON.parse(rawKeys) as LocalJwtKey[];
  const key = keys.find((candidate) => candidate.alg === "ES256") ?? keys[0];
  if (key == null) throw new Error(`[${LABEL}] GOTRUE_JWT_KEYS does not contain a signing key`);

  const encodedHeader = base64UrlJson({
    alg: key.alg ?? "ES256",
    typ: "JWT",
    ...(key.kid == null ? {} : { kid: key.kid }),
  });
  const encodedPayload = base64UrlJson({
    iss: "supabase",
    ref: process.env["GENRETV_COMPOSE_PROJECT"] ?? "genretv-local",
    role: "service_role",
    iat: Math.floor(Date.now() / 1000),
    exp: 2_000_000_000,
  });
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const privateKey = createPrivateKey({ key: key as JsonWebKey, format: "jwk" });
  const signature = sign("sha256", Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");

  return `${signingInput}.${signature}`;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function waitForUserSeed(env: NodeJS.ProcessEnv): void {
  const result = spawnSync("podman", ["wait", userSeedContainer], { env, encoding: "utf8", timeout: 120_000 });
  if (result.status !== 0) {
    throw new Error(`[${LABEL}] User seed did not finish: ${result.stderr.trim()}`);
  }

  const exitCode = Number(result.stdout.trim());
  if (exitCode !== 0) {
    throw new Error(`[${LABEL}] User seed exited with ${exitCode}`);
  }
}

async function waitForMaintainerLogin(timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  const url = `http://localhost:${envoyPort}/auth/v1/token?grant_type=password`;

  while (Date.now() - start < timeoutMs) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "maintainer@genretv.local",
        password: localUserPassword,
      }),
    }).catch(() => null);

    if (response?.status === 200) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`[${LABEL}] Timed out waiting for seeded maintainer login`);
}

function ensureLocalCert(): boolean {
  const certFile = path.join(CERT_DIR, "localhost.pem");
  const keyFile = path.join(CERT_DIR, "localhost-key.pem");
  if (existsSync(certFile) && existsSync(keyFile)) return true;

  if (spawnSync("mkcert", ["-CAROOT"], { stdio: "ignore" }).status !== 0) {
    console.warn(
      `[${LABEL}] mkcert not found; https://localhost:${caddyPort} will be unavailable. ` +
        `The plain gateway on http://localhost:${envoyPort} still works.`,
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
  console.error(`\n[${LABEL}] readiness failed; dumping compose state:`);
  for (const args of [
    ["compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE, "ps"],
    ["compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE, "logs", "--tail", "100", "db", "auth", "envoy"],
  ]) {
    spawnSync("podman", args, { env, stdio: "inherit" });
  }
}

async function main(): Promise<void> {
  const env = { ...process.env, DATABASE_URL, GENRETV_SECRET_KEY: localServiceRoleKey() };
  const certReady = ensureLocalCert();

  run("bun", ["run", "edge:build"], env);
  run("podman", ["compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE, "up", "-d", "db"], env);
  await waitForTcpService("127.0.0.1", postgresPort, "GenreTV Postgres");
  await waitForPgReady(DATABASE_URL);

  run("bun", ["run", "db:migrate:local"], env);
  run("bun", ["run", "db:seed:canonical:local"], env);

  run("podman", ["compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE, "up", "-d"], env);
  run(
    "podman",
    [
      "compose",
      "-f",
      COMPOSE_FILE,
      "--env-file",
      ENV_FILE,
      "up",
      "-d",
      "--force-recreate",
      "functions",
      "envoy",
      "caddy",
    ],
    env,
  );

  const readiness = [
    waitForTcpService("127.0.0.1", envoyPort, "GenreTV Envoy gateway"),
    waitForTcpService("127.0.0.1", electricPort, "GenreTV Electric"),
  ];
  if (certReady) {
    readiness.push(waitForTcpService("127.0.0.1", caddyPort, "GenreTV Caddy"));
  }

  try {
    await Promise.all(readiness);
    await waitForHttpOk(`http://localhost:${envoyPort}/auth/v1/health`, "GenreTV GoTrue");
  } catch (error) {
    dumpComposeStateOnFailure(env);
    throw error;
  }

  run(
    "podman",
    ["compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE, "--profile", "seed", "up", "-d", "user-seed"],
    env,
  );
  waitForUserSeed(env);
  await waitForMaintainerLogin();

  console.log(`\nGenreTV stack is up (${LABEL}):`);
  if (certReady) console.log(`  Browser gateway: https://localhost:${caddyPort}`);
  console.log(`  Plain gateway:   http://localhost:${envoyPort}`);
  console.log(`  Studio:          http://localhost:${process.env["GENRETV_STUDIO_PORT"] ?? 54333}`);
  console.log(`  Postgres:        localhost:${postgresPort}`);
}

await main();
