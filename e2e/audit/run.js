#!/usr/bin/env node
// Role audit of StartPOS ("human-like" testing): the owner creates a brand-new, clearly
// marked audit store through the real UI, builds one RBAC role per job and hires one
// user per role, then every persona works through the real UI on phone, tablet and
// desktop sizes in English and Arabic while each screen is checked. Writes
// index.html / report.md / report.json. See README.md in this folder.
//
//   node audit/run.js                       # against http://localhost:2000 (pos-rest serving ../build)
//   AUDIT_MATRIX=smoke node audit/run.js
//   AUDIT_BASE_URL=https://… node audit/run.js --live    # opt-in only; see README
//
// The store guard (lib/guard.js) stops the run the moment anything would touch another
// store, a user it did not create, or a live API host.
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { buildRunConfig, assertTargetAllowed, emailsFor, saudiIds } = require('./lib/config');
const { createGuardState, allowEmail, GuardViolation } = require('./lib/guard');
const { DEVICES, deviceById, planCells } = require('./lib/devices');
const { createRecorder, summarizeTimings, timingFindings } = require('./lib/findings');
const { renderMarkdown, renderHtml } = require('./lib/report');
const { loadDictionary, makeT } = require('./lib/i18n');
const { PERSONAS, personaById } = require('./lib/personas');
const { SCENARIOS } = require('./lib/scenarios');
const { login, setupStore, reuseStore } = require('./lib/setup');
const { openActor, ensureDir, stripAnsi } = require('./lib/actor');
const { explore } = require('./lib/explorer');

const E2E_DIR = path.resolve(__dirname, '..');
const APP_SRC = path.resolve(E2E_DIR, '..', 'src');

