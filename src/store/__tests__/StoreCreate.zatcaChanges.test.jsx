/**
 * Tests for StoreCreate changes:
 *  1-2. Serial locks — sales
 *  3-4. Serial locks — sales return
 *  5-6. Serial locks — customer deposit
 *  7-8. Serial locks — customer withdrawal
 *  9.   All locked / none locked simultaneously
 * 10.   Serial locks API call verification
 * 11.   Trim on save
 * 12.   ZATCA reconnect flash after save
 */

import React, { createRef } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── mocks (before subject import) ─────────────────────────────────────────────

jest.mock('react-bootstrap', () => {
    const Modal = ({ show, children }) =>
        show ? <div data-testid="store-modal">{children}</div> : null;
    Modal.Header = ({ children }) => <div>{children}</div>;
    Modal.Body   = ({ children }) => <div>{children}</div>;
    Modal.Footer = ({ children }) => <div>{children}</div>;
    const Button  = ({ children, onClick, disabled, type }) => (
        <button onClick={onClick} disabled={disabled} type={type}>{children}</button>
    );
    const Spinner = () => <span data-testid="spinner" />;
    return { Modal, Button, Spinner };
});

jest.mock('react-image-file-resizer', () => ({
    imageFileResizer: jest.fn(),
}));

jest.mock('react-select-country-list', () => () => ({
    getData: () => [
        { value: 'SA', label: 'Saudi Arabia' },
        { value: 'AE', label: 'United Arab Emirates' },
    ],
}));

jest.mock('react-bootstrap-typeahead', () => ({
    Typeahead: require('react').forwardRef(({ onChange, selected, placeholder }, ref) => (
        <input
            ref={ref}
            data-testid="country-typeahead"
            placeholder={placeholder}
            value={selected && selected[0] ? selected[0].label : ''}
            onChange={e => onChange(e.target.value ? [{ value: e.target.value, label: e.target.value }] : [])}
        />
    )),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
    useEnterKeyNavigation: jest.fn(),
}));

jest.mock('../../utils/timezone.js', () => ({
    toStoreLocalDate: jest.fn(() => null),
    fromStoreLocalDate: jest.fn(() => null),
}));

jest.mock('../../sidebar_menu_config', () => ({
    applyAutomobileMenuOrder: jest.fn(items => items),
    DEFAULT_MENU: [],
    loadSidebarConfig: jest.fn(() => []),
    saveSidebarConfig: jest.fn(),
}));

jest.mock('../zatca_connect.js', () =>
    require('react').forwardRef((_props, ref) => {
        require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
        return null;
    })
);

jest.useFakeTimers();

import StoreCreate from '../create.js';

// ── fixture helpers ───────────────────────────────────────────────────────────

