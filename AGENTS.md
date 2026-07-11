# GenreTV Agent Guide

<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `bunx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `bunx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

## ⛔ NEVER USE SQL STRINGS IF YOU CAN USE DRIZZLE OBJECTS ⛔

**This is a hard rule. SQL written as a JavaScript string is the LAST resort, never the default.**
Every database expression — schema, queries, RLS policies, row filters, checks, defaults — climbs this
strict hierarchy, and you must use the **highest tier that works**:

1. **① Pure Drizzle objects (BEST — default to this):** `eq`/`and`/`or`/`inArray`/`exists`/`sql`-free
   operators, real column objects, `pgPolicy`, query-builder subqueries, the official
   `drizzle-orm/supabase` helpers (`authUid`, `authenticatedRole`, …). Rename-safe, type-checked.
2. **② `sql\`…\``with TYPED interpolation:** when ① can't express it, use a tagged`sql\`…\`` template
that interpolates **column objects** (`${table.col}`), **table objects** (`${table}`), `c(col)`for
Electric's bare-identifier`where`, and **bound params** (`${value}`). Never bake identifiers or
   values into the template text as literals when a typed interpolation exists.
3. **③ SQL in a string (LAST RESORT — must be justified):** a raw string / `sql.raw(...)` is allowed
   **only** for SQL that Drizzle genuinely cannot express — `GRANT`/`REVOKE`, `CREATE FUNCTION`
   (PL/pgSQL bodies), triggers, SECURITY DEFINER helpers, `current_setting('request.jwt.claims')`
   JSON extraction, `jsonb_array_elements`. If you reach for tier ③, the bar is "no tier ① or ② form
   exists" — say so explicitly in a comment.

**Electric note:** the read-path sync `customWhere` is tier ② by necessity — Electric's shape grammar
requires _bare_ columns, so `c(col)` (not `eq`, which qualifies) is the ceiling there.

Before writing any SQL-bearing string, stop and ask: _can this be a Drizzle object, or a typed
`sql\`\``?_ If yes, it MUST be. Reviewers will reject tier ③ that had a tier ①/② form.

## Release & tooling standard

genretv follows the **Cross-repo TypeScript release & versioning standard** (defined in the global
agent guide, `~/.claude/CLAUDE.md`; full rationale in
[docs/adr/0031](docs/adr/0031-unified-ts-release-versioning-tooling-standard.md)). genretv is the
**consumer** side — it publishes nothing to a registry, so the versioning/publishing rules do not
apply here. What does apply:

- **Scripts are check-default.** `bun run format` / `bun run lint` **check** (non-mutating); use
  `format:write` / `lint:fix` to change files. `bun run validate` is the pre-commit gate
  (auto-installed via `prepare` → `hooks:install`).
- **Compiler:** standard `typescript` v7+. Prefer the package script `bun run typecheck` over manually
  running `tsc ...`; the root script checks every TypeScript project in this repo.
- **Consuming `@pgxsinkit/*`:** installed from **public npm release pins** by
  default (what CI, the k3s build, and prod use). To preview unreleased library work locally, use
  the dev-channel scripts — `bun run dev:link` (switch to the GitHub Packages `@dev` channel and move
  to the latest `@dev` build), `bun run dev:bump` (already linked → re-resolve to the latest `@dev`),
  `bun run dev:unlink` (restore the release pins), `bun run dev:status`. Never commit the dev pins.
  See `docs/runbooks/consuming-conform-ed-and-pgxsinkit.md`.
- **Agent Skills (TanStack Intent) — install them, and keep them current.** `@pgxsinkit/*` ships
  version-pinned Agent Skills (`skills/**/SKILL.md`) inside each installed package; `load` always prints
  the skill matching the installed version. **Before doing pgxsinkit work** (sync, registry/row-filter
  authoring, the Electric proxy, `packages/offline-data`), discover and load the relevant skill instead
  of guessing the API — it complements pgxsinkit's `llms.txt` (broad model) with task-scoped guidance.
  - `bunx @tanstack/intent@latest install` — write/refresh the `intent-skills` loading block in this
    file (`AGENTS.md`; `CLAUDE.md` is a symlink to it). Run on a fresh clone and whenever the shipped
    skill set changes.
  - `bunx @tanstack/intent@latest list` — what's shipped. For pgxsinkit (what genretv installs):
    `@pgxsinkit/client` → `core`, `operating`; `@pgxsinkit/contracts` → `registry-authoring`;
    `@pgxsinkit/server` → `deploying`. Other installed deps also ship skills worth loading in their
    area — `@electric-sql/client` (`electric-debugging`) and `@tanstack/router-*`.
    `bunx @tanstack/intent@latest load @pgxsinkit/contracts#registry-authoring` prints one.
  - `bunx @tanstack/intent@latest stale` — flag drift after a dependency change.
  - **Updating is automatic:** skills travel with the package, so `bun run dev:bump` / `bun update`
    brings the matching skill version — no re-install needed; just re-`load`.
  - **Always use the `@latest` form** — `@electric-sql/client` also ships an `intent` bin, so a bare
    `intent` from `node_modules/.bin` can resolve to the wrong CLI. The `intent.skills` allowlist in
    `package.json` scopes which packages surface.
  - These skills are **living artifacts under hardening**: when integration surfaces a gap or wrong
    assumption, fix it **upstream** in `pgxsinkit/pgxsinkit` (the `SKILL.md` _and_ its source doc), not
    in pgxsinkit — same rule as any `@pgxsinkit/*` bug. Full loop in the consuming runbook.

