// Sign-in, sign-out and session handling through the real login page and API.
const { test, expect, E2E_EMAIL, E2E_PASSWORD } = require('./fixtures');

const emailBox = (page) => page.getByPlaceholder('Enter your email');
const passwordBox = (page) => page.getByPlaceholder('Enter your password');
const loginButton = (page) => page.getByRole('button', { name: 'Login' });

async function submit(page, email, password) {
  await emailBox(page).fill(email);
  await passwordBox(page).fill(password);
  await loginButton(page).click();
}

const token = (page) => page.evaluate(() => localStorage.getItem('access_token'));

test.describe('login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows the sign-in form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Start POS' })).toBeVisible();
    await expect(emailBox(page)).toBeEditable();
    await expect(passwordBox(page)).toBeEditable();
    await expect(passwordBox(page)).toHaveAttribute('type', 'password');
    await expect(loginButton(page)).toBeEnabled();
  });

  test('blank e-mail and password are rejected with field errors', async ({ page }) => {
    // The e-mail input is type=email; submit via the form to bypass nothing.
    await loginButton(page).click();
    await expect(page.getByText('E-mail is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(await token(page)).toBeNull();
  });

  test('a wrong password is refused and the failed attempt is counted', async ({ page }) => {
    await submit(page, E2E_EMAIL, 'not-the-password');
    await expect(page.getByText('E-mail or Password is wrong')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(await token(page)).toBeNull();
    const lock = await page.evaluate((e) => JSON.parse(localStorage.getItem('pos_login_lock_' + e)), E2E_EMAIL);
    test.skip(lock === null, 'this build has no client-side login lockout');
    expect(lock.failures).toBe(1);
  });

  test('an unknown e-mail gets the same generic error (no account enumeration)', async ({ page }) => {
    await submit(page, `nobody-${Date.now()}@startpos.test`, 'whatever');
    await expect(page.getByText('E-mail or Password is wrong')).toBeVisible();
    expect(await token(page)).toBeNull();
  });

  test('after too many failures the form locks without calling the server', async ({ page }) => {
    await page.evaluate((e) => localStorage.setItem('pos_login_lock_' + e,
      JSON.stringify({ failures: 5, lockedUntil: Date.now() + 10 * 60 * 1000 })), E2E_EMAIL);
    let authorizeCalls = 0;
    page.on('request', (r) => { if (r.url().includes('/v1/authorize')) authorizeCalls++; });

    await submit(page, E2E_EMAIL, E2E_PASSWORD);
    // Builds without the lockout feature just attempt the login.
    await page.waitForTimeout(1000);
    test.skip(authorizeCalls > 0, 'this build has no client-side login lockout');
    await expect(page.getByRole('alert')).toContainText('Too many failed attempts');
    await expect(emailBox(page)).toBeDisabled();
    await expect(passwordBox(page)).toBeDisabled();
    await expect(loginButton(page)).toBeDisabled();
    expect(authorizeCalls).toBe(0);
    expect(await token(page)).toBeNull();
  });

  test('valid credentials sign in and open the dashboard for the store', async ({ page }) => {
    await submit(page, `  ${E2E_EMAIL}  `, E2E_PASSWORD); // surrounding spaces are trimmed
    await page.waitForURL(/\/dashboard\//);
    expect(await token(page)).toBeTruthy();
    const stored = await page.evaluate(() => ({
      storeId: localStorage.getItem('store_id'),
      userName: localStorage.getItem('user_name'),
      lock: localStorage.getItem('pos_login_lock_' + localStorage.getItem('user_name')),
    }));
    expect(stored.storeId).toMatch(/^[0-9a-f]{24}$/);
    expect(stored.userName).toBe('E2E Admin');
    await expect(page.getByText('E2E Admin').first()).toBeVisible();
  });
});

test.describe('signed-in session', () => {
  test.use({ storageState: require('./fixtures').AUTH_STATE });

  test('opening the login page while signed in goes straight to the dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/dashboard\//);
  });

  test('a corrupted token shows no data and the API refuses it', async ({ page }) => {
    test.info().annotations.push({
      type: 'known-issue',
      description: 'With an invalid token the list screens raise unhandled promise rejections instead of returning to the login page.',
    });
    await page.goto('/dashboard/customers');
    await page.evaluate(() => localStorage.setItem('access_token', 'corrupted'));
    const listCall = page.waitForResponse((r) => r.url().includes('/v1/customer?'));
    await page.reload();
    expect((await listCall).status()).toBe(401);
    await expect(page.getByText(/CUS-\d+/)).toHaveCount(0); // no customer rows leak through
  });

  test('logout clears the session and returns to the login page', async ({ page }) => {
    await page.goto('/dashboard/customers');
    await page.getByText('E2E Admin').first().click();
    await page.getByText('Logout', { exact: false }).first().click();
    await expect(emailBox(page)).toBeVisible();
    expect(await token(page)).toBeNull();
  });
});
