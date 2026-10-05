import React, { useState } from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import {
    DataGrid, Pagination, Modal, ConfirmDialog, ToastProvider, useToast, Menu, Button, IconButton,
    AsyncMultiSelect, TextFilter, DateFilter, ColumnChooser, Field, Input, KeyValue, Tabs, SearchInput,
} from '../../ui';
import { Trash2, MoreHorizontal } from 'lucide-react';

const columns = [
    { key: 'code', label: 'Code', sortKey: 'code' },
    { key: 'name', label: 'Name', sortKey: 'name', filter: () => <input aria-label="name filter" /> },
    { key: 'amount', label: 'Amount', align: 'num', render: r => r.amount.toFixed(2) },
];
const rows = [{ id: '1', code: 'A', name: 'Alpha', amount: 1 }, { id: '2', code: 'B', name: 'Beta', amount: 2.5 }];

describe('DataGrid', () => {
    it('renders headers, cells and custom renderers', () => {
        render(<DataGrid columns={columns} rows={rows} />);
        expect(screen.getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Code', 'Name', 'Amount']);
        expect(screen.getByText('2.50')).toHaveClass('is-num');
    });

    it('cycles sort asc → desc and exposes aria-sort', () => {
        const onSort = jest.fn();
        const { rerender } = render(<DataGrid columns={columns} rows={rows} sort={null} onSortChange={onSort} />);
        fireEvent.click(screen.getByText('Code'));
        expect(onSort).toHaveBeenLastCalledWith({ key: 'code', dir: 'asc' });
        rerender(<DataGrid columns={columns} rows={rows} sort={{ key: 'code', dir: 'asc' }} onSortChange={onSort} />);
        expect(screen.getByText('Code').closest('th')).toHaveAttribute('aria-sort', 'ascending');
        fireEvent.click(screen.getByText('Code'));
        expect(onSort).toHaveBeenLastCalledWith({ key: 'code', dir: 'desc' });
    });

    it('sorts from the keyboard', () => {
        const onSort = jest.fn();
        render(<DataGrid columns={columns} rows={rows} onSortChange={onSort} />);
        fireEvent.keyDown(screen.getByText('Name').closest('th'), { key: 'Enter' });
        expect(onSort).toHaveBeenCalledWith({ key: 'name', dir: 'asc' });
    });

    it('does not sort non-sortable columns', () => {
        const onSort = jest.fn();
        render(<DataGrid columns={columns} rows={rows} onSortChange={onSort} />);
        fireEvent.click(screen.getByText('Amount'));
        expect(onSort).not.toHaveBeenCalled();
    });

    it('shows skeleton rows while loading with no data', () => {
        const { container } = render(<DataGrid columns={columns} rows={[]} loading skeletonRows={3} />);
        expect(container.querySelectorAll('.erp-skeleton')).toHaveLength(9);
    });

    it('keeps old rows (dimmed) while reloading', () => {
        render(<DataGrid columns={columns} rows={rows} loading />);
        expect(screen.getByText('Alpha')).toBeInTheDocument();
    });

    it('shows the empty state with an action', () => {
        render(<DataGrid columns={columns} rows={[]} emptyTitle="Nothing" emptyAction={<button>Add</button>} />);
        expect(screen.getByText('Nothing')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });

    it('row click and row actions do not interfere', () => {
        const onRow = jest.fn();
        const onDelete = jest.fn();
        render(<DataGrid columns={columns} rows={rows} onRowClick={onRow} rowActions={r => [{ label: 'Delete', icon: Trash2, onClick: () => onDelete(r.id) }]} />);
        fireEvent.click(screen.getByText('Beta'));
        expect(onRow).toHaveBeenCalledWith(rows[1]);
        fireEvent.click(screen.getAllByLabelText('Row actions')[0]);
        fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
        expect(onDelete).toHaveBeenCalledWith('1');
        expect(onRow).toHaveBeenCalledTimes(1);
    });

    it('renders the filter row only when asked', () => {
        const { rerender } = render(<DataGrid columns={columns} rows={rows} />);
        expect(screen.queryByLabelText('name filter')).toBeNull();
        rerender(<DataGrid columns={columns} rows={rows} showFilters />);
        expect(screen.getByLabelText('name filter')).toBeInTheDocument();
    });

    it('falls back to index keys when rows have no id', () => {
        expect(() => render(<DataGrid columns={columns} rows={[{ code: 'x', name: 'y', amount: 0 }]} />)).not.toThrow();
    });
});

describe('Pagination', () => {
    it('shows range text and disables edges', () => {
        render(<Pagination page={1} pageSize={20} total={45} onPageChange={() => { }} />);
        expect(screen.getByText(/1–20 of 45/)).toBeInTheDocument();
        expect(screen.getByLabelText('Previous page')).toBeDisabled();
        expect(screen.getByLabelText('Next page')).not.toBeDisabled();
        expect(screen.getByLabelText('Page 1')).toHaveAttribute('aria-current', 'page');
    });

    it('navigates and changes page size', () => {
        const onPage = jest.fn();
        const onSize = jest.fn();
        render(<Pagination page={2} pageSize={20} total={45} onPageChange={onPage} onPageSizeChange={onSize} />);
        fireEvent.click(screen.getByLabelText('Next page'));
        expect(onPage).toHaveBeenCalledWith(3);
        fireEvent.click(screen.getByLabelText('Last page'));
        expect(onPage).toHaveBeenCalledWith(3);
        fireEvent.click(screen.getByLabelText('First page'));
        expect(onPage).toHaveBeenCalledWith(1);
        fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '50' } });
        expect(onSize).toHaveBeenCalledWith(50);
    });

    it('handles zero results', () => {
        render(<Pagination page={1} pageSize={20} total={0} onPageChange={() => { }} />);
        expect(screen.getByText(/0–0 of 0/)).toBeInTheDocument();
        expect(screen.getByLabelText('Next page')).toBeDisabled();
    });
});

