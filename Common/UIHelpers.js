// helpers/UIHelpers.js
import { expect } from "@playwright/test";
import { allure } from "allure-playwright";

/**
 * Generic UI helper for Playwright tests.
 * - Supports raw locator strings and descriptor objects { type, value, role, exact }.
 * - Robust click with retries + optional JS click fallback.
 * - All methods attach screenshots to Allure on success/failure.
 */
export default class UIHelpers {
  constructor(page, options = {}) {
    this.page = page;
    this._default = {
      attempts: options.attempts ?? 3,
      waitForTimeout: options.waitForTimeout ?? 5000,
      clickTimeout: options.clickTimeout ?? 5000,
      tryJsClick: options.tryJsClick ?? true,
      scrollIfNeeded: options.scrollIfNeeded ?? true,
      backoffBase: options.backoffBase ?? 200,
    };
  }

  /* -------------------------
     Selector -> Locator helper
     Accepts:
       - string (raw locator) e.g. '#id' or 'button:has-text("OK")'
       - object: { type: 'role'|'text'|'label'|'testId'|'locator', value: '...' , role: 'button', exact: true }
     -------------------------*/
  _getLocator(selector) {
    if (typeof selector === "string") return this.page.locator(selector);

    const type = (selector.type || "locator").toLowerCase();
    const exact = !!selector.exact;

    switch (type) {
      case "role": {
        const roleName = selector.role;
        const name = selector.value ?? selector.name;
        if (!roleName)
          throw new Error("UIHelpers: role type requires 'role' property");
        return name
          ? this.page.getByRole(roleName, { name, exact })
          : this.page.getByRole(roleName);
      }
      case "text": {
        const text = selector.value ?? selector.text;
        if (text === undefined)
          throw new Error("UIHelpers: text type requires 'value'");
        return this.page.getByText(text, { exact });
      }
      case "label": {
        const label = selector.value ?? selector.label;
        if (label === undefined)
          throw new Error("UIHelpers: label type requires 'value'");
        return this.page.getByLabel(label, { exact });
      }
      case "testid":
      case "testId": {
        const id = selector.value ?? selector.testId ?? selector.testid;
        if (id === undefined)
          throw new Error("UIHelpers: testId type requires 'value'");
        return this.page.locator(`[data-testid="${id}"]`);
      }
      case "locator":
      case "css":
      default: {
        const loc = selector.value ?? selector.selector;
        if (!loc)
          throw new Error(
            "UIHelpers: locator type requires 'value' (selector string)"
          );
        return this.page.locator(loc);
      }
    }
  }

  _desc(selector) {
    if (typeof selector === "string") return selector;
    const type = selector.type ?? "locator";
    const value =
      selector.value ??
      selector.selector ??
      selector.text ??
      selector.label ??
      selector.testId ??
      selector.name;
    if (type === "role")
      return `role=${selector.role}${value ? ` name="${value}"` : ""}`;
    return `${type}:${value ?? JSON.stringify(selector)}`;
  }

  async _attachScreenshot(name) {
    try {
      const scr = await this.page.screenshot();
      allure.attachment(name ?? "Screenshot", scr, "image/png");
    } catch (e) {
      // ignore screenshot errors
    }
  }

  /* -------------------------
     Navigation
     -------------------------*/
  async navigate(url, opts = {}) {
    try {
      await this.page.goto(url, {
        waitUntil: "domcontentloaded",
        ...(opts.gotoOptions || {}),
      });
      console.log(`✅ Navigated to: ${url}`);
      await allure.step(`Navigated to ${url}`, async () => {
        await this._attachScreenshot("Screenshot - navigate");
      });
    } catch (error) {
      console.error(`❌ Failed to navigate to: ${url}`, error);
      await allure.step(`❌ Failed to navigate to: ${url}`, async () => {
        await this._attachScreenshot("Screenshot - navigate-failed");
      });
      throw error;
    }
  }

