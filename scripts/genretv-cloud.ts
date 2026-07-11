// Operate GenreTV against managed Supabase + Electric Cloud.
//
// The repeatable deployment path is deliberately non-destructive:
//
//   bun run cloud:deploy     # migrate -> secrets -> functions
//   bun run cloud:seed       # explicit canonical bootstrap/upsert; never part of deploy
//   bun run cloud:dev        # local Vite client -> cloud backend
//
// Project creation and Electric source creation remain one-time manual steps. Supabase CLI commands
// always receive the explicit project ref and never depend on mutable `supabase link` state.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const cloudEnvFile = "genretv.cloud.env";
const supabaseBin = process.env["SUPABASE_BIN"] ?? "supabase";
const placeholderMarkers = ["YOUR_", "xxxxxxxx", "<id>", "<secret>", "<ref>"];

export type CloudStep = "migrate" | "secrets" | "functions" | "seed";
export type CloudCommand = "deploy" | "dev" | CloudStep;

export const deploymentSteps = ["migrate", "secrets", "functions"] as const satisfies readonly CloudStep[];

export interface SupabaseProject {
  ref: string;
  url: string;
}

export function parseCloudEnv(contents: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const raw of contents.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals === -1) continue;
    env[line.slice(0, equals).trim()] = line
      .slice(equals + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2");
  }
  return env;
}

export function stepsFor(command: CloudCommand): readonly CloudStep[] {
  if (command === "deploy") return deploymentSteps;
  if (command === "dev") return [];
  return [command];
}

export function supabaseProject(env: Record<string, string>): SupabaseProject {
  const ref = requiredValue(env, "GENRETV_SUPABASE_PROJECT_REF", "Supabase project ref");
  if (!/^[a-z0-9]{20}$/.test(ref)) {
    throw new Error(`${cloudEnvFile} GENRETV_SUPABASE_PROJECT_REF must be the 20-character lowercase project ref.`);
  }

  const configuredUrl = env["GENRETV_SUPABASE_URL"];
  const url = configuredUrl
    ? requiredValue(env, "GENRETV_SUPABASE_URL", "Supabase project URL")
    : `https://${ref}.supabase.co`;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${cloudEnvFile} GENRETV_SUPABASE_URL must be a valid URL.`);
  }

  const standardHost = parsed.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
  if (standardHost && standardHost[1] !== ref) {
    throw new Error(`${cloudEnvFile} GENRETV_SUPABASE_URL does not match GENRETV_SUPABASE_PROJECT_REF (${ref}).`);
  }

  return { ref, url };
}

export function supabaseSecretsArgs(env: Record<string, string>, file: string): string[] {
  return ["secrets", "set", "--project-ref", supabaseProject(env).ref, "--env-file", file];
}

export function supabaseFunctionsArgs(env: Record<string, string>): string[] {
  return ["functions", "deploy", "--project-ref", supabaseProject(env).ref, "genretv-write", "genretv-sync"];
}

export function supabaseCliEnv(env: Record<string, string>): Record<string, string> {
  return {
    SUPABASE_ACCESS_TOKEN: requiredValue(
      env,
      "GENRETV_SUPABASE_ACCESS_TOKEN",
      "personal access token for the GenreTV Supabase account",
    ),
  };
}

export function frontendCloudEnv(env: Record<string, string>): Record<string, string> {
  const url = env["VITE_GENRETV_SUPABASE_URL"]
    ? requiredValue(env, "VITE_GENRETV_SUPABASE_URL", "local cloud frontend Supabase URL")
    : supabaseProject(env).url;
  const key = requiredOneOf(
    env,
    ["VITE_GENRETV_PUBLISHABLE_KEY", "GENRETV_PUBLISHABLE_KEY"],
    "local cloud frontend publishable key",
  );
  const region = env["VITE_GENRETV_FUNCTIONS_REGION"] ?? env["GENRETV_FUNCTIONS_REGION"];

  return {
    VITE_GENRETV_SUPABASE_URL: url,
    VITE_GENRETV_PUBLISHABLE_KEY: key,
    ...(region ? { VITE_GENRETV_FUNCTIONS_REGION: region } : {}),
  };
}

export function validateCloudEnv(env: Record<string, string>, command: CloudCommand): void {
  supabaseProject(env);

  if (command === "dev") {
    frontendCloudEnv(env);
    const configuredOrigins = env["GENRETV_ALLOWED_ORIGINS"];
    if (
      configuredOrigins &&
      !configuredOrigins
        .split(",")
        .map((origin) => origin.trim())
        .includes("http://localhost:5660")
    ) {
      throw new Error(
        `${cloudEnvFile} GENRETV_ALLOWED_ORIGINS must include http://localhost:5660 for cloud:dev. ` +
          "Update it, run `bun run cloud:secrets`, then retry.",
      );
    }
    return;
  }

  for (const step of stepsFor(command)) {
    if (step === "migrate" || step === "seed") {
      requiredValue(env, "GENRETV_DATABASE_URL", "direct Postgres connection");
    } else if (step === "secrets") {
      requiredValue(env, "ELECTRIC_SHAPE_URL", "Electric Cloud shape endpoint");
    }
    if (step === "secrets" || step === "functions") supabaseCliEnv(env);
  }
}

