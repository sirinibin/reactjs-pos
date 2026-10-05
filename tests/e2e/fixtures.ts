import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export const EMAIL = process.env.SEED_EMAIL || 'sirinibin2006@gmail.com';
export const PASSWORD = process.env.SEED_PASSWORD || '123456';

export function seed(): any {
  const p = resolve(here, '../.seed.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
}

/** Sessions come from auth.setup.ts storage state; this just lands on the home page. */
export async function login(page: Page) {
  await page.goto('/home');
  await page.waitForURL(/\/home/);
  await expect(page.locator('#content h1').first()).toBeVisible();
}

/** Only run sign-in form tests on a couple of projects (API rate-limits /authorize per IP). */
export const AUTH_PROJECTS = ['desktop-1920', 'iphone-14'];

/** Fail the test on uncaught page errors or React warnings about render loops. */
export const test = base.extend<{ guard: void }>({
  guard: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && /Maximum update depth|Uncaught|is not a function|Cannot read prop/.test(m.text())) errors.push(m.text());
    });
    await use();
    expect(errors, 'page errors').toEqual([]);
  }, { auto: true }],
});

/** Assert the page has no horizontal overflow at the current viewport. */
export async function expectNoHorizontalOverflow(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over, 'horizontal overflow in px').toBeLessThanOrEqual(1);
}

export const isMobile = (page: Page) => (page.viewportSize()?.width || 1200) <= 760;

export { expect };