function makeStoreResponse(overrides = {}) {
    const baseNationalAddress = {
        building_no: '1234',
        street_name: 'King Road',
        street_name_arabic: 'طريق الملك',
        district_name: 'Al-Olaya',
        district_name_arabic: 'العليا',
        city_name: 'Riyadh',
        city_name_arabic: 'الرياض',
        zipcode: '12345',
    };
    const base = {
        id: 'store-abc',
        name: 'Test Store',
        name_in_arabic: 'متجر',
        code: 'BR01',
        branch_name: 'Main',
        registration_number: 'CRN001',
        business_category: 'Supply Activities',
        vat_no: '300000000000003',
        vat_percent: 15,
        phone: '+966500000000',
        email: 'test@test.com',
        country_code: 'SA',
        zipcode: '12345',
        national_address: baseNationalAddress,
        bank_account: {},
        settings: { invoice: {} },
        zatca: { phase: '1' },
        sales_serial_number: { prefix: 'S-INV', start_from_count: 1, padding_count: 3 },
        sales_return_serial_number: { prefix: 'SR-INV', start_from_count: 1, padding_count: 3 },
        customer_deposit_serial_number: { prefix: 'CD-INV', start_from_count: 1, padding_count: 3 },
        customer_withdrawal_serial_number: { prefix: 'CW-INV', start_from_count: 1, padding_count: 3 },
        stock_transfer_serial_number: { prefix: 'ST-TR', start_from_count: 1, padding_count: 3 },
        purchase_serial_number: { prefix: 'P-INV', start_from_count: 1, padding_count: 3 },
        purchase_return_serial_number: { prefix: 'PR-INV', start_from_count: 1, padding_count: 3 },
        purchase_order_serial_number: { prefix: 'PO-INV', start_from_count: 1, padding_count: 3 },
        quotation_serial_number: { prefix: 'Q-INV', start_from_count: 1, padding_count: 3 },
        quotation_sales_return_serial_number: { prefix: 'QSR-INV', start_from_count: 1, padding_count: 3 },
        non_vat_sales_serial_number: { prefix: 'NV-INV', start_from_count: 1, padding_count: 3 },
        non_vat_sales_return_serial_number: { prefix: 'NVR-INV', start_from_count: 1, padding_count: 3 },
        customer_serial_number: { prefix: 'C', start_from_count: 1, padding_count: 3 },
        vendor_serial_number: { prefix: 'V', start_from_count: 1, padding_count: 3 },
        expense_serial_number: { prefix: 'EXP', start_from_count: 1, padding_count: 3 },
        capital_deposit_serial_number: { prefix: 'CAP', start_from_count: 1, padding_count: 3 },
        divident_serial_number: { prefix: 'DIV', start_from_count: 1, padding_count: 3 },
        delivery_note_serial_number: { prefix: 'DN', start_from_count: 1, padding_count: 3 },
        purchase_request_serial_number: { prefix: 'PR-REQ', start_from_count: 1, padding_count: 3 },
    };
    const result = { ...base, ...overrides };
    // Deep-merge national_address so callers can override individual fields without losing
    // required sibling fields (e.g. street_name_arabic, building_no, etc.).
    if (overrides.national_address) {
        result.national_address = { ...baseNationalAddress, ...overrides.national_address };
    }
    return result;
}

// Renders StoreCreate, opens an existing store, and navigates to Serial Numbers tab.
// Returns { ref, store }.
async function renderWithSerialNumbers(storeOverrides = {}, serialLocks = {}) {
    const store = makeStoreResponse(storeOverrides);

    global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('/serial-locks')) {
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ result: serialLocks }),
            });
        }
        if (url.includes('/customer-package')) {
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ result: [], status: true }),
            });
        }
        return Promise.resolve({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ result: store }),
        });
    });

    const ref = createRef();
    render(<StoreCreate ref={ref} />);

    await act(async () => {
        ref.current.open('store-abc');
        // Flush microtasks for fetch responses
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    });

    // Wait for the store to load — header changes from 'Create New Store' to 'Update Store — Test Store'
    await waitFor(() => expect(screen.getByText(/Update Store/)).toBeInTheDocument());

    // Navigate to Serial Numbers tab
    const serialBtn = screen.getAllByRole('button').find(b => b.textContent.trim() === 'Serial Numbers');
    if (serialBtn) {
        fireEvent.click(serialBtn);
        // Multiple elements contain /Sales ID/ (e.g. "Sales ID's:" and "Non VAT Sales ID's:")
        await waitFor(() => expect(screen.getAllByText(/Sales ID/).length).toBeGreaterThan(0));
    }

    return { ref, store };
}

// ── setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'tok-abc');
    localStorage.setItem('store_id', 'store-abc');
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    localStorage.clear();
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Serial locks — sales
// ═══════════════════════════════════════════════════════════════════════════════

