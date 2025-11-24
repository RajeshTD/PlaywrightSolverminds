// keywords/commonMethods.js
import { expect } from "@playwright/test"; // keep if tests use expect directly
import { allure } from "allure-playwright";
import UIHelpers from "../Common/UIHelpers.js";

export default class commonmethods {
  constructor(page) {
    this.page = page;
    this.ui = new UIHelpers(page);
  }

  // navigation wrapper
  async navigate(url, opts = {}) {
    return this.ui.navigate(url, opts);
  }

  // click wrapper - accepts string or descriptor object
  async click(locator, opts = {}) {
    return this.ui.click(locator, opts);
  }

  // type wrapper
  async type(locator, value, opts = {}) {
    return this.ui.type(locator, value, opts);
  }

  // fill wrapper (you previously named it Filkeys)
  async Filkeys(locator, value, opts = {}) {
    return this.ui.fill(locator, value, opts);
  }

  // getText wrapper
  async getText(locator, opts = {}) {
    return this.ui.getText(locator, opts);
  }

  // verifyText wrapper
  async verifyText(locator, expectedText, opts = {}) {
    return this.ui.verifyText(locator, expectedText, opts);
  }

  // waitForVisible wrapper
  async waitForVisible(locator, opts = {}) {
    return this.ui.waitForVisible(locator, opts);
  }

  // If you had additional custom methods in this class, keep them here and call this.ui.* as needed
}
