// Renders an audit run as Markdown and as a self-contained HTML page (screenshots are
// linked relative to the report folder). Pure: e2e/audit/test/report.test.js.
const { SEVERITIES, severityByRole, summarizeTimings, fineTuneList } = require("./findings");

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const mdCell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n+/g, " ");
const secs = (ms) => (ms / 1000).toFixed(1) + " s";

function coverage(run) {
  const cells = run.cells || [];
  const ok = cells.filter((c) => c.status === "passed").length;
  const failed = cells.filter((c) => c.status === "failed").length;
  const skipped = cells.filter((c) => c.status === "skipped").length;
  const devices = new Set(cells.map((c) => c.device));
  const langs = new Set(cells.map((c) => c.lang));
  return { total: cells.length, ok, failed, skipped, devices: [...devices], langs: [...langs] };
}

function buildModel(run) {
  const findings = run.findings || [];
  return {
    ...run,
    coverage: coverage(run),
    bySeverity: Object.fromEntries(SEVERITIES.map((s) => [s, findings.filter((f) => f.severity === s).length])),
    byRole: severityByRole(findings),
    timing: summarizeTimings(run.timings || []),
    fineTune: fineTuneList(findings),
  };
}

function renderMarkdown(run) {
  const m = buildModel(run);
  const L = [];
  L.push(`# StartPOS role audit · ${m.runId}`, "");
  L.push(`Target: ${m.target} (API ${m.target}/v1)${m.live ? " · LIVE run" : ""}  `);
  L.push(`Audit store: **${m.storeName}** (id ${m.storeId || "not created"}) · started ${m.startedAt} · took ${secs(m.durationMs || 0)}  `);
  L.push(`Matrix: ${m.matrix} · ${m.coverage.total} scenario runs (${m.coverage.ok} passed, ${m.coverage.failed} failed, ${m.coverage.skipped} skipped) on ${m.coverage.devices.length} device sizes in ${m.coverage.langs.join(" + ") || "-"}  `);
  L.push(`LLM explorer: ${m.explorer ? m.explorerModel + ` (${m.explorerSteps} steps per persona)` : "off (no ANTHROPIC_API_KEY)"}`, "");
  if (m.aborted) L.push(`> **Run stopped early:** ${m.aborted}`, "");
  L.push("## Summary", "");
  L.push("| Severity | Findings |", "|---|---|");
  for (const s of SEVERITIES) L.push(`| ${s} | ${m.bySeverity[s]} |`);
  L.push("");
  L.push("## What to fine-tune first", "");
  if (!m.fineTune.length) L.push("Nothing above info level.");
  m.fineTune.forEach((f, i) => L.push(`${i + 1}. **[${f.severity}] ${mdCell(f.title)}** (${f.category}; seen ${f.spread}× by ${f.roles.join(", ") || "the run"}) · ${f.id}`));
  L.push("");
  L.push("## Findings by role", "");
  L.push(`| Role | ${SEVERITIES.join(" | ")} |`, `|---|${SEVERITIES.map(() => "---").join("|")}|`);
  for (const [r, c] of Object.entries(m.byRole)) L.push(`| ${r} | ${SEVERITIES.map((s) => c[s]).join(" | ")} |`);
  L.push("");
  L.push("## Findings", "");
  for (const f of m.findings || []) {
    L.push(`### ${f.id} · [${f.severity}] ${f.title}`, "");
    L.push(`Category: ${f.category} · roles: ${f.roles.join(", ") || "-"} · seen ${f.count}× (${f.where.slice(0, 8).join(", ")}${f.where.length > 8 ? ", …" : ""}) · source: ${f.source}  `);
    if (f.url) L.push(`Screen: \`${f.url}\`  `);
    if (f.detail) L.push("", f.detail);
    if (f.steps?.length) {
      L.push("", "Repro steps:", "");
      f.steps.forEach((s, i) => L.push(`${i + 1}. ${s}`));
    }
    if (f.screenshot) L.push("", `![${f.id}](${f.screenshot})`);
    L.push("");
  }
  L.push("## Timing (slowest first)", "");
  L.push("| Step | Runs | Median | p95 | Max |", "|---|---|---|---|---|");
  for (const t of m.timing.slice(0, 40)) L.push(`| ${mdCell(t.step)} | ${t.n} | ${secs(t.median)} | ${secs(t.p95)} | ${secs(t.max)} |`);
  L.push("");
  L.push("## Coverage", "");
  L.push("| Role | Scenario | Device | Lang | Result | Time |", "|---|---|---|---|---|---|");
  for (const c of m.cells || []) L.push(`| ${c.role} | ${mdCell(c.scenario)} | ${c.device} | ${c.lang} | ${c.status}${c.error ? ": " + mdCell(c.error).slice(0, 120) : ""} | ${secs(c.ms || 0)} |`);
  L.push("");
  L.push("## Store guard", "");
  L.push(`Violations: ${(m.violations || []).length ? m.violations.map(mdCell).join("; ") : "none"} · reads of other stores blocked before the audit store existed: ${m.blockedReads || 0}  `);
  L.push(`Users created: ${(m.users || []).map((u) => `${u.role} (${u.email})`).join(", ") || "-"}  `);
  L.push(`Third-party hosts read: ${(m.thirdParty || []).map(([h, n]) => `${h} (${n})`).join(", ") || "none"}`, "");
  L.push("## Cleaning up", "");
  L.push(
    `Every audit store is named \`ZZ AUDIT <run id>\`, every RBAC role \`ZZ AUDIT <run id> <role>\` and every audit user \`audit-<run id>-<role>@${m.emailDomain}\`. ` +
      "CI runs use a throwaway MongoDB, so nothing is left behind. After a --live run, find them by that prefix on the Stores and Users screens and delete the users, then the store.",
    "",
  );
  return L.join("\n");
}