describe('1. Serial locks — sales', () => {
    test('1.1  sales_locked=false → sales start_from_count input is NOT disabled', async () => {
        await renderWithSerialNumbers({}, { sales_locked: false });
        // When not locked, no element has the "cannot change" title
        expect(screen.queryByTitle('Cannot change: sales records already exist')).not.toBeInTheDocument();
    });

    test('1.2  sales_locked=true → sales start_from_count input IS disabled', async () => {
        await renderWithSerialNumbers({}, { sales_locked: true });
        await waitFor(() => {
            const el = screen.getByTitle('Cannot change: sales records already exist');
            expect(el).toBeDisabled();
        });
    });

    test('1.3  sales_locked=true → input has the "Cannot change" title attribute', async () => {
        await renderWithSerialNumbers({}, { sales_locked: true });
        await waitFor(() => {
            expect(screen.getByTitle('Cannot change: sales records already exist')).toBeInTheDocument();
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Serial locks — sales return
// ═══════════════════════════════════════════════════════════════════════════════

describe('2. Serial locks — sales return', () => {
    test('2.1  sales_return_locked=false → sales return start_from_count NOT disabled', async () => {
        await renderWithSerialNumbers({}, { sales_return_locked: false });
        expect(screen.queryByTitle('Cannot change: sales return records already exist')).not.toBeInTheDocument();
    });

    test('2.2  sales_return_locked=true → sales return start_from_count IS disabled', async () => {
        await renderWithSerialNumbers({}, { sales_return_locked: true });
        await waitFor(() => {
            const el = screen.getByTitle('Cannot change: sales return records already exist');
            expect(el).toBeDisabled();
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Serial locks — customer deposit
// ═══════════════════════════════════════════════════════════════════════════════

describe('3. Serial locks — customer deposit', () => {
    test('3.1  customer_deposit_locked=false → deposit start_from_count NOT disabled', async () => {
        await renderWithSerialNumbers({}, { customer_deposit_locked: false });
        expect(screen.queryByTitle('Cannot change: receivable records already exist')).not.toBeInTheDocument();
    });

    test('3.2  customer_deposit_locked=true → deposit start_from_count IS disabled', async () => {
        await renderWithSerialNumbers({}, { customer_deposit_locked: true });
        await waitFor(() => {
            const el = screen.getByTitle('Cannot change: receivable records already exist');
            expect(el).toBeDisabled();
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Serial locks — customer withdrawal
// ═══════════════════════════════════════════════════════════════════════════════

describe('4. Serial locks — customer withdrawal', () => {
    test('4.1  customer_withdrawal_locked=false → withdrawal start_from_count NOT disabled', async () => {
        await renderWithSerialNumbers({}, { customer_withdrawal_locked: false });
        expect(screen.queryByTitle('Cannot change: payable records already exist')).not.toBeInTheDocument();
    });

    test('4.2  customer_withdrawal_locked=true → withdrawal start_from_count IS disabled', async () => {
        await renderWithSerialNumbers({}, { customer_withdrawal_locked: true });
        await waitFor(() => {
            const el = screen.getByTitle('Cannot change: payable records already exist');
            expect(el).toBeDisabled();
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. All locked / none locked simultaneously
// ═══════════════════════════════════════════════════════════════════════════════

describe('5. All locked / none locked simultaneously', () => {
    test('5.1  all four locked → all four "Cannot change" titles present and disabled', async () => {
        await renderWithSerialNumbers({}, {
            sales_locked: true,
            sales_return_locked: true,
            customer_deposit_locked: true,
            customer_withdrawal_locked: true,
        });
        await waitFor(() => {
            expect(screen.getByTitle('Cannot change: sales records already exist')).toBeDisabled();
            expect(screen.getByTitle('Cannot change: sales return records already exist')).toBeDisabled();
            expect(screen.getByTitle('Cannot change: receivable records already exist')).toBeDisabled();
            expect(screen.getByTitle('Cannot change: payable records already exist')).toBeDisabled();
        });
    });

    test('5.2  none locked → none of the four "Cannot change" titles present', async () => {
        await renderWithSerialNumbers({}, {});
        expect(screen.queryByTitle('Cannot change: sales records already exist')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Cannot change: sales return records already exist')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Cannot change: receivable records already exist')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Cannot change: payable records already exist')).not.toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Serial locks API call
// ═══════════════════════════════════════════════════════════════════════════════

describe('6. Serial locks API call', () => {
    test('6.1  when opening an existing store (with id), serial-locks API is called', async () => {
        await renderWithSerialNumbers();
        expect(global.fetch.mock.calls.some(([url]) => url.includes('/serial-locks'))).toBe(true);
    });

    test('6.2  serial-locks URL contains the store id', async () => {
        await renderWithSerialNumbers();
        const locksCall = global.fetch.mock.calls.find(([url]) => url.includes('/serial-locks'));
        expect(locksCall).toBeDefined();
        expect(locksCall[0]).toContain('store-abc');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Trim on save
// ═══════════════════════════════════════════════════════════════════════════════

describe('7. Trim on save', () => {
    async function renderAndClickUpdate(storeOverrides = {}) {
        const store = makeStoreResponse(storeOverrides);
        global.fetch = jest.fn().mockImplementation((url) => {
            if (url.includes('/serial-locks')) {
                return Promise.resolve({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ result: {} }),
                });
            }
            if (url.includes('/customer-package')) {
                return Promise.resolve({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ result: [], status: true }),
                });
            }
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ result: store }),
            });
        });

        const ref = createRef();
        render(<StoreCreate ref={ref} />);

        await act(async () => {
            ref.current.open('store-abc');
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => expect(screen.getByText(/Update Store/)).toBeInTheDocument());

        // Click the Save Changes button
        const updateBtn = screen.getAllByRole('button').find(b => b.textContent.trim() === 'Save Changes');
        fireEvent.click(updateBtn);

        return { ref };
    }

    test('7.1  name with trailing spaces → PUT body JSON has name without trailing spaces', async () => {
        await renderAndClickUpdate({ name: 'Test Store   ' });
        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'PUT');
            expect(putCall).toBeDefined();
            const body = JSON.parse(putCall[1].body);
            expect(body.name).toBe('Test Store');
        });
    });

    test('7.2  national_address.street_name with trailing spaces → trimmed in PUT body', async () => {
        await renderAndClickUpdate({ national_address: { street_name: 'King Road   ' } });
        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'PUT');
            expect(putCall).toBeDefined();
            const body = JSON.parse(putCall[1].body);
            expect(body.national_address.street_name).toBe('King Road');
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. ZATCA reconnect after save
// ═══════════════════════════════════════════════════════════════════════════════

describe('8. ZATCA reconnect after save', () => {
    async function openAndSave(zatcaReconnectRequired) {
        const store = makeStoreResponse();
        const saveResponse = makeStoreResponse({
            zatca: { phase: '1', zatca_reconnect_required: zatcaReconnectRequired },
        });

        global.fetch = jest.fn().mockImplementation((url, opts) => {
            if (url.includes('/serial-locks')) {
                return Promise.resolve({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ result: {} }),
                });
            }
            if (url.includes('/customer-package')) {
                return Promise.resolve({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ result: [], status: true }),
                });
            }
            if (opts && opts.method === 'PUT') {
                return Promise.resolve({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ result: saveResponse }),
                });
            }
            return Promise.resolve({
                ok: true,
                headers: { get: () => 'application/json' },
                json: () => Promise.resolve({ result: store }),
            });
        });

        const ref = createRef();
        render(<StoreCreate ref={ref} />);

        await act(async () => {
            ref.current.open('store-abc');
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => expect(screen.getByText(/Update Store/)).toBeInTheDocument());

        const updateBtn = screen.getAllByRole('button').find(b => b.textContent.trim() === 'Save Changes');
        fireEvent.click(updateBtn);

        return { ref };
    }

    test('8.1  successful save with zatca_reconnect_required=false → success flash shown', async () => {
        await openAndSave(false);
        await waitFor(() =>
            expect(screen.getByText(/updated successfully/i)).toBeInTheDocument()
        );
    });

    test('8.2  successful save with zatca_reconnect_required=true → ZATCA flash message shown', async () => {
        await openAndSave(true);
        await waitFor(() =>
            expect(screen.getByText(/ZATCA-sensitive fields changed/i)).toBeInTheDocument()
        );
    });
});
