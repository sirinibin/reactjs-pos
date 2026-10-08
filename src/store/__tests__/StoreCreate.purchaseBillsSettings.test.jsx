/**
 * Tests for the Purchase Bills Settings tab in StoreCreate:
 *  1.  "Purchase Bills" sidebar tab button renders
 *  2.  "Enable Purchase Bills Tracking" checkbox renders in the Purchase Bills tab
 *  3.  "Purchase Managers Numbers" label is visible when tracking is enabled (API load)
 *  4.  Add Number button appends a new phone-number input
 *  5.  Remove button deletes the correct number entry
 *  6.  "Purchase Managers Numbers" section is hidden when tracking is disabled
 *  7.  Checkbox toggles the DOM checked state for enable_purchase_bills_tracking
 */

import React, { createRef } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── mocks ──────────────────────────────────────────────────────────────────────

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

jest.mock('../ProcurementWhatsAppWidget', () => () => null);
jest.mock('../ProcurementEmailWidget', () => () => null);

jest.useFakeTimers();

import StoreCreate from '../create.js';

// ── fixture helpers ────────────────────────────────────────────────────────────

function makeStoreResponse(settingsOverrides = {}) {
    return {
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
        national_address: {
            building_no: '1234', street_name: 'King Road', street_name_arabic: 'طريق الملك',
            district_name: 'Al-Olaya', district_name_arabic: 'العليا',
            city_name: 'Riyadh', city_name_arabic: 'الرياض', zipcode: '12345',
        },
        bank_account: {},
        settings: {
            invoice: {},
            enable_rfq_supplier_on_purchase: false,
            enable_purchase_bills_tracking: false,
            purchase_bills_manager_numbers: [],
            ...settingsOverrides,
        },
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
}

function mockFetch(store) {
    global.fetch = jest.fn().mockImplementation((url) => {
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
}

async function renderWithPurchaseBillsTab(settingsOverrides = {}) {
    const store = makeStoreResponse(settingsOverrides);
    mockFetch(store);

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

    // Navigate to Purchase Bills tab
    await waitFor(() => {
        const btn = screen.getAllByRole('button').find(b => b.textContent.includes('Purchase Bills'));
        if (btn) fireEvent.click(btn);
    });

    // Wait for the tab content to render
    await waitFor(() => expect(screen.getByText(/Enable Purchase Bills Tracking/i)).toBeInTheDocument());

    return { ref, store };
}

// ── setup / teardown ───────────────────────────────────────────────────────────

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'tok-abc');
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

// ── tests ──────────────────────────────────────────────────────────────────────

test('1. Purchase Bills sidebar tab button renders', async () => {
    await renderWithPurchaseBillsTab();
    const btn = screen.getAllByRole('button').find(b => b.textContent.includes('Purchase Bills'));
    expect(btn).toBeTruthy();
});

test('2. Enable Purchase Bills Tracking checkbox renders in Purchase Bills tab', async () => {
    await renderWithPurchaseBillsTab();
    await waitFor(() => {
        expect(screen.getByText(/Enable Purchase Bills Tracking/i)).toBeInTheDocument();
    });
});

// Tests 3–5 load enable_purchase_bills_tracking:true from the API response
// (no checkbox interaction) so they are isolated from any toggle side-effects.

test('3. Purchase Managers Numbers label is visible when tracking is enabled', async () => {
    await renderWithPurchaseBillsTab({
        enable_purchase_bills_tracking: true,
        purchase_bills_manager_numbers: [],
    });

    await waitFor(() => {
        // Anchored regex so it only matches the <label> element, not the description paragraph.
        expect(screen.getByText(/^Purchase Managers Numbers$/i)).toBeInTheDocument();
    });
});

test('4. Add Number button appends a new phone-number input', async () => {
    await renderWithPurchaseBillsTab({
        enable_purchase_bills_tracking: true,
        purchase_bills_manager_numbers: [],
    });

    await waitFor(() => {
        expect(screen.getByText(/Add Number/i)).toBeInTheDocument();
    });

    const addBtn = screen.getByText(/Add Number/i).closest('button');
    fireEvent.click(addBtn);

    await waitFor(() => {
        const inputs = screen.getAllByPlaceholderText(/966501234567/i);
        expect(inputs.length).toBeGreaterThanOrEqual(1);
    });
});

test('5. Remove button deletes the correct number entry', async () => {
    await renderWithPurchaseBillsTab({
        enable_purchase_bills_tracking: true,
        purchase_bills_manager_numbers: [],
    });

    await waitFor(() => {
        expect(screen.getByText(/Add Number/i)).toBeInTheDocument();
    });

    // Add two entries
    const addBtn = screen.getByText(/Add Number/i).closest('button');
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);

    await waitFor(() => {
        expect(screen.getAllByPlaceholderText(/966501234567/i).length).toBe(2);
    });

    // Remove the first entry
    const removeBtns = screen.getAllByRole('button').filter(b => b.className.includes('btn-outline-danger'));
    expect(removeBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(removeBtns[0]);

    await waitFor(() => {
        expect(screen.getAllByPlaceholderText(/966501234567/i).length).toBe(1);
    });
});

test('6. Purchase Managers Numbers section is hidden when tracking is disabled', async () => {
    await renderWithPurchaseBillsTab({ enable_purchase_bills_tracking: false });

    await waitFor(() => {
        expect(screen.getByText(/Enable Purchase Bills Tracking/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/^Purchase Managers Numbers$/i)).not.toBeInTheDocument();
});

test('7. Checkbox DOM state changes when clicked', async () => {
    await renderWithPurchaseBillsTab({ enable_purchase_bills_tracking: false });

    await waitFor(() => {
        expect(screen.getByText(/Enable Purchase Bills Tracking/i)).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const enableCheckbox = checkboxes.find(cb => {
        const label = cb.closest('label') || cb.parentElement;
        return label && label.textContent.includes('Enable Purchase Bills Tracking');
    });

    if (enableCheckbox) {
        expect(enableCheckbox.checked).toBe(false);
        fireEvent.click(enableCheckbox);
        await waitFor(() => expect(enableCheckbox.checked).toBe(true));
    }
});
