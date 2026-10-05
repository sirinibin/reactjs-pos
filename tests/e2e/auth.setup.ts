import { test as setup, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { EMAIL, PASSWORD } from './fixtures';

export const STATE = 'tests/e2e/.auth/state.json';

/** Token from a previous run, if it still works (the API allows only 10 sign-ins / 15 min per IP). */
async function reusableToken(baseURL: string): Promise<boolean> {
  if (!existsSync(STATE)) return false;
  try {
    const st = JSON.parse(readFileSync(STATE, 'utf8'));
    const origin = st.origins?.find((o: any) => o.origin === new URL(baseURL).origin);
    const token = origin?.localStorage?.find((x: any) => x.name === 'access_token')?.value;
    if (!token) return false;
    const r = await fetch(new URL('/v1/me', baseURL), { headers: { Authorization: token } });
    return r.ok;
  } catch {
    return false;
  }
}

setup('authenticate', async ({ page, baseURL }) => {
  if (await reusableToken(baseURL!)) return;
  await page.goto('/login');
  await page.locator('#email').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/home/);
  await expect(page.locator('.rail')).toBeAttached();
  await page.context().storageState({ path: STATE });
});
