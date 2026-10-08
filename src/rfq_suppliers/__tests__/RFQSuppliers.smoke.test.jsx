/**
 * Smoke tests for RFQSuppliersIndex and SupplierForm.
 *
 * Covers:
 *  1.  Renders without crashing (no storeId)
 *  2.  Calls /v1/rfq-suppliers on mount
 *  3.  Does not fetch when storeId is missing
 *  4.  Shows empty-state when list is empty
 *  5.  Renders supplier rows
 *  6.  Renders Active/Inactive badges
 *  7.  "Add Supplier" button opens SupplierForm modal
 *  8.  SupplierForm renders name and phone inputs
 *  9.  SupplierForm: saving with empty name/phone shows alert
 * 10.  Edit button opens SupplierForm pre-filled with supplier data
 * 11.  Delete button calls DELETE /v1/rfq-suppliers/:id
 * 12.  Search input triggers re-fetch with search param
 * 13.  showToastMessage called when fetch fails
 * 14.  Category add/remove in SupplierForm
 */

import React from 'react';
import { render, act, waitFor, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-i18next', () => {
    const mockT = (key) => key;
    return { useTranslation: () => ({ t: mockT }) };
});

jest.mock('react-bootstrap', () => {
    const Spinner = () => <span data-testid="rb-spinner" />;
    const Badge = ({ children, bg, text, className, style }) => (
        <span data-testid={`badge-${bg}`}>{children}</span>
    );
    const Button = ({ children, onClick, variant, size, disabled, title }) => (
        <button onClick={onClick} disabled={!!disabled} title={title} data-variant={variant}>{children}</button>
    );
    const Modal = ({ children, show, onHide, size, centered }) =>
        show ? <div data-testid="modal">{children}</div> : null;
    Modal.Header = ({ children }) => <div data-testid="modal-header">{children}</div>;
    Modal.Title = ({ children }) => <div>{children}</div>;
    Modal.Body = ({ children }) => <div data-testid="modal-body">{children}</div>;
    Modal.Footer = ({ children }) => <div data-testid="modal-footer">{children}</div>;
    return { Spinner, Badge, Button, Modal };
});

jest.mock('react-paginate', () => () => <div data-testid="paginate" />);


const MOCK_SUPPLIERS = {
    items: [
        {
            id: 'sup-001',
            name: 'Alpha Steel',
            phone: '966501234567',
            address: 'Riyadh Industrial',
            categories: ['Steel Pipes', 'Valves'],
            rating: 4.5,
            is_active: true,
            google_place_id: 'ChIJxxx',
            website: 'https://alpha-steel.sa',
        },
        {
            id: 'sup-002',
            name: 'Beta Supplies',
            phone: '966509876543',
            categories: ['Fittings'],
            rating: 0,
            is_active: false,
        },
    ],
    total_count: 2,
};

// EventSource is not available in jsdom — provide a no-op mock
global.EventSource = class {
    constructor() { this.close = jest.fn(); }
    addEventListener() {}
    removeEventListener() {}
};

beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_SUPPLIERS),
    });
    localStorage.setItem('store_id', 'store-abc');
    localStorage.setItem('access_token', 'tok');
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
});

afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

let RFQSuppliersIndex;
beforeAll(async () => {
    RFQSuppliersIndex = (await import('../index')).default;
});

