import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { configure, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calls, mockApi, renderApp, STORE_ID } from '@/test/utils';
import { BoardPage } from './board';
import { PREFILL_KEY } from './lib/jobCalc';

// Heavy user-event flows; keep headroom when the suite runs on a busy machine.
vi.setConfig({ testTimeout: 20000 });
configure({ asyncUtilTimeout: 5000 });

const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12, 0, 0, 0); return d.toISOString(); };
const JOBS = [
  { id: 'j1', job_number: 'RJ-1', title: 'Oil change', status: 'open', customer_id: 'c1', customer_name: 'Ahmed', vehicle_number: 'RSJ 4821', brand: 'Toyota', model: 'Camry', technician_names: ['Ramesh Kumar'], total_with_vat: 165, estimated_delivery: day(-2) },
  { id: 'j2', job_number: 'RJ-2', title: 'Brake pads', status: 'in_progress', customer_id: 'c1', customer_name: 'Ahmed', total_with_vat: 292.5, estimated_delivery: day(0) },
  { id: 'j3', job_number: 'RJ-3', title: 'AC service', status: 'closed', customer_id: 'c1', customer_name: 'Ahmed', total_with_vat: 0, order_id: 'o1', order_net_total: 50 },
];
const col = (name: string) => screen.getByRole('region', { name });
const dt = () => { const data: Record<string, string> = {}; return { data, types: [] as string[], setData(k: string, v: string) { data[k] = v; this.types.push(k); }, getData: (k: string) => data[k] || '', effectAllowed: '' }; };
const drag = (card: HTMLElement, body: HTMLElement) => {
  const d = dt();
  fireEvent.dragStart(card, { dataTransfer: d });
  fireEvent.dragOver(body, { dataTransfer: d, clientY: 9999 });
  fireEvent.drop(body, { dataTransfer: d, clientY: 9999 });
};
const boardMocks = (extra: any[] = []) => mockApi([
  ...extra,
  { method: 'GET', path: '/v1/repair-job', reply: { status: true, total_count: 3, result: JOBS } },
  { method: 'PUT', path: /^\/v1\/repair-job\/\w+$/, reply: { status: true, result: {} } },
  { method: 'GET', path: '/v1/customer', reply: { status: true, result: [{ id: 'c1', name: 'Ahmed' }] } },
]);

