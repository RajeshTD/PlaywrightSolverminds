// tools/run-tests.js
// CommonJS runner that lists tests, runs playwright, generates Allure HTML.
// Place at tools/run-tests.js and run: npm run test:allure

const fs = require("fs");
const path = require("path");
const child = require("child_process");

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

const baseResults = "allure-results";
const runName = process.env.ALLURE_OUTPUT_NAME || `Report-${ts()}`;
const resultsDir = path.resolve(baseResults, runName);
const reportDir = path.resolve(`allure-report-${runName}`);

fs.mkdirSync(resultsDir, { recursive: true });
console.log("Allure results directory (main):", resultsDir);

// child env
const env = Object.assign({}, process.env, {
  ALLURE_RESULTS_DIR: resultsDir,
  ALLURE_OUTPUT_NAME: runName,
});

// helper: run via shell and stream output; returns spawnSync result
function runShell(cmd) {
  console.log("\n▶ Running:", cmd);
  try {
    const res = child.spawnSync(cmd, {
      stdio: "inherit",
      shell: true,
      env,
      cwd: process.cwd(),
      windowsHide: false,
      timeout: 0,
    });
    return res;
  } catch (err) {
    return { status: 1, error: err };
  }
}

/* 0) Optional: show environment for debugging */
console.log("Environment SUMMARY:");
console.log(" - ALLURE_RESULTS_DIR:", env.ALLURE_RESULTS_DIR);
console.log(" - ALLURE_OUTPUT_NAME:", env.ALLURE_OUTPUT_NAME);
console.log(" - cwd:", process.cwd());

/* 1) List tests (helpful quick-check) */
const listRes = runShell("npx playwright test --list");
if (listRes.error) {
  console.warn("Warning: listing tests failed:", listRes.error);
}

/* 2) Run tests */
const testCmd = "npx playwright test";
const runRes = runShell(testCmd);

if (typeof runRes.status === "number") {
  console.log("\n▶ Playwright exit code:", runRes.status);
} else {
  console.warn("\n▶ Playwright did not return an exit code.", runRes);
}

/* 3) Generate Allure HTML report (attempt regardless of test exit code) */
console.log("\n▶ Generating Allure HTML report into:", reportDir);

// Before generating, move any loose result files that landed in the base
// `allure-results` folder into our timestamped `resultsDir` so the generator
// has a complete run folder and to avoid mixing artifacts between runs.
try {
  if (fs.existsSync(baseResults)) {
    const items = fs.readdirSync(baseResults, { withFileTypes: true });
    for (const item of items) {
      // skip the intended run folder itself
      if (item.name === runName) continue;
      // skip the report dir if someone named it similarly
      if (item.name === path.basename(reportDir)) continue;

      const src = path.join(baseResults, item.name);
      const dest = path.join(resultsDir, item.name);

      // move files or directories into the run folder
      try {
        fs.renameSync(src, dest);
        console.log(
          `Moved ${item.name} -> ${path.relative(process.cwd(), dest)}`
        );
      } catch (err) {
        // If rename fails (cross-device), try copy then remove
        const copyRecursive = (s, d) => {
          const st = fs.statSync(s);
          if (st.isDirectory()) {
            fs.mkdirSync(d, { recursive: true });
            for (const child of fs.readdirSync(s)) {
              copyRecursive(path.join(s, child), path.join(d, child));
            }
          } else {
            fs.copyFileSync(s, d);
          }
        };
        try {
          copyRecursive(src, dest);
          // remove source
          const removeRecursive = (p) => {
            if (fs.existsSync(p)) {
              const st2 = fs.statSync(p);
              if (st2.isDirectory()) {
                for (const c of fs.readdirSync(p))
                  removeRecursive(path.join(p, c));
                fs.rmdirSync(p);
              } else {
                fs.unlinkSync(p);
              }
            }
          };
          removeRecursive(src);
          console.log(
            `Copied and removed ${item.name} -> ${path.relative(
              process.cwd(),
              dest
            )}`
          );
        } catch (err2) {
          console.warn(
            `Failed to move or copy ${src} into ${dest}:`,
            err2.message || err2
          );
        }
      }
    }
  }
} catch (e) {
  console.warn(
    "Warning while organizing allure-results files:",
    e && e.message ? e.message : e
  );
}

// Prefer npx invocation (uses package bin if present)
let genRes = runShell(
  `npx allure generate "${resultsDir}" -o "${reportDir}" --clean`
);

// Fallback to direct 'allure' binary if npx failed
if (!genRes || genRes.status !== 0) {
  console.warn(
    "npx allure generate failed or returned non-zero; trying direct 'allure'..."
  );
  genRes = runShell(
    `allure generate "${resultsDir}" -o "${reportDir}" --clean`
  );
}

if (genRes && genRes.status === 0) {
  console.log("✅ Allure report generated at:", reportDir);
} else {
  console.error(
    "❌ Allure generation failed. Check that allure-commandline is installed."
  );
  console.error(
    "You can install it as a dev dependency: npm i -D allure-commandline"
  );
}

/* 4) Optionally open report */
if (process.env.AUTO_OPEN_ALLURE === "1" && fs.existsSync(reportDir)) {
  console.log("\n▶ Opening Allure report:", reportDir);
  let openRes = runShell(`npx allure open "${reportDir}"`);
  if (!openRes || openRes.status !== 0) {
    runShell(`allure open "${reportDir}"`);
  }
}

/* Exit with Playwright's exit code (if known) else with genRes status or 0 */
const exitCode =
  typeof runRes.status === "number"
    ? runRes.status
    : genRes && typeof genRes.status === "number"
    ? genRes.status
    : 0;
process.exit(exitCode);
