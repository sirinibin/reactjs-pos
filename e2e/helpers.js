const API_URL = process.env.E2E_API_URL || 'http://localhost:2000';
const EMAIL = process.env.E2E_EMAIL || 'sirinibin2006@gmail.com';
const PASSWORD = process.env.E2E_PASSWORD || '123456';

/** Logs in through the same two-step flow the app uses. */
/**
 * The API rate-limits /v1/authorize per client IP (10 per 15 min). Each test
 * login presents its own address in X-Real-IP so suites can run repeatedly
 * against a local API without tripping the limiter.
 */
function testClientIp() {
    return '10.' + [0, 0, 0].map(() => Math.floor(Math.random() * 250) + 1).join('.');
}

async function login(request) {
    if (process.env.E2E_TOKEN) return process.env.E2E_TOKEN;
    const auth = await request.post(API_URL + '/v1/authorize', { data: { email: EMAIL, password: PASSWORD }, headers: { 'X-Real-IP': testClientIp() } });
    if (!auth.ok()) throw new Error('authorize failed: ' + auth.status() + ' ' + (await auth.text()));
    const code = (await auth.json()).result.code;
    const tok = await request.post(API_URL + '/v1/accesstoken', { headers: { Authorization: code } });
    if (!tok.ok()) throw new Error('accesstoken failed: ' + tok.status());
    return (await tok.json()).result.access_token;
}

/** First store visible to the test user (the store the UI will open). */
async function firstStore(request, token) {
    const res = await request.get(API_URL + '/v1/store?select=id,name&limit=1', { headers: { Authorization: token } });
    const body = await res.json();
    if (!body.result || !body.result.length) throw new Error('The test user has no store. Create one first.');
    return body.result[0];
}

function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

module.exports = { API_URL, EMAIL, PASSWORD, login, firstStore, uid, testClientIp };