describe('Repair jobs board', () => {
  it('renders lists with counts and cards with plate, due date, technician and amount', async () => {
    const f = boardMocks();
    renderApp(<BoardPage />, { at: '/workshop/board' });
    const todo = await screen.findByRole('region', { name: 'TO DO' });
    await within(todo).findByText('Oil change');
    expect(within(todo).getByLabelText('2 cards')).toBeInTheDocument(); // open + closed both map to TO DO
    expect(within(todo).getByText('ر س ح')).toBeInTheDocument();
    expect(within(todo).getByText('RK')).toBeInTheDocument();
    expect(within(todo).getByText('165.00')).toBeInTheDocument();
    expect(within(todo).getByText('INV · 50.00')).toBeInTheDocument();
    expect(within(col('IN PROGRESS')).getByText('Brake pads')).toBeInTheDocument();
    const [c] = calls(f, 'GET', '/v1/repair-job');
    expect(c.url.searchParams.get('limit')).toBe('500');
    expect(c.url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(c.url.searchParams.get('search[archived]')).toBeNull();
  });

  it('drop on the last list writes status "closed"; placement goes to localStorage only', async () => {
    const f = boardMocks();
    renderApp(<BoardPage />, { at: '/workshop/board' });
    const card = (await screen.findByText('Brake pads')).closest('article')!;
    drag(card, col('DONE').querySelector('[data-list-body]') as HTMLElement);
    await waitFor(() => expect(calls(f, 'PUT', '/v1/repair-job/j2')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/repair-job/j2')[0].body).toEqual({ status: 'closed' });
    expect(calls(f, 'PUT', '/v1/repair-job/j2')[0].url.searchParams.get('search[store_id]')).toBe(STORE_ID);
    expect(JSON.parse(localStorage.getItem('repair_job_kanban_card_map')!)).toEqual({ j2: 'done' });
    expect(JSON.parse(localStorage.getItem('repair_job_kanban_card_order')!).done).toEqual(['j2']);
    expect(within(col('DONE')).getByText('Brake pads')).toBeInTheDocument();
  });

  it('moving a closed job out of the last list reopens it; other moves send nothing', async () => {
    localStorage.setItem('repair_job_kanban_card_map', JSON.stringify({ j3: 'done' }));
    const f = boardMocks();
    renderApp(<BoardPage />, { at: '/workshop/board' });
    const closed = (await screen.findByText('AC service')).closest('article')!;
    drag(closed, col('IN PROGRESS').querySelector('[data-list-body]') as HTMLElement);
    await waitFor(() => expect(calls(f, 'PUT', '/v1/repair-job/j3')).toHaveLength(1));
    expect(calls(f, 'PUT', '/v1/repair-job/j3')[0].body).toEqual({ status: 'open' });
    drag(screen.getByText('Oil change').closest('article')!, col('IN PROGRESS').querySelector('[data-list-body]') as HTMLElement);
    await waitFor(() => expect(JSON.parse(localStorage.getItem('repair_job_kanban_card_map')!).j1).toBe('in_progress'));
    expect(calls(f, 'PUT', '/v1/repair-job/j1')).toHaveLength(0);
  });

  it('card menu offers a keyboard-accessible "Move to" and Archive', async () => {
    const f = boardMocks();
    renderApp(<BoardPage />, { at: '/workshop/board' });
    await screen.findByText('Oil change');
    await userEvent.click(screen.getByRole('button', { name: 'Actions RJ-1' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'DONE' }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/repair-job/j1')[0]?.body).toEqual({ status: 'closed' }));
    await userEvent.click(screen.getByRole('button', { name: 'Actions RJ-2' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Archive this repair job?' })).getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(calls(f, 'PUT', '/v1/repair-job/j2')[0]?.body).toEqual({ archived: true }));
  });

  it('Overdue / Due Today toggles filter cards in every column', async () => {
    boardMocks();
    renderApp(<BoardPage />, { at: '/workshop/board' });
    await screen.findByText('Oil change');
    await userEvent.click(screen.getByRole('button', { name: /Overdue/ }));
    expect(screen.getByText('Oil change')).toBeInTheDocument();
    expect(screen.queryByText('Brake pads')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Overdue/ }));
    await userEvent.click(screen.getByRole('button', { name: /Due Today/ }));
    expect(screen.getByText('Brake pads')).toBeInTheDocument();
    expect(screen.queryByText('Oil change')).not.toBeInTheDocument();
  });

  it('quick-adds a card from a column footer with the customer filter applied', async () => {
    const f = boardMocks([{ method: 'POST', path: '/v1/repair-job', reply: { status: true, result: { id: 'nj', job_number: 'RJ-4' } } }]);
    renderApp(<BoardPage />, { at: '/workshop/board?customer_id=c1&customer_name=Ahmed' });
    await screen.findByText('Oil change');
    expect(calls(f, 'GET', '/v1/repair-job')[0].url.searchParams.get('search[customer_id]')).toBe('c1');
    await userEvent.click(within(col('IN PROGRESS')).getByRole('button', { name: 'Add a card' }));
    await userEvent.type(within(col('IN PROGRESS')).getByRole('textbox', { name: 'Enter a title for this card...' }), 'Wheel alignment{Enter}');
    await waitFor(() => expect(calls(f, 'POST', '/v1/repair-job')).toHaveLength(1));
    expect(calls(f, 'POST', '/v1/repair-job')[0].body).toMatchObject({ title: 'Wheel alignment', store_id: STORE_ID, status: 'open', customer_id: 'c1' });
    await waitFor(() => expect(JSON.parse(localStorage.getItem('repair_job_kanban_card_map')!)).toEqual({ nj: 'in_progress' }));
  });

  it('lists: rename on double-click, add another list, delete asks to confirm', async () => {
    boardMocks();
    renderApp(<BoardPage />, { at: '/workshop/board' });
    await screen.findByText('Oil change');
    await userEvent.dblClick(within(col('IN PROGRESS')).getByText('IN PROGRESS'));
    const name = screen.getByRole('textbox', { name: 'List name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Diagnosing{Enter}');
    expect(screen.getByRole('region', { name: 'Diagnosing' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add another list' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Enter list name...' }), 'Ready for pickup{Enter}');
    expect(screen.getByRole('region', { name: 'Ready for pickup' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('repair_job_kanban_lists')!).map((l: any) => l.name)).toEqual(['TO DO', 'Diagnosing', 'DONE', 'Ready for pickup']);
    await userEvent.click(screen.getByRole('button', { name: 'Delete list · Diagnosing' }));
    const dlg = await screen.findByRole('dialog', { name: 'Delete list' });
    expect(within(dlg).getByText(/This list has 1 card\(s\)/)).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: 'Delete' }));
    expect(screen.queryByRole('region', { name: 'Diagnosing' })).not.toBeInTheDocument();
    expect(within(col('TO DO')).getByText('Brake pads')).toBeInTheDocument();
  });

  it('Sales Invoice requires a customer filter', async () => {
    boardMocks();
    renderApp(<BoardPage />, { at: '/workshop/board' });
    await screen.findByText('Oil change');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sales Invoice' }));
    expect(await screen.findByRole('dialog', { name: 'Customer Required' })).toBeInTheDocument();
  });

  it('multi-job invoice: picks jobs without an invoice and prefills the sales editor', async () => {
    const full = (id: string, labour: number) => ({ status: true, result: { id, job_number: id, customer_id: 'c1', customer_name: 'Ahmed', labour_charge: labour, parts: [] } });
    const f = boardMocks([
      { method: 'GET', path: '/v1/repair-job/j1', reply: full('j1', 115) },
      { method: 'GET', path: '/v1/repair-job/j2', reply: full('j2', 230) },
      { method: 'GET', path: '/v1/product', reply: { status: true, result: [{ id: 'lab', name: 'Labour Charge' }] } },
    ]);
    renderApp(<BoardPage />, { at: '/workshop/board?customer_id=c1&customer_name=Ahmed', extraRoutes: <Route path="/sales/invoices/new" element={<div data-testid="sales-new" />} /> });
    await screen.findByText('Oil change');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sales Invoice' }));
    const dlg = await screen.findByRole('dialog', { name: 'Select Job Cards for Sales Invoice' });
    expect(within(dlg).queryByText('RJ-3')).not.toBeInTheDocument(); // already invoiced
    await userEvent.click(within(dlg).getByRole('checkbox', { name: 'Select all' }));
    expect(within(dlg).getByText('457.50')).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: 'Create Sales Invoice (2)' }));
    expect(await screen.findByTestId('sales-new')).toBeInTheDocument();
    const pre = JSON.parse(sessionStorage.getItem(PREFILL_KEY)!);
    expect(pre).toMatchObject({ customer_id: 'c1', customer_name: 'Ahmed', repair_job_ids: ['j1', 'j2'] });
    expect(pre.products).toEqual([expect.objectContaining({ product_id: 'lab', name: 'Labour Charge', unit_price_with_vat: 345, unit_price: 300 })]);
    expect(calls(f, 'GET', /^\/v1\/repair-job\/j[12]$/)).toHaveLength(2);
  });
});