  /* -------------------------
     Click (robust)
     selectorOrDescriptor: string | object
     opts override defaults
     -------------------------*/
  async click(selectorOrDescriptor, opts = {}) {
    const cfg = { ...this._default, ...opts };
    const locator = this._getLocator(selectorOrDescriptor);
    let lastError = null;

    for (let attempt = 1; attempt <= cfg.attempts; attempt++) {
      try {
        await locator.waitFor({
          state: "visible",
          timeout: cfg.waitForTimeout,
        });

        // Quick checks for visible & enabled
        const [isVisible, isEnabled] = await Promise.all([
          locator.isVisible().catch(() => false),
          locator.isEnabled().catch(() => false),
        ]);
        if (!isVisible) throw new Error("Element not visible");
        if (!isEnabled) {
          // short pause to wait for enabled
          await this.page.waitForTimeout(200);
          const reEnabled = await locator.isEnabled().catch(() => false);
          if (!reEnabled) throw new Error("Element not enabled");
        }

        if (cfg.scrollIfNeeded)
          await locator.scrollIntoViewIfNeeded().catch(() => undefined);

        await locator.click({ timeout: cfg.clickTimeout });
        console.log(
          `✅ Clicked on element (attempt ${attempt}): ${this._desc(
            selectorOrDescriptor
          )}`
        );
        await allure.step(
          `✅ Clicked on element: ${this._desc(
            selectorOrDescriptor
          )} (attempt ${attempt})`,
          async () => {
            await this._attachScreenshot(
              `Screenshot - click success (attempt ${attempt})`
            );
          }
        );
        return true;
      } catch (err) {
        lastError = err;
        console.error(
          `⚠️ Click attempt ${attempt} failed for ${this._desc(
            selectorOrDescriptor
          )}:`,
          err.message ?? err
        );
        await allure.step(
          `⚠️ Click attempt ${attempt} failed for ${this._desc(
            selectorOrDescriptor
          )}`,
          async () => {
            await this._attachScreenshot(
              `Screenshot - click attempt ${attempt}`
            );
          }
        );

        // Recovery: try JS click if allowed (non-blocking)
        if (cfg.tryJsClick) {
          try {
            await locator
              .evaluate((el) => {
                // some elements require focus first
                if (el && typeof el.focus === "function") el.focus();
                if (el && typeof el.click === "function") el.click();
              })
              .catch(() => undefined);

            await this.page.waitForTimeout(200);
          } catch (re) {
            // ignore recovery errors
          }
        }

        // small backoff
        await this.page.waitForTimeout(cfg.backoffBase * attempt);
      }
    }

    // final failure
    await allure.step(
      `❌ Failed to click element after ${cfg.attempts} attempts: ${this._desc(
        selectorOrDescriptor
      )}`,
      async () => {
        await this._attachScreenshot("Screenshot - click final failure");
      }
    );
    console.error(
      `❌ Failed to click element after ${cfg.attempts} attempts: ${this._desc(
        selectorOrDescriptor
      )}`
    );
    throw (
      lastError ??
      new Error(`Failed to click element: ${this._desc(selectorOrDescriptor)}`)
    );
  }

  /* -------------------------
     Type (simulate typing)
     -------------------------*/
  async type(selectorOrDescriptor, value, opts = {}) {
    const locator = this._getLocator(selectorOrDescriptor);
    try {
      await locator.waitFor({
        state: "visible",
        timeout: opts.waitForTimeout ?? this._default.waitForTimeout,
      });
      await locator.type(value, { timeout: opts.typeTimeout ?? 30000 });
      console.log(
        `✅ Typed "${value}" into: ${this._desc(selectorOrDescriptor)}`
      );
      await allure.step(
        `✅ Typed "${value}" into: ${this._desc(selectorOrDescriptor)}`,
        async () => {
          await this._attachScreenshot("Screenshot - type");
        }
      );
    } catch (error) {
      console.error(
        `❌ Failed to type in: ${this._desc(selectorOrDescriptor)}`,
        error
      );
      await allure.step(
        `❌ Failed to type in: ${this._desc(selectorOrDescriptor)}`,
        async () => {
          await this._attachScreenshot("Screenshot - type failed");
        }
      );
      throw error;
    }
  }

