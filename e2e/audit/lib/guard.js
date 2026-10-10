// The store guard: the audit may only ever change the store it created and the users
// and roles it created. Every browser request and every API response passes through
// checkRequest / checkResponse; a violation aborts the request and stops the whole run
// (fail closed). The rules are unit-tested in e2e/audit/test/guard.test.js:
//
//  * never a request to the live API hosts (gulfunionozone.com, startuptech.uk) unless
//    the run was started with --live against exactly that host;
//  * sign-in only as the owner account or an email this run created
//    (audit-<run>-<role>@audit.startpos.test);
//  * every API call carries a token this run was issued (anonymous writes are refused);
//  * exactly one store is created, and it must be named "ZZ AUDIT <run id>";
//  * every store id a request names (search[store_id], store_id, store_ids, /store/<id>)
//    must be the audit store. Until the owner has switched to the audit store, reads of
//    another store's data are blocked quietly (the owner's landing page) and writes stop
//    the run; after that, any request naming another store stops the run;
//  * a write that names no store must target a record this run created (PUT/DELETE
//    /v1/<thing>/<id>) or be one of the stateless calculators;
//  * users and RBAC roles may only be created with this run's audit emails / role names
//    and only for the audit store;
//  * destructive platform endpoints (store duplicate / permanent delete / admin
//    settings / store data) are always off limits;
//  * a staff user whose /v1/me lists any other store stops the run.
const { LIVE_HOSTS, isAuditEmail, isAuditStoreName, isAuditRoleName } = require('./config');

class GuardViolation extends Error {
  constructor(reason) {
    super('STORE GUARD: ' + reason);
    this.name = 'GuardViolation';
    this.reason = reason;
  }
}

function createGuardState(cfg) {
  return {
    cfg,
    ownerEmail: String(cfg.ownerEmail).toLowerCase(),
    allowedEmails: new Set([String(cfg.ownerEmail).toLowerCase()]),
    storeId: null,
    storeActive: false, // set once the owner's session has switched to the audit store
    storeCreates: 0,
    ownedIds: new Set(), // records this run created (users, roles, products, sales, ...)
    tokens: new Set(),
    violations: [],
    probeStoreIds: new Set(),
    blockedReads: 0, // reads of another store's data blocked before the audit store existed
    thirdParty: new Map(), // host -> count (reads we let through)
  };
}

/** Called once the owner's session runs on the audit store (store switcher verified). */
function activateStore(state, storeId) {
  if (!state.storeId || storeId !== state.storeId) throw new GuardViolation(`session switched to ${storeId}, not the audit store ${state.storeId}`);
  state.storeActive = true;
}

/** Local development only (AUDIT_REUSE=1): continue in the audit store an earlier run with the same run id created. */
function adoptStore(state, storeId, storeName) {
  if (state.cfg.live) throw new GuardViolation('reusing an audit store is not allowed on a live run');
  if (!isAuditStoreName(storeName, state.cfg.runId) || !OID.test(String(storeId))) throw new GuardViolation(`refusing to adopt store ${storeName} (${storeId})`);
  state.storeId = String(storeId);
  state.storeCreates = 1;
  state.ownedIds.add(state.storeId);
}

/**
 * A made-up store id (no store has it) for the cross-store probe: a read naming it must be
 * refused with 403. Only GETs may name it; any write naming it still stops the run.
 */
function addProbeStore(state, rand = () => Math.floor(Math.random() * 16)) {
  let id;
  do id = 'fffffff0' + Array.from({ length: 16 }, () => rand().toString(16)).join('');
  while (id === state.storeId);
  state.probeStoreIds.add(id);
  return id;
}

function allowEmail(state, email) {
  const e = String(email).toLowerCase();
  if (!isAuditEmail(e, state.cfg.runId, state.cfg.emailDomain)) throw new GuardViolation('refusing to allow a non-audit email ' + e);
  state.allowedEmails.add(e);
}

const OID = /^[0-9a-f]{24}$/i;
const FONT_HOSTS = /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com)$/i;
// never, in any store
const FORBIDDEN = [
  /^\/v1\/store\/[^/]+\/(duplicate|permanent|restore)/,
  /^\/v1\/admin/i,
  /^\/v1\/store-data/i,
  /^\/v1\/product\/migrate-rack/,
  /\/(forgot|reset)-?password/i,
];
// stateless calculators the forms call while you type (no store id in the body)
const STATELESS = [/\/calculate-/, /\/v1\/arabic-name\/translate/i, /\/v1\/translate/i, /\/v1\/logout$/];

function parseBody(body) {
  if (body == null || body === '') return null;
  if (typeof body === 'object') return body;
  try { return JSON.parse(body); } catch (_) { return null; }
}

