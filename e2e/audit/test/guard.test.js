// The store guard is the audit's safety net: these rules decide whether a request may
// leave the browser. Run with `npm run test:audit-unit` (node:test, no browser).
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRunConfig, auditEmail, auditRoleName } = require('../lib/config');
const G = require('../lib/guard');

const RUN = '20261010-1200-abcd';
const STORE = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const TOKEN = 'tok-123';
const T = 'http://localhost:2000';

function fresh({ env = {}, argv = [] } = {}) {
  const cfg = buildRunConfig({ AUDIT_RUN_ID: RUN, ...env }, { argv });
  return G.createGuardState(cfg);
}
function ready() {
  const s = fresh();
  s.tokens.add(TOKEN);
  assert.equal(G.checkResponse(s, { method: 'POST', url: T + '/v1/store', status: 200, json: { result: { id: STORE, name: 'ZZ AUDIT ' + RUN } } }), null);
  G.activateStore(s, STORE);
  return s;
}
const req = (s, method, path, body, token = TOKEN) =>
  G.checkRequest(s, { method, url: path.startsWith('http') ? path : T + path, headers: token ? { authorization: token } : {}, body: body && JSON.stringify(body) });

test('live hosts are refused, with and without --live for another host', () => {
  const s = ready();
  for (const u of ['https://startpos-api.gulfunionozone.com/v1/me', 'https://api.startuptech.uk/x', 'https://gulfunionozone.com/']) {
    const d = req(s, 'GET', u);
    assert.equal(d.allow, false, u);
    assert.equal(d.violation, true, u);
  }
  const live = fresh({ env: { AUDIT_BASE_URL: 'https://startpos.gulfunionozone.com' }, argv: ['--live'] });
  assert.equal(G.checkRequest(live, { method: 'GET', url: 'https://startpos.gulfunionozone.com/' }).allow, true);
  assert.equal(G.checkRequest(live, { method: 'GET', url: 'https://other.gulfunionozone.com/' }).allow, false);
});

test('a non-local target without --live is refused before anything starts', () => {
  const { assertTargetAllowed } = require('../lib/config');
  assert.throws(() => assertTargetAllowed(buildRunConfig({ AUDIT_BASE_URL: 'https://startpos.gulfunionozone.com' })), /--live/);
  assert.doesNotThrow(() => assertTargetAllowed(buildRunConfig({})));
});

test('third-party writes are blocked quietly, reads counted', () => {
  const s = ready();
  assert.deepEqual(req(s, 'POST', 'https://api.ipify.org/x').violation, false);
  assert.equal(req(s, 'GET', 'https://api.ipify.org/?format=json').allow, true);
  assert.equal(s.thirdParty.get('api.ipify.org'), 1);
  assert.equal(req(s, 'GET', 'https://fonts.googleapis.com/css').allow, true);
  assert.equal(s.thirdParty.has('fonts.googleapis.com'), false);
});

test('sign-in only as accounts this run may use', () => {
  const s = ready();
  assert.equal(req(s, 'POST', '/v1/authorize', { email: 'e2e-admin@startpos.test' }, '').allow, true);
  assert.equal(req(s, 'POST', '/v1/authorize', { email: 'someone@shop.sa' }, '').violation, true);
  const staff = auditEmail(RUN, 'cashier');
  assert.equal(req(s, 'POST', '/v1/authorize', { email: staff }, '').violation, true);
  G.allowEmail(s, staff);
  assert.equal(req(s, 'POST', '/v1/authorize', { email: staff }, '').allow, true);
  assert.throws(() => G.allowEmail(s, 'boss@shop.sa'));
});

test('tokens: anonymous writes and foreign tokens stop the run', () => {
  const s = ready();
  assert.equal(req(s, 'POST', '/v1/product?search[store_id]=' + STORE, { store_id: STORE }, '').violation, true);
  assert.equal(req(s, 'GET', '/v1/product?search[store_id]=' + STORE, null, 'someone-elses').violation, true);
  assert.equal(G.checkResponse(s, { method: 'POST', url: T + '/v1/accesstoken', status: 200, json: { result: { access_token: 'new' } } }), null);
  assert.equal(req(s, 'GET', '/v1/product?search[store_id]=' + STORE, null, 'Bearer new').allow, true);
});

test('only one store, named for this run', () => {
  const s = fresh();
  s.tokens.add(TOKEN);
  assert.equal(req(s, 'POST', '/v1/store', { name: 'My Shop' }).violation, true);
  assert.equal(req(s, 'POST', '/v1/store', { name: 'ZZ AUDIT 20261010-1200-ffff' }).violation, true, 'another run id');
  assert.equal(req(s, 'POST', '/v1/store', { name: 'ZZ AUDIT ' + RUN }).allow, true);
  assert.equal(req(s, 'POST', '/v1/store', { name: 'ZZ AUDIT ' + RUN }).violation, true, 'second create');
  assert.match(G.checkResponse(s, { method: 'POST', url: T + '/v1/store', status: 200, json: { result: { id: OTHER, name: 'Real shop' } } }), /not the audit store/);
});

