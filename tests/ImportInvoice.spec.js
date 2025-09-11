import { test, expect } from "@playwright/test";
import commonmethods from "../Common/Keywords";
import Login_Locators from "../Common/Locators";
import { allure } from "allure-playwright";
import readNextColumn from "../Common/Utils";

test("Draft Invoice", async ({ page }) => {
  const keyword = new commonmethods(page);
  const Loc = new Login_Locators(page);

  const Filepath = "./Test Files/Testdata.xlsx";

  const Username = await readNextColumn(Filepath, "Sheet1", "Username");
  const Passw_ord = await readNextColumn(Filepath, "Sheet1", "Password");
  const Modulename = await readNextColumn(Filepath, "Sheet1", "ModuleName");

  allure.label("Owner", "Muthuram");
  allure.epic("Practice Playwright");
  allure.feature("Import Invoice");
  allure.story("Save Invoice as Draft");

  await keyword.navigate("https://lrpv2.solverminds.net/main");

  await expect(page).toHaveTitle("SVM LRPV2 ");

  await keyword.waitForVisible(Loc.UsernameInput);

  await keyword.Filkeys(Loc.UsernameInput, Username);

  await keyword.Filkeys(Loc.PasswordInput, Passw_ord);

  await keyword.click(Loc.LoginButton);

  if (await page.locator(Loc.Processing).isVisible()) {
    await page.locator(Loc.Processing).isHidden();
  }

  await keyword.click(Loc.ModuleInput);

  await keyword.type(Loc.ModuleInput, Modulename);

  await keyword.click(Loc.SelectII);
});
