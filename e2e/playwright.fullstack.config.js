// Browser end-to-end tests for StartPOS.
//
// They run the production React build (../build) served by the real Go API
// (sirinibin/pos-rest, STATIC_DIR=../build) on a throwaway MongoDB + Redis,
// so a passing run means the UI, the API and the database work together.
// The mocked-API specs in ./tests use playwright.config.js instead.
// See README.md in this folder for running them locally.
const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:2000';

// /v1/authorize is rate limited per client IP, read from X-Real-IP (which
// nginx sets in production). A per-run address keeps repeated local runs
// from throttling one another; CI starts from a fresh server anyway.
const runIP = `10.${(process.pid >> 8) & 0xff}.${process.pid & 0xff}.${Math.floor(Math.random() * 250) + 1}`;

module.exports = defineConfig({
  testDir: './fullstack',
  globalSetup: require.resolve('./fullstack/global-setup.js'),
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  outputDir: 'test-results-fullstack',
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-fullstack' }], ['github']]
    : [['list']],
  use: {
    baseURL,
    extraHTTPHeaders: { 'X-Real-IP': runIP },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {},
  },
  // Every spec runs on a laptop screen. Specs tagged @devices also run on a
  // large desktop, a tablet (portrait and landscape) and a phone, because the
  // app must work on PCs, tablets and phones at every resolution.
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 800 } } },
    { name: 'desktop-large', grep: /@devices/, use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
    { name: 'tablet', grep: /@devices/, use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } },
    { name: 'tablet-landscape', grep: /@devices/, use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } },
    { name: 'phone', grep: /@devices/, use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 } },
    { name: 'phone-small', grep: /@devices/, use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } },
  ],
});
