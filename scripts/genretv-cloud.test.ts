import { describe, expect, test } from "bun:test";

import {
  deploymentSteps,
  frontendCloudEnv,
  parseCloudEnv,
  stepsFor,
  supabaseCliEnv,
  supabaseFunctionsArgs,
  supabaseProject,
  supabaseSecretsArgs,
  validateCloudEnv,
} from "./genretv-cloud";

const validEnv = {
  GENRETV_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
  GENRETV_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  GENRETV_SUPABASE_ACCESS_TOKEN: "sbp_genretv_account_token",
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
      VITE_GENRETV_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
      VITE_GENRETV_PUBLISHABLE_KEY: "sb_publishable_example",
      VITE_GENRETV_FUNCTIONS_REGION: "eu-central-1",
    });
  });

  test("uses the explicit project ref as the authoritative deployment target", () => {
    expect(supabaseProject(validEnv)).toEqual({
      ref: "abcdefghijklmnopqrst",
      url: "https://abcdefghijklmnopqrst.supabase.co",
    });
    expect(supabaseProject({ ...validEnv, GENRETV_SUPABASE_URL: "" })).toEqual({
      ref: "abcdefghijklmnopqrst",
      url: "https://abcdefghijklmnopqrst.supabase.co",
    });
    expect(supabaseSecretsArgs(validEnv, "tmp/agents/secrets.env")).toEqual([
      "secrets",
      "set",
      "--project-ref",
      "abcdefghijklmnopqrst",
      "--env-file",
      "tmp/agents/secrets.env",
    ]);
    expect(supabaseFunctionsArgs(validEnv)).toEqual([
      "functions",
      "deploy",
      "--project-ref",
      "abcdefghijklmnopqrst",
      "genretv-write",
      "genretv-sync",
    ]);
    expect(supabaseCliEnv(validEnv)).toEqual({
      SUPABASE_ACCESS_TOKEN: "sbp_genretv_account_token",
    });
  });

  test("rejects a standard Supabase URL for a different project", () => {
    expect(() =>
      supabaseProject({
        ...validEnv,
        GENRETV_SUPABASE_URL: "https://zyxwvutsrqponmlkjihg.supabase.co",
      }),
    ).toThrow("does not match GENRETV_SUPABASE_PROJECT_REF");
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
          GENRETV_SUPABASE_PROJECT_REF: validEnv.GENRETV_SUPABASE_PROJECT_REF,
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

  test("requires a project-specific access token only for Supabase CLI mutations", () => {
    const { GENRETV_SUPABASE_ACCESS_TOKEN: _, ...withoutAccessToken } = validEnv;

    expect(() => validateCloudEnv(withoutAccessToken, "migrate")).not.toThrow();
    expect(() => validateCloudEnv(withoutAccessToken, "secrets")).toThrow("missing GENRETV_SUPABASE_ACCESS_TOKEN");
    expect(() => validateCloudEnv(withoutAccessToken, "functions")).toThrow("missing GENRETV_SUPABASE_ACCESS_TOKEN");
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
