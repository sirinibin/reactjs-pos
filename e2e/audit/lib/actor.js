// One persona at work on one device in one language: a fresh browser context with the
// store guard installed, console / network / timing capture, and the helpers the
// scenarios use (go, step, shot, checkScreen, api).
const fs = require('fs');
const path = require('path');
const { contextOptions } = require('./devices');
const { installGuard, GuardViolation } = require('./guard');
const { collectScreen, analyzeScreen, analyzeAxe, analyzeConsole, analyzeNetwork } = require('./checks');

class ExpectationFailed extends Error {
  constructor(finding) {
    super(finding.title);
    this.name = 'ExpectationFailed';
    this.finding = finding;
  }
}

/** Fails the current step with a product finding (not a harness hiccup). */
function expectThat(ok, finding) {
  if (!ok) throw new ExpectationFailed(finding);
}

// eslint-disable-next-line no-control-regex
const stripAnsi = (s) => String(s).replace(/\u001b\[[0-9;]*m/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openActor(run, { role, user, device, lang, scenario, storageState }) {
  const { browser, cfg, guard, rec, T } = run;
  const context = await browser.newContext({
    ...contextOptions(device, lang),
    baseURL: cfg.target,
    storageState: storageState || undefined,
    extraHTTPHeaders: { 'X-Real-IP': cfg.realIp },
  });
  let violation = null;
  await installGuard(context, guard, (reason) => {
    violation = violation || reason;
    run.onViolation(reason);
  });
  // the persona's language, as if they had picked it in the language menu last time
  await context.addInitScript((l) => {
    try { if (!sessionStorage.getItem('__audit_lang')) { localStorage.setItem('i18nextLng', l); sessionStorage.setItem('__audit_lang', '1'); } } catch (_) { /* storage blocked */ }
  }, lang);
  // the owner (a platform Admin who can see every store) comes back to the audit store, as the app remembers the last store per user
  if (run.remembered && Object.keys(run.remembered).length)
    await context.addInitScript((kv) => {
      try { for (const [k, v] of Object.entries(kv)) if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch (_) { /* storage blocked */ }
    }, run.remembered);
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const consoleMsgs = [];
  const responses = [];
  // errors caused by the guard blocking another store's data before the audit store exists are the harness's doing
  // and fetches cut off by a page load (reload, goto) are the browser's doing, not the app's
  let navAt = 0;
  page.on('request', (r) => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) navAt = Date.now(); });
  const keep = (text) => !/Failed to fetch|ERR_BLOCKED_BY_CLIENT/i.test(text) || (guard.storeActive && Date.now() - navAt > 2000);
  page.on('console', (m) => { if (m.type() === 'error' && keep(m.text())) consoleMsgs.push({ type: 'console', text: m.text(), url: page.url() }); });
  page.on('pageerror', (e) => { const t = e.stack || e.message; if (keep(t)) consoleMsgs.push({ type: 'pageerror', text: t, url: page.url() }); });
  page.on('response', async (r) => {
    let u;
    try { u = new URL(r.url()); } catch (_) { return; }
    if (u.host !== cfg.targetHost || !u.pathname.startsWith('/v1/') || r.status() < 400) return;
    let body = '';
    try { body = (await r.text()).slice(0, 500); } catch (_) { /* gone */ }
    responses.push({ method: r.request().method(), path: u.pathname, status: r.status(), body, url: page.url() });
  });

  const steps = [];
  const where = { role: role.id, device: device.id, lang, scenario };
  let shotN = 0;
  const expectedNet = [];
  const rel = (url) => { try { const u = new URL(url); return u.pathname; } catch (_) { return url; } };

  const actor = {
    page, context, cfg, role, user, device, lang, T, steps,
    data: run.data,
    guard,
    rtl: lang === 'ar',
    narrow: device.viewport.width < 992,
    get violation() { return violation; },
    /** Allows API errors the scenario provokes on purpose (validation, forbidden). */
    expectNetwork(e) { expectedNet.push(e); },
    /** Text the app shows for `en` in this persona's language (placeholders, exact labels). */
    tr(en) { return T.text(en, lang); },
    async go(p) {
      await page.goto(cfg.target + p, { waitUntil: 'domcontentloaded' });
      await actor.settle();
    },
    async settle(ms = 300) {
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {});
      const stuck = await page
        .waitForFunction(() => ![...document.querySelectorAll('.spinner-border, .spinner-grow')].some((s) => s.getBoundingClientRect().width > 0), null, { timeout: 15_000 })
        .then(() => false).catch(() => true);
      if (stuck && !page.isClosed())
        actor.finding({ severity: 'medium', category: 'performance', title: 'Loading spinner still showing after 15 s', screenshot: await actor.shot('stuck-loader') });
      if (ms) await sleep(ms);
    },
    async shot(name, fullPage = false) {
      const file = `${role.id}-${scenario}-${device.id}-${lang}-${++shotN}-${String(name).replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.png`;
      try {
        await page.screenshot({ path: path.join(run.shotsDir, file), fullPage, timeout: 10_000 });
        return 'screenshots/' + file;
      } catch (_) { return ''; }
    },
    /** Records how long something the user waited for took (shows in Timing, slow ones become findings). */
    time(name, ms) { rec.time({ ...where, step: `${role.label}: ${name}`, ms }); },
    finding(f) {
      return rec.add({ ...where, url: rel(page.url()), steps: [...steps], ...f });
    },
    /** One timed step. Failures become findings; a store-guard violation stops the run. */
    async step(name, fn, { optional = false, timed = true } = {}) {
      if (run.stopped) throw new GuardViolation(run.stopped);
      steps.push(name);
      const t0 = Date.now();
      try {
        const out = await fn();
        if (run.stopped) throw new GuardViolation(run.stopped);
        if (timed) rec.time({ ...where, step: `${role.label}: ${name}`, ms: Date.now() - t0 });
        if (cfg.paceMs) await sleep(cfg.paceMs);
        return out;
      } catch (e) {
        if (e instanceof GuardViolation || run.stopped) throw e instanceof GuardViolation ? e : new GuardViolation(run.stopped);
        const screenshot = await actor.shot(name, !(e instanceof ExpectationFailed));
        if (e instanceof ExpectationFailed) {
          actor.finding({ ...e.finding, screenshot });
          return undefined;
        }
        actor.finding({
          severity: optional ? 'low' : 'medium',
          category: 'harness',
          title: `Could not complete: ${name}`,
          detail: stripAnsi(String(e.message || e)).split('\n').slice(0, 8).join('\n'),
          screenshot,
        });
        if (!optional) throw e;
        return undefined;
      }
    },
    /** Layout / i18n / a11y checks of the current screen (axe once per screen, size class and language). */
    async checkScreen(label = '') {
      try {
        const snap = await page.evaluate(collectScreen);
        for (const f of analyzeScreen(snap, { mobile: device.mobile })) actor.finding({ ...f, title: f.title + (label ? ` (${label})` : '') });
        const key = `${rel(snap.url).replace(/\/[0-9a-f]{24}/g, '/:id')}|${label}|${device.kind}|${lang}`;
        if (run.axe && !run.axeSeen.has(key)) {
          run.axeSeen.add(key);
          const res = await new run.axe({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
          // one finding per axe rule for the whole run (screens and devices are listed on it), not one per screen
          for (const f of analyzeAxe(res.violations)) actor.finding({ ...f, url: '(app-wide)', detail: `First seen on ${rel(snap.url)}${label ? ' (' + label + ')' : ''}. ${f.detail || ''}` });
        }
      } catch (_) { /* the screen navigated away mid-check */ }
    },
    /** Calls the API with this persona's own session (the guard checks it like any request). */
    async api(method, apiPath, body) {
      if (!page.url().startsWith(cfg.target)) await actor.go('/dashboard/business-dashboard'); // the session lives in the app's storage
      return page.evaluate(async ({ method, apiPath, body }) => {
        try {
          const r = await fetch(apiPath, {
            method,
            headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') || '' },
            body: body ? JSON.stringify(body) : undefined,
          });
          let json = null;
          try { json = await r.json(); } catch (_) { /* empty */ }
          return { status: r.status, json };
        } catch (e) { return { status: 0, error: String(e) }; }
      }, { method, apiPath, body });
    },
    async close() {
      for (const f of analyzeConsole(consoleMsgs)) actor.finding({ ...f, url: rel(consoleMsgs.find((m) => m.text.startsWith(f.detail.slice(0, 40)))?.url || page.url()) });
      for (const f of analyzeNetwork(responses, { expected: expectedNet })) {
        const r = responses.find((x) => f.title.includes(String(x.status)) && f.title.includes(x.method));
        actor.finding({ ...f, url: rel(r?.url || page.url()) });
      }
      await context.close().catch(() => {});
    },
  };
  return actor;
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
  return d;
}

module.exports = { ExpectationFailed, expectThat, stripAnsi, openActor, ensureDir, sleep };
