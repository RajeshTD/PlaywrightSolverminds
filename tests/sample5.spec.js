import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { generateAxeHtmlReport } from "../Common/utils/axe.js";

let axeResults;

test.beforeEach(async ({ page }) => {
  await page.goto("https://staging.convr.io/");
});

test("Accessibility scan with Axe", async ({ page }) => {
  await page.getByRole("textbox", { name: "Email" }).type("admin@convr.com");
  await page.getByRole("button", { name: "Next" }).click();

  // Always run AXE scan, even if test fails later
  axeResults = await new AxeBuilder({ page }).analyze();

  // Intentionally verifying UI
  await expect(page.locator("div").nth(3)).toBeVisible();
});

// ALWAYS generate Axe report (pass or fail)
test.afterEach(async ({ page }, testInfo) => {
  if (axeResults) {
    await generateAxeHtmlReport(axeResults, page, testInfo);
  }
});
