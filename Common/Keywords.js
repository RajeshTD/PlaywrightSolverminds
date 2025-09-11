import { expect } from "@playwright/test";
import { allure } from "allure-playwright";

export default class commonmethods {
  constructor(page) {
    this.page = page;
  }

  async navigate(url) {
    try {
      await this.page.goto(url, { waitUntil: "domcontentloaded" });
      console.log(`✅ Navigated to: ${url}`);

      await allure.step(`Navigated to ${url}`, async () => {
        const Screenshots = await this.page.screenshot();
        allure.attachment("Screenshot", Screenshots, "image/png");
      });
    } catch (error) {
      console.error(`❌ Failed to navigate to: ${url}`, error);
      await allure.step(`❌ Failed to navigate to: ${url}`, async () => {
        const screenshots = await this.page.screenshot();
        allure.attachment("Screenshot", screenshots, "image/png");
      });
      throw error;
    }
  }

  async click(locator) {
    try {
      await this.page.locator(locator).waitFor({ state: "visible" });
      await this.page.locator(locator).click();
      console.log(`✅ Clicked on element: ${locator}`);
      allure.step(`✅ Clicked on element: ${locator}`,async()=>{
        const Scr = await this.page.screenshot();
        allure.attachment("Screenshot", Scr, "image/png");
      });
    } catch (error) {
      console.error(`❌ Failed to click element: ${locator}`, error);
       allure.step(`❌ Failed to click element: ${locator}`, async () => {
         const Scr = await this.page.screenshot();
         allure.attachment("Screenshot", Scr, "image/png");
       });
      throw error;
    }
  }

  async type(locator, value) {
    try {
      await this.page.locator(locator).waitFor({ state: "visible" });
      await this.page.locator(locator).type(value);
      console.log(`✅ Typed "${value}" into: ${locator}`);
       allure.step(`✅ Typed "${value}" into: ${locator}`, async () => {
         const Scr = await this.page.screenshot();
         allure.attachment("Screenshot", Scr, "image/png");
       });
    } catch (error) {
      console.error(`❌ Failed to type in: ${locator}`, error);
       allure.step(`❌ Failed to type in: ${locator}`, async () => {
         const Scr = await this.page.screenshot();
         allure.attachment("Screenshot", Scr, "image/png");
       });
      throw error;
    }
  }

  async Filkeys(locator, value) {
    try {
      await this.page.locator(locator).waitFor({ state: "visible" });
      await this.page.locator(locator).fill(value);
      console.log(`✅ Fill the values on "${value}" into: ${locator}`);
      allure.step(
        `✅ Fill the values on "${value}" into: ${locator}`,
        async () => {
          const Scr = await this.page.screenshot();
          allure.attachment("Screenshot", Scr, "image/png");
        }
      );
    } catch (error) {
      console.error(`❌ Failed to type in: ${locator}`, error);
      allure.step(
        `❌ Failed to Fill the values on "${value}" into: ${locator}`,
        async () => {
          const Scr = await this.page.screenshot();
          allure.attachment("Screenshot", Scr, "image/png");
        }
      );
      throw error;
    }
  }

  async getText(locator) {
    try {
      await this.page.locator(locator).waitFor({ state: "visible" });
      const text = await this.page.locator(locator).innerText();
      console.log(`✅ Got text from ${locator}: "${text}"`);
      allure.step(`✅ Got text from ${locator}: "${text}"`, async () => {
        const Scr = await this.page.screenshot();
        allure.attachment("Screenshot", Scr, "image/png");
      });
      return text;
    } catch (error) {
      console.error(`❌ Failed to get text from: ${locator}`, error);
      allure.step(`❌ Failed to get text from: ${locator}`, async () => {
        const Scr = await this.page.screenshot();
        allure.attachment("Screenshot", Scr, "image/png");
      });
      throw error;
    }
  }

  async verifyText(locator, expectedText) {
    try {
      await expect(this.page.locator(locator)).toHaveText(expectedText);
      console.log(`✅ Verified text "${expectedText}" for: ${locator}`);
      allure.step(
        `✅ Verified text "${expectedText}" for: ${locator}`,
        async () => {
          const Scr = await this.page.screenshot();
          allure.attachment("Screenshot", Scr, "image/png");
        }
      );
    } catch (error) {
      console.error(`❌ Text verification failed for: ${locator}`, error);
      allure.step(`❌ Text verification failed for: ${locator}`, async () => {
        const Scr = await this.page.screenshot();
        allure.attachment("Screenshot", Scr, "image/png");
      });
      throw error;
    }
  }

  async waitForVisible(locator) {
    await this.page.locator(locator).waitFor({ state: "visible" });
    console.log(`⏳ Waited until element is visible: ${locator}`);
  }
}
