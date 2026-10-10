const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../lib/config');
const { DEVICES, planCells } = require('../lib/devices');
const P = require('../lib/personas');
const { menuRows } = require('../lib/setup');
const { createRecorder, normalizePath } = require('../lib/findings');
const { renderMarkdown, renderHtml } = require('../lib/report');
const { loadDictionary, makeT } = require('../lib/i18n');

const SRC = path.resolve(__dirname, '../../../src');

test('run ids, names and emails are marked for the run', () => {
  const id = C.makeRunId(new Date('2026-10-10T12:34:00Z'), () => 0.5);
  assert.match(id, C.RUN_ID_RE);
  assert.equal(C.auditEmail(id, 'Cashier'), `audit-${id}-cashier@audit.startpos.test`);
  assert.equal(C.isAuditEmail(C.auditEmail(id, 'x'), id), true);
  assert.equal(C.isAuditEmail('audit-x@audit.startpos.test', id), false);
  assert.equal(C.isAuditStoreName('zz audit ' + id, id), true);
  assert.equal(C.isAuditStoreName('ZZ AUDIT 20261010-0000-0000', id), false);
  assert.throws(() => C.auditEmail('bad', 'x'));
});

test('config defaults to the local pos-rest and the standard matrix', () => {
  const cfg = C.buildRunConfig({});
  assert.equal(cfg.target, 'http://localhost:2000');
  assert.equal(cfg.live, false);
  assert.equal(cfg.matrix, 'standard');
  assert.deepEqual(cfg.langs, ['en', 'ar']);
  assert.equal(cfg.explorer, false);
  assert.equal(C.buildRunConfig({ ANTHROPIC_API_KEY: 'k' }).explorer, true);
  assert.equal(C.buildRunConfig({ ANTHROPIC_API_KEY: 'k', AUDIT_NO_EXPLORER: '1' }).explorer, false);
  assert.equal(C.buildRunConfig({ AUDIT_MATRIX: 'nonsense' }).matrix, 'standard');
  assert.match(C.buildRunConfig({}).realIp, /^10\.\d+\.\d+\.\d+$/);
  assert.equal(C.buildRunConfig({ AUDIT_BASE_URL: 'https://x.startuptech.uk' }).live, true);
});

test('saudi ids have the shapes the store form wants', () => {
  const ids = C.saudiIds();
  assert.match(ids.vatNo, /^3\d{13}3$/);
  assert.match(ids.crNo, /^10\d{8}$/);
  assert.match(ids.phone, /^05\d{8}$/);
});

test('planCells: smoke one cell, standard one per size class, full everything', () => {
  const sc = [{ id: 'a' }, { id: 'b', devices: ['desktop'], standardCells: 1 }];
  assert.equal(planCells(sc, { matrix: 'smoke', langs: ['en', 'ar'] }).length, 2);
  const std = planCells(sc, { matrix: 'standard', langs: ['en', 'ar'] });
  const kinds = std.filter((c) => c.scenario === 'a').map((c) => DEVICES.find((d) => d.id === c.device).kind);
  assert.deepEqual(kinds, ['phone', 'tablet', 'desktop']);
  assert.deepEqual(new Set(std.filter((c) => c.scenario === 'a').map((c) => c.lang)), new Set(['en', 'ar']));
  assert.equal(std.filter((c) => c.scenario === 'b').length, 1);
  assert.equal(planCells(sc, { matrix: 'full', langs: ['en', 'ar'] }).length, DEVICES.length * 2 + 3 * 2);
});

test('the persona resources match the app\'s sidebar menu', () => {
  const rows = menuRows(SRC);
  assert.deepEqual([...new Set(rows.map((r) => r.resource))], P.RESOURCES);
  for (const r of Object.values(P.RBAC_ROLES)) for (const k of Object.keys(r.perms)) assert.ok(P.RESOURCES.includes(k), k);
});

test('can(): Admin everything, Manager all but roles, RBAC per matrix', () => {
  assert.equal(P.can('owner', 'user_roles', 'create'), true);
  assert.equal(P.can('manager', 'user_roles', 'read'), false);
  assert.equal(P.can('manager', 'purchases', 'create'), true);
  assert.equal(P.can('cashier', 'sales', 'create'), true);
  assert.equal(P.can('cashier', 'products', 'create'), false);
  assert.equal(P.can('viewer', 'sales', 'create'), false);
  assert.equal(P.can('viewer', 'sales', 'read'), true);
  assert.equal(P.can('nobody', 'sales', 'read'), false);
  for (const s of P.GUARDED_SCREENS) assert.ok(fs.readFileSync(path.join(SRC, 'App.js'), 'utf8').includes(`path="${s.path}"`), s.path);
});

test('findings deduplicate across devices and keep the worst severity', () => {
  const rec = createRecorder();
  rec.add({ severity: 'low', category: 'layout', title: 'X', url: '/dashboard/product/aaaaaaaaaaaaaaaaaaaaaaaa', role: 'owner', device: 'tablet', lang: 'en' });
  rec.add({ severity: 'high', category: 'layout', title: 'X', url: '/dashboard/product/bbbbbbbbbbbbbbbbbbbbbbbb', role: 'cashier', device: 'phone-se', lang: 'ar' });
  assert.equal(rec.findings.length, 1);
  assert.equal(rec.findings[0].severity, 'high');
  assert.deepEqual(rec.findings[0].roles, ['owner', 'cashier']);
  assert.equal(normalizePath('http://x/dashboard/a/aaaaaaaaaaaaaaaaaaaaaaaa?x=1'), '/dashboard/a/:id');
});

test('report renders markdown and escaped html', () => {
  const run = { runId: 'r', target: 'http://localhost:2000', storeName: 'ZZ AUDIT r', findings: [{ id: 'F001', severity: 'high', category: 'security', title: '<script>x</script>', detail: '', roles: [], where: [], steps: [], count: 1 }], timings: [], cells: [], users: [], violations: [], thirdParty: [], langs: ['en'] };
  assert.match(renderMarkdown(run), /StartPOS/);
  const html = renderHtml(run);
  assert.ok(!html.includes('<script>x</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('bilingual locators come from the app\'s own locale files', () => {
  const T = makeT(loadDictionary(path.join(SRC, 'i18n', 'locales')));
  const re = T('Create', { exact: true });
  assert.ok(re.test('Create'));
  assert.ok(re.test('+ Create'));
  assert.ok(!re.test('Create New'));
  assert.notEqual(T.text('Create', 'ar'), 'Create');
});
