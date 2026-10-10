#!/usr/bin/env node
// Reads a role-audit report (audit/run.js) and decides whether CI passes.
//
//   node audit/gate.js audit-reports/<run id>/report.json
//
// Fails when the run was aborted, the store guard tripped, or any persona could not
// finish a scenario (a failed cell means a real flow is broken for that role on that
// device, or the harness lost its way: either way someone has to look). Findings
// themselves (security, a11y, slow steps, layout) are listed in the job summary and the
// uploaded report, not gated, so known app issues do not block every deploy.
// Writes the summary to $GITHUB_STEP_SUMMARY when set.
const fs = require('fs');

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];

function auditVerdict(report) {
  const cells = report.cells || [];
  const failed = cells.filter((c) => c.status === 'failed');
  const bySeverity = {};
  for (const f of report.findings || []) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  const reasons = [];
  if (report.aborted) reasons.push(`run aborted: ${report.aborted}`);
  if ((report.violations || []).length) reasons.push(`store guard: ${report.violations.length} violation(s)`);
  if (failed.length) reasons.push(`${failed.length} of ${cells.length} persona runs could not finish`);
  if (!cells.length && !report.aborted) reasons.push('no persona runs were recorded');
  return { ok: reasons.length === 0, reasons, failed, passed: cells.length - failed.length, total: cells.length, bySeverity };
}

const cell = (s) => String(s || '').split('\n')[0].replace(/\|/g, '\\|').slice(0, 160);

function summaryMarkdown(report, v) {
  const sev = SEVERITIES.filter((s) => v.bySeverity[s]).map((s) => `${s} ${v.bySeverity[s]}`).join(', ') || 'none';
  const lines = [
    `### Role audit ${v.ok ? 'passed' : 'failed'}`,
    '',
    `Store \`${report.storeName || ''}\` · ${report.target || ''} · matrix ${report.matrix || ''} (${(report.langs || []).join('+')}) · ` +
      `${v.passed}/${v.total} persona runs finished · ${((report.durationMs || 0) / 60000).toFixed(1)} min · findings: ${sev}`,
  ];
  if (v.reasons.length) lines.push('', ...v.reasons.map((r) => `- ${r}`));
  if (v.failed.length) {
    lines.push('', '| Role | Scenario | Device | Lang | Error |', '|---|---|---|---|---|');
    for (const c of v.failed) lines.push(`| ${c.role} | ${c.scenario} | ${c.device} | ${c.lang} | ${cell(c.error)} |`);
  }
  const top = (report.findings || []).filter((f) => f.severity === 'critical' || f.severity === 'high');
  if (top.length) {
    lines.push('', '<details><summary>Critical and high findings</summary>', '', '| Severity | Category | Finding | Roles |', '|---|---|---|---|');
    for (const f of top) lines.push(`| ${f.severity} | ${f.category} | ${cell(f.title)} | ${(f.roles || []).join(', ')} |`);
    lines.push('', '</details>');
  }
  lines.push('', 'Full report: index.html in the audit report artifact.');
  return lines.join('\n') + '\n';
}

function main(argv = process.argv.slice(2), env = process.env) {
  const file = argv[0];
  if (!file) {
    console.error('usage: node audit/gate.js <report.json>');
    return 1;
  }
  let report;
  try {
    report = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    const md = `### Role audit failed\n\n- no readable report at \`${file}\`: ${e.message}\n`;
    console.log(md);
    if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, md);
    return 1;
  }
  const v = auditVerdict(report);
  const md = summaryMarkdown(report, v);
  console.log(md);
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, md);
  return v.ok ? 0 : 1;
}

if (require.main === module) process.exit(main());

module.exports = { auditVerdict, summaryMarkdown, main };
