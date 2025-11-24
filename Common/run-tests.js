import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function makeTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

const baseResults = "allure-results";
const runName = process.env.ALLURE_OUTPUT_NAME ?? `Report-${makeTimestamp()}`;
const dest = path.resolve(baseResults, runName);
fs.mkdirSync(dest, { recursive: true });

const env = {
  ...process.env,
  ALLURE_RESULTS_DIR: dest,
  ALLURE_OUTPUT_NAME: runName,
};
console.log("ALLURE_RESULTS_DIR set to:", env.ALLURE_RESULTS_DIR);

const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const args = ["playwright", "test"];
const r = spawnSync(cmd, args, { stdio: "inherit", env });

process.exit(r.status);
