#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SCOPE = "@pgxsinkit/";
const BUNFIG = join(ROOT, "bunfig.toml");
const BUNFIG_EXAMPLE = join(ROOT, "bunfig.toml.example");
const TOKEN_PLACEHOLDER = "ghp_YOUR_READ_PACKAGES_TOKEN";
const DEP_KEYS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;
const SPEC_RE = /"(@pgxsinkit\/[^"]+)"(\s*:\s*)"[^"]*"/g;

interface Manifest {
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

function workspaceManifestPaths(): string[] {
  const root = readJson<Manifest>(join(ROOT, "package.json"));
  const dirs = new Set<string>();
  for (const pattern of root.workspaces ?? []) {
    const base = pattern.endsWith("/*") ? pattern.slice(0, -2) : pattern;
    let entries: string[];
    try {
      entries = readdirSync(join(ROOT, base));
    } catch {
      continue;
    }
    for (const entry of entries) dirs.add(join(ROOT, base, entry));
  }
  return [join(ROOT, "package.json"), ...[...dirs].map((dir) => join(dir, "package.json")).filter(existsSync)];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function scopedDeps(path: string): Record<string, string> {
  const pkg = readJson<Manifest>(path);
  const out: Record<string, string> = {};
  for (const key of DEP_KEYS) {
    const deps = pkg[key];
    if (!deps) continue;
    for (const [name, spec] of Object.entries(deps)) {
      if (name.startsWith(SCOPE)) out[name] = spec;
    }
  }
  return out;
}

function token(): string {
  for (const key of ["GH_PACKAGES_TOKEN", "GITHUB_TOKEN"] as const) {
    const value = process.env[key];
    if (value) return value;
  }
  const proc = spawnSync("gh", ["auth", "token"], { encoding: "utf8" });
  const value = proc.status === 0 ? proc.stdout.trim() : "";
  if (!value) {
    console.error("No GitHub token. Run `gh auth refresh -s read:packages`, or set GH_PACKAGES_TOKEN.");
    process.exit(1);
  }
  return value;
}

function ensureBunfig(): void {
  if (existsSync(BUNFIG)) return;
  if (!existsSync(BUNFIG_EXAMPLE)) {
    console.error("Missing bunfig.toml.example; cannot configure GitHub Packages.");
    process.exit(1);
  }
  const text = readFileSync(BUNFIG_EXAMPLE, "utf8").split(TOKEN_PLACEHOLDER).join(token());
  writeFileSync(BUNFIG, text);
  console.log("Wrote gitignored bunfig.toml for GitHub Packages.");
}

function rewriteSpecs(targetFor: (name: string, path: string) => string | null): number {
  let changed = 0;
  for (const path of workspaceManifestPaths()) {
    const text = readFileSync(path, "utf8");
    const next = text.replace(SPEC_RE, (match, name: string, sep: string) => {
      const target = targetFor(name, path);
      if (target === null) return match;
      const replacement = `"${name}"${sep}"${target}"`;
      if (replacement !== match) changed++;
      return replacement;
    });
    if (next !== text) writeFileSync(path, next);
  }
  return changed;
}

function run(cmd: string, args: string[]): void {
  const proc = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit" });
  if (proc.status !== 0) process.exit(proc.status ?? 1);
}

function updateDev(): void {
  ensureBunfig();
  rewriteSpecs(() => "dev");
  let updated = 0;
  for (const path of workspaceManifestPaths()) {
    const names = Object.keys(scopedDeps(path)).sort();
    if (names.length === 0) continue;
    run("bun", ["update", "--cwd", dirname(path), ...names.map((name) => `${name}@dev`)]);
    updated += names.length;
  }
  if (updated === 0) {
    console.log("No @pgxsinkit dependencies found.");
    return;
  }
  rewriteSpecs(() => "dev");
  run("bun", ["run", "format:write"]);
}

function gitHeadSpec(path: string, name: string): string | null {
  const rel = relative(ROOT, path);
  const proc = spawnSync("git", ["show", `HEAD:${rel}`], { cwd: ROOT, encoding: "utf8" });
  if (proc.status !== 0) return null;
  return scopedDepsFromText(proc.stdout)[name] ?? null;
}

function scopedDepsFromText(text: string): Record<string, string> {
  const pkg = JSON.parse(text) as Manifest;
  const out: Record<string, string> = {};
  for (const key of DEP_KEYS) {
    const deps = pkg[key];
    if (!deps) continue;
    for (const [name, spec] of Object.entries(deps)) {
      if (name.startsWith(SCOPE)) out[name] = spec;
    }
  }
  return out;
}

function link(): void {
  updateDev();
  console.log("Linked @pgxsinkit dependencies to the GitHub Packages dev channel.");
}

function bump(): void {
  updateDev();
  console.log("Bumped @pgxsinkit dependencies to the latest dev channel build.");
}

function unlink(): void {
  if (existsSync(BUNFIG)) {
    rmSync(BUNFIG);
    console.log("Removed bunfig.toml.");
  }
  const restored = rewriteSpecs((name, path) => gitHeadSpec(path, name));
  console.log(`Restored ${restored} @pgxsinkit spec(s) from HEAD.`);
  run("bun", ["install"]);
  run("bun", ["run", "format:write"]);
}

function status(): void {
  console.log(`dev channel: ${existsSync(BUNFIG) ? "linked" : "not linked"}`);
  for (const path of workspaceManifestPaths()) {
    const rel = relative(ROOT, path);
    for (const [name, spec] of Object.entries(scopedDeps(path))) {
      let installed = "";
      try {
        const pkg = readJson<{ version?: string }>(join(ROOT, "node_modules", name, "package.json"));
        installed = pkg.version ? ` (installed ${pkg.version})` : "";
      } catch {
        /* dependency is not installed */
      }
      console.log(`${rel}: ${name}@${spec}${installed}`);
    }
  }
}

const command = process.argv[2];
if (command === "link") link();
else if (command === "bump") bump();
else if (command === "unlink") unlink();
else if (command === "status") status();
else {
  console.error("Usage: bun run dev:link | dev:bump | dev:unlink | dev:status");
  process.exit(1);
}
