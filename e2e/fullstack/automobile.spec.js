// Automobile workshop, full stack: employees, vehicles, repair jobs and the
// repair-jobs board, typed into the real screens and checked against the API.
// Every record has a unique name; nothing other tests created is touched.
const { test, expect, AUTH_STATE } = require('./fixtures');
const { miscApi, recordWrites, typeInto, escapeRe, uniq } = require('./helpers/misc');

test.use({ storageState: AUTH_STATE });

const isPost = (path) => (r) => r.request().method() === 'POST' && new RegExp(`/v1/${path}(\\?|$)`).test(r.url());
const randomMobile = () => `05${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

function autoApi(request) {
  const api = miscApi(request);
  return Object.assign(api, {
    async employee(id) { return (await this.get(`/v1/employee/${id}`)).result; },
    async employeesNamed(name) {
      const body = await this.get(`/v1/employee?search[name]=${encodeURIComponent(name)}&limit=20`);
      return (body.result || []).filter((e) => e.name === name);
    },
    async vehicle(id) { return (await this.get(`/v1/vehicle/${id}`)).result; },
    async vehiclesOf(customerId) {
      return (await this.get(`/v1/vehicle?search[customer_id]=${customerId}&limit=20`)).result || [];
    },
    async repairJob(id) { return (await this.get(`/v1/repair-job/${id}`)).result; },
    async createVehicle(customer, plate) {
      const body = await this.post('/v1/vehicle', {
        customer_id: customer.id, customer_name: customer.name, brand: 'Toyota', model: 'Camry', vehicle_number: plate,
      });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },
    async createRepairJob(title, extra = {}) {
      const body = await this.post('/v1/repair-job', { title, status: 'open', date: new Date().toISOString(), ...extra });
      expect(body.status, JSON.stringify(body.errors)).toBe(true);
      return body.result;
    },
  });
}

/** Opens a screen's Create form (a full-screen dialog) and returns it. */
async function openCreate(page, path, title) {
  await page.goto(`/dashboard/${path}`);
  await page.getByRole('button', { name: 'Create' }).first().click();
  const dialog = page.getByRole('dialog').filter({ hasText: title });
  await expect(dialog.getByText(title).first()).toBeVisible();
  return dialog;
}

const headerCreate = (dialog) => dialog.locator('button', { hasText: /^\s*(Create|Update)\s*$/ }).first();

test.describe('employees', () => {
  async function fillEmployee(page, dialog, { name, arabic, mobile, salary, day }) {
    if (name !== undefined) await typeInto(page, dialog.getByPlaceholder('Full name'), name, 5);
    if (arabic) await dialog.getByPlaceholder('Optional').first().fill(arabic);
    if (mobile) await typeInto(page, dialog.getByPlaceholder('05xxxxxxxx'), mobile, 5);
    // Salary and the salary day are the two number inputs of the Salary Information card.
    const dayInput = dialog.locator('input[type="number"][max="28"]');
    const salaryInput = dayInput.locator('xpath=preceding::input[@type="number"][1]');
    if (salary !== undefined) await salaryInput.fill(String(salary));
    if (day !== undefined) await dayInput.fill(String(day));
  }

  test('an employee with an Arabic name is created, then the salary is edited', async ({ page, request }) => {
    const api = autoApi(request);
    const name = `E2E Mechanic ${uniq()}`;
    const mobile = randomMobile();
    const dialog = await openCreate(page, 'employees', 'Create New Employee');
    await fillEmployee(page, dialog, { name, arabic: 'محمد الميكانيكي', mobile, salary: 3500, day: 25 });
    const saved = page.waitForResponse(isPost('employee'));
    await headerCreate(dialog).click();
    const res = await saved;
    const body = await res.json();
    expect(res.status(), JSON.stringify(body.errors)).toBe(200);
    let stored = await api.employee(body.result.id);
    expect(stored).toMatchObject({ name, name_in_arabic: 'محمد الميكانيكي', mob1: mobile, salary: 3500, salary_day: 25, store_id: api.storeId });

    // Edit from the list.
    await page.goto('/dashboard/employees');
    await typeInto(page, page.getByPlaceholder('Search').first(), name, 10);
    const row = page.locator('tbody tr').filter({ hasText: name });
    await expect(row).toHaveCount(1);
    await row.locator('button.btn-light').first().click();
    const edit = page.getByRole('dialog').filter({ has: page.getByPlaceholder('Full name') });
    await expect(edit.getByPlaceholder('Full name')).toHaveValue(name);
    await edit.locator('input[type="number"][max="28"]').locator('xpath=preceding::input[@type="number"][1]').fill('4100.50');
    const put = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/v1/employee/${stored.id}`));
    await headerCreate(edit).click();
    expect((await put).status()).toBe(200);
    stored = await api.employee(stored.id);
    expect(stored.salary).toBe(4100.5);
    expect(await api.employeesNamed(name)).toHaveLength(1);
  });

  test('an employee without a name or with a negative salary is refused before anything is sent', async ({ page }) => {
    const posts = recordWrites(page, /\/v1\/employee(\?|$)/);
    const dialog = await openCreate(page, 'employees', 'Create New Employee');
    await fillEmployee(page, dialog, { salary: -100 });
    await headerCreate(dialog).click();
    await expect(dialog.getByText('Name is required').first()).toBeVisible();
    await expect(dialog.getByText('Salary cannot be negative').first()).toBeVisible();
    await expect(dialog.getByText('Create New Employee')).toBeVisible();
    expect(posts).toHaveLength(0);
  });

  test('a mobile number already used by another employee is refused', async ({ page, request }) => {
    const api = autoApi(request);
    const mobile = randomMobile();
    const first = await api.post('/v1/employee', { name: `E2E First ${uniq()}`, mob1: mobile, salary: 1000, salary_day: 1, joining_date: new Date().toISOString() });
    expect(first.status, JSON.stringify(first.errors)).toBe(true);
    const name = `E2E Second ${uniq()}`;
    const dialog = await openCreate(page, 'employees', 'Create New Employee');
    await fillEmployee(page, dialog, { name, mobile, salary: 1000 });
    const saved = page.waitForResponse(isPost('employee'));
    await headerCreate(dialog).click();
    const res = await saved;
    expect(res.status()).toBe(400);
    expect((await res.json()).errors.mob1).toBe('Mobile 1 already exists');
    await expect(dialog.getByText('Mobile 1 already exists').first()).toBeVisible();
    expect(await api.employeesNamed(name)).toHaveLength(0);
  });
});

