import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env["GENRETV_E2E_PORT"] ?? 5174);
const host = process.env["GENRETV_E2E_HOST"] ?? "127.0.0.1";
const baseURL = process.env["PLAYWRIGHT_BASE_URL"] ?? `http://${host}:${port}`;
const workers = Number(process.env["GENRETV_E2E_WORKERS"] ?? 1);

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "offline.spec.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  outputDir: "tmp/agents/playwright-results",
  timeout: 120_000,
  expect: {
    timeout: 90_000,
  },
  fullyParallel: false,
  workers,
  reporter: process.env["CI"] ? [["dot"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: `bun --env-file=infra/compose/genretv-e2e.env run dev:genretv -- --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_E2E: "1",
      VITE_GENRETV_SUPABASE_URL: process.env["VITE_GENRETV_SUPABASE_URL"] ?? "http://localhost:55431",
      VITE_GENRETV_PUBLISHABLE_KEY:
        process.env["VITE_GENRETV_PUBLISHABLE_KEY"] ?? "sb_publishable_genretvE2Exxxxxxxxxxxx_demo0000",
      VITE_GENRETV_FUNCTIONS_REGION: process.env["VITE_GENRETV_FUNCTIONS_REGION"] ?? "",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
