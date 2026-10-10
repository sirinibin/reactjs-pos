// Run configuration of the role audit (e2e/audit/run.js). Pure, so the naming and
// target rules are unit-tested (e2e/audit/test/config.test.js): every audit store and
// user carries the run id, the store name starts with "ZZ AUDIT", every email uses the
// reserved .test audit domain, and a run against a non-local site needs --live.

const AUDIT_STORE_PREFIX = 'ZZ AUDIT';
const AUDIT_STORE_PREFIX_AR = 'تدقيق آلي';
const DEFAULT_EMAIL_DOMAIN = 'audit.startpos.test'; // RFC 2606 .test: never delivered
const DEFAULT_TARGET = 'http://localhost:2000'; // pos-rest serving this build (STATIC_DIR)
// The production / test API hosts the build talks to when deployed. The audit never
// contacts them unless the run was started with --live against exactly that host.
const LIVE_HOSTS = /(^|\.)(gulfunionozone\.com|startuptech\.uk)$/i;

// run ids: UTC timestamp + 4 random hex chars, e.g. 20261010-0130-a3f9
function makeRunId(now = new Date(), rand = Math.random) {
  const p = (n) => String(n).padStart(2, '0');
  const ts = `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}-${p(now.getUTCHours())}${p(now.getUTCMinutes())}`;
  return `${ts}-${Math.floor(rand() * 0xffff).toString(16).padStart(4, '0')}`;
}
const RUN_ID_RE = /^\d{8}-\d{4}-[0-9a-f]{4}$/;

function auditEmail(runId, role, domain = DEFAULT_EMAIL_DOMAIN) {
  if (!RUN_ID_RE.test(runId)) throw new Error('bad run id ' + runId);
  return `audit-${runId}-${String(role).toLowerCase().replace(/[^a-z0-9]+/g, '-')}@${domain}`;
}

function isAuditEmail(email, runId, domain = DEFAULT_EMAIL_DOMAIN) {
  const e = String(email || '').trim().toLowerCase();
  return RUN_ID_RE.test(runId) && e.startsWith(`audit-${runId}-`) && e.endsWith('@' + domain.toLowerCase());
}

const auditStoreName = (runId) => `${AUDIT_STORE_PREFIX} ${runId}`;
const isAuditStoreName = (name, runId) =>
  runId ? String(name || '').trim().toUpperCase() === auditStoreName(runId).toUpperCase()
    : /^ZZ AUDIT \d{8}-\d{4}-[0-9a-f]{4}$/i.test(String(name || '').trim());
// RBAC role names the owner creates: "ZZ AUDIT <run> Cashier"
const auditRoleName = (runId, label) => `${AUDIT_STORE_PREFIX} ${runId} ${label}`;
const isAuditRoleName = (name, runId) => String(name || '').startsWith(`${AUDIT_STORE_PREFIX} ${runId} `);

// Strong password the server accepts (8+ chars, mixed classes).
function auditPassword(runId, rand = Math.random) {
  return `Audit#${runId.slice(-4)}${Math.floor(rand() * 1e6).toString(36).toUpperCase()}x9`;
}

// Saudi registration numbers in the shapes the store form validates, random per run so
// two runs (or two concurrent agents) never collide.
function saudiIds(rand = Math.random) {
  const digits = (n) => Array.from({ length: n }, () => Math.floor(rand() * 10)).join('');
  return {
    vatNo: '3' + digits(13) + '3',
    crNo: '10' + digits(8),
    phone: '05' + digits(8),
    branchCode: 'Z' + digits(4),
  };
}

const truthy = (v) => /^(1|true|yes|on)$/i.test(String(v || ''));
const isLocalHost = (host) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);

/** Builds the run config from environment variables (see e2e/audit/README.md). */
function buildRunConfig(env = {}, { argv = [], now = new Date(), rand = Math.random } = {}) {
  const runId = env.AUDIT_RUN_ID && RUN_ID_RE.test(env.AUDIT_RUN_ID) ? env.AUDIT_RUN_ID : makeRunId(now, rand);
  const target = String(env.AUDIT_BASE_URL || env.E2E_BASE_URL || DEFAULT_TARGET).replace(/\/+$/, '');
  const targetUrl = new URL(target);
  const domain = env.AUDIT_EMAIL_DOMAIN || DEFAULT_EMAIL_DOMAIN;
  const matrix = ['smoke', 'standard', 'full'].includes(env.AUDIT_MATRIX) ? env.AUDIT_MATRIX : 'standard';
  const live = !isLocalHost(targetUrl.host);
  // /v1/authorize is rate limited per X-Real-IP; one address per run (like the fullstack config)
  const ipSeed = Math.floor(rand() * 0xffffff);
  return {
    runId,
    target,
    targetHost: targetUrl.host,
    live,
    liveFlag: argv.includes('--live'),
    // the app and its API share one origin: pos-rest serves the build and /v1
    apiPrefix: '/v1',
    emailDomain: domain,
    storeName: auditStoreName(runId),
    storeNameAr: `${AUDIT_STORE_PREFIX_AR} ${runId}`,
    ownerEmail: String(env.AUDIT_OWNER_EMAIL || env.E2E_EMAIL || 'e2e-admin@startpos.test').toLowerCase(),
    ownerPassword: env.AUDIT_OWNER_PASSWORD || env.E2E_PASSWORD || 'E2e-Passw0rd!',
    password: env.AUDIT_PASSWORD || auditPassword(runId, rand),
    matrix,
    langs: (env.AUDIT_LANGS || 'en,ar').split(',').map((s) => s.trim()).filter(Boolean),
    outDir: env.AUDIT_OUT_DIR || `audit-reports/${runId}`,
    realIp: env.AUDIT_REAL_IP || `10.${(ipSeed >> 16) & 0xff}.${(ipSeed >> 8) & 0xff}.${(ipSeed & 0xfe) + 1}`,
    // LLM explorer: only when a key is present; the key itself is never stored or logged
    explorer: !!env.ANTHROPIC_API_KEY && !truthy(env.AUDIT_NO_EXPLORER),
    explorerModel: env.AUDIT_MODEL || 'claude-opus-5-5',
    explorerSteps: Math.max(0, Number(env.AUDIT_EXPLORER_STEPS) || 10),
    paceMs: Math.max(0, Number(env.AUDIT_PACE_MS ?? (live ? 250 : 0))),
    axe: !truthy(env.AUDIT_NO_AXE),
    headed: truthy(env.AUDIT_HEADED),
    chromiumPath: env.E2E_CHROMIUM || env.PW_CHROMIUM_PATH || '',
  };
}

/** Throws when the target needs --live and did not get it (CI and local runs never do). */
function assertTargetAllowed(cfg) {
  if (cfg.live && !cfg.liveFlag)
    throw new Error(`Refusing to run against ${cfg.target} without --live: the audit creates a store and users there. ` +
      'CI and local runs use the build served by a local pos-rest (http://localhost:2000).');
}

function emailsFor(cfg, roles) {
  return Object.fromEntries(roles.map((r) => [r, auditEmail(cfg.runId, r, cfg.emailDomain)]));
}

module.exports = {
  AUDIT_STORE_PREFIX, DEFAULT_EMAIL_DOMAIN, DEFAULT_TARGET, LIVE_HOSTS, RUN_ID_RE,
  makeRunId, auditEmail, isAuditEmail, auditStoreName, isAuditStoreName, auditRoleName, isAuditRoleName,
  auditPassword, saudiIds, buildRunConfig, assertTargetAllowed, emailsFor, isLocalHost,
};