test.describe('vehicles', () => {
  test('a vehicle is registered for a customer with brand, model, plate and VIN @devices', async ({ page, request }) => {
    const api = autoApi(request);
    const customer = await api.createCustomer({ name: `E2E Car Owner ${uniq()}` });
    const plate = `ABC ${Math.floor(Math.random() * 9000) + 1000}`;
    const vin = `JTDBR32E${String(Date.now()).slice(-9)}`;
    const dialog = await openCreate(page, 'vehicles', 'Create New Vehicle');
    await typeInto(page, dialog.getByPlaceholder('Search customer...'), customer.name, 10);
    await page.getByRole('option', { name: new RegExp(escapeRe(customer.name), 'i') }).first().click();
    await dialog.locator('select').nth(0).selectOption('Toyota');
    await dialog.locator('select').nth(1).selectOption('Land Cruiser');
    await dialog.getByPlaceholder('2020').fill('2019');
    await typeInto(page, dialog.getByPlaceholder('Plate number'), plate, 10);
    await typeInto(page, dialog.getByPlaceholder('VIN / Chassis'), vin, 5);
    await dialog.getByPlaceholder('Color').fill('أبيض White');
    const saved = page.waitForResponse(isPost('vehicle'));
    await headerCreate(dialog).click();
    const res = await saved;
    const body = await res.json();
    expect(res.status(), JSON.stringify(body.errors)).toBe(200);
    const stored = await api.vehicle(body.result.id);
    expect(stored).toMatchObject({
      customer_id: customer.id, brand: 'Toyota', model: 'Land Cruiser', year: 2019, vehicle_number: plate, chassis_number: vin, color: 'أبيض White',
    });
    expect(await api.vehiclesOf(customer.id)).toHaveLength(1);
  });

  test('a vehicle without a customer or plate number is refused before anything is sent', async ({ page, request }) => {
    const api = autoApi(request);
    const customer = await api.createCustomer({ name: `E2E Car Owner ${uniq()}` });
    const posts = recordWrites(page, /\/v1\/vehicle(\?|$)/);
    const dialog = await openCreate(page, 'vehicles', 'Create New Vehicle');
    await headerCreate(dialog).click();
    await expect(dialog.getByText('Customer is required').first()).toBeVisible();

    await typeInto(page, dialog.getByPlaceholder('Search customer...'), customer.name, 10);
    await page.getByRole('option', { name: new RegExp(escapeRe(customer.name), 'i') }).first().click();
    await headerCreate(dialog).click();
    await expect(dialog.getByText('Vehicle number is required').first()).toBeVisible();
    expect(posts).toHaveLength(0);
    expect(await api.vehiclesOf(customer.id)).toHaveLength(0);
  });

  test('double-clicking Create registers the vehicle once', async ({ page, request }) => {
    const api = autoApi(request);
    const customer = await api.createCustomer({ name: `E2E Car Owner ${uniq()}` });
    const dialog = await openCreate(page, 'vehicles', 'Create New Vehicle');
    await typeInto(page, dialog.getByPlaceholder('Search customer...'), customer.name, 10);
    await page.getByRole('option', { name: new RegExp(escapeRe(customer.name), 'i') }).first().click();
    await dialog.locator('select').nth(0).selectOption('Nissan');
    await dialog.locator('select').nth(1).selectOption({ index: 1 });
    await typeInto(page, dialog.getByPlaceholder('Plate number'), `DBL ${uniq()}`, 5);
    const saved = page.waitForResponse(isPost('vehicle'));
    await headerCreate(dialog).dblclick();
    expect((await saved).status()).toBe(200);
    await expect.poll(async () => (await api.vehiclesOf(customer.id)).length).toBeGreaterThan(0);
    expect(await api.vehiclesOf(customer.id)).toHaveLength(1);
  });
});