describe('Modal', () => {
    function Harness({ onClose }) {
        return (
            <>
                <button>outside</button>
                <Modal open title="Edit thing" onClose={onClose} footer={<button>Save</button>}>
                    <input aria-label="first" />
                </Modal>
            </>
        );
    }

    it('is an accessible dialog with a title', () => {
        render(<Harness onClose={() => { }} />);
        expect(screen.getByRole('dialog', { name: 'Edit thing' })).toBeInTheDocument();
    });

    it('closes on Escape and on backdrop, not on panel clicks', () => {
        const onClose = jest.fn();
        render(<Harness onClose={onClose} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
        fireEvent.mouseDown(screen.getByRole('dialog'));
        expect(onClose).toHaveBeenCalledTimes(1);
        fireEvent.mouseDown(document.querySelector('.erp-overlay'));
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('moves focus inside and traps Tab', () => {
        render(<Harness onClose={() => { }} />);
        const close = screen.getByLabelText('Close');
        expect(close).toHaveFocus();
        const save = screen.getByText('Save');
        save.focus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(close).toHaveFocus();
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
        expect(save).toHaveFocus();
    });

    it('locks body scroll while open and restores it', () => {
        const { unmount } = render(<Harness onClose={() => { }} />);
        expect(document.body.style.overflow).toBe('hidden');
        unmount();
        expect(document.body.style.overflow).toBe('');
    });

    it('renders nothing when closed', () => {
        render(<Modal open={false} title="x">y</Modal>);
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});

describe('ConfirmDialog', () => {
    it('confirms and cancels', () => {
        const yes = jest.fn();
        const no = jest.fn();
        render(<ConfirmDialog open title="Delete brand" message="Sure?" confirmLabel="Delete" danger onConfirm={yes} onCancel={no} />);
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(yes).toHaveBeenCalled();
        expect(no).toHaveBeenCalled();
    });

    it('blocks closing while busy', () => {
        const no = jest.fn();
        render(<ConfirmDialog open title="t" message="m" busy onConfirm={() => { }} onCancel={no} />);
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(no).not.toHaveBeenCalled();
    });
});

describe('Toast', () => {
    function Trigger() {
        const toast = useToast();
        return (
            <>
                <button onClick={() => toast.success('Saved!')}>ok</button>
                <button onClick={() => toast.error('Failed!')}>bad</button>
            </>
        );
    }

    it('shows and auto-dismisses', () => {
        jest.useFakeTimers();
        render(<ToastProvider duration={1000}><Trigger /></ToastProvider>);
        fireEvent.click(screen.getByText('ok'));
        expect(screen.getByRole('status')).toHaveTextContent('Saved!');
        act(() => { jest.advanceTimersByTime(1100); });
        expect(screen.queryByText('Saved!')).toBeNull();
        jest.useRealTimers();
    });

    it('errors use role=alert and can be dismissed manually', () => {
        render(<ToastProvider duration={0}><Trigger /></ToastProvider>);
        fireEvent.click(screen.getByText('bad'));
        expect(screen.getByRole('alert')).toHaveTextContent('Failed!');
        fireEvent.click(screen.getByLabelText('Dismiss'));
        expect(screen.queryByText('Failed!')).toBeNull();
    });

    it('useToast outside a provider is a safe no-op', () => {
        render(<Trigger />);
        expect(() => fireEvent.click(screen.getByText('ok'))).not.toThrow();
    });
});

describe('Menu', () => {
    it('opens, skips hidden items, and closes on Escape / outside click', () => {
        const a = jest.fn();
        render(
            <div>
                <span>outside</span>
                <Menu trigger={<IconButton icon={MoreHorizontal} label="More" />} items={[{ label: 'A', onClick: a }, { label: 'Hidden', hidden: true }, { separator: true }, { label: 'B' }]} />
            </div>
        );
        const trigger = screen.getByLabelText('More');
        fireEvent.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.queryByText('Hidden')).toBeNull();
        expect(screen.getByRole('menuitem', { name: 'A' })).toHaveFocus();
        fireEvent.keyDown(document, { key: 'ArrowDown' });
        expect(screen.getByRole('menuitem', { name: 'B' })).toHaveFocus();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('menu')).toBeNull();
        fireEvent.click(trigger);
        fireEvent.mouseDown(screen.getByText('outside'));
        expect(screen.queryByRole('menu')).toBeNull();
        fireEvent.click(trigger);
        fireEvent.click(screen.getByRole('menuitem', { name: 'A' }));
        expect(a).toHaveBeenCalled();
    });
});

describe('Button', () => {
    it('loading disables and sets aria-busy', () => {
        const fn = jest.fn();
        render(<Button loading onClick={fn}>Save</Button>);
        const b = screen.getByRole('button', { name: 'Save' });
        expect(b).toBeDisabled();
        expect(b).toHaveAttribute('aria-busy', 'true');
    });
});

describe('Field', () => {
    it('wires label, required and error to the control', () => {
        render(<Field label="Name" required error="Name is required"><Input /></Field>);
        const input = screen.getByLabelText(/Name/);
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAttribute('aria-required', 'true');
        expect(input).toHaveClass('is-invalid');
        expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
    });
    it('shows a hint when there is no error', () => {
        render(<Field label="Code" hint="Short code"><Input /></Field>);
        expect(screen.getByLabelText('Code').getAttribute('aria-describedby')).toBe(screen.getByText('Short code').id);
    });
});

describe('KeyValue', () => {
    it('shows an em dash for empty values', () => {
        render(<KeyValue items={[{ label: 'Name', value: '' }, null, { label: 'Code', value: 'X' }]} />);
        expect(screen.getByText('—')).toBeInTheDocument();
        expect(screen.getByText('X')).toBeInTheDocument();
    });
});

describe('Tabs', () => {
    it('marks the selected tab', () => {
        const onChange = jest.fn();
        render(<Tabs tabs={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} value="a" onChange={onChange} />);
        expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('aria-selected', 'true');
        fireEvent.click(screen.getByRole('tab', { name: 'B' }));
        expect(onChange).toHaveBeenCalledWith('b');
    });
});

describe('SearchInput', () => {
    it('clears with the clear button', () => {
        function H() { const [v, setV] = useState('abc'); return <SearchInput value={v} onChange={setV} placeholder="Search" />; }
        render(<H />);
        fireEvent.click(screen.getByLabelText('Clear search'));
        expect(screen.getByPlaceholderText('Search')).toHaveValue('');
    });
});

describe('TextFilter', () => {
    it('debounces and trims before reporting', () => {
        jest.useFakeTimers();
        const onChange = jest.fn();
        render(<TextFilter label="Name" value="" onChange={onChange} delay={300} />);
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: ' bo' } });
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: ' bos ' } });
        expect(onChange).not.toHaveBeenCalled();
        act(() => { jest.advanceTimersByTime(310); });
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('bos');
        jest.useRealTimers();
    });
});

