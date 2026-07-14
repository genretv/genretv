import { localDevelopmentAllowedOrigins } from "../core/cors";

export const defaultAllowedOrigins = [...localDevelopmentAllowedOrigins];

export function parseAllowedOrigins(value: string | undefined): string[] {
  const origins = (value ?? defaultAllowedOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : defaultAllowedOrigins;
}

export function requireEnv(env: Record<string, string | undefined>, names: string[], message: string): string {
  for (const name of names) {
    const value = env[name];
    if (value) {
      return value;
    }
  }

  throw new Error(message);
}
