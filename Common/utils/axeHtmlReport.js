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

    // Group by impact
    const impactGroups = { critical: [], serious: [], moderate: [], minor: [] };

    let screenshotIndex = 1;

    for (const issue of results.violations) {
        const level = issue.impact || "moderate";

        for (const node of issue.nodes) {
            const filename = `screenshot-${screenshotIndex}.png`;
            const filepath = path.join(screenshotDir, filename);

            try {
                await page.locator(node.target[0]).screenshot({
                    path: filepath,
                    timeout: 2000
                });
                node.screenshot = "screenshots/" + filename;
            } catch {
                node.screenshot = null;
            }

            screenshotIndex++;
        }

        impactGroups[level].push(issue);
    }

    // HTML + FIXED CSS
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Axe Accessibility Report</title>

<style>
    body {
        font-family: Arial, sans-serif;
        background: #f4f4f4;
        margin: 0;
        display: flex;
        height: 100vh;
        overflow: hidden;
    }

    .sidebar {
        width: 260px;
        background: #1a1a1a;
        color: #fff;
        padding: 20px;
        overflow-y: auto;
        flex-shrink: 0;
        height: 100vh;
    }

    .sidebar h2 {
        margin-top: 0;
    }

    .sidebar a {
        display: block;
        color: #fff;
        text-decoration: none;
        padding: 8px;
        margin: 5px 0;
        border-radius: 5px;
        background: #333;
    }

    .main {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        background: #f7f7f7;
    }

    .issue {
        background: #fff;
        padding: 15px;
        margin: 20px 0;
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .node-box {
        background: #fafafa;
        padding: 10px;
        margin: 10px 0;
        border-left: 4px solid #007acc;
        word-break: break-word;
    }

    pre {
        background: #efefef;
        padding: 10px;
        border-radius: 6px;
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    img {
        max-width: 100%;
        border: 1px solid #ccc;
        margin-top: 10px;
        border-radius: 6px;
    }

    h1, h2, h3 {
        margin-top: 0;
    }
</style>

</head>

<body>

<div class="sidebar">
    <h2>Issue Categories</h2>
    <a href="#critical">Critical (${impactGroups.critical.length})</a>
    <a href="#serious">Serious (${impactGroups.serious.length})</a>
    <a href="#moderate">Moderate (${impactGroups.moderate.length})</a>
    <a href="#minor">Minor (${impactGroups.minor.length})</a>
</div>

<div class="main">
    <h1>Axe Accessibility Report</h1>

    ${Object.keys(impactGroups).map(level => `
        <h2 id="${level}">${level.toUpperCase()} Issues</h2>

        ${impactGroups[level].length === 0 ? "<p>No issues found</p>" : ""}

        ${impactGroups[level].map(issue => `
            <div class="issue">
                <h3>${issue.id} (${issue.impact})</h3>
                <p>${issue.description}</p>

                <h4>Affected Nodes:</h4>

                ${issue.nodes.map(n => `
                    <div class="node-box">
                        <strong>Target:</strong> ${n.target.join(", ")}
                        <pre>${n.html}</pre>

                        ${n.screenshot ?
                            `<h4>Screenshot:</h4>
                             <img src="${n.screenshot}" />`
                             :
                            `<p style="color:red;">Screenshot not available</p>`
                        }

                        <h4>Failure Summary:</h4>
                        <pre>${n.failureSummary || 'N/A'}</pre>
                    </div>
                `).join("")}

            </div>
        `).join("")}
    `).join("")}

</div>

</body>
</html>
`;

    fs.writeFileSync(htmlFile, html, "utf-8");
    console.log("🚀 Axe report generated with screenshots at:", htmlFile);
}
