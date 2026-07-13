import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const localMaintainer = {
  email: "maintainer@genretv.local",
  password: process.env["GENRETV_LOCAL_USER_PASSWORD"] ?? "genretv-local-password",
};

export const localPublisher = {
  email: "publisher@genretv.local",
  password: process.env["GENRETV_LOCAL_USER_PASSWORD"] ?? "genretv-local-password",
};

export const localUser = {
  email: "user@genretv.local",
  password: process.env["GENRETV_LOCAL_USER_PASSWORD"] ?? "genretv-local-password",
};

export async function expectE2eStackAvailable(): Promise<void> {
  const gatewayUrl = process.env["GENRETV_E2E_GATEWAY_URL"] ?? "http://localhost:55431";
  const response = await fetch(`${gatewayUrl}/auth/v1/health`).catch((error: unknown) => {
    throw new Error(
      `GenreTV E2E stack is not reachable at ${gatewayUrl}. Playwright should start it automatically. ${String(error)}`,
    );
  });

  if (!response.ok) {
    throw new Error(
      `GenreTV E2E stack health check failed with ${response.status}. Check the infra:e2e:up output and retry.`,
    );
  }
}

export async function signIn(page: Page, user = localMaintainer): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(user.email)).toBeVisible();
}

export async function expectSynchronizationSettled(page: Page, timeout = 120_000): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await expect(page.getByRole("link", { name: /Synchronization:/ })).toHaveAccessibleName(
    "Synchronization: Synchronized",
    { timeout },
  );
}
