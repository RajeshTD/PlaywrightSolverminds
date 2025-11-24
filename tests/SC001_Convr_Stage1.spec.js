import { test } from "@playwright/test";
import commonmethods from "../Common/Keywords";
import Login_Locators from "../Common/Locators";
import { allure } from "allure-playwright";
import readNextColumn from "../Common/Utils";

test("Answers Stage 1", async ({ page }) => {
  const keyword = new commonmethods(page);
  const Loc = new Login_Locators(page);

  const Filepath = "./Test Files/Testdata.xlsx";

  const Username = await readNextColumn(Filepath, "Sheet1", "Username");
  const Passw_ord = await readNextColumn(Filepath, "Sheet1", "Password");
  const Modulename = await readNextColumn(Filepath, "Sheet1", "ModuleName");

  allure.label("Owner", "Muthuram");
  allure.epic("Automation of Convr Application");
  allure.feature("Answers Stage 1");
  allure.story("Enter the mandatory fields and submit the form");

  // Navigate
  await keyword.navigate("https://staging.convr.io/");

  // Wait for logo image to be visible
  await keyword.waitForVisible({ type: "role", role: "img", value: "convr" });

  // Enter Email
  await keyword.click({ type: "role", role: "textbox", value: "Email" });
  await keyword.type(
    { type: "role", role: "textbox", value: "Email" },
    "admin@convr.com"
  );

  // Click Next
  await keyword.click({ type: "role", role: "button", value: "Next" });

  // Fill Username or email
  await keyword.Filkeys(
    { type: "role", role: "textbox", value: "Username or email" },
    "prabhakaran.sundaram-gdt+msig@convr.com"
  );

  // Fill Password
  await keyword.click({ type: "role", role: "textbox", value: "Password" });
  await keyword.Filkeys(
    { type: "role", role: "textbox", value: "Password" },
    "Cubes123$"
  );

  // Click Sign In
  await keyword.click({ type: "role", role: "button", value: "Sign In" });

  // Open Assigned to me menu and select "Created by me"
  await keyword.click({
    type: "role",
    role: "button",
    value: "Assigned to me",
  });

  await keyword.waitForVisible({
    type: "role",
    role: "menu",
    value: "Assigned to me",
  });

  await keyword.click({
    type: "role",
    role: "menuitem",
    value: "Created by me",
  });

  page.locator("#login").click();

});