describe('DateFilter', () => {
    it('sends a single date and clears the range keys', () => {
        const onChange = jest.fn();
        render(<DateFilter label="Created" field="created_at" fromField="created_at_from" toField="created_at_to" onChange={onChange} />);
        fireEvent.change(screen.getByLabelText('Created'), { target: { value: '2026-10-05' } });
        expect(onChange).toHaveBeenLastCalledWith({ created_at: 'Oct 05 2026', created_at_from: '', created_at_to: '' });
    });

    it('switches to a range and clears the single date', () => {
        const onChange = jest.fn();
        render(<DateFilter label="Created" field="created_at" fromField="created_at_from" toField="created_at_to" onChange={onChange} />);
        fireEvent.click(screen.getByLabelText('Range'));
        expect(onChange).toHaveBeenLastCalledWith({ created_at: '', created_at_from: '', created_at_to: '' });
        fireEvent.change(screen.getByLabelText('Created from'), { target: { value: '2026-01-01' } });
        fireEvent.change(screen.getByLabelText('Created to'), { target: { value: '2026-01-31' } });
        expect(onChange).toHaveBeenLastCalledWith({ created_at: '', created_at_from: 'Jan 01 2026', created_at_to: 'Jan 31 2026' });
    });
});

describe('AsyncMultiSelect', () => {
    it('loads options, adds by click and Enter, removes by button and Backspace', async () => {
        const load = jest.fn().mockResolvedValue([{ id: 'u1', name: 'Ali' }, { id: 'u2', name: 'Sara' }]);
        function H() { const [v, setV] = useState([]); return <AsyncMultiSelect value={v} onChange={setV} loadOptions={load} label="Users" />; }
        render(<H />);
        const input = screen.getByLabelText('Users');
        fireEvent.focus(input);
        await screen.findByRole('option', { name: 'Ali' });
        fireEvent.mouseDown(screen.getByRole('option', { name: 'Ali' }));
        expect(screen.getByLabelText('Remove Ali')).toBeInTheDocument();
        // selected option no longer offered
        expect(screen.queryByRole('option', { name: 'Ali' })).toBeNull();
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(screen.getByLabelText('Remove Sara')).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Remove Ali'));
        expect(screen.queryByLabelText('Remove Ali')).toBeNull();
        fireEvent.keyDown(input, { key: 'Backspace' });
        expect(screen.queryByLabelText('Remove Sara')).toBeNull();
    });

    it('shows "No matches" and survives a failing loader', async () => {
        const load = jest.fn().mockRejectedValue(new Error('x'));
        render(<AsyncMultiSelect value={[]} onChange={() => { }} loadOptions={load} label="Users" />);
        fireEvent.focus(screen.getByLabelText('Users'));
        expect(await screen.findByText('No matches')).toBeInTheDocument();
    });
});

