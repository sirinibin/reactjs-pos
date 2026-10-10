const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { auditVerdict, summaryMarkdown, main } = require('../gate');

const base = {
  storeName: 'ZZ AUDIT 20261010-1200-abcd', matrix: 'standard', langs: ['en', 'ar'], target: 'http://localhost:2000', durationMs: 600000,
  violations: [], aborted: '',
  cells: [{ role: 'owner', scenario: 'setup', device: 'laptop', lang: 'en', status: 'passed' }, { role: 'cashier', scenario: 'selling', device: 'pixel-7', lang: 'ar', status: 'passed' }],
  findings: [{ severity: 'high', category: 'security', title: 'Leaks | hash', roles: ['owner'] }, { severity: 'low', category: 'a11y', title: 'x' }],
};

test('passes when every cell finished, whatever the findings', () => {
  const v = auditVerdict(base);
  assert.equal(v.ok, true);
  assert.equal(v.passed, 2);
  assert.deepEqual(v.bySeverity, { high: 1, low: 1 });
});

test('fails on a failed cell, an abort, a guard violation or an empty run', () => {
  assert.equal(auditVerdict({ ...base, cells: [...base.cells, { role: 'viewer', scenario: 'browse', device: 'tablet', lang: 'en', status: 'failed', error: 'x' }] }).ok, false);
  assert.match(auditVerdict({ ...base, aborted: 'login failed' }).reasons[0], /aborted/);
  assert.match(auditVerdict({ ...base, violations: ['read of store b'] }).reasons[0], /store guard/);
  assert.equal(auditVerdict({ ...base, cells: [] }).ok, false);
});

test('summary lists failed cells and high findings with pipes escaped', () => {
  const r = { ...base, cells: [...base.cells, { role: 'viewer', scenario: 'browse', device: 'tablet', lang: 'en', status: 'failed', error: 'a | b\nmore' }] };
  const md = summaryMarkdown(r, auditVerdict(r));
  assert.match(md, /### Role audit failed/);
  assert.match(md, /\| viewer \| browse \| tablet \| en \| a \\\| b \|/);
  assert.match(md, /Leaks \\\| hash/);
  assert.match(md, /findings: high 1, low 1/);
});

test('main writes the GitHub step summary and returns the exit code', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));
  const file = path.join(dir, 'report.json');
  const summary = path.join(dir, 'summary.md');
  fs.writeFileSync(file, JSON.stringify(base));
  const log = console.log;
  console.log = () => {};
  try {
    assert.equal(main([file], { GITHUB_STEP_SUMMARY: summary }), 0);
    assert.match(fs.readFileSync(summary, 'utf8'), /Role audit passed/);
    assert.equal(main([path.join(dir, 'missing.json')], { GITHUB_STEP_SUMMARY: summary }), 1);
    assert.match(fs.readFileSync(summary, 'utf8'), /no readable report/);
  } finally {
    console.log = log;
  }
});