async function runAudit(env = process.env, { argv = process.argv.slice(2), log = console.log } = {}) {
  const cfg = buildRunConfig(env, { argv });
  assertTargetAllowed(cfg);
  const only = (env.AUDIT_ONLY || '').split(',').filter(Boolean);
  const roleFilter = (env.AUDIT_ROLES || '').split(',').filter(Boolean);
  const outDir = ensureDir(path.resolve(E2E_DIR, cfg.outDir));
  const shotsDir = ensureDir(path.join(outDir, 'screenshots'));
  const startedAt = new Date();
  log(`audit ${cfg.runId}: ${cfg.target} (${cfg.matrix}, ${cfg.langs.join('+')}) → ${outDir}`);

  const personas = PERSONAS.filter((p) => !roleFilter.length || p.id === 'owner' || roleFilter.includes(p.id));
  const emails = { owner: cfg.ownerEmail, ...emailsFor(cfg, personas.filter((p) => p.id !== 'owner').map((p) => p.id)) };
  const guard = createGuardState(cfg);
  const rec = createRecorder();
  const T = makeT(loadDictionary(path.join(APP_SRC, 'i18n', 'locales')));
  let axe = null;
  if (cfg.axe) {
    try { axe = require('@axe-core/playwright').default || require('@axe-core/playwright').AxeBuilder; } catch (_) { log('(@axe-core/playwright not installed: accessibility checks off)'); }
  }
  const browser = await chromium.launch({ headless: !cfg.headed, executablePath: cfg.chromiumPath || undefined });
  const run = {
    browser, cfg, guard, rec, T, axe,
    axeSeen: new Set(),
    shotsDir,
    stopped: null,
    data: { storeId: null, products: [], customers: [], vendors: [], sales: [], expenseCategoryId: null },
    onViolation(reason) {
      if (!run.stopped) {
        run.stopped = reason;
        log('STORE GUARD STOPPED THE RUN: ' + reason);
      }
    },
  };
  const users = [{ role: 'owner', email: cfg.ownerEmail }];
  const states = new Map(); // persona id -> storageState after its first sign-in
  const cellLog = (c) => {
    rec.cell(c);
    log(`  ${c.status.padEnd(7)} ${c.role.padEnd(10)} ${c.scenario.padEnd(14)} ${c.device.padEnd(11)} ${c.lang} ${(c.ms / 1000).toFixed(1)}s${c.error ? '  ' + c.error.split('\n')[0].slice(0, 140) : ''}`);
  };

  try {
    // ---- setup: the owner creates the store and hires the staff (desktop, English)
    const setupDevice = deviceById(env.AUDIT_SETUP_DEVICE || 'laptop');
    const owner = personaById('owner');
    const a = await openActor(run, { role: owner, device: setupDevice, lang: 'en', scenario: 'setup' });
    const t0 = Date.now();
    try {
      await a.step('Sign in as the owner', () => login(a, { email: cfg.ownerEmail, password: cfg.ownerPassword }), { timed: false });
      const reuse = /^(1|true)$/i.test(env.AUDIT_REUSE || '') && env.AUDIT_RUN_ID && !cfg.live; // local development only
      const { storeId } = reuse
        ? await a.step('Reuse the audit store of this run id', () => reuseStore(a, { cfg, personas, emails, guard, allowEmail, users }), { timed: false })
        : await setupStore(a, { cfg, ids: saudiIds(), personas, emails, srcDir: APP_SRC, guard, allowEmail, users });
      run.data.storeId = storeId;
      const ownerState = await a.context.storageState();
      states.set('owner', ownerState);
      const ls = (ownerState.origins.find((o) => o.origin === new URL(cfg.target).origin) || { localStorage: [] }).localStorage;
      run.remembered = Object.fromEntries(ls.filter((e) => /^last_store_/.test(e.name) && e.value === storeId).map((e) => [e.name, e.value]));
      cellLog({ role: 'owner', scenario: 'setup', device: setupDevice.id, lang: 'en', status: 'passed', ms: Date.now() - t0 });
    } catch (e) {
      cellLog({ role: 'owner', scenario: 'setup', device: setupDevice.id, lang: 'en', status: 'failed', ms: Date.now() - t0, error: stripAnsi(e.message) });
      throw e;
    } finally {
      await a.close();
    }

    // ---- the working day: every scenario on its device / language cells
    const scenarios = SCENARIOS.filter((s) => !only.length || only.includes(s.id));
    const cells = planCells(scenarios, { matrix: cfg.matrix, langs: cfg.langs, devices: DEVICES });
    for (const sc of scenarios) {
      const scCells = cells.filter((c) => c.scenario === sc.id);
      for (const [ci, cell] of scCells.entries()) {
        // standard: secondary roles take turns across the cells so each still covers every size class over the run
        const roles = sc.roles.filter((pid, ri) => cfg.matrix !== 'standard' || ri === 0 || !sc.rotateRoles || (ri - 1) % scCells.length === ci);
        for (const pid of roles) {
          const persona = personas.find((p) => p.id === pid);
          if (!persona || run.stopped) continue;
          const device = deviceById(cell.device);
          const c0 = Date.now();
          // the sign-in scenario signs in by hand on every device; the rest reuse the session
          const fresh = sc.id === 'signin' || !states.has(pid);
          const actor = await openActor(run, { role: persona, device, lang: cell.lang, scenario: sc.id, storageState: fresh ? null : states.get(pid) });
          let status = 'passed';
          let error = '';
          try {
            if (fresh) {
              const ms = await actor.step('Sign in', () => login(actor, { email: emails[pid], password: pid === 'owner' ? cfg.ownerPassword : cfg.password }), { timed: false });
              if (ms !== undefined && !states.has(pid)) states.set(pid, await actor.context.storageState());
            }
            await sc.run(actor);
          } catch (e) {
            status = 'failed';
            error = stripAnsi(e.message);
            if (e instanceof GuardViolation) throw e;
          } finally {
            await actor.close();
            cellLog({ role: pid, scenario: sc.id, device: device.id, lang: cell.lang, status, ms: Date.now() - c0, error });
          }
        }
      }
    }

    // ---- the explorer: Claude uses the app as each persona for a few steps (only with ANTHROPIC_API_KEY)
    if (cfg.explorer && !run.stopped) {
      let client = null;
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        client = new (Anthropic.default || Anthropic)(); // reads ANTHROPIC_API_KEY from the environment
      } catch (_) {
        rec.add({ severity: 'info', category: 'harness', title: 'Explorer skipped: @anthropic-ai/sdk is not installed', detail: 'npm install --no-save @anthropic-ai/sdk in e2e/ to use the Claude explorer.' });
      }
      let k = 0;
      for (const persona of client ? personas : []) {
        if (run.stopped) break;
        const device = DEVICES[(k * 3 + 1) % DEVICES.length];
        const lang = cfg.langs[k++ % cfg.langs.length];
        const actor = await openActor(run, { role: persona, device, lang, scenario: 'explorer', storageState: states.get(persona.id) });
        const c0 = Date.now();
        let status = 'passed';
        let error = '';
        try {
          await actor.go('/dashboard/business-dashboard');
          await explore(actor, persona, { client, model: cfg.explorerModel, steps: cfg.explorerSteps });
        } catch (e) {
          status = 'failed';
          error = stripAnsi(e.message);
          if (e instanceof GuardViolation) throw e;
        } finally {
          await actor.close();
          cellLog({ role: persona.id, scenario: 'explorer', device: device.id, lang, status, ms: Date.now() - c0, error });
        }
      }
    }
  } catch (e) {
    if (!run.stopped && !(e instanceof GuardViolation)) run.aborted = stripAnsi(e.message).split('\n')[0];
    else run.aborted = 'store guard: ' + (run.stopped || e.message);
  } finally {
    await browser.close().catch(() => {});
  }

  for (const f of timingFindings(summarizeTimings(rec.timings))) rec.add({ ...f, role: '' });
  const report = {
    runId: cfg.runId,
    target: cfg.target,
    live: cfg.live,
    storeName: cfg.storeName,
    storeId: guard.storeId,
    emailDomain: cfg.emailDomain,
    matrix: cfg.matrix,
    langs: cfg.langs,
    explorer: cfg.explorer,
    explorerModel: cfg.explorerModel,
    explorerSteps: cfg.explorerSteps,
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    aborted: run.aborted || '',
    violations: guard.violations,
    blockedReads: guard.blockedReads,
    thirdParty: [...guard.thirdParty.entries()],
    users,
    findings: rec.findings,
    timings: rec.timings,
    cells: rec.cells,
  };
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outDir, 'report.md'), renderMarkdown(report));
  fs.writeFileSync(path.join(outDir, 'index.html'), renderHtml(report));
  log(`done in ${(report.durationMs / 60000).toFixed(1)} min: ${report.findings.length} findings, ${report.cells.filter((c) => c.status === 'passed').length}/${report.cells.length} runs passed${report.aborted ? ', ABORTED: ' + report.aborted : ''} → ${path.join(outDir, 'index.html')}`);
  return report;
}

if (require.main === module) {
  runAudit().then(
    (r) => process.exit(r.violations.length ? 2 : 0),
    (e) => {
      console.error(e.message);
      process.exit(1);
    },
  );
}

module.exports = { runAudit };