test.describe('repair jobs', () => {
  test('a repair job for a customer\'s vehicle is created in the form', async ({ page, request }) => {
    const api = autoApi(request);
    const customer = await api.createCustomer({ name: `E2E Workshop Client ${uniq()}` });
    const plate = `RJ ${uniq()}`;
    const vehicle = await api.createVehicle(customer, plate);
    const title = `E2E AC repair ${uniq()}`;

    const dialog = await openCreate(page, 'repair-jobs', 'Repair Job');
    await typeInto(page, dialog.getByPlaceholder('e.g. Engine overhaul, AC repair, Full service...'), title, 5);
    // The form starts with the walk-in UNKNOWN customer; a user replaces it by typing over it.
    await expect(dialog.getByPlaceholder('Search customer...')).toHaveValue(/UNKNOWN/i);
    await typeInto(page, dialog.getByPlaceholder('Search customer...'), customer.name, 10);
    await page.getByRole('option', { name: new RegExp(escapeRe(customer.name), 'i') }).first().click({ timeout: 8000 });
    await typeInto(page, dialog.getByPlaceholder('Search vehicle...'), plate, 10);
    await page.getByRole('option', { name: new RegExp(escapeRe(plate), 'i') }).first().click();
    await dialog.getByPlaceholder('Customer complaint description').fill('AC blows warm air — المكيف لا يبرد');
    const saved = page.waitForResponse(isPost('repair-job'));
    await headerCreate(dialog).click();
    const res = await saved;
    const body = await res.json();
    expect(res.status(), JSON.stringify(body.errors)).toBe(200);
    const job = await api.repairJob(body.result.id);
    expect(job).toMatchObject({ title, customer_id: customer.id, vehicle_id: vehicle.id, vehicle_number: plate, complaint: 'AC blows warm air — المكيف لا يبرد' });
    expect(job.job_number).toBeTruthy();
  });

  test('a repair job without a title is refused with a visible error', async ({ page }) => {
    const dialog = await openCreate(page, 'repair-jobs', 'Repair Job');
    const saved = page.waitForResponse(isPost('repair-job'));
    await headerCreate(dialog).click();
    const res = await saved;
    expect(res.status()).toBe(400);
    expect((await res.json()).errors.title).toBe('Title is required');
    await expect(dialog.getByText('Title is required').first()).toBeVisible();
  });

  /** The board column (by its title) holding a card. */
  const col = (page, id) => page.locator(`[data-list-id="${id}"]`);

  /**
   * Opens the board filtered to one customer, so only this test's cards are on it
   * (each column shows 5 cards at a time and the shared store collects jobs).
   */
  async function openBoardFor(page, customer) {
    await page.goto('/dashboard/repair-jobs-board');
    await typeInto(page, page.getByPlaceholder('Filter by customer...'), customer.name, 10);
    const loaded = page.waitForResponse((r) => r.url().includes('/v1/repair-job?') && r.url().includes(customer.id));
    await page.locator('div', { hasText: new RegExp(`^${escapeRe(customer.name)}$`) }).last().dispatchEvent('mousedown');
    await loaded;
  }

  async function boardJob(api, status = 'open') {
    const customer = await api.createCustomer({ name: `E2E Board Client ${uniq()}` });
    const title = `E2E Board Job ${uniq()}`;
    const job = await api.createRepairJob(title, { customer_id: customer.id, customer_name: customer.name, status });
    return { customer, title, job };
  }

  test('a job card moved to DONE on the board is closed, and moving it back to TO DO reopens it', async ({ page, request }) => {
    const api = autoApi(request);
    const { customer, title, job } = await boardJob(api);
    await openBoardFor(page, customer);
    const card = page.locator('[draggable=true]').filter({ hasText: title });
    await expect(col(page, 'todo').locator('[draggable=true]').filter({ hasText: title })).toHaveCount(1);

    const closed = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/v1/repair-job/${job.id}`));
    await card.dragTo(col(page, 'done'));
    expect((await closed).status()).toBe(200);
    expect((await api.repairJob(job.id)).status).toBe('closed');
    await expect(col(page, 'done').locator('[draggable=true]').filter({ hasText: title })).toHaveCount(1);

    const reopened = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes(`/v1/repair-job/${job.id}`));
    await card.dragTo(col(page, 'todo'));
    expect((await reopened).status()).toBe(200);
    expect((await api.repairJob(job.id)).status).toBe('open');
  });

  test('a closed job is shown under DONE on any browser, not under TO DO', async ({ page, request }) => {
    const api = autoApi(request);
    const { customer, title } = await boardJob(api, 'closed');
    await openBoardFor(page, customer);
    await expect(page.locator('[draggable=true]').filter({ hasText: title })).toHaveCount(1);
    await expect(col(page, 'done').locator('[draggable=true]').filter({ hasText: title })).toHaveCount(1, { timeout: 3000 });
  });

  test('a job moved to IN PROGRESS is in progress for everyone, not only in this browser', async ({ page, request }) => {
    const api = autoApi(request);
    const { customer, title, job } = await boardJob(api);
    await openBoardFor(page, customer);
    const card = page.locator('[draggable=true]').filter({ hasText: title });
    await card.dragTo(col(page, 'in_progress'));
    await expect(col(page, 'in_progress').locator('[draggable=true]').filter({ hasText: title })).toHaveCount(1);
    await expect.poll(async () => (await api.repairJob(job.id)).status, { timeout: 5000 }).toBe('in_progress');
  });

  test('the automobile dashboard loads its figures', async ({ page }) => {
    const loaded = page.waitForResponse((r) => r.url().includes('/v1/automobile/dashboard'));
    await page.goto('/dashboard/automobile-dashboard');
    expect((await loaded).status()).toBe(200);
    await expect(page.getByText('Real-time overview of your automobile workshop operations')).toBeVisible();
    await expect(page.getByText('TOTAL PROFIT', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Profit Overview')).toBeVisible();
  });
});
