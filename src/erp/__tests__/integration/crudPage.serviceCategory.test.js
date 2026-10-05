/**
 * Integration: the rebuilt Service Categories page against a mock of the
 * /v1/service-category contract: row numbers, parent picker, parent
 * payload (parent_id/parent_name), clearing the parent, delete/restore.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import CrudPage from '../../crud/CrudPage';
import { ToastProvider } from '../../ui';
import { serviceCategoryConfig } from '../../modules/masters/configs';

const STORE = 'store-1';
let db;
let requests;
let bodies;

function cat(id, name, extra = {}) {
    return { id, name, parent_id: null, parent_name: '', created_at: '2026-10-05T10:00:00Z', deleted: false, ...extra };
}

const server = setupServer(
    rest.get('/v1/service-category', (req, res, ctx) => {
        requests.push(req.url);
        const q = req.url.searchParams;
        let rows = db.filter(b => (q.get('search[deleted]') === '1' ? b.deleted : !b.deleted));
        const name = q.get('search[name]');
        if (name) rows = rows.filter(b => b.name.toLowerCase().includes(name.toLowerCase()));
        const page = +q.get('page') || 1;
        const limit = +q.get('limit') || 20;
        return res(ctx.json({ status: true, total_count: rows.length, result: rows.slice((page - 1) * limit, page * limit) }));
    }),
    rest.get('/v1/service-category/:id', (req, res, ctx) => res(ctx.json({ status: true, result: db.find(x => x.id === req.params.id) }))),
    rest.post('/v1/service-category', (req, res, ctx) => {
        bodies.push({ method: 'POST', url: req.url, body: req.body });
        const created = cat('new-' + db.length, req.body.name, { parent_id: req.body.parent_id, parent_name: req.body.parent_name });
        db.push(created);
        return res(ctx.json({ status: true, result: created }));
    }),
    rest.put('/v1/service-category/:id', (req, res, ctx) => {
        bodies.push({ method: 'PUT', url: req.url, body: req.body });
        const i = db.findIndex(b => b.id === req.params.id);
        db[i] = { ...db[i], ...req.body };
        return res(ctx.json({ status: true, result: db[i] }));
    }),
    rest.delete('/v1/service-category/:id', (req, res, ctx) => {
        db.find(x => x.id === req.params.id).deleted = true;
        return res(ctx.json({ status: true, result: 'Deleted successfully' }));
    }),
    rest.post('/v1/service-category/restore/:id', (req, res, ctx) => {
        db.find(x => x.id === req.params.id).deleted = false;
        return res(ctx.json({ status: true, result: 'Restored successfully' }));
    }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('store_id', STORE);
    localStorage.setItem('access_token', 'tok');
    db = [
        cat('c1', 'Engine'),
        cat('c2', 'Oil Change', { parent_id: 'c1', parent_name: 'Engine' }),
        cat('c3', 'Body Work'),
    ];
    requests = [];
    bodies = [];
});
afterEach(() => server.resetHandlers());

const renderPage = () => render(<ToastProvider><CrudPage config={serviceCategoryConfig} /></ToastProvider>);
const rowOf = text => screen.getAllByText(text, { selector: 'td' })[0].closest('tr');

it('lists categories with row numbers and parent names', async () => {
    renderPage();
    await screen.findAllByText('Oil Change', { selector: 'td' });
    const cells = within(rowOf('Oil Change')).getAllByRole('cell').map(c => c.textContent);
    expect(cells[0]).toBe('2');
    expect(cells).toContain('Engine');
    expect(within(rowOf('Body Work')).getAllByRole('cell')[0].textContent).toBe('3');
    const url = requests[requests.length - 1];
    expect(url.searchParams.get('search[store_id]')).toBe(STORE);
    expect(url.searchParams.get('sort')).toBe('-created_at');
});

it('row numbers continue on the next page', async () => {
    db = Array.from({ length: 25 }, (_, i) => cat('x' + i, 'Cat ' + i));
    renderPage();
    await screen.findAllByText('Cat 0', { selector: 'td' });
    fireEvent.click(screen.getByLabelText('Next page'));
    await screen.findAllByText('Cat 20', { selector: 'td' });
    expect(within(rowOf('Cat 20')).getAllByRole('cell')[0].textContent).toBe('21');
});

it('creates a child category with a parent picked from search', async () => {
    renderPage();
    await screen.findAllByText('Engine', { selector: 'td' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Create' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: ' Brakes ' } });
    const picker = within(dialog).getByRole('combobox', { name: /Parent Category/ });
    fireEvent.change(picker, { target: { value: 'Body' } });
    // the picker searches within the current store
    await waitFor(() => expect(requests.some(u => u.searchParams.get('search[name]') === 'Body')).toBe(true));
    const lookupCall = requests.find(u => u.searchParams.get('search[name]') === 'Body');
    expect(lookupCall.searchParams.get('select')).toBe('id,name');
    expect(lookupCall.searchParams.get('search[store_id]')).toBe(STORE);
    fireEvent.mouseDown(await screen.findByRole('option', { name: 'Body Work' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Created successfully!')).toBeInTheDocument();
    const post = bodies.find(b => b.method === 'POST');
    expect(post.body).toMatchObject({ name: 'Brakes', parent_id: 'c3', parent_name: 'Body Work', store_id: STORE });
});

it('requires a name', async () => {
    renderPage();
    await screen.findAllByText('Engine', { selector: 'td' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Create' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(within(dialog).getByText('Name is required')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
});

it('editing shows the current parent and clearing it sends a null parent', async () => {
    renderPage();
    await screen.findAllByText('Oil Change', { selector: 'td' });
    fireEvent.click(within(rowOf('Oil Change')).getByLabelText('Row actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: /Edit Service Category/ });
    await within(dialog).findByDisplayValue('Oil Change');
    fireEvent.click(within(dialog).getByLabelText('Remove Engine'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Updated successfully!')).toBeInTheDocument();
    const put = bodies.find(b => b.method === 'PUT');
    expect(put.url.pathname).toBe('/v1/service-category/c2');
    expect(put.url.searchParams.get('search[store_id]')).toBe(STORE);
    expect(put.body).toMatchObject({ name: 'Oil Change', parent_id: null, parent_name: '' });
});

it('deletes and restores a category', async () => {
    renderPage();
    await screen.findAllByText('Body Work', { selector: 'td' });
    fireEvent.click(within(rowOf('Body Work')).getByLabelText('Row actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: /Delete Service Category/ })).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Deleted successfully!')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryAllByText('Body Work', { selector: 'td' })).toHaveLength(0));
    fireEvent.change(screen.getByLabelText('Deleted'), { target: { value: '1' } });
    await screen.findAllByText('Body Work', { selector: 'td' });
    fireEvent.click(within(rowOf('Body Work')).getByLabelText('Row actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Restore' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: /Restore/ })).getByRole('button', { name: 'Restore' }));
    expect(await screen.findByText('Restored successfully!')).toBeInTheDocument();
    expect(db.find(b => b.id === 'c3').deleted).toBe(false);
});
