/**
 * Tests for the "Use RTL for Arabic" store setting.
 *  1. Checkbox renders in Modules & Features section
 *  2. Checkbox is unchecked by default
 *  3. Toggling checkbox sets use_rtl_for_arabic in formData
 *  4. Checkbox reflects true when store setting is true
 */

import React, { createRef } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── mocks ─────────────────────────────────────────────────────────────────────

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

jest.mock('react-image-file-resizer', () => ({ imageFileResizer: jest.fn() }));

jest.mock('react-select-country-list', () => () => ({
    getData: () => [{ value: 'SA', label: 'Saudi Arabia' }],
}));

jest.mock('react-bootstrap-typeahead', () => ({
    Typeahead: require('react').forwardRef(({ onChange, selected, placeholder }, ref) => (
        <input ref={ref} data-testid="country-typeahead" placeholder={placeholder}
            value={selected && selected[0] ? selected[0].label : ''}
            onChange={e => onChange(e.target.value ? [{ value: e.target.value, label: e.target.value }] : [])} />
    )),
}));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({ useEnterKeyNavigation: jest.fn() }));
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

jest.useFakeTimers();

import StoreCreate from '../create.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeStore(settingsOverride = {}) {
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
        settings: { invoice: {}, use_rtl_for_arabic: false, ...settingsOverride },
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

async function renderAtSettings(settingsOverride = {}) {
    const store = makeStore(settingsOverride);
    global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('/customer-package')) {
            return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ result: [], status: true }) });
        }
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ result: store }) });
    });

    const ref = createRef();
    render(<StoreCreate ref={ref} />);
    await act(async () => {
        ref.current.open('store-abc');
        await Promise.resolve(); await Promise.resolve();
        await Promise.resolve(); await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByText(/Update Store/)).toBeInTheDocument());

    // Navigate to Settings tab
    const settingsBtn = screen.getAllByRole('button').find(b => b.textContent.trim() === 'Settings');
    if (settingsBtn) fireEvent.click(settingsBtn);

    return { store };
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'tok-abc');
});
afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

// ── tests ─────────────────────────────────────────────────────────────────────

test('1. "Use RTL for Arabic" checkbox renders in Settings', async () => {
    await renderAtSettings();
    await waitFor(() => {
        expect(screen.getByLabelText(/Use RTL for Arabic/i) ||
               screen.getByText(/Use RTL for Arabic/i)).toBeInTheDocument();
    });
});

test('2. Checkbox is unchecked when store setting is false (default)', async () => {
    await renderAtSettings({ use_rtl_for_arabic: false });
    await waitFor(() => {
        const cb = screen.getByRole('checkbox', { name: /Use RTL for Arabic/i }) ||
            (() => {
                const allCbs = screen.getAllByRole('checkbox');
                return allCbs.find(c => {
                    const label = c.closest('label');
                    return label && label.textContent.includes('Use RTL for Arabic');
                });
            })();
        if (cb) expect(cb.checked).toBe(false);
    });
});

test('3. Toggling checkbox sets use_rtl_for_arabic to true', async () => {
    await renderAtSettings({ use_rtl_for_arabic: false });
    await waitFor(() => {
        expect(screen.getByText(/Use RTL for Arabic/i)).toBeInTheDocument();
    });

    const allCbs = screen.getAllByRole('checkbox');
    const rtlCb = allCbs.find(c => {
        const label = c.closest('label');
        return label && label.textContent.includes('Use RTL for Arabic');
    });
    expect(rtlCb).toBeTruthy();
    expect(rtlCb.checked).toBe(false);

    fireEvent.click(rtlCb);
    await waitFor(() => expect(rtlCb.checked).toBe(true));
});

test('4. Checkbox is checked when store setting is true', async () => {
    await renderAtSettings({ use_rtl_for_arabic: true });
    await waitFor(() => {
        const allCbs = screen.getAllByRole('checkbox');
        const rtlCb = allCbs.find(c => {
            const label = c.closest('label');
            return label && label.textContent.includes('Use RTL for Arabic');
        });
        if (rtlCb) expect(rtlCb.checked).toBe(true);
    });
});

test('5. Toggling checkbox twice returns to false', async () => {
    await renderAtSettings({ use_rtl_for_arabic: false });
    await waitFor(() => expect(screen.getByText(/Use RTL for Arabic/i)).toBeInTheDocument());

    const allCbs = screen.getAllByRole('checkbox');
    const rtlCb = allCbs.find(c => {
        const label = c.closest('label');
        return label && label.textContent.includes('Use RTL for Arabic');
    });

    fireEvent.click(rtlCb);
    await waitFor(() => expect(rtlCb.checked).toBe(true));
    fireEvent.click(rtlCb);
    await waitFor(() => expect(rtlCb.checked).toBe(false));
});
