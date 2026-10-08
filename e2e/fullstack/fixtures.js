// Shared helpers for the e2e specs.
const base = require('@playwright/test');
const path = require('path');

const E2E_EMAIL = process.env.E2E_EMAIL || 'e2e-admin@startpos.test';
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'E2e-Passw0rd!';
const AUTH_STATE = path.join(__dirname, '..', '.auth', 'admin.json');

// Hosts the build talks to in production. A test must never reach them, so
// requests to them are aborted and reported as a failure.
const LIVE_API_HOSTS = /(gulfunionozone\.com|startuptech\.uk)/i;

// Noise that is not an application defect: third-party scripts or IP lookups
// that may be unreachable from CI.
const IGNORED_CONSOLE = [
  /Failed to load resource/i,
  /Error fetching IP/i,
  /ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/i,
  /api\.ipify\.org/i,
  /Download the React DevTools/i,
];

/**
 * `test` with a `guard` fixture that records uncaught page errors, failed
 * API calls (HTTP 5xx) and any attempt to reach the live API. Every test
 * asserts the guard is clean when it ends.
 */
const test = base.test.extend({
  guard: [async ({ page }, use, testInfo) => {
    const problems = [];
    page.on('pageerror', (err) => problems.push(`Uncaught error: ${err.message}`));
    page.on('response', (res) => {
      const url = res.url();
      if (url.includes('/v1/') && res.status() >= 500) {
        problems.push(`API ${res.request().method()} ${url} -> HTTP ${res.status()}`);
      }
    });
    await page.route(LIVE_API_HOSTS, (route) => {
      problems.push(`Request to live API blocked: ${route.request().url()}`);
      return route.abort();
    });
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (!IGNORED_CONSOLE.some((re) => re.test(text))) consoleErrors.push(text.slice(0, 300));
    });

    await use({ problems, consoleErrors });

    if (consoleErrors.length) {
      await testInfo.attach('console-errors', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
    }
    // A test may declare a known, tracked defect with
    // test.info().annotations.push({ type: 'known-issue', description });
    // its uncaught page errors are then attached instead of failing the test.
    // API 5xx responses and live-API requests always fail.
    const knownIssue = testInfo.annotations.some((a) => a.type === 'known-issue');
    const fatal = knownIssue ? problems.filter((p) => !p.startsWith('Uncaught error')) : problems;
    if (knownIssue && fatal.length !== problems.length) {
      await testInfo.attach('known-issue-page-errors', { body: problems.join('\n'), contentType: 'text/plain' });
    }
    base.expect(fatal, fatal.join('\n')).toEqual([]);
  }, { auto: true }],
});

module.exports = { test, expect: base.expect, E2E_EMAIL, E2E_PASSWORD, AUTH_STATE };
