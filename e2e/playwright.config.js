// @ts-check
const { defineConfig } = require('@playwright/test');

const UI_URL = process.env.E2E_UI_URL || 'http://localhost:3004';

module.exports = defineConfig({
    testDir: '.',
    timeout: 60000,
    expect: { timeout: 10000 },
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [['list']],
    globalSetup: require.resolve('./global-setup.js'),
    use: {
        baseURL: UI_URL,
        ignoreHTTPSErrors: true,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        viewport: { width: 1440, height: 900 },
    },
    projects: [
        { name: 'api', testMatch: /api\/.*\.spec\.js/ },
        { name: 'ui', testMatch: /ui\/.*\.spec\.js/, use: { storageState: '.auth/state.json' } },
    ],
});