function loadCloudEnv(): Record<string, string> {
  const file = path.resolve(process.cwd(), cloudEnvFile);
  if (!existsSync(file)) {
    throw new Error(
      `${cloudEnvFile} not found. Copy genretv.cloud.env.example to ${cloudEnvFile} and fill in the cloud values.`,
    );
  }
  return parseCloudEnv(readFileSync(file, "utf8"));
}

function requiredValue(env: Record<string, string>, name: string, label: string): string {
  const value = env[name];
  if (!value) throw new Error(`${cloudEnvFile} is missing ${name} (${label}).`);
  if (placeholderMarkers.some((marker) => value.includes(marker))) {
    throw new Error(`${cloudEnvFile} still has a placeholder value for ${name} (${label}).`);
  }
  return value;
}

function requiredOneOf(env: Record<string, string>, names: readonly string[], label: string): string {
  for (const name of names) {
    const value = env[name];
    if (value && !placeholderMarkers.some((marker) => value.includes(marker))) return value;
  }
  throw new Error(`${cloudEnvFile} needs ${names.join(" or ")} (${label}).`);
}

function run(command: string, args: string[], extraEnv: Record<string, string> = {}): void {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  if (result.error) {
    const code = (result.error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(
        `\`${command}\` was not found. Install it or set SUPABASE_BIN to an executable path. See docs/runbooks/genretv-on-cloud.md.`,
      );
    }
    throw new Error(`Failed to start \`${command}\`: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Command failed (exit ${result.status ?? "killed"}): ${command} ${args.join(" ")}`);
  }
}

function requireSupabaseCli(): void {
  const result = spawnSync(supabaseBin, ["--version"], { stdio: "ignore" });
  if (result.error || result.status !== 0) {
    throw new Error(
      `The Supabase CLI (\`${supabaseBin}\`) is required and is not runnable. Install it, configure ` +
        "GENRETV_SUPABASE_ACCESS_TOKEN, or set SUPABASE_BIN. " +
        "See docs/runbooks/genretv-on-cloud.md.",
    );
  }
}

function migrate(env: Record<string, string>): void {
  run("bun", ["run", "db:migrate"], {
    DATABASE_URL: requiredValue(env, "GENRETV_DATABASE_URL", "direct Postgres connection"),
  });
}

function secrets(env: Record<string, string>): void {
  const directory = "tmp/agents";
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, "genretv-cloud-secrets.env");
  const lines = [`ELECTRIC_SHAPE_URL=${requiredValue(env, "ELECTRIC_SHAPE_URL", "Electric Cloud shape endpoint")}`];
  if (env["GENRETV_ALLOWED_ORIGINS"]) {
    lines.push(`GENRETV_ALLOWED_ORIGINS=${env["GENRETV_ALLOWED_ORIGINS"]}`);
  }

  try {
    writeFileSync(file, `${lines.join("\n")}\n`, { mode: 0o600 });
    run(supabaseBin, supabaseSecretsArgs(env, file), supabaseCliEnv(env));
  } finally {
    rmSync(file, { force: true });
  }
}

function functions(env: Record<string, string>): void {
  run("bun", ["run", "edge:build"]);
  run(supabaseBin, supabaseFunctionsArgs(env), supabaseCliEnv(env));
}

function seed(env: Record<string, string>): void {
  console.warn(
    "cloud:seed upserts the committed canonical seed. Use it for initial bootstrap or an intentional canonical refresh.",
  );
  run("bun", ["run", "db:seed:canonical"], {
    DATABASE_URL: requiredValue(env, "GENRETV_DATABASE_URL", "direct Postgres connection"),
  });
}

function dev(env: Record<string, string>): void {
  const browserEnv = frontendCloudEnv(env);
  const region = browserEnv["VITE_GENRETV_FUNCTIONS_REGION"];
  console.log(
    `\nGenreTV local Vite -> ${browserEnv["VITE_GENRETV_SUPABASE_URL"]}` +
      `${region ? `; write function pinned to ${region}` : ""}. Open http://localhost:5660.`,
  );
  run("bun", ["run", "dev:genretv"], browserEnv);
}

function parseCommand(value: string | undefined): CloudCommand {
  const command = value ?? "deploy";
  if (
    command === "deploy" ||
    command === "dev" ||
    command === "migrate" ||
    command === "secrets" ||
    command === "functions" ||
    command === "seed"
  ) {
    return command;
  }
  throw new Error(`Unknown cloud command \`${command}\`. Use deploy, dev, migrate, secrets, functions, or seed.`);
}

function main(): void {
  const command = parseCommand(process.argv[2]);
  const env = loadCloudEnv();
  validateCloudEnv(env, command);

  if (command === "dev") {
    dev(env);
    return;
  }

  const steps = stepsFor(command);
  if (steps.includes("secrets") || steps.includes("functions")) requireSupabaseCli();

  const project = supabaseProject(env);
  console.log(`GenreTV -> ${project.url} (project ref ${project.ref}). Steps: ${steps.join(" -> ")}`);
  for (const step of steps) {
    if (step === "migrate") migrate(env);
    else if (step === "secrets") secrets(env);
    else if (step === "functions") functions(env);
    else seed(env);
  }

  if (command === "deploy") {
    console.log(
      "\nCloud deploy complete. Run `bun run cloud:seed` only for an intended canonical bootstrap, then `bun run cloud:dev`.",
    );
  }
}

if (import.meta.main) main();
