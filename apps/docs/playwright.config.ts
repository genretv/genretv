import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const port = 5175;
const host = "127.0.0.1";
const baseURL = `http://${host}:${port}`;

export default defineConfig({
  testDir: "./screenshots",
  globalSetup: "../../tests/e2e/global-setup.ts",
  globalTeardown: "../../tests/e2e/global-teardown.ts",
  outputDir: "../../tmp/agents/docs-screenshot-results",
  timeout: 120_000,
  expect: { timeout: 90_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: `bun --env-file=infra/compose/genretv-e2e.env run dev:genretv -- --host ${host} --port ${port}`,
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_E2E: "1",
      VITE_GENRETV_SUPABASE_URL: "http://localhost:55431",
      VITE_GENRETV_PUBLISHABLE_KEY: "sb_publishable_genretvE2Exxxxxxxxxxxx_demo0000",
      VITE_GENRETV_FUNCTIONS_REGION: "",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
