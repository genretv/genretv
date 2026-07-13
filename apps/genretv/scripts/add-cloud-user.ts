import { existsSync, readFileSync } from "node:fs";
import { emitKeypressEvents } from "node:readline";
import type { ReadStream, WriteStream } from "node:tty";

import { createClient } from "@supabase/supabase-js";

import { parseCloudEnv, supabaseProject } from "../../../scripts/genretv-cloud";

const cloudEnvFile = "genretv.cloud.env";
const usage = "Usage: bun run cloud:user:add <email> <publisher|canonical_maintainer>";

const roleProfiles = {
  publisher: ["publisher"],
  canonical_maintainer: ["canonical_maintainer", "publisher"],
} as const;

export type CloudUserProfile = keyof typeof roleProfiles;

interface CloudUserArgs {
  email: string;
  profile: CloudUserProfile;
}

interface Keypress {
  ctrl?: boolean;
  meta?: boolean;
  name?: string;
}

export function rolesForProfile(profile: CloudUserProfile): string[] {
  return [...roleProfiles[profile]];
}

export function parseCloudUserArgs(argv: readonly string[]): CloudUserArgs {
  if (argv.length !== 2) throw new Error(usage);

  const email = argv[0]!.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${argv[0]} is not a valid email address.`);
  }

  const profile = argv[1];
  if (profile !== "publisher" && profile !== "canonical_maintainer") {
    throw new Error("The role must be publisher or canonical_maintainer.");
  }

  return { email, profile };
}

export async function readHiddenLine(
  label: string,
  input: ReadStream = process.stdin,
  output: WriteStream = process.stdout,
): Promise<string> {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("Password entry requires an interactive terminal.");
  }

  output.write(label);
  emitKeypressEvents(input);
  const wasRaw = input.isRaw;
  input.setRawMode(true);
  input.resume();

  return new Promise((resolve, reject) => {
    const characters: string[] = [];

    const finish = (result: { value: string } | { error: Error }): void => {
      input.removeListener("keypress", onKeypress);
      input.setRawMode(wasRaw);
      input.pause();
      output.write("\n");
      if ("error" in result) reject(result.error);
      else resolve(result.value);
    };

    const onKeypress = (value: string | undefined, key: Keypress): void => {
      if (key.ctrl && key.name === "c") {
        finish({ error: new Error("User creation cancelled.") });
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        finish({ value: characters.join("") });
        return;
      }
      if (key.name === "backspace") {
        characters.pop();
        return;
      }
      if (value && !key.ctrl && !key.meta && key.name !== "escape") characters.push(value);
    };

    input.on("keypress", onKeypress);
  });
}

function loadCloudEnv(): Record<string, string> {
  if (!existsSync(cloudEnvFile)) {
    throw new Error(`Copy genretv.cloud.env.example to ${cloudEnvFile} and fill in the cloud values first.`);
  }
  return parseCloudEnv(readFileSync(cloudEnvFile, "utf8"));
}

function requiredSecretKey(env: Record<string, string>): string {
  const key = env["GENRETV_SECRET_KEY"];
  if (!key || key.includes("YOUR_") || key.includes("xxxxxxxx")) {
    throw new Error(`${cloudEnvFile} needs GENRETV_SECRET_KEY for this trusted one-time admin operation.`);
  }
  return key;
}

async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`${usage}\n\nAllowed role profiles:\n  publisher\n  canonical_maintainer (also grants publisher)`);
    return;
  }

  const { email, profile } = parseCloudUserArgs(process.argv.slice(2));
  const env = loadCloudEnv();
  const project = supabaseProject(env);
  const roles = rolesForProfile(profile);

  console.log(`Create ${email} in ${project.url} (project ref ${project.ref}) with roles: ${roles.join(", ")}`);
  const password = await readHiddenLine("Password: ");
  if (password.length === 0) throw new Error("Password must not be empty.");
  const confirmation = await readHiddenLine("Confirm password: ");
  if (password !== confirmation) throw new Error("Passwords do not match.");

  const supabase = createClient(project.url, requiredSecretKey(env), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { roles },
  });
  if (error) throw new Error(`Supabase rejected the new user: ${error.message}`);
  if (!data.user) throw new Error("Supabase reported success without returning the new user.");

  const { data: verification, error: verificationError } = await supabase.auth.admin.getUserById(data.user.id);
  if (verificationError) throw new Error(`Created the user but could not verify it: ${verificationError.message}`);
  const savedRoles = verification.user.app_metadata["roles"];
  if (!Array.isArray(savedRoles) || roles.some((role) => !savedRoles.includes(role))) {
    throw new Error(`Created user ${data.user.id}, but its saved app_metadata roles could not be verified.`);
  }

  console.log(`Created and verified ${email} (${data.user.id}) as ${profile}.`);
}

if (import.meta.main) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