  /* -------------------------
     Fill (set value)
     -------------------------*/
  async fill(selectorOrDescriptor, value, opts = {}) {
    const locator = this._getLocator(selectorOrDescriptor);
    try {
      await locator.waitFor({
        state: "visible",
        timeout: opts.waitForTimeout ?? this._default.waitForTimeout,
      });
      await locator.fill(value, { timeout: opts.fillTimeout ?? 30000 });
      console.log(
        `✅ Filled "${value}" into: ${this._desc(selectorOrDescriptor)}`
      );
      await allure.step(
        `✅ Filled "${value}" into: ${this._desc(selectorOrDescriptor)}`,
        async () => {
          await this._attachScreenshot("Screenshot - fill");
        }
      );
    } catch (error) {
      console.error(
        `❌ Failed to fill in: ${this._desc(selectorOrDescriptor)}`,
        error
      );
      await allure.step(
        `❌ Failed to fill in: ${this._desc(selectorOrDescriptor)}`,
        async () => {
          await this._attachScreenshot("Screenshot - fill failed");
        }
      );
      throw error;
    }
  }

  /* -------------------------
     Get innerText
     -------------------------*/
  async getText(selectorOrDescriptor, opts = {}) {
    const locator = this._getLocator(selectorOrDescriptor);
    try {
      await locator.waitFor({
        state: "visible",
        timeout: opts.waitForTimeout ?? this._default.waitForTimeout,
      });
      const text = await locator.innerText();
      console.log(
        `✅ Got text from ${this._desc(selectorOrDescriptor)}: "${text}"`
      );
      await allure.step(
        `✅ Got text from ${this._desc(selectorOrDescriptor)}: "${text}"`,
        async () => {
          await this._attachScreenshot("Screenshot - getText");
        }
      );
      return text;
    } catch (error) {
      console.error(
        `❌ Failed to get text from: ${this._desc(selectorOrDescriptor)}`,
        error
      );
      await allure.step(
        `❌ Failed to get text from: ${this._desc(selectorOrDescriptor)}`,
        async () => {
          await this._attachScreenshot("Screenshot - getText failed");
        }
      );
      throw error;
    }
  }

  /* -------------------------
     Verify text using expect
     -------------------------*/
  async verifyText(selectorOrDescriptor, expectedText, opts = {}) {
    const locator = this._getLocator(selectorOrDescriptor);
    try {
      await expect(locator).toHaveText(expectedText, {
        timeout: opts.timeout ?? 5000,
      });
      console.log(
        `✅ Verified text "${expectedText}" for: ${this._desc(
          selectorOrDescriptor
        )}`
      );
      await allure.step(
        `✅ Verified text "${expectedText}" for: ${this._desc(
          selectorOrDescriptor
        )}`,
        async () => {
          await this._attachScreenshot("Screenshot - verifyText");
        }
      );
    } catch (error) {
      console.error(
        `❌ Text verification failed for: ${this._desc(selectorOrDescriptor)}`,
        error
      );
      await allure.step(
        `❌ Text verification failed for: ${this._desc(selectorOrDescriptor)}`,
        async () => {
          await this._attachScreenshot("Screenshot - verifyText failed");
        }
      );
      throw error;
    }
  }

  /* -------------------------
     Wait until visible (wrapper)
     -------------------------*/
  async waitForVisible(selectorOrDescriptor, opts = {}) {
    const locator = this._getLocator(selectorOrDescriptor);
    await locator.waitFor({
      state: "visible",
      timeout: opts.timeout ?? this._default.waitForTimeout,
    });
    console.log(
      `⏳ Waited until element is visible: ${this._desc(selectorOrDescriptor)}`
    );
  }
}
