import fs from "fs";
import path from "path";

export async function generateAxeHtmlReport(results, outputDir = "axe-report", page) {
    const reportPath = path.join(process.cwd(), outputDir);

    if (!fs.existsSync(reportPath)) {
        fs.mkdirSync(reportPath, { recursive: true });
    }

    const htmlFile = path.join(reportPath, "index.html");

    // Screenshot directory
    const screenshotDir = path.join(reportPath, "screenshots");
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir);
    }

    const impactGroups = { critical: [], serious: [], moderate: [], minor: [] };
    let screenshotIndex = 1;

    for (const issue of results.violations) {
        const level = issue.impact || "moderate";

        for (const node of issue.nodes) {

            const filename = `screenshot-${screenshotIndex}.png`;
            const filepath = path.join(screenshotDir, filename);

            try {
                // Print for debugging
                console.log("AXE TARGET:", node.target);

                // 🔥 ALWAYS TAKE FULL-PAGE SCREENSHOT
                await page.screenshot({
                    path: filepath,
                    fullPage: true
                });

                node.screenshot = "screenshots/" + filename;

            } catch (err) {
                console.log("Screenshot failed:", node.target, err);
                node.screenshot = null;
            }

            screenshotIndex++;
        }

        impactGroups[level].push(issue);
    }

    // ------------------------------
    // Generate HTML
    // ------------------------------
    const html = `
        <html>
        <head>
            <title>Axe Report</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                .issue { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; border-radius: 6px; }
                img { max-width: 100%; border: 1px solid #aaa; border-radius: 4px; }
                pre { background: #eee; padding: 10px; }
            </style>
        </head>
        <body>

        <h1>Axe Report with Screenshots</h1>

        ${Object.keys(impactGroups).map(level => `
            <h2>${level.toUpperCase()}</h2>

            ${impactGroups[level].map(issue => `
                <div class="issue">
                    <h3>${issue.id} (${issue.impact})</h3>
                    <p>${issue.description}</p>

                    ${issue.nodes.map(n => `
                        <div style="margin-bottom:20px;">
                            <b>Target:</b> ${n.target.join(", ")} <br>

                            ${
                                n.screenshot
                                ? `<img src="${n.screenshot}">`
                                : `<p style="color:red;">Screenshot unavailable</p>`
                            }

                            <pre>${n.failureSummary}</pre>
                        </div>
                    `).join("")}

                </div>
            `).join("")}

        `).join("")}

        </body>
        </html>
    `;

    fs.writeFileSync(htmlFile, html, "utf-8");
    console.log("✔ Report generated:", htmlFile);
}
