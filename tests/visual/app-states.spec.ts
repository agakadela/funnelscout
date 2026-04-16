import { expect, test, type Browser } from "@playwright/test";

import "./load-env";
import { authStoragePath } from "./constants";
import { applyProSubscriptionForOrg1 } from "./fixtures/apply-visual-db-state";

test.describe.configure({ mode: "serial" });

const renewDateMask = (page: import("@playwright/test").Page) =>
  page
    .locator("p.fs-text-small")
    .filter({ hasText: /^Renews:/ })
    .locator("span.font-mono");

async function gotoMarketingHome(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      name: /Know which clients need attention/i,
    }),
  ).toBeVisible();
}

async function gotoSignIn(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Email")).toBeVisible();
}

async function gotoDashboard(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /Agency overview/i }),
  ).toBeVisible();
}

async function gotoBilling(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/billing", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
}

async function withStoragePage<T>(
  browser: Browser,
  storageFile: string,
  fn: (page: import("@playwright/test").Page) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext({
    storageState: authStoragePath(storageFile),
    viewport: { width: 1280, height: 720 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  try {
    return await fn(page);
  } finally {
    await context.close();
  }
}

test("marketing home", async ({ page }) => {
  await gotoMarketingHome(page);
  await expect(page).toHaveScreenshot("marketing-home.png");
});

test("sign-in", async ({ page }) => {
  await gotoSignIn(page);
  await expect(page).toHaveScreenshot("sign-in.png");
});

test("dashboard logged in (GHL ready)", async ({ browser }) => {
  await withStoragePage(browser, "user1.json", async (page) => {
    await gotoDashboard(page);
    await expect(page).toHaveScreenshot("dashboard.png");
  });
});

test("GHL reconnect banner", async ({ browser }) => {
  await withStoragePage(browser, "user2.json", async (page) => {
    await gotoDashboard(page);
    const banner = page
      .getByRole("status")
      .filter({ hasText: /GHL disconnected/i });
    await expect(banner).toBeVisible();
    await expect(banner).toHaveScreenshot("ghl-reconnect-banner.png");
  });
});

test("RunAnalysisButton idle", async ({ browser }) => {
  await withStoragePage(browser, "user1.json", async (page) => {
    await gotoDashboard(page);
    const runBtn = page
      .locator(".fs-run-btn")
      .filter({ hasText: /Run analysis/i });
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toHaveScreenshot("run-analysis-idle.png");
  });
});

test("RunAnalysisButton in progress", async ({ browser }) => {
  await withStoragePage(browser, "user1.json", async (page) => {
    await page.route("**/api/analysis/trigger", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ analysisId: "visual-regression-mock-analysis" }),
      });
    });
    await page.route("**/api/analysis/status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "running" }),
      });
    });

    await gotoDashboard(page);
    await page.getByRole("button", { name: /Run analysis/i }).click();
    const inProgress = page.getByRole("button", {
      name: /Analysis in progress/i,
    });
    await expect(inProgress).toBeVisible({ timeout: 15_000 });
    await expect(inProgress).toHaveScreenshot("run-analysis-in-progress.png");
  });
});

test("billing no subscription", async ({ browser }) => {
  await withStoragePage(browser, "user3.json", async (page) => {
    await gotoBilling(page);
    await expect(page).toHaveScreenshot("billing-no-subscription.png");
  });
});

test("billing starter with renews", async ({ browser }) => {
  await withStoragePage(browser, "user1.json", async (page) => {
    await gotoBilling(page);
    await expect(page).toHaveScreenshot("billing-starter.png", {
      mask: [renewDateMask(page)],
    });
  });
});

test("billing pro unlimited", async ({ browser }) => {
  await applyProSubscriptionForOrg1();

  await withStoragePage(browser, "user1.json", async (page) => {
    await gotoBilling(page);
    await expect(page).toHaveScreenshot("billing-pro.png", {
      mask: [renewDateMask(page)],
    });
  });
});
