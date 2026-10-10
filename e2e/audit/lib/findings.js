// Collects what the personas notice: findings (deduplicated across devices and
// languages), step timings and coverage. Pure data; report.js renders it.

const SEVERITIES = ["critical", "high", "medium", "low", "info"];
const CATEGORIES = [
  "security",
  "permission",
  "bug",
  "data",
  "performance",
  "layout",
  "i18n",
  "a11y",
  "ux",
  "console",
  "network",
  "harness",
];
const rank = (s) => {
  const i = SEVERITIES.indexOf(s);
  return i < 0 ? SEVERITIES.length : i;
};

// ids in URLs differ per record; the same problem on two records is one finding
function normalizePath(url) {
  let s = String(url || "");
  try {
    const u = new URL(s);
    s = u.pathname + u.hash;
  } catch {
    /* already a path */
  }
  return s
    .replace(/\?.*$/, "")
    .replace(/\/[0-9a-f]{24}(?=\/|$)/gi, "/:id")
    .replace(/\/(?:st|u|p|c|s|v|e|r)_[0-9a-z]+(?=\/|$)/gi, "/:id")
    .replace(/\/\d+(?=\/|$)/g, "/:n");
}

function findingKey(f) {
  return [f.category, f.title, normalizePath(f.url || "")].join("|");
}

function createRecorder() {
  const findings = new Map();
  const timings = [];
  const cells = [];
  let seq = 0;
  return {
    add(f) {
      const finding = {
        severity: SEVERITIES.includes(f.severity) ? f.severity : "medium",
        category: CATEGORIES.includes(f.category) ? f.category : "bug",
        title: String(f.title || "Untitled finding").slice(0, 200),
        detail: String(f.detail || "").slice(0, 4000),
        role: f.role || "",
        scenario: f.scenario || "",
        url: f.url || "",
        steps: (f.steps || []).slice(-15),
        screenshot: f.screenshot || "",
        source: f.source || "script",
      };
      const key = findingKey(finding);
      const prev = findings.get(key);
      const where = [f.device, f.lang].filter(Boolean).join("/");
      if (prev) {
        prev.count++;
        if (f.role && !prev.roles.includes(f.role)) prev.roles.push(f.role);
        if (where && !prev.where.includes(where)) prev.where.push(where);
        if (rank(finding.severity) < rank(prev.severity)) prev.severity = finding.severity;
        if (!prev.screenshot && finding.screenshot) prev.screenshot = finding.screenshot;
        return prev;
      }
      const rec = { id: "F" + String(++seq).padStart(3, "0"), ...finding, count: 1, roles: f.role ? [f.role] : [], where: where ? [where] : [] };
      findings.set(key, rec);
      return rec;
    },
    time(t) {
      timings.push({ role: t.role, scenario: t.scenario, step: t.step, ms: Math.round(t.ms), device: t.device, lang: t.lang });
    },
    cell(c) {
      cells.push(c);
    },
    get findings() {
      return [...findings.values()].sort((a, b) => rank(a.severity) - rank(b.severity) || b.count - a.count || a.id.localeCompare(b.id));
    },
    get timings() {
      return timings;
    },
    get cells() {
      return cells;
    },
  };
}

function percentile(values, p) {
  const v = [...values].sort((a, b) => a - b);
  if (!v.length) return 0;
  const i = Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1));
  return v[i];
}

/** Groups step timings: [{step, n, median, p95, max}] slowest first. */
function summarizeTimings(timings) {
  const by = new Map();
  for (const t of timings) {
    const k = t.step;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(t.ms);
  }
  return [...by.entries()]
    .map(([step, ms]) => ({ step, n: ms.length, median: percentile(ms, 50), p95: percentile(ms, 95), max: Math.max(...ms) }))
    .sort((a, b) => b.p95 - a.p95);
}

/** Severity counts per role: {role: {critical: n, ...}} (a finding counts for each role it hit). */
function severityByRole(findings) {
  const out = {};
  for (const f of findings) {
    for (const r of f.roles.length ? f.roles : ["(run)"]) {
      out[r] ||= Object.fromEntries(SEVERITIES.map((s) => [s, 0]));
      out[r][f.severity]++;
    }
  }
  return out;
}

const SLOW_MS = 3000;
const VERY_SLOW_MS = 8000;

/** Turns slow steps into performance findings (p95 over the thresholds). */
function timingFindings(summary) {
  return summary
    .filter((s) => s.p95 >= SLOW_MS)
    .map((s) => ({
      severity: s.p95 >= VERY_SLOW_MS ? "high" : "medium",
      category: "performance",
      title: `Slow: ${s.step}`,
      detail: `p95 ${(s.p95 / 1000).toFixed(1)} s, median ${(s.median / 1000).toFixed(1)} s, max ${(s.max / 1000).toFixed(1)} s over ${s.n} runs (target under ${SLOW_MS / 1000} s).`,
    }));
}

/** The "what to fine-tune" list: the top issues by severity, then by how widely they hit. */
function fineTuneList(findings, max = 12) {
  return findings
    .filter((f) => f.category !== "harness" && f.severity !== "info")
    .slice(0, max)
    .map((f) => ({ id: f.id, severity: f.severity, category: f.category, title: f.title, spread: f.count, roles: f.roles }));
}


module.exports = { SEVERITIES, CATEGORIES, normalizePath, findingKey, createRecorder, percentile, summarizeTimings, severityByRole, timingFindings, fineTuneList };
