/**
 * Logs in once through the real API and saves a browser storage state with
 * the same localStorage keys the login screen writes, so UI tests start
 * signed in. The login screen itself is covered by ui/login.spec.js.
 */
const fs = require('fs');
const path = require('path');
const { request: pwRequest } = require('@playwright/test');
const { API_URL, login, firstStore } = require('./helpers');

module.exports = async config => {
    const baseURL = config.projects.find(p => p.name === 'ui').use.baseURL;
    const request = await pwRequest.newContext();
    const token = await login(request);
    const me = (await (await request.get(API_URL + '/v1/me', { headers: { Authorization: token } })).json()).result;
    const store = await firstStore(request, token);
    await request.dispose();

    const ls = {
        access_token: token,
        user_id: me.id,
        user_name: me.name,
        user_role: me.role || 'Manager',
        admin: String(!!me.admin),
        store_id: store.id,
        store_name: store.name,
        i18nextLng: 'en',
    };
    const state = {
        cookies: [],
        origins: [{ origin: new URL(baseURL).origin, localStorage: Object.entries(ls).map(([name, value]) => ({ name, value })) }],
    };
    const dir = path.join(__dirname, '.auth');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(state, null, 2));
    process.env.E2E_STORE_ID = store.id;
    process.env.E2E_TOKEN = token;
};
