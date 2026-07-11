import { describe, expect, test } from "bun:test";

import { deploymentSteps, frontendCloudEnv, parseCloudEnv, stepsFor, validateCloudEnv } from "./genretv-cloud";

const validEnv = {
  GENRETV_SUPABASE_URL: "https://example.supabase.co",
  GENRETV_PUBLISHABLE_KEY: "sb_publishable_example",
  GENRETV_DATABASE_URL: "postgresql://postgres:password@example.supabase.co:5432/postgres",
  GENRETV_FUNCTIONS_REGION: "eu-central-1",
  ELECTRIC_SHAPE_URL: "https://example.electric-sql.cloud/v1/shape?source_id=source&secret=secret",
};

describe("GenreTV cloud orchestration", () => {
  test("parses comments, spacing, and quoted values", () => {
    expect(
      parseCloudEnv(`
        # comment
        GENRETV_SUPABASE_URL = https://example.supabase.co
        GENRETV_PUBLISHABLE_KEY="sb_publishable_example"
        IGNORED_LINE
      `),
    ).toEqual({
      GENRETV_SUPABASE_URL: "https://example.supabase.co",
      GENRETV_PUBLISHABLE_KEY: "sb_publishable_example",
    });
  });

  test("keeps canonical seeding out of normal deploys", () => {
    expect(deploymentSteps).toEqual(["migrate", "secrets", "functions"]);
    expect(stepsFor("deploy")).toEqual(["migrate", "secrets", "functions"]);
    expect(stepsFor("seed")).toEqual(["seed"]);
  });

  test("derives safe browser variables from server-side cloud names", () => {
    expect(frontendCloudEnv(validEnv)).toEqual({
      VITE_GENRETV_SUPABASE_URL: "https://example.supabase.co",
      VITE_GENRETV_PUBLISHABLE_KEY: "sb_publishable_example",
      VITE_GENRETV_FUNCTIONS_REGION: "eu-central-1",
    });
  });

  test("prefers explicit browser overrides", () => {
    expect(
      frontendCloudEnv({
        ...validEnv,
        VITE_GENRETV_SUPABASE_URL: "https://browser.example",
        VITE_GENRETV_PUBLISHABLE_KEY: "sb_publishable_browser",
      }),
    ).toMatchObject({
      VITE_GENRETV_SUPABASE_URL: "https://browser.example",
      VITE_GENRETV_PUBLISHABLE_KEY: "sb_publishable_browser",
    });
  });

  test("validates only the credentials needed by each operation", () => {
    expect(() => validateCloudEnv(validEnv, "deploy")).not.toThrow();
    expect(() => validateCloudEnv(validEnv, "dev")).not.toThrow();
    expect(() =>
      validateCloudEnv(
        {
          GENRETV_SUPABASE_URL: validEnv.GENRETV_SUPABASE_URL,
          GENRETV_DATABASE_URL: validEnv.GENRETV_DATABASE_URL,
        },
        "migrate",
      ),
    ).not.toThrow();
  });

  test("rejects placeholders before running external commands", () => {
    expect(() =>
      validateCloudEnv(
        {
          ...validEnv,
          ELECTRIC_SHAPE_URL: "https://YOUR_SOURCE_ID.electric-sql.cloud/v1/shape",
        },
        "deploy",
      ),
    ).toThrow("placeholder value for ELECTRIC_SHAPE_URL");
  });

  test("rejects an explicit CORS list that excludes the cloud dev origin", () => {
    expect(() =>
      validateCloudEnv(
        {
          ...validEnv,
          GENRETV_ALLOWED_ORIGINS: "https://genretv.github.io,http://localhost:5173",
        },
        "dev",
      ),
    ).toThrow("must include http://localhost:5660");
  });
});