/** Every store id anywhere in a JSON body (nested lines included). */
function storeIdsIn(value, out = [], depth = 0) {
  if (!value || typeof value !== 'object' || depth > 6) return out;
  if (Array.isArray(value)) { for (const v of value) storeIdsIn(v, out, depth + 1); return out; }
  for (const [k, v] of Object.entries(value)) {
    if ((k === 'store_id' || k === 'storeId') && v != null && v !== '') {
      out.push(String(v));
    } else if ((k === 'store_ids' || k === 'storeIds') && Array.isArray(v)) {
      for (const x of v) { if (x) out.push(String(x)); }
    } else if (k === 'product_stores' && v && typeof v === 'object' && !Array.isArray(v)) {
      for (const key of Object.keys(v)) out.push(key);
      storeIdsIn(v, out, depth + 1);
    } else if (v && typeof v === 'object') storeIdsIn(v, out, depth + 1);
  }
  return out;
}

function tokenOf(headers = {}) {
  const h = headers.authorization || headers.Authorization || '';
  return String(h).replace(/^Bearer\s+/i, '').trim();
}

function queryStoreIds(u) {
  const ids = [];
  for (const [k, v] of u.searchParams) if (v && /^(search\[)?store_?id\]?$/i.test(k)) ids.push(v);
  return ids;
}

/**
 * Decides one outgoing request: {allow: true} | {allow: false, violation: bool, reason}.
 * violation:false blocks quietly (third-party writes, another store's data before the
 * audit store exists); violation:true stops the run.
 */