const SEV_COLOR = { critical: "#b42318", high: "#c4320a", medium: "#b54708", low: "#175cd3", info: "#475467" };

function renderHtml(run) {
  const m = buildModel(run);
  const e = escapeHtml;
  const badge = (s) => `<span class="sev" style="--c:${SEV_COLOR[s] || "#475467"}">${e(s)}</span>`;
  const findings = (m.findings || [])
    .map(
      (f) => `<details class="f" ${["critical", "high"].includes(f.severity) ? "open" : ""} data-sev="${e(f.severity)}" data-cat="${e(f.category)}">
  <summary>${badge(f.severity)} <b>${e(f.id)}</b> ${e(f.title)} <small>${e(f.category)} · ${f.count}× · ${e(f.roles.join(", "))}</small></summary>
  <div class="fb">
    ${f.url ? `<p><code>${e(f.url)}</code></p>` : ""}
    ${f.detail ? `<p class="pre">${e(f.detail)}</p>` : ""}
    <p class="muted">Seen on: ${e(f.where.join(", ") || "-")} · source: ${e(f.source)}</p>
    ${f.steps?.length ? `<ol>${f.steps.map((s) => `<li>${e(s)}</li>`).join("")}</ol>` : ""}
    ${f.screenshot ? `<a href="${e(f.screenshot)}"><img loading="lazy" src="${e(f.screenshot)}" alt="Screenshot for ${e(f.id)}"></a>` : ""}
  </div>
</details>`,
    )
    .join("\n");
  const roleRows = Object.entries(m.byRole)
    .map(([r, c]) => `<tr><th>${e(r)}</th>${SEVERITIES.map((s) => `<td>${c[s] || ""}</td>`).join("")}</tr>`)
    .join("");
  const timingRows = m.timing
    .slice(0, 40)
    .map((t) => `<tr><td>${e(t.step)}</td><td>${t.n}</td><td>${secs(t.median)}</td><td>${secs(t.p95)}</td><td>${secs(t.max)}</td></tr>`)
    .join("");
  const cellRows = (m.cells || [])
    .map(
      (c) =>
        `<tr class="${e(c.status)}"><td>${e(c.role)}</td><td>${e(c.scenario)}</td><td>${e(c.device)}</td><td>${e(c.lang)}</td><td>${e(c.status)}${c.error ? `<br><small>${e(String(c.error).slice(0, 160))}</small>` : ""}</td><td>${secs(c.ms || 0)}</td></tr>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Role audit ${e(m.runId)}</title>
<style>
:root{--bg:#fff;--fg:#101828;--mut:#667085;--line:#e4e7ec;--card:#f9fafb}
@media (prefers-color-scheme:dark){:root{--bg:#0c111d;--fg:#f5f5f6;--mut:#94969c;--line:#1f242f;--card:#161b26}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}
.muted,small{color:var(--mut)}.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px}.tile b{display:block;font-size:22px}
table{border-collapse:collapse;width:100%;font-size:13px;display:block;overflow-x:auto}th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:start;white-space:nowrap}
tr.failed td{color:#c4320a}.sev{display:inline-block;border-radius:99px;padding:0 8px;font-size:12px;color:#fff;background:var(--c)}
details.f{border:1px solid var(--line);border-radius:10px;margin:8px 0;background:var(--card)}details.f summary{cursor:pointer;padding:10px 12px}
.fb{padding:0 12px 12px}.fb img{max-width:100%;max-height:420px;border:1px solid var(--line);border-radius:8px}.pre{white-space:pre-wrap}
code{font-size:12px;word-break:break-all}ol.ft li{margin:4px 0}.filters{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
.filters button{border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:99px;padding:2px 10px;cursor:pointer}
.filters button[aria-pressed=true]{background:var(--fg);color:var(--bg)}
</style></head><body><main>
<h1>StartPOS role audit · ${e(m.runId)}</h1>
<p class="muted">${e(m.target)} · audit store <b>${e(m.storeName)}</b> (${e(m.storeId || "not created")}) · ${e(m.startedAt)} · ${secs(m.durationMs || 0)} · matrix ${e(m.matrix)} · explorer ${m.explorer ? e(m.explorerModel) : "off"}</p>
${m.aborted ? `<p><b>Run stopped early:</b> ${e(m.aborted)}</p>` : ""}
<div class="tiles">${SEVERITIES.map((s) => `<div class="tile">${badge(s)}<b>${m.bySeverity[s]}</b></div>`).join("")}
<div class="tile">runs<b>${m.coverage.ok}/${m.coverage.total}</b></div><div class="tile">devices<b>${m.coverage.devices.length}</b></div></div>
<h2>What to fine-tune first</h2>
<ol class="ft">${m.fineTune.map((f) => `<li>${badge(f.severity)} <b>${e(f.title)}</b> <small>${e(f.category)} · ${f.spread}× · ${e(f.roles.join(", "))} · ${e(f.id)}</small></li>`).join("") || "<li>Nothing above info level.</li>"}</ol>
<h2>Findings by role</h2>
<table><thead><tr><th>Role</th>${SEVERITIES.map((s) => `<th>${s}</th>`).join("")}</tr></thead><tbody>${roleRows}</tbody></table>
<h2>Findings</h2>
<div class="filters" role="group" aria-label="Filter by severity">${["all", ...SEVERITIES].map((s) => `<button type="button" data-f="${s}" aria-pressed="${s === "all"}">${s}</button>`).join("")}</div>
${findings || "<p>No findings.</p>"}
<h2>Timing (slowest first)</h2>
<table><thead><tr><th>Step</th><th>Runs</th><th>Median</th><th>p95</th><th>Max</th></tr></thead><tbody>${timingRows}</tbody></table>
<h2>Coverage</h2>
<table><thead><tr><th>Role</th><th>Scenario</th><th>Device</th><th>Lang</th><th>Result</th><th>Time</th></tr></thead><tbody>${cellRows}</tbody></table>
<h2>Store guard</h2>
<p>Violations: ${(m.violations || []).length ? e(m.violations.join("; ")) : "none"} · reads of other stores blocked before the audit store existed: ${m.blockedReads || 0}</p>
<p>Users created: ${e((m.users || []).map((u) => `${u.role} (${u.email})`).join(", ") || "-")}</p>
<p>Third-party hosts read: ${e((m.thirdParty || []).map(([h, n]) => `${h} (${n})`).join(", ") || "none")}</p>
<h2>Cleaning up</h2>
<p>Audit stores are named <code>ZZ AUDIT &lt;run id&gt;</code>; audit users are <code>audit-&lt;run id&gt;-&lt;role&gt;@${e(m.emailDomain)}</code>. CI uses a throwaway MongoDB; after a --live run delete the users, then the store, from the Users and Stores screens.</p>
</main>
<script>
document.querySelectorAll(".filters button").forEach(function(b){b.addEventListener("click",function(){
  var f=b.dataset.f;document.querySelectorAll(".filters button").forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});
  document.querySelectorAll("details.f").forEach(function(d){d.hidden=!(f==="all"||d.dataset.sev===f)});});});
</script></body></html>`;
}


module.exports = { escapeHtml, buildModel, renderMarkdown, renderHtml };