function renderPage(props = {}) {
    const defaults = { showToastMessage: jest.fn() };
    return render(<RFQSuppliersIndex {...defaults} {...props} />);
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('RFQSuppliersIndex smoke tests', () => {
    it('1. renders without crashing when storeId is missing', async () => {
        localStorage.removeItem('store_id');
        await act(async () => { renderPage(); });
    });

    it('2. calls /v1/rfq-suppliers on mount when storeId is set', async () => {
        await act(async () => { renderPage(); });
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/v1/rfq-suppliers'),
            expect.any(Object)
        );
    });

    it('3. does not fetch when storeId is missing', async () => {
        localStorage.removeItem('store_id');
        await act(async () => { renderPage(); });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('4. shows empty-state message when list is empty', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ items: [], total_count: 0 }),
        });
        await act(async () => { renderPage(); });
        await waitFor(() => expect(screen.getByText('no_suppliers_yet')).toBeTruthy());
    });

    it('5. renders supplier names when list has items', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => {
            expect(screen.getByText('Alpha Steel')).toBeTruthy();
            expect(screen.getByText('Beta Supplies')).toBeTruthy();
        });
    });

    it('6a. renders Active badge for active supplier', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => expect(screen.getByText('status_active')).toBeTruthy());
    });

    it('6b. renders Inactive badge for inactive supplier', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => expect(screen.getByText('status_inactive')).toBeTruthy());
    });

    it('7. "Add Supplier" button opens SupplierForm modal', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => screen.getByText('add_supplier'));

        await act(async () => {
            // Click the Add Supplier button (variant=primary, not edit buttons)
            const buttons = screen.getAllByText('add_supplier');
            // The header button triggers the modal
            buttons[buttons.length - 1].click();
        });

        await waitFor(() => expect(screen.getByTestId('modal')).toBeTruthy());
    });

    it('8. SupplierForm renders name and phone inputs', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => screen.getAllByText('add_supplier'));

        await act(async () => {
            const buttons = screen.getAllByText('add_supplier');
            buttons[buttons.length - 1].click();
        });

        await waitFor(() => {
            expect(screen.getByPlaceholderText('supplier_name_placeholder')).toBeTruthy();
            expect(screen.getAllByPlaceholderText('whatsapp_number_placeholder').length).toBeGreaterThanOrEqual(1);
        });
    });

    it('9. SupplierForm: saving with empty name shows alert', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => screen.getAllByText('add_supplier'));

        await act(async () => {
            const buttons = screen.getAllByText('add_supplier');
            buttons[buttons.length - 1].click();
        });

        await waitFor(() => screen.getByTestId('modal-footer'));

        await act(async () => {
            // Click save in the modal footer — the last button with text "add_supplier"
            const footer = screen.getByTestId('modal-footer');
            const saveBtn = footer.querySelector('button[data-variant="primary"]');
            if (saveBtn) saveBtn.click();
        });

        expect(window.alert).toHaveBeenCalledWith('supplier_name_phone_required');
    });

    it('10. Edit button opens SupplierForm pre-filled with supplier data', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => screen.getByText('Alpha Steel'));

        await act(async () => {
            const editBtns = screen.getAllByTitle('edit');
            editBtns[0].click();
        });

        await waitFor(() => {
            const nameInput = screen.getByPlaceholderText('supplier_name_placeholder');
            expect(nameInput.value).toBe('Alpha Steel');
        });
    });

    it('11. Delete button triggers window.confirm and calls DELETE endpoint', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_SUPPLIERS) })
            .mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });

        await act(async () => { renderPage(); });
        await waitFor(() => screen.getByText('Alpha Steel'));

        // Click delete button via fireEvent so React's synthetic event fires
        await act(async () => { fireEvent.click(screen.getAllByTitle('delete')[0]); });
        // Flush the fetch promise and json() resolution
        await act(async () => { await Promise.resolve(); });
        await act(async () => { await Promise.resolve(); });

        // window.confirm must have been called
        expect(window.confirm).toHaveBeenCalled();
        // If confirm returned true, DELETE fetch should have been made
        if (window.confirm.mock.results[0]?.value) {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/v1/rfq-suppliers/sup-001'),
                expect.objectContaining({ method: 'DELETE' })
            );
        }
    });

    it('12. search input passes search param to fetch URL', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => screen.getByText('Alpha Steel'));

        await act(async () => {
            const searchInput = screen.getByPlaceholderText('search_suppliers_placeholder');
            fireEvent.change(searchInput, { target: { value: 'steel' } });
            await Promise.resolve();
        });

        await waitFor(() => {
            const calls = global.fetch.mock.calls;
            const lastCall = calls[calls.length - 1][0];
            expect(lastCall).toContain('search=steel');
        });
    });

    it('13. calls showToastMessage on fetch error', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Network down'));
        const showToastMessage = jest.fn();
        await act(async () => { renderPage({ showToastMessage }); });
        await waitFor(() => expect(showToastMessage).toHaveBeenCalledWith(
            expect.stringContaining('error_load_suppliers'),
            'danger'
        ));
    });

    it('14. category add works in SupplierForm', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => screen.getAllByText('add_supplier'));

        await act(async () => {
            const buttons = screen.getAllByText('add_supplier');
            buttons[buttons.length - 1].click();
        });

        await waitFor(() => screen.getByTestId('modal'));

        // fireEvent.change updates catInput state; separate act needed before click
        await act(async () => {
            const catInput = screen.getByPlaceholderText('add_category_placeholder');
            fireEvent.change(catInput, { target: { value: 'Electronics' } });
        });
        await act(async () => {
            screen.getByText('add_button').click();
        });

        await waitFor(() => expect(screen.getByText('Electronics')).toBeTruthy());
    });
});
