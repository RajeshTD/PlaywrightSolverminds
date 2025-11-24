import fs from "fs";
import path from "path";

export async function generateAxeDevtoolsReport(results, outputDir = "axe-report", page) {
  const reportDir = path.join(process.cwd(), outputDir);
  const htmlFile = path.join(reportDir, "index.html");
  const screenshotDir = path.join(reportDir, "screenshots");

  fs.mkdirSync(reportDir, { recursive: true });
  fs.mkdirSync(screenshotDir, { recursive: true });

  const impactGroups = { critical: [], serious: [], moderate: [], minor: [] };
  let screenshotIndex = 1;

  // ---------- helper to escape HTML ----------
  const esc = (text) =>
    String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // ---------- collect data + screenshots ----------
  for (const issue of results.violations) {
    const level = issue.impact || "moderate";
    const nodes = issue.nodes || [];

    // Take one full-page screenshot for document-level rules (no nodes)
    if (!nodes.length) {
      const filename = `issue-${screenshotIndex++}.png`;
      const filepath = path.join(screenshotDir, filename);
      try {
        await page.screenshot({ path: filepath, fullPage: true });
        issue.metaScreenshot = `screenshots/${filename}`;
      } catch {
        issue.metaScreenshot = null;
      }
    }

    for (const node of nodes) {
      const filename = `node-${screenshotIndex++}.png`;
      const filepath = path.join(screenshotDir, filename);

      try {
        const selector = node.target?.[0];

        let usedClip = false;

        // ignore obviously unscreenshotable selectors
        if (
          selector &&
          !selector.startsWith("meta") &&
          selector !== "html" &&
          selector !== "head" &&
          !selector.includes("::before") &&
          !selector.includes("::after")
        ) {
          const locator = page.locator(selector);
          const visible = await locator.isVisible().catch(() => false);

          if (visible) {
            await locator.scrollIntoViewIfNeeded().catch(() => {});
            const box = await locator.boundingBox().catch(() => null);

            if (box) {
              const padding = 40;
              const clip = {
                x: Math.max(box.x - padding, 0),
                y: Math.max(box.y - padding, 0),
                width: box.width + padding * 2,
                height: box.height + padding * 2,
              };

              await page.screenshot({ path: filepath, clip });
              usedClip = true;
            }
          }
        }

        // fallback: full page screenshot
        if (!usedClip) {
          await page.screenshot({ path: filepath, fullPage: true });
        }

        node.screenshot = `screenshots/${path.basename(filepath)}`;
      } catch {
        node.screenshot = null;
      }
    }

    impactGroups[level].push(issue);
  }

  // ---------- HTML (Axe DevTools-style) ----------
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Axe DevTools Style Report</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    background: #f5f5f7;
    color: #111827;
    display: flex;
    height: 100vh;
    overflow: hidden;
  }
  .sidebar {
    width: 260px;
    background: #111827;
    color: #e5e7eb;
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 2px 0 10px rgba(0,0,0,0.25);
    z-index: 1;
  }
  .sidebar-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .sidebar-sub {
    font-size: 12px;
    color: #9ca3af;
    margin-bottom: 10px;
  }
  .level-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-radius: 6px;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    font-size: 13px;
  }
  .level-link span:first-child { font-weight: 500; }
  .level-link[data-level="critical"] { background: rgba(239, 68, 68, 0.18); }
  .level-link[data-level="serious"] { background: rgba(249, 115, 22, 0.18); }
  .level-link[data-level="moderate"] { background: rgba(245, 158, 11, 0.15); }
  .level-link[data-level="minor"] { background: rgba(34, 197, 94, 0.12); }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 18px 22px 80px;
  }
  .page-header {
    font-size: 22px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .page-sub {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 18px;
  }
  .issue-group-title {
    margin-top: 16px;
    margin-bottom: 6px;
    font-size: 15px;
    font-weight: 600;
    text-transform: uppercase;
    color: #4b5563;
  }
  .issue-card {
    background: white;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 12px;
    box-shadow: 0 1px 4px rgba(15,23,42,0.08);
    border: 1px solid #e5e7eb;
    position: relative;
  }
  .issue-card.highlighted {
    box-shadow: 0 0 0 2px #a855f7;
    border-color: #a855f7;
  }
  .issue-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .issue-id {
    font-weight: 600;
    font-size: 14px;
  }
  .pill {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .pill-critical { background: #fee2e2; color: #b91c1c; }
  .pill-serious { background: #ffedd5; color: #c2410c; }
  .pill-moderate { background: #fef9c3; color: #854d0e; }
  .pill-minor { background: #dcfce7; color: #15803d; }

  .issue-body { margin-top: 8px; font-size: 13px; color: #4b5563; }
  .issue-actions { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
  .btn {
    border-radius: 6px;
    border: none;
    font-size: 12px;
    padding: 6px 10px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .btn-primary {
    background: #8b5cf6;
    color: white;
  }
  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
  }
  .node-snippet {
    margin-top: 8px;
    font-size: 12px;
    background: #f9fafb;
    border-radius: 6px;
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
  }
  .node-snippet code { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.55);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  .modal-backdrop.visible { display: flex; }
  .modal {
    background: white;
    width: min(960px, 90vw);
    max-height: 90vh;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(15,23,42,0.45);
  }
  .modal-header {
    background: linear-gradient(90deg, #8b5cf6, #ec4899);
    color: white;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .modal-title {
    font-size: 14px;
    font-weight: 600;
  }
  .modal-close {
    border: none;
    background: transparent;
    color: white;
    font-size: 18px;
    cursor: pointer;
  }
  .modal-body {
    padding: 14px 16px 10px;
    background: #111827;
    display: flex;
    justify-content: center;
  }
  .modal-body img {
    max-width: 100%;
    max-height: 60vh;
    border-radius: 8px;
    border: 2px solid #a855f7;
    background: #000;
  }
  .modal-footer {
    padding: 10px 16px 12px;
    background: #f9fafb;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
</style>
</head>
<body>

<div class="sidebar">
  <div class="sidebar-title">Axe DevTools Report</div>
  <div class="sidebar-sub">Grouped by impact level</div>
  <a class="level-link" data-level="critical" href="#group-critical">
    <span>Critical</span><span>${impactGroups.critical.length}</span>
  </a>
  <a class="level-link" data-level="serious" href="#group-serious">
    <span>Serious</span><span>${impactGroups.serious.length}</span>
  </a>
  <a class="level-link" data-level="moderate" href="#group-moderate">
    <span>Moderate</span><span>${impactGroups.moderate.length}</span>
  </a>
  <a class="level-link" data-level="minor" href="#group-minor">
    <span>Minor</span><span>${impactGroups.minor.length}</span>
  </a>
</div>

<div class="content">
  <div class="page-header">Accessibility scan results</div>
  <div class="page-sub">${esc(results.url || page.url?.() || "")}</div>

  ${Object.entries(impactGroups)
    .map(([level, issues]) => {
      const groupId = "group-" + level;
      const label = level.toUpperCase();
      return `
      <div id="${groupId}" class="issue-group">
        <div class="issue-group-title">${label}</div>
        ${
          issues.length === 0
            ? `<p style="font-size:13px;color:#6b7280;">No ${label.toLowerCase()} issues found.</p>`
            : issues
                .map((issue, idx) => {
                  const issueId = `${level}-${idx}`;
                  const firstNodeWithScreenshot =
                    (issue.nodes || []).find((n) => n.screenshot) || null;
                  const screenshotPath =
                    firstNodeWithScreenshot?.screenshot || issue.metaScreenshot || "";
                  return `
          <div class="issue-card" id="issue-${issueId}" data-issue-id="${issueId}">
            <div class="issue-header">
              <div class="issue-id">${esc(issue.id)} (${esc(issue.impact)})</div>
              <span class="pill pill-${level}">${label}</span>
            </div>
            <div class="issue-body">
              ${esc(issue.description || issue.help || "")}
            </div>

            ${
              issue.nodes && issue.nodes.length
                ? `<div class="node-snippet">
                     <div style="font-weight:500;margin-bottom:4px;">First affected node</div>
                     <code>${esc(issue.nodes[0].target?.join(", ") || "")}</code>
                     ${
                       issue.nodes[0].failureSummary
                         ? `<div style="margin-top:4px;">${esc(
                             issue.nodes[0].failureSummary
                           )}</div>`
                         : ""
                     }
                   </div>`
                : ""
            }

            <div class="issue-actions">
              ${
                screenshotPath
                  ? `<button class="btn btn-primary view-screenshot"
                             data-img="${esc(screenshotPath)}"
                             data-title="Screenshot: ${esc(
                               issue.help || issue.id
                             )}"
                             data-issue="${issueId}">
                       View screenshot
                     </button>`
                  : ""
              }
              ${
                issue.helpUrl
                  ? `<a class="btn btn-secondary"
                         href="${esc(issue.helpUrl)}"
                         target="_blank" rel="noreferrer">
                       Learn more
                     </a>`
                  : ""
              }
            </div>
          </div>`;
                })
                .join("")
        }
      </div>`;
    })
    .join("")}
</div>

<div class="modal-backdrop" id="screenshotModal">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title" id="modalTitle">Screenshot</div>
      <button class="modal-close" id="modalClose">&times;</button>
    </div>
    <div class="modal-body">
      <img id="modalImage" src="" alt="Issue screenshot" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" id="highlightBtn">Highlight issue</button>
      <button class="btn btn-secondary" id="modalCloseFooter">Close</button>
    </div>
  </div>
</div>

<script>
  (function () {
    const modalBackdrop = document.getElementById("screenshotModal");
    const modalImg = document.getElementById("modalImage");
    const modalTitle = document.getElementById("modalTitle");
    const highlightBtn = document.getElementById("highlightBtn");
    const closeButtons = [
      document.getElementById("modalClose"),
      document.getElementById("modalCloseFooter"),
    ];

    let currentIssueId = null;

    function openModal(imgSrc, title, issueId) {
      modalImg.src = imgSrc;
      modalTitle.textContent = title;
      currentIssueId = issueId;
      modalBackdrop.classList.add("visible");
    }

    function closeModal() {
      modalBackdrop.classList.remove("visible");
      modalImg.src = "";
      currentIssueId = null;
    }

    document.querySelectorAll(".view-screenshot").forEach((btn) => {
      btn.addEventListener("click", () => {
        const img = btn.getAttribute("data-img");
        const title = btn.getAttribute("data-title");
        const issueId = btn.getAttribute("data-issue");
        openModal(img, title, issueId);
      });
    });

    closeButtons.forEach((btn) => btn.addEventListener("click", closeModal));
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    highlightBtn.addEventListener("click", () => {
      if (!currentIssueId) return;
      document
        .querySelectorAll(".issue-card.highlighted")
        .forEach((el) => el.classList.remove("highlighted"));
      const card = document.getElementById("issue-" + currentIssueId);
      if (card) {
        card.classList.add("highlighted");
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      closeModal();
    });
  })();
</script>

</body>
</html>`;

  fs.writeFileSync(htmlFile, html, "utf-8");
  console.log("✅ Axe DevTools-style report generated at:", htmlFile);
}
