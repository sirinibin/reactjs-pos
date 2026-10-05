import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the real Go API (proxied by Vite preview on :4173 → API_URL).
 * Device matrix covers phones, tablets (portrait/landscape), laptops and large desktops.
 */
const STATE = 'tests/e2e/.auth/state.json';
const chromiumPath = process.env.PW_CHROMIUM || undefined;
const launch = chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {};

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...launch,
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 240_000,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop-1920', use: { storageState: STATE, ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } , dependencies: ['setup'] },
    { name: 'laptop-1366', use: { storageState: STATE, ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } , dependencies: ['setup'] },
    { name: 'laptop-1280', use: { storageState: STATE, ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } , dependencies: ['setup'] },
    { name: 'ipad-pro-landscape', use: { storageState: STATE, ...devices['iPad Pro 11 landscape'], browserName: 'chromium' } , dependencies: ['setup'] },
    { name: 'ipad-portrait', use: { storageState: STATE, ...devices['iPad (gen 7)'], browserName: 'chromium' } , dependencies: ['setup'] },
    { name: 'galaxy-tab-s4', use: { storageState: STATE, ...devices['Galaxy Tab S4'], browserName: 'chromium' } , dependencies: ['setup'] },
    { name: 'iphone-14', use: { storageState: STATE, ...devices['iPhone 14'], browserName: 'chromium' } , dependencies: ['setup'] },
    { name: 'iphone-se', use: { storageState: STATE, ...devices['iPhone SE'], browserName: 'chromium' } , dependencies: ['setup'] },
    { name: 'pixel-7', use: { storageState: STATE, ...devices['Pixel 7'] } , dependencies: ['setup'] },
    { name: 'galaxy-s9', use: { storageState: STATE, ...devices['Galaxy S9+'] } , dependencies: ['setup'] },
  ],
});
