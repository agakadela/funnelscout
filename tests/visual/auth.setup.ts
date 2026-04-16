import { test as setup } from "@playwright/test";

import {
  authStoragePath,
  visualTestPassword,
  VISUAL_SEED_EMAIL,
} from "./constants";

async function signInAndSaveState(
  page: import("@playwright/test").Page,
  email: string,
  outPath: string,
): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(visualTestPassword());
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 60_000 });
  await page.context().storageState({ path: outPath });
}

setup("authenticate owner 01", async ({ page }) => {
  await signInAndSaveState(
    page,
    VISUAL_SEED_EMAIL.owner01,
    authStoragePath("user1.json"),
  );
});

setup("authenticate owner 02", async ({ page }) => {
  await signInAndSaveState(
    page,
    VISUAL_SEED_EMAIL.owner02,
    authStoragePath("user2.json"),
  );
});

setup("authenticate owner 03", async ({ page }) => {
  await signInAndSaveState(
    page,
    VISUAL_SEED_EMAIL.owner03,
    authStoragePath("user3.json"),
  );
});
