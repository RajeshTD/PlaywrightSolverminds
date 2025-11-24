import { test, expect } from "@playwright/test";
import { generateAxeHtmlReport } from "../Common/utils/axeHtmlReport.js";
import AxeBuilder from "@axe-core/playwright";

test("axe report with screenshots", async ({ page }) => {

    let results = null;

    try {
        console.log("🚀 Navigating to page...");
        await page.goto("https://staging.convr.io/", { waitUntil: "networkidle" });

        await page.getByRole("textbox", { name: "Email" }).type("admin@convr.com");
        await page.getByRole("button", { name: "Next" }).click();

        await page.waitForLoadState("networkidle");

        console.log("🔍 Running Axe scan...");
        results = await new AxeBuilder({ page }).analyze();

    } catch (error) {
        console.error("❌ Playwright error:", error);

        // Even if Playwright fails, attempt Axe scan on available DOM
        if (!results) {
            try {
                console.log("⚠️ Running Axe scan after failure...");
                results = await new AxeBuilder({ page }).analyze();
            } catch (axeErr) {
                console.error("❌ Axe scan failed too:", axeErr);
            }
        }

    } finally {
        console.log("📄 Generating Axe report...");

        // Only generate if we have at least a partial result
        if (results) {
            await generateAxeHtmlReport(results, "axe-report", page);
            console.log("✅ Axe report generated even after failure.");
        } else {
            console.log("❌ No Axe results available — report not created.");
        }
    }
});
