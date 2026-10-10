/**
 * The repair board keeps a job's column in its status on the API, so every
 * user and device sees the same board:
 *  - a job closed by a drop on DONE is listed under DONE (status "closed"),
 *  - a drop on IN PROGRESS saves status "in_progress",
 *  - a drop back on TO DO reopens it.
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import RepairJobKanban from '../kanban.js';
import { statusForListDrop, statusToDefaultListId } from '../kanban_utils.js';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const JOBS = [
    { id: 'j1', job_number: 'RJ-1', title: 'Closed job', status: 'closed' },
    { id: 'j2', job_number: 'RJ-2', title: 'Open job', status: 'open' },
    { id: 'j3', job_number: 'RJ-3', title: 'Busy job', status: 'in_progress' },
];

const json = (body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('store_id', 's1');
    localStorage.setItem('access_token', 't');
    global.fetch = jest.fn((url, opts = {}) => {
        if (opts.method === 'PUT') return json({ status: true, result: { id: 'x', ...JSON.parse(opts.body) } });
        if (String(url).startsWith('/v1/repair-job?')) return json({ status: true, result: JOBS.map((j) => ({ ...j })) });
        return json({ status: true, result: [] });
    });
});

const column = (id) => document.querySelector(`[data-list-id="${id}"]`);
const card = (jobId) => document.querySelector(`[data-job-id="${jobId}"]`);
const dataTransfer = { setDragImage: jest.fn(), setData: jest.fn(), getData: jest.fn(), effectAllowed: '', dropEffect: '' };

async function renderBoard() {
    render(<RepairJobKanban />);
    await waitFor(() => expect(screen.getByText('Open job')).toBeTruthy());
}

async function drag(jobId, listId) {
    await act(async () => {
        fireEvent.dragStart(card(jobId), { dataTransfer });
        fireEvent.dragOver(column(listId), { dataTransfer });
        fireEvent.drop(column(listId), { dataTransfer });
    });
}

const puts = () => global.fetch.mock.calls.filter(([, o]) => o && o.method === 'PUT').map(([u, o]) => ({ url: u, body: JSON.parse(o.body) }));

describe('repair board statuses', () => {
    test('a closed job is listed under DONE without a local card map', async () => {
        await renderBoard();
        expect(within(column('done')).getByText('Closed job')).toBeTruthy();
        expect(within(column('todo')).queryByText('Closed job')).toBeNull();
        expect(within(column('in_progress')).getByText('Busy job')).toBeTruthy();
    });

    test('a drop on IN PROGRESS saves status in_progress through the API', async () => {
        await renderBoard();
        await drag('j2', 'in_progress');
        await waitFor(() => expect(puts()).toHaveLength(1));
        expect(puts()[0].url).toMatch(/^\/v1\/repair-job\/j2\?/);
        expect(puts()[0].body).toEqual({ status: 'in_progress' });
    });

    test('a drop back on TO DO reopens an in-progress job', async () => {
        await renderBoard();
        await drag('j3', 'todo');
        await waitFor(() => expect(puts()).toHaveLength(1));
        expect(puts()[0].body).toEqual({ status: 'open' });
    });
});

describe('kanban_utils', () => {
    test('statusToDefaultListId maps closed to done', () => {
        expect(statusToDefaultListId('closed')).toBe('done');
    });

    test('statusForListDrop', () => {
        expect(statusForListDrop('done', true, 'open')).toBe('closed');
        expect(statusForListDrop('done', true, 'closed')).toBeNull();
        expect(statusForListDrop('in_progress', false, 'open')).toBe('in_progress');
        expect(statusForListDrop('in_progress', false, 'in_progress')).toBeNull();
        expect(statusForListDrop('todo', false, 'closed')).toBe('open');
        expect(statusForListDrop('todo', false, 'in_progress')).toBe('open');
        expect(statusForListDrop('todo', false, 'open')).toBeNull();
    });
});