describe('ColumnChooser', () => {
    it('toggles, reorders, applies and resets', () => {
        const onSave = jest.fn();
        const onReset = jest.fn();
        const prefs = [{ key: 'a', visible: true }, { key: 'b', visible: true }];
        const { rerender } = render(<ColumnChooser open prefs={prefs} labels={{ a: 'Alpha', b: 'Beta' }} onSave={onSave} onReset={onReset} onClose={() => { }} />);
        fireEvent.click(screen.getByLabelText('Alpha'));
        fireEvent.click(screen.getByLabelText('Move Beta up'));
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
        expect(onSave).toHaveBeenCalledWith([{ key: 'b', visible: true }, { key: 'a', visible: false }]);
        rerender(<ColumnChooser open prefs={prefs} labels={{ a: 'Alpha', b: 'Beta' }} onSave={onSave} onReset={onReset} onClose={() => { }} />);
        fireEvent.click(screen.getByRole('button', { name: 'Restore defaults' }));
        expect(onReset).toHaveBeenCalled();
        // reopening starts again from the saved prefs, discarding the unsaved draft
        rerender(<ColumnChooser open={false} prefs={prefs} labels={{ a: 'Alpha', b: 'Beta' }} onSave={onSave} onReset={onReset} onClose={() => { }} />);
        rerender(<ColumnChooser open prefs={prefs} labels={{ a: 'Alpha', b: 'Beta' }} onSave={onSave} onReset={onReset} onClose={() => { }} />);
        expect(within(screen.getByRole('dialog')).getByLabelText('Move Alpha up')).toBeDisabled();
        expect(screen.getByLabelText('Alpha')).toBeChecked();
    });
});

describe('waitFor sanity', () => {
    it('resolves', async () => { await waitFor(() => expect(true).toBe(true)); });
});