function checkRequest(state, { method = 'GET', url, headers = {}, body }) {
  let u;
  try { u = new URL(url); } catch (_) { return { allow: true }; }
  if (!/^https?:$/.test(u.protocol)) return { allow: true };
  const { cfg } = state;
  const m = method.toUpperCase();
  const deny = (reason) => ({ allow: false, violation: true, reason });
  const quiet = (reason) => ({ allow: false, violation: false, reason });

  if (LIVE_HOSTS.test(u.hostname) && !(cfg.liveFlag && u.host === cfg.targetHost))
    return deny(`request to the live host ${u.host} (${m} ${u.pathname})`);
  if (u.host !== cfg.targetHost) {
    if (m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') return quiet(`write to third-party host ${u.host} blocked`);
    if (!FONT_HOSTS.test(u.hostname)) state.thirdParty.set(u.host, (state.thirdParty.get(u.host) || 0) + 1);
    return { allow: true };
  }
  const path = u.pathname;
  if (!path.startsWith(cfg.apiPrefix + '/') || m === 'OPTIONS') return { allow: true }; // the app's own files
  if (FORBIDDEN.some((re) => re.test(path))) return deny(`off-limits endpoint ${m} ${path}`);
  const json = parseBody(body);

  if (path === '/v1/authorize') {
    const email = String(json?.email || '').trim().toLowerCase();
    if (!state.allowedEmails.has(email)) return deny('sign-in as an account this run may not use: ' + (email || '(empty)'));
    return { allow: true };
  }
  if (path === '/v1/accesstoken') return { allow: true }; // exchanges the code /v1/authorize just issued

  const tok = tokenOf(headers);
  const write = m !== 'GET' && m !== 'HEAD';
  if (!tok) return write ? deny(`anonymous write ${m} ${path}`) : { allow: true };
  if (!state.tokens.has(tok)) return deny(`API call with a token this run was not issued (${m} ${path})`);

  const ids = [...queryStoreIds(u), ...(json ? storeIdsIn(json) : [])];
  const sm = /^\/v1\/store\/([^/?#]+)/.exec(path);
  if (sm && OID.test(sm[1])) ids.push(sm[1]);
  const foreign = ids.filter((id) => id !== state.storeId);

  if (!write) {
    if (!foreign.length) return { allow: true };
    // the permission sweep's cross-store probe: a made-up store id that names no real store, reads only
    if (foreign.every((id) => state.probeStoreIds.has(id))) return { allow: true };
    if (!state.storeActive) { state.blockedReads++; return quiet(`read of another store before the session switched to the audit store (${path})`); }
    return deny(`read of store ${foreign[0]}, not the audit store ${state.storeId} (${path})`);
  }

  // ---- writes
  if (m === 'POST' && path === '/v1/store') {
    if (state.storeCreates > 0 || state.storeId) return deny('a second store create in one run');
    if (!isAuditStoreName(json?.name, cfg.runId)) return deny('creating a store not named as this run\'s audit store: ' + json?.name);
    state.storeCreates++;
    return { allow: true };
  }
  if (path.startsWith('/v1/user') && !path.startsWith('/v1/user-role')) {
    const um = /^\/v1\/user\/([0-9a-f]{24})/i.exec(path);
    if (m === 'POST' && path === '/v1/user') {
      if (!isAuditEmail(json?.email, cfg.runId, cfg.emailDomain)) return deny('creating a user without this run\'s audit email: ' + json?.email);
    } else if (!um || !state.ownedIds.has(um[1])) return deny(`changing a user this run did not create (${m} ${path})`);
  }
  if (path.startsWith('/v1/user-role') && m === 'POST' && json && json.name != null && !isAuditRoleName(json.name, cfg.runId))
    return deny('creating an RBAC role not named for this run: ' + json.name);
  if (!state.storeId) {
    if (m === 'DELETE' && path === '/v1/logout') return { allow: true };
    return deny(`write before the audit store exists (${m} ${path})`);
  }
  if (foreign.length) return deny(`write names store ${foreign[0]}, not the audit store ${state.storeId} (${m} ${path})`);
  if (!ids.length) {
    const rec = /^\/v1\/[a-z-]+\/(?:[a-z-]+\/)*([0-9a-f]{24})(?:\/|$)/i.exec(path);
    if (rec && state.ownedIds.has(rec[1])) return { allow: true };
    if (STATELESS.some((re) => re.test(path))) return { allow: true };
    return deny(`write that names no store and no record of this run (${m} ${path})`);
  }
  return { allow: true };
}

/** Checks an API response; records tokens, the audit store and created records. Returns a violation reason or null. */
function checkResponse(state, { method = 'GET', url, status, json, requestBody }) {
  let u;
  try { u = new URL(url); } catch (_) { return null; }
  if (u.host !== state.cfg.targetHost || status >= 400 || !json || typeof json !== 'object') return null;
  const path = u.pathname;
  const m = method.toUpperCase();
  const result = json.result;
  if (path === '/v1/accesstoken' && m === 'POST') {
    if (result?.access_token) state.tokens.add(result.access_token);
    return null;
  }
  if (path === '/v1/store' && m === 'POST' && result?.id) {
    if (!isAuditStoreName(result.name, state.cfg.runId)) return 'store create returned a store that is not the audit store: ' + result.name;
    state.storeId = String(result.id);
    state.ownedIds.add(state.storeId);
    return null;
  }
  if (path === '/v1/me' && m === 'GET' && result) {
    const email = String(result.email || '').toLowerCase();
    if (!state.allowedEmails.has(email)) return 'signed in as an unexpected user ' + email;
    if (email !== state.ownerEmail && state.storeId) {
      const ids = (result.store_ids || []).map(String);
      if (ids.some((id) => id !== state.storeId)) return `audit user ${email} has access to other stores (${ids.join(',')})`;
    }
    return null;
  }
  if ((m === 'POST') && result && typeof result === 'object' && OID.test(String(result.id || ''))) {
    const body = parseBody(requestBody);
    const ids = [...queryStoreIds(u), ...(body ? storeIdsIn(body) : [])];
    if (state.storeId && (ids.includes(state.storeId) || path === '/v1/user')) state.ownedIds.add(String(result.id));
  }
  return null;
}

/** Installs the guard on a Playwright context. onViolation(reason) stops the run. */
async function installGuard(context, state, onViolation) {
  const violate = (reason) => {
    state.violations.push(reason);
    onViolation(reason);
  };
  await context.route('**/*', async (route) => {
    const req = route.request();
    let decision;
    try {
      decision = checkRequest(state, { method: req.method(), url: req.url(), headers: await req.allHeaders(), body: req.postData() });
    } catch (e) {
      decision = { allow: false, violation: true, reason: 'guard error: ' + e.message };
    }
    if (!decision.allow) {
      if (decision.violation) violate(decision.reason);
      return route.abort('blockedbyclient').catch(() => {});
    }
    let u;
    try { u = new URL(req.url()); } catch (_) { return route.fallback(); }
    // read API answers that set state (tokens, store id, created ids) before the page sees them
    const inspect = u.host === state.cfg.targetHost && u.pathname.startsWith('/v1/') &&
      (req.method() === 'POST' || u.pathname === '/v1/me');
    if (!inspect) return route.fallback();
    let res;
    try { res = await route.fetch(); } catch (_) { return route.abort().catch(() => {}); }
    let json = null;
    try { json = await res.json(); } catch (_) { /* not JSON */ }
    const reason = checkResponse(state, { method: req.method(), url: req.url(), status: res.status(), json, requestBody: req.postData() });
    if (reason) { violate(reason); return route.abort('blockedbyclient').catch(() => {}); }
    return route.fulfill({ response: res }).catch(() => {});
  });
}

module.exports = { GuardViolation, createGuardState, activateStore, adoptStore, allowEmail, addProbeStore, checkRequest, checkResponse, storeIdsIn, installGuard };
