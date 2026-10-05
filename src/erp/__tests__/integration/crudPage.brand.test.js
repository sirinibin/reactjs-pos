/**
 * Integration: the rebuilt Product Brands page against a mock of the real
 * /v1/product-brand contract (list → filter → sort → create → view → edit →
 * delete → restore), including server-side validation errors.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import CrudPage from '../../crud/CrudPage';
import { ToastProvider } from '../../ui';
import { productBrandConfig } from '../../modules/masters/configs';

const STORE = 'store-1';
let db;
let requests;

function brand(id, name, code, extra = {}) {
    return { id, name, code, created_at: '2026-10-05T10:00:00Z', deleted: false, created_by_name: 'Sirin k', ...extra };
}

const server = setupServer(
    rest.get('/v1/product-brand', (req, res, ctx) => {
        requests.push(req.url);
        const q = req.url.searchParams;
        let rows = db.filter(b => (q.get('search[deleted]') === '1' ? b.deleted : !b.deleted));
        const name = q.get('search[name]');
        if (name) rows = rows.filter(b => b.name.toLowerCase().includes(name.toLowerCase()));
        const sort = q.get('sort') || '';
        const key = sort.replace('-', '');
        if (key) rows = rows.slice().sort((a, b) => (a[key] > b[key] ? 1 : -1) * (sort.startsWith('-') ? -1 : 1));
        const page = +q.get('page');
        const limit = +q.get('limit');
        return res(ctx.json({ status: true, total_count: rows.length, result: rows.slice((page - 1) * limit, page * limit) }));
    }),
    rest.get('/v1/product-brand/:id', (req, res, ctx) => {
        const b = db.find(x => x.id === req.params.id);
        return b ? res(ctx.json({ status: true, result: b })) : res(ctx.status(404), ctx.json({ status: false, errors: { id: 'Not found' } }));
    }),
    rest.post('/v1/product-brand', (req, res, ctx) => {
        const body = req.body;
        if (db.some(b => b.code === body.code)) {
            return res(ctx.status(400), ctx.json({ status: false, errors: { code: 'Code is already in use' } }));
        }
        const created = brand('new-' + db.length, body.name, body.code, { store_id: body.store_id });
        db.push(created);
        return res(ctx.json({ status: true, result: created }));
    }),
    rest.put('/v1/product-brand/:id', (req, res, ctx) => {
        const i = db.findIndex(b => b.id === req.params.id);
        db[i] = { ...db[i], ...req.body, updated_by_name: 'Sirin k' };
        return res(ctx.json({ status: true, result: db[i] }));
    }),
    rest.delete('/v1/product-brand/:id', (req, res, ctx) => {
        const b = db.find(x => x.id === req.params.id);
        b.deleted = true;
        return res(ctx.json({ status: true, result: 'Deleted successfully' }));
    }),
    rest.post('/v1/product-brand/restore/:id', (req, res, ctx) => {
        const b = db.find(x => x.id === req.params.id);
        b.deleted = false;
        return res(ctx.json({ status: true, result: 'Restored successfully' }));
    }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('store_id', STORE);
    localStorage.setItem('access_token', 'tok');
    db = [brand('b1', 'Bosch', 'BSH'), brand('b2', 'Denso', 'DNS'), brand('b3', 'NGK', 'NGK')];
    requests = [];
});
afterEach(() => server.resetHandlers());

function renderPage() {
    return render(<ToastProvider><CrudPage config={productBrandConfig} /></ToastProvider>);
}

const lastList = () => requests[requests.length - 1];

it('loads the first page with the classic query contract', async () => {
    renderPage();
    expect(await screen.findByText('Bosch')).toBeInTheDocument();
    const url = lastList();
    expect(url.searchParams.get('select')).toBe('id,code,name,created_at,deleted');
    expect(url.searchParams.get('search[store_id]')).toBe(STORE);
    expect(url.searchParams.get('sort')).toBe('-created_at');
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.has('search[timezone_offset]')).toBe(true);
    expect(screen.getByText('3 records')).toBeInTheDocument();
});

it('filters by name (debounced) and resets to page 1', async () => {
    renderPage();
    await screen.findByText('Bosch');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'den' } });
    await waitFor(() => expect(screen.queryByText('Bosch')).toBeNull());
    expect(screen.getByText('Denso')).toBeInTheDocument();
    expect(lastList().searchParams.get('search[name]')).toBe('den');
    expect(screen.getByRole('button', { name: /clear filters \(1\)/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(await screen.findByText('Bosch')).toBeInTheDocument();
    expect(lastList().searchParams.has('search[name]')).toBe(false);
});

it('shows a filtered-empty state', async () => {
    renderPage();
    await screen.findByText('Bosch');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'zzz' } });
    expect(await screen.findByText('No matching records')).toBeInTheDocument();
});

it('sorts by clicking a header', async () => {
    renderPage();
    await screen.findByText('Bosch');
    fireEvent.click(screen.getByText('Name'));
    await waitFor(() => expect(lastList().searchParams.get('sort')).toBe('name'));
    fireEvent.click(screen.getByText('Name'));
    await waitFor(() => expect(lastList().searchParams.get('sort')).toBe('-name'));
});

it('remembers the page size per list', async () => {
    renderPage();
    await screen.findByText('Bosch');
    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '50' } });
    await waitFor(() => expect(lastList().searchParams.get('limit')).toBe('50'));
    expect(localStorage.getItem('erp_product_brand_pageSize')).toBe('50');
});

it('validates required fields before calling the API', async () => {
    renderPage();
    await screen.findByText('Bosch');
    fireEvent.click(screen.getAllByRole('button', { name: 'Create' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(within(dialog).getByText('Name is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Code is required')).toBeInTheDocument();
    expect(db).toHaveLength(3);
});

it('maps a server field error to the field and keeps the dialog open', async () => {
    renderPage();
    await screen.findByText('Bosch');
    fireEvent.click(screen.getAllByRole('button', { name: 'Create' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: 'Bosch 2' } });
    fireEvent.change(within(dialog).getByLabelText(/Code/), { target: { value: 'BSH' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await within(dialog).findByText('Code is already in use')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('creates a brand (trimmed), refreshes the list and opens the record', async () => {
    renderPage();
    await screen.findByText('Bosch');
    fireEvent.click(screen.getAllByRole('button', { name: 'Create' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: '  Valeo  ' } });
    fireEvent.change(within(dialog).getByLabelText(/Code/), { target: { value: 'VAL' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Created successfully!')).toBeInTheDocument();
    expect(db[3]).toMatchObject({ name: 'Valeo', code: 'VAL', store_id: STORE });
    const drawer = await screen.findByRole('dialog', { name: 'Valeo' });
    expect(within(drawer).getByText('VAL')).toBeInTheDocument();
});

it('edits a brand from the row menu', async () => {
    renderPage();
    await screen.findByText('Denso');
    const row = screen.getByText('Denso').closest('tr');
    fireEvent.click(within(row).getByLabelText('Row actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: /Edit Product Brand — Denso/ });
    const name = await within(dialog).findByDisplayValue('Denso');
    fireEvent.change(name, { target: { value: 'Denso Japan' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Updated successfully!')).toBeInTheDocument();
    expect(db.find(b => b.id === 'b2').name).toBe('Denso Japan');
    // payload keeps fields the form does not show
    expect(db.find(b => b.id === 'b2').created_by_name).toBe('Sirin k');
});

it('deletes after confirmation, then restores from the Deleted filter', async () => {
    renderPage();
    await screen.findAllByText('NGK', { selector: 'td' });
    const row = screen.getAllByText('NGK', { selector: 'td' })[0].closest('tr');
    fireEvent.click(within(row).getByLabelText('Row actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const confirm = screen.getByRole('dialog', { name: /Delete Product Brand/ });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Deleted successfully!')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryAllByText('NGK', { selector: 'td' })).toHaveLength(0));

    fireEvent.change(screen.getByLabelText('Deleted'), { target: { value: '1' } });
    const deletedRow = (await screen.findAllByText('NGK', { selector: 'td' }))[0].closest('tr');
    expect(lastList().searchParams.get('search[deleted]')).toBe('1');
    fireEvent.click(within(deletedRow).getByLabelText('Row actions'));
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).toBeNull();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Restore' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: /Restore/ })).getByRole('button', { name: 'Restore' }));
    expect(await screen.findByText('Restored successfully!')).toBeInTheDocument();
    expect(db.find(b => b.id === 'b3').deleted).toBe(false);
});

it('shows the API error when the list fails', async () => {
    server.use(rest.get('/v1/product-brand', (req, res, ctx) => res(ctx.status(500), ctx.json({ status: false, errors: { db: 'Database unavailable' } }))));
    renderPage();
    expect(await screen.findByText('Database unavailable')).toBeInTheDocument();
});

it('cancelling a delete makes no request', async () => {
    const spy = jest.fn();
    server.use(rest.delete('/v1/product-brand/:id', (req, res, ctx) => { spy(); return res(ctx.json({ status: true })); }));
    renderPage();
    await screen.findByText('Bosch');
    const row = screen.getByText('Bosch').closest('tr');
    fireEvent.click(within(row).getByLabelText('Row actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(spy).not.toHaveBeenCalled();
});

it('row click opens the record view with its audit trail', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('Bosch'));
    const drawer = await screen.findByRole('dialog', { name: 'Bosch' });
    expect(within(drawer).getByText('Record history')).toBeInTheDocument();
    expect(within(drawer).getByText('Sirin k')).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Edit' }));
    expect(await screen.findByRole('dialog', { name: /Edit Product Brand/ })).toBeInTheDocument();
});