test('before the switch other stores are blocked quietly; after it they stop the run', () => {
  const s = fresh();
  s.tokens.add(TOKEN);
  const d = req(s, 'GET', '/v1/store/' + OTHER);
  assert.equal(d.allow, false);
  assert.equal(d.violation, false);
  assert.equal(s.blockedReads, 1);
  assert.equal(req(s, 'POST', '/v1/product', { store_id: OTHER }).violation, true, 'writes before the store exists');
  G.checkResponse(s, { method: 'POST', url: T + '/v1/store', status: 200, json: { result: { id: STORE, name: 'ZZ AUDIT ' + RUN } } });
  assert.throws(() => G.activateStore(s, OTHER));
  G.activateStore(s, STORE);
  assert.equal(req(s, 'GET', '/v1/store/' + OTHER).violation, true);
  assert.equal(req(s, 'GET', '/v1/order?search[store_id]=' + OTHER).violation, true);
  assert.equal(req(s, 'GET', '/v1/order?search[store_id]=' + STORE).allow, true);
});

test('writes must name the audit store (query, body, nested lines, product_stores keys)', () => {
  const s = ready();
  assert.equal(req(s, 'POST', '/v1/order?search[store_id]=' + STORE, { store_id: STORE, products: [{ store_id: STORE }] }).allow, true);
  assert.equal(req(s, 'POST', '/v1/order?search[store_id]=' + STORE, { store_id: STORE, products: [{ store_id: OTHER }] }).violation, true);
  assert.equal(req(s, 'POST', '/v1/product', { store_id: STORE, product_stores: { [OTHER]: { retail_unit_price: 1 } } }).violation, true);
  assert.equal(req(s, 'PUT', '/v1/user/' + OTHER, { store_ids: [STORE] }).violation, true, 'a user this run did not create');
  assert.equal(req(s, 'DELETE', '/v1/product/' + OTHER).violation, true, 'no store, not our record');
  assert.equal(req(s, 'POST', '/v1/order/calculate-net-total', { products: [] }).allow, true, 'stateless calculator');
});

test('records this run created may be changed without a store id', () => {
  const s = ready();
  const id = 'cccccccccccccccccccccccc';
  G.checkResponse(s, { method: 'POST', url: T + '/v1/product?search[store_id]=' + STORE, status: 200, json: { result: { id } }, requestBody: JSON.stringify({ store_id: STORE }) });
  assert.equal(req(s, 'DELETE', '/v1/product/' + id).allow, true);
});

test('users and roles carry this run\'s names', () => {
  const s = ready();
  assert.equal(req(s, 'POST', '/v1/user', { email: 'real@shop.sa', store_ids: [STORE] }).violation, true);
  assert.equal(req(s, 'POST', '/v1/user', { email: auditEmail(RUN, 'viewer'), store_ids: [STORE] }).allow, true);
  assert.equal(req(s, 'POST', '/v1/user-role?search[store_id]=' + STORE, { name: 'Cashier', store_id: STORE }).violation, true);
  assert.equal(req(s, 'POST', '/v1/user-role?search[store_id]=' + STORE, { name: auditRoleName(RUN, 'Cashier'), store_id: STORE }).allow, true);
});

test('off-limits endpoints are refused even in the audit store', () => {
  const s = ready();
  for (const p of [`/v1/store/${STORE}/duplicate`, `/v1/store/${STORE}/permanent`, `/v1/store/${STORE}/restore`, '/v1/admin/settings', '/v1/store-data', '/v1/product/migrate-rack', '/v1/forgot-password'])
    assert.equal(req(s, 'POST', p, { store_id: STORE }).violation, true, p);
});

test('/v1/me must be an allowed account, and staff must see only the audit store', () => {
  const s = ready();
  assert.match(G.checkResponse(s, { method: 'GET', url: T + '/v1/me', status: 200, json: { result: { email: 'x@shop.sa' } } }), /unexpected user/);
  const staff = auditEmail(RUN, 'salesman');
  G.allowEmail(s, staff);
  assert.equal(G.checkResponse(s, { method: 'GET', url: T + '/v1/me', status: 200, json: { result: { email: staff, store_ids: [STORE] } } }), null);
  assert.match(G.checkResponse(s, { method: 'GET', url: T + '/v1/me', status: 200, json: { result: { email: staff, store_ids: [STORE, OTHER] } } }), /other stores/);
});

test('the cross-store probe id is readable but never writable, and is no real store', () => {
  const s = ready();
  const probe = G.addProbeStore(s);
  assert.match(probe, /^fffffff0[0-9a-f]{16}$/);
  assert.notEqual(probe, STORE);
  assert.equal(req(s, 'GET', `/v1/product?search[store_id]=${probe}&limit=1`).allow, true);
  assert.equal(req(s, 'POST', `/v1/product?search[store_id]=${probe}`, { store_id: probe }).violation, true);
  assert.equal(req(s, 'GET', `/v1/product?search[store_id]=${OTHER}`).violation, true, 'other ids still stop the run');
});

test('reusing a store is for local runs with the same run id only', () => {
  const s = fresh();
  assert.throws(() => G.adoptStore(s, STORE, 'Real shop'));
  G.adoptStore(s, STORE, 'ZZ AUDIT ' + RUN);
  assert.equal(s.storeId, STORE);
  const live = fresh({ env: { AUDIT_BASE_URL: 'https://startpos.gulfunionozone.com' }, argv: ['--live'] });
  assert.throws(() => G.adoptStore(live, STORE, 'ZZ AUDIT ' + RUN), /live/);
});

test('storeIdsIn finds ids at any depth', () => {
  assert.deepEqual(G.storeIdsIn({ a: { b: [{ store_id: 'x' }] }, store_ids: ['y'], product_stores: { z: {} } }).sort(), ['x', 'y', 'z']);
});