## Product context

pgxsinkit is a tool for discovering currently showing sci-fi and fantasy TV shows and related movies

The primary frontend stack is `React` + `TanStack Router`.
The backend stack is `Deno`, with shared schema and data contracts centered around `Drizzle`.

## Repository shape

- `apps/genretv` — main user-facing website
- `apps/genretv-api` — backend services
- `infra/` — podman/compose resources

## Hard stop policies for AI assistants and agents

- Hard-stop policy: do not create a temporary file unless its path is under `tmp/agents/` (or another repo-approved `tmp/*` override explicitly requested by the user).
- NEVER place temporary files in the main project directories, at the root, or in /tmp.
- Hard-stop policy: if a command or workflow would create a root-level scratch file (for example `./scratch.ts`, `./debug.log`), abort and reroute it to `tmp/agents/` first.
- If a temporary file is accidentally created outside `tmp/`, delete or move it immediately before any further edits, tests, or commands.

## Project Technologies

- typescript >=7
- react + tanstack router + tanstack hotkeys + tanstack pacer
- mantine v9 (component library — see .claude/rules/)
- mise
- bun, including `SQL/sql` for postgresql server access (not `pg` or `postgres.js`)
- vite
- zod v4+
- drizzle-orm v1.0.0 or above (currently RC)
- pgxsinkit (see workspace project for details)
- pglite
- postgres 17+
- supabase
- electric-sql

## Working rules for assistants

- Use `genretv` / `@genretv/*` as the repo-wide name and namespace.
- Unless specifically instructed, always use the latest stable versions of dependencies, and prefer built-in features over adding new dependencies.
- Prefer feature-local code inside each app, and only move code to `packages/` when it is shared.
- For frontend work, prefer React components and hooks in `.tsx` files.
- Keep route files in `src/routes/`, reusable UI in `packages/ui`, and shared domain logic in `packages/domain`.
- Keep PGlite sync concerns in `packages/offline-data`, not scattered across apps.
- If a bug is in `@pgxsinkit/*` do not add app-layer workarounds in `genretv`; fix it upstream first, then update or publish and upgrade dependencies/references in `genretv`.
- Prefer package scripts over direct tool invocation: `bun run typecheck` not manual `tsc ...`, `bun run lint` not `oxlint`, `bun run format` not `oxfmt`. Use `bun test` for tests and `bun run validate:full` for full validation. Direct tool invocation is only a fallback when no package script exists.
- Verify claims with real commands before saying work is complete.
- Keep accessibility and learner clarity high: semantic HTML, keyboard support, readable copy, and explicit empty/error states.

---

## Frontend guidance

_Applies when working on React, TanStack Router, Mantine, or shared frontend packages._

- Default to React function components and hooks in `.tsx` files.
- Use Mantine v9 (NOT v8) for all UI components — do not build custom implementations
  of things Mantine already provides (modals, tables, forms, notifications, dates).
- Shared Mantine theme and component wrappers live in `packages/ui`.
- Organize new work by feature: `src/features/<feature-name>/`, with route entrypoints under `src/routes/`.
- Keep reusable visual components generic and move them to `packages/ui` only when at least two apps need them.
- Shared domain types, validation, and language-learning entities belong in `packages/domain`.
- PGlite and pgxsinkit sync logic belong in `packages/offline-data`.
- Prefer clear, accessible UX for users and admins: explicit labels, keyboard-friendly forms, and readable status text.

## Mantine documentation

- Live docs via MCP server (configured in .mcp.json)
- Full reference if needed (MCP unavailable): https://mantine.dev/llms-full.txt

## Infrastructure guidance

_Applies when working on podman compose configuration._

- Podman and Podman Compose are explicitly allowed and preferred for container-backed integration tests and local dev infrastructure.
- For compose specs, avoid the filename `docker-compose.yml`; store compose manifests under `infra/compose/` using podman-oriented names.

## Testing guidance

_Applies when adding or fixing unit, integration, or end-to-end tests._

- Follow TDD where practical: write or update the failing test first, then implement the minimal fix.
- Test real behavior, not mock-only behavior.
- Frontend unit/component tests should use `bun test`; browser flows should use `Playwright`.
- Backend and integration tests for the Bun service should use `bun test`.
- Integration policy split (current baseline):
- PR and main branch gates must run `bun run validate:full` and `bun run test:integration`.
- Container-backed integration tests should run with isolated Podman Compose projects and must tear containers down after each run.
- Favor meaningful assertions over snapshot-heavy tests.
- Before declaring success, run the relevant verification commands and report the actual results.

---
