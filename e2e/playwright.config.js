// Browser end-to-end tests. Run from this folder:
//   npm install && npx playwright install chromium   (once)
//   (cd .. && npm run build)                          (build the app)
//   npm test
const { defineConfig } = require("@playwright/test");

const port = Number(process.env.E2E_PORT || 4310);

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 10000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1600, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {},
  },
  webServer: {
    command: "node serve-build.js",
    port,
    reuseExistingServer: true,
  },
});
