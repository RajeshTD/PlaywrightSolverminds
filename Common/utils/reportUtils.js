// Common/utils/reportUtils.js
import fs from 'fs';
import path from 'path';
import util from 'util';

const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);
const exists = (p) => fs.existsSync(p);

function ts() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, '-');
}

export async function generateAxeHtmlReport(results, screenshots = [], opts = {}) {
  // opts: { outDirBase }
  const base = opts.outDirBase || path.join(process.cwd(), 'report');
  const dir = path.join(base, `axe-report-${ts()}`);
  if (!exists(dir)) await mkdir(dir, { recursive: true });

  const jsonPath = path.join(dir, 'axe-report.json');
  await writeFile(jsonPath, JSON.stringify(results, null, 2));

  // copy provided screenshots (array of {name, path}) into images/
  const imagesDir = path.join(dir, 'images');
  if (!exists(imagesDir)) await mkdir(imagesDir);

  for (const s of screenshots || []) {
    try {
      const dest = path.join(imagesDir, s.name);
      fs.copyFileSync(s.path, dest);
    } catch (e) {
      console.warn('Could not copy screenshot', s, e.message);
    }
  }

  // Build index.html (simple Axe DevTools-like layout)
  const htmlFile = path.join(dir, 'index.html');

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Axe Report</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;margin:0}
  .header{padding:12px 20px;background:#f5f6f7;border-bottom:1px solid #ddd}
  .wrap{display:flex;height:calc(100vh - 58px)}
  .sidebar{width:320px;border-right:1px solid #ddd;overflow:auto;background:#fff}
  .main{flex:1;padding:18px;overflow:auto}
  .issue-item{padding:12px 14px;border-bottom:1px solid #eee;cursor:pointer}
  .issue-item:hover{background:#f7f9fb}
  .issue-title{font-weight:600}
  .tag{display:inline-block;background:#eee;padding:4px 8px;margin:4px;border-radius:14px;font-size:12px}
  .screenshot{max-width:420px;border:1px solid #ccc;margin:8px 0}
  pre{background:#f8f8f8;padding:10px;border-radius:4px;overflow:auto}
  .meta{color:#555;font-size:13px;margin-top:6px}
</style>
</head>
<body>
  <div class="header"><strong>Axe Accessibility Report</strong> — Violations: ${results.violations.length}</div>
  <div class="wrap">
    <div class="sidebar" id="sidebar">
      ${results.violations.map((v, i) => `
        <div class="issue-item" data-index="${i}">
          <div class="issue-title">${v.id} <span style="color:#999">(${v.impact})</span></div>
          <div class="meta">${v.nodes.length} node(s) • <a href="${v.helpUrl}" target="_blank">more</a></div>
        </div>
      `).join('')}
    </div>
    <div class="main" id="main">
      <div id="detail">
        <h2>Select an issue from the left</h2>
      </div>
    </div>
  </div>

<script>
  const results = ${JSON.stringify(results)};
  const screenshots = ${JSON.stringify((screenshots || []).map(s => ({name: s.name})))};

  function escapeHtml(s){
    return (s+'').replace(/[&<>"]/g,a=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[a]));
  }

  const sidebar = document.getElementById('sidebar');
  const detail = document.getElementById('detail');

  sidebar.addEventListener('click', (e) => {
    const it = e.target.closest('.issue-item');
    if (!it) return;
    const idx = +it.getAttribute('data-index');
    renderDetail(idx);
  });

  function renderDetail(i){
    const v = results.violations[i];
    detail.innerHTML = \`
      <h2>\${escapeHtml(v.id)} <small style="color:#666">(\${v.impact})</small></h2>
      <p>\${escapeHtml(v.description)}</p>
      <p><a href="\${v.helpUrl}" target="_blank">More information</a></p>
      <div>\${v.tags.map(t=>'<span class="tag">'+escapeHtml(t)+'</span>').join(' ')}</div>
      <h3>Nodes (\${v.nodes.length})</h3>
      \${v.nodes.map((n, ni) => {
        const shotName = (n.any && n.any[0] && n.any[0].id) ? n.any[0].id : null;
        const shotPath = shotName ? ('images/' + shotName + '.png') : null;
        return '<div style="margin-bottom:18px;">' +
          '<div style="font-weight:600">Node ' + (ni+1) + '</div>' +
          '<div style="font-size:13px;color:#333;margin:6px 0"><strong>Target:</strong> ' + escapeHtml((n.target||[]).join(', ')) + '</div>' +
          (shotPath ? '<img class="screenshot" src="'+shotPath+'" />' : '') +
          '<details><summary>HTML snippet</summary><pre>' + escapeHtml(n.html || '') + '</pre></details>' +
          '</div>';
      }).join('')}
    \`;
    window.scrollTo(0,0);
  }

  // Auto open first issue
  if (results.violations.length) renderDetail(0);
</script>
</body>
</html>`;

  await writeFile(htmlFile, html, 'utf8');
  console.log('Report generated at:', htmlFile);
  return { dir, htmlFile, jsonPath };
}
