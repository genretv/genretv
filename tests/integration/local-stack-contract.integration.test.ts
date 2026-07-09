import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const gatewayUrl = process.env["GENRETV_LOCAL_GATEWAY_URL"] ?? "http://localhost:54331";
const publishableKey = process.env["VITE_GENRETV_PUBLISHABLE_KEY"] ?? "sb_publishable_genretvLOCALxxxxxxxxxxx_demo0000";
const localUserPassword = process.env["GENRETV_LOCAL_USER_PASSWORD"] ?? "genretv-local-password";

describe("local Supabase and Electric stack contract", () => {
  test("compose exposes the local pgxsinkit shape used by management testing", async () => {
    const compose = await readFile("infra/compose/genretv-compose.yml", "utf8");
    const envoy = await readFile("infra/compose/genretv/envoy.yaml", "utf8");
    const stackUpScript = await readFile("scripts/infra-stack-up.ts", "utf8");
    const edgeBuildScript = await readFile("apps/genretv/scripts/build-edge-functions.ts", "utf8");
    const e2eEnv = await readFile("infra/compose/genretv-e2e.env", "utf8");
    const playwright = await readFile("playwright.config.ts", "utf8");

    expect(compose).toContain("supabase/postgres:17");
    expect(compose).toContain("supabase/gotrue");
    expect(compose).toContain("supabase/edge-runtime");
    expect(compose).toContain("electricsql/electric");
    expect(compose).toContain("envoyproxy/envoy");
    expect(envoy).toContain("/functions/v1/");
    expect(compose).toContain("${GENRETV_FUNCTIONS_MOUNT:-../../supabase/functions-dist}:/home/deno/functions:ro");
    expect(edgeBuildScript).toContain('process.env["GENRETV_FUNCTIONS_DIST"]');
    expect(compose).toContain("${GENRETV_ENVOY_PORT:-54331}:8000");
    expect(compose).toContain("${GENRETV_ELECTRIC_PORT:-54330}:3000");
    expect(compose).toContain("${GENRETV_POSTGRES_PORT:-54322}:5432");
    expect(compose).toContain("${GENRETV_DB_CONTAINER:-genretv-db}");
    expect(e2eEnv).toContain("GENRETV_COMPOSE_PROJECT=genretv-e2e");
    expect(e2eEnv).toContain("GENRETV_DB_CONTAINER=genretv-e2e-db");
    expect(e2eEnv).toContain("GENRETV_FUNCTIONS_DIST=tmp/agents/e2e-functions-dist");
    expect(e2eEnv).toContain("GENRETV_FUNCTIONS_MOUNT=../../tmp/agents/e2e-functions-dist");
    expect(e2eEnv).toContain("GENRETV_POSTGRES_PORT=55422");
    expect(e2eEnv).toContain("GENRETV_ENVOY_PORT=55431");
    expect(playwright).toContain("globalSetup");
    expect(playwright).toContain("genretv-e2e.env");
    expect(playwright).toContain("http://localhost:55431");
    expect(compose).not.toContain("postgrest");
    expect(stackUpScript).toContain('"--force-recreate"');
    expect(stackUpScript).toContain('"functions"');
  });

  test("local user seed provides the accounts required by E2E management flows", async () => {
    const seedScript = await readFile("infra/compose/genretv/seed-users.sh", "utf8");

    expect(seedScript).toContain(`password="${"${GENRETV_LOCAL_USER_PASSWORD:-genretv-local-password}"}"`);
    expect(seedScript).toContain(
      'create_user "maintainer@genretv.local" "[\\"canonical_maintainer\\",\\"publisher\\"]"',
    );
    expect(seedScript).toContain('create_user "publisher@genretv.local" "[\\"publisher\\"]"');
    expect(seedScript).toContain('create_user "user@genretv.local" "[]"');
  });
});

describe("live local stack", () => {
  const liveTest = process.env["GENRETV_RUN_LOCAL_STACK_TESTS"] === "1" ? test : test.skip;

  liveTest("auth health endpoint is reachable through the plain local gateway", async () => {
    const response = await fetch(`${gatewayUrl}/auth/v1/health`);

    expect(response.status).toBe(200);
  });

  liveTest("seeded maintainer can receive a Supabase session", async () => {
    const response = await fetch(`${gatewayUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "maintainer@genretv.local",
        password: localUserPassword,
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { access_token?: unknown; user?: { email?: unknown } };
    expect(typeof body.access_token).toBe("string");
    expect(body.user?.email).toBe("maintainer@genretv.local");
  });
});
