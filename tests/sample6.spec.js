import { test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { generateAxeDevtoolsReport } from "../Common/utils/axeDevtoolsReport.js";

test("Accessibility scan with Axe DevTools-style report", async ({ page }) => {

  test.setTimeout(180000);  // ← FIX: prevent timeout

  await page.goto("https://staging.convr.io/", { waitUntil: "load" });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);

  // AXE scan
  await page.waitForTimeout(300);
  const results = await new AxeBuilder({ page }).analyze();
  await page.waitForTimeout(300);

  // Generate DevTools-style report
  await generateAxeDevtoolsReport(results, "axe-report", page);

  console.log("🎯 Accessibility scan completed");
});
