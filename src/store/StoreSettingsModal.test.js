/**
 * Unit tests for StoreSettingsModal — all conditional rendering rules:
 *
 *  1.  Modal visibility (show / hide)
 *  2.  Data loading (spinner, fetch URL, auth header)
 *  3.  ZATCA phase gate — which phase card is shown
 *  4.  Phase cards contain only Sales & Sales Return (Purchase is separate)
 *  5.  Purchase Titles — separate card, always visible, phase-aware content
 *  6.  Non-VAT Sales groups gated by settings.non_vat_sales
 *  7.  Quotation Sales groups gated by settings.enable_sales_in_quotation
 *  8.  Purchase Order label gated by settings.enable_purchase_order_module
 *  9.  Stock Transfer label gated by settings.enable_warehouse_module
 * 10.  Combined module flag interactions
 * 11.  Always-visible document title fields (Quotation, Delivery Note, etc.)
 * 12.  Save — API call, flash messages
 * 13.  Tab navigation
 * 14.  General Info tab fields
 * 15.  National Address tab fields
 * 16.  Contact tab fields
 * 17.  Validation — required fields
 * 18.  Trim on save
 * 19.  ZATCA Reconnect Required banner
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── mocks (before subject import) ─────────────────────────────────────────────

jest.mock('react-bootstrap', () => {
    const Modal = ({ show, children }) =>
        show ? <div data-testid="ssm-modal">{children}</div> : null;
    Modal.Header = ({ children }) => <div>{children}</div>;
    Modal.Body   = ({ children }) => <div>{children}</div>;
    Modal.Footer = ({ children }) => <div>{children}</div>;
    const Button  = ({ children, onClick, disabled }) =>
        <button onClick={onClick} disabled={disabled}>{children}</button>;
    const Spinner = () => <span data-testid="spinner" />;
    return { Modal, Button, Spinner };
});

jest.mock('../utils/timezone.js', () => ({
    toStoreLocalDate:   jest.fn(() => null),
    fromStoreLocalDate: jest.fn(() => null),
}));

jest.mock('./zatca_connect.js', () =>
    // eslint-disable-next-line react/display-name
    require('react').forwardRef((_props, _ref) => null)
);

jest.mock('react-bootstrap-typeahead', () => ({
    Typeahead: ({ onChange, selected, placeholder }) => (
        <input
            data-testid="country-typeahead"
            placeholder={placeholder}
            value={selected && selected[0] ? selected[0].label : ''}
            onChange={e => onChange(e.target.value ? [{ value: e.target.value, label: e.target.value }] : [])}
        />
    ),
}));

jest.mock('react-select-country-list', () => () => ({
    getData: () => [
        { value: 'SA', label: 'Saudi Arabia' },
        { value: 'AE', label: 'United Arab Emirates' },
        { value: 'US', label: 'United States' },
    ],
}));

import StoreSettingsModal from './StoreSettingsModal';

// ── fixture helpers ───────────────────────────────────────────────────────────

function deepMerge(base, override) {
    const out = { ...base };
    const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
    for (const k of Object.keys(override || {})) {
        out[k] = isObj(override[k]) && isObj(out[k])
            ? deepMerge(out[k], override[k])
            : override[k];
    }
    return out;
}

function makeStore(overrides = {}) {
    return deepMerge({
        id: 'store-1',
        name: 'Test Company Ltd',
        name_in_arabic: 'شركة الاختبار',
        code: 'BRANCH-01',
        branch_name: 'Main Branch',
        registration_number: 'CRN001',
        vat_no: '300000000000003',
        vat_percent: 15,
        phone: '+966500000000',
        email: 'test@example.com',
        country_code: 'SA',
        currency_code: 'SAR',
        national_address: {
            building_no: '1234',
            street_name: 'King Road',
            street_name_arabic: '',
            district_name: 'Al-Olaya',
            district_name_arabic: '',
            city_name: 'Riyadh',
            city_name_arabic: '',
            zipcode: '12345',
        },
        zatca: { phase: '1' },
        bank_account: { bank_name: '', customer_no: '', iban: '', account_name: '', account_no: '' },
        settings: {
            non_vat_sales:                false,
            enable_sales_in_quotation:    false,
            enable_purchase_order_module: false,
            enable_warehouse_module:      false,
            cash_opening_balance:         100,
            cash_opening_balance_date:    null,
            bank_opening_balance:         200,
            bank_opening_balance_date:    null,
            invoice: {
                phase1: {
                    sales_titles:           { paid: 'P1-S-Paid',   credit: 'P1-S-Cred',   cash: 'P1-S-Cash'   },
                    sales_return_titles:    { paid: 'P1-SR-Paid',  credit: 'P1-SR-Cred',  cash: 'P1-SR-Cash'  },
                    purchase_titles:        { paid: 'P1-P-Paid',   credit: 'P1-P-Cred',   cash: 'P1-P-Cash'   },
                    purchase_return_titles: { paid: 'P1-PR-Paid',  credit: 'P1-PR-Cred',  cash: 'P1-PR-Cash'  },
                },
                phase2: {
                    sales_titles:           { paid: 'P2-S-Paid',   credit: 'P2-S-Cred',   cash: 'P2-S-Cash'   },
                    sales_return_titles:    { paid: 'P2-SR-Paid',  credit: 'P2-SR-Cred',  cash: 'P2-SR-Cash'  },
                    purchase_titles:        { paid: 'P2-P-Paid',   credit: 'P2-P-Cred',   cash: 'P2-P-Cash'   },
                    purchase_return_titles: { paid: 'P2-PR-Paid',  credit: 'P2-PR-Cred',  cash: 'P2-PR-Cash'  },
                },
                phase2_b2b: {
                    sales_titles:           { paid: 'B2B-S-Paid',  credit: 'B2B-S-Cred',  cash: 'B2B-S-Cash'  },
                    sales_return_titles:    { paid: 'B2B-SR-Paid', credit: 'B2B-SR-Cred', cash: 'B2B-SR-Cash' },
                    purchase_titles:        { paid: 'B2B-P-Paid',  credit: 'B2B-P-Cred',  cash: 'B2B-P-Cash'  },
                    purchase_return_titles: { paid: 'B2B-PR-Paid', credit: 'B2B-PR-Cred', cash: 'B2B-PR-Cash' },
                },
                quotation_title:               'Quotation',
                delivery_note_title:           'Delivery Note',
                stock_transfer_title:          'Stock Transfer',
                purchase_order_title:          'Purchase Order',
                payable_title:                 'Payable',
                receivable_title:              'Receivable',
                quotation_sales_titles:        { paid: 'QS-Paid',  credit: 'QS-Cred',  cash: 'QS-Cash'  },
                quotation_sales_return_titles: { paid: 'QSR-Paid', credit: 'QSR-Cred', cash: 'QSR-Cash' },
                non_vat_sales_titles:          { paid: 'NV-Paid',  credit: 'NV-Cred',  cash: 'NV-Cash'  },
                non_vat_sales_return_titles:   { paid: 'NVR-Paid', credit: 'NVR-Cred', cash: 'NVR-Cash' },
            },
        },
    }, overrides);
}

function stubFetch(store, { loadOk = true, saveOk = true } = {}) {
    global.fetch = jest.fn()
        .mockResolvedValueOnce({
            ok:   loadOk,
            json: jest.fn().mockResolvedValue(loadOk ? { result: store } : { errors: {} }),
        })
        .mockResolvedValue({
            ok:   saveOk,
            json: jest.fn().mockResolvedValue(saveOk ? { result: store } : { errors: {} }),
        });
}

// Renders the modal and waits until store data is loaded.
// Default active tab is 'general'; this helper navigates to 'invoice_titles'
// so that legacy tests (3-12) that assert invoice tab content still pass.
async function renderLoaded(storeOverrides = {}) {
    const store = makeStore(storeOverrides);
    stubFetch(store);
    const onHide = jest.fn();
    render(<StoreSettingsModal show={true} onHide={onHide} />);
    // Wait for General Info tab to load (default tab)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Info' })).toBeInTheDocument());
    // Navigate to Invoice Titles so legacy tests still see PURCHASE TITLES
    const invoiceBtn = screen.getAllByRole('button').find(b => b.textContent.trim() === 'Invoice Titles');
    fireEvent.click(invoiceBtn);
    await waitFor(() => expect(screen.getByText('PURCHASE TITLES')).toBeInTheDocument());
    return { onHide, store };
}

// Renders the modal and waits until General Info tab is loaded (does NOT navigate away).
async function renderOnGeneral(storeOverrides = {}) {
    const store = makeStore(storeOverrides);
    stubFetch(store);
    const onHide = jest.fn();
    render(<StoreSettingsModal show={true} onHide={onHide} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Info' })).toBeInTheDocument());
    return { onHide, store };
}

// ── setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
    localStorage.setItem('store_id',     'store-1');
    localStorage.setItem('access_token', 'tok-abc');
    localStorage.setItem('store_name',   'Test Store');
    global.fetch = jest.fn(); // default no-op so show=false tests don't crash
});

afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Modal visibility
// ═══════════════════════════════════════════════════════════════════════════════

describe('1. Modal visibility', () => {
    test('1.1  show=false → modal not mounted', () => {
        render(<StoreSettingsModal show={false} onHide={jest.fn()} />);
        expect(screen.queryByTestId('ssm-modal')).not.toBeInTheDocument();
    });

    test('1.2  show=true → modal mounted', async () => {
        const store = makeStore();
        stubFetch(store);
        render(<StoreSettingsModal show={true} onHide={jest.fn()} />);
        expect(screen.getByTestId('ssm-modal')).toBeInTheDocument();
    });

    test('1.3  show=false → no fetch issued', () => {
        render(<StoreSettingsModal show={false} onHide={jest.fn()} />);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('1.4  store name from localStorage shown in header', async () => {
        await renderLoaded();
        expect(screen.getByText('Test Store')).toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Data loading
// ═══════════════════════════════════════════════════════════════════════════════

describe('2. Data loading', () => {
    test('2.1  fetch called with correct store URL', async () => {
        await renderLoaded();
        expect(global.fetch.mock.calls[0][0]).toBe('/v1/store/store-1');
    });

    test('2.2  Authorization header carries access token', async () => {
        await renderLoaded();
        const [, opts] = global.fetch.mock.calls[0];
        expect(opts.headers.Authorization).toBe('tok-abc');
    });

    test('2.3  loading spinner shown while fetch is pending', async () => {
        const store = makeStore();
        let resolveFetch;
        global.fetch = jest.fn().mockReturnValue(
            new Promise(resolve => { resolveFetch = resolve; })
        );
        render(<StoreSettingsModal show={true} onHide={jest.fn()} />);
        await waitFor(() =>
            expect(screen.getByText('Loading store data…')).toBeInTheDocument()
        );
        resolveFetch({ ok: true, json: () => Promise.resolve({ result: store }) });
    });

    test('2.4  content visible after fetch resolves', async () => {
        await renderLoaded();
        expect(screen.getByText('PURCHASE TITLES')).toBeInTheDocument();
    });

    test('2.5  no content rendered while loading (formData is null)', async () => {
        const store = makeStore();
        let resolveFetch;
        global.fetch = jest.fn().mockReturnValue(
            new Promise(resolve => { resolveFetch = resolve; })
        );
        render(<StoreSettingsModal show={true} onHide={jest.fn()} />);
        await waitFor(() => screen.getByText('Loading store data…'));
        expect(screen.queryByText('PURCHASE TITLES')).not.toBeInTheDocument();
        resolveFetch({ ok: true, json: () => Promise.resolve({ result: store }) });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ZATCA phase gate — card visibility
// ═══════════════════════════════════════════════════════════════════════════════

describe('3. ZATCA phase gate — card visibility', () => {
    test('3.1  phase "1" → ZATCA PHASE 1 badge visible', async () => {
        await renderLoaded({ zatca: { phase: '1' } });
        expect(screen.getByText('ZATCA PHASE 1')).toBeInTheDocument();
    });

    test('3.2  phase "1" → ZATCA PHASE 2 · B2C badge NOT shown', async () => {
        await renderLoaded({ zatca: { phase: '1' } });
        expect(screen.queryByText('ZATCA PHASE 2 · B2C')).not.toBeInTheDocument();
    });

    test('3.3  phase "1" → ZATCA PHASE 2 · B2B badge NOT shown', async () => {
        await renderLoaded({ zatca: { phase: '1' } });
        expect(screen.queryByText('ZATCA PHASE 2 · B2B')).not.toBeInTheDocument();
    });

    test('3.4  phase "2" → ZATCA PHASE 2 · B2C badge visible', async () => {
        await renderLoaded({ zatca: { phase: '2' } });
        expect(screen.getByText('ZATCA PHASE 2 · B2C')).toBeInTheDocument();
    });

    test('3.5  phase "2" → ZATCA PHASE 2 · B2B badge visible', async () => {
        await renderLoaded({ zatca: { phase: '2' } });
        expect(screen.getByText('ZATCA PHASE 2 · B2B')).toBeInTheDocument();
    });

    test('3.6  phase "2" → ZATCA PHASE 1 badge NOT shown', async () => {
        await renderLoaded({ zatca: { phase: '2' } });
        expect(screen.queryByText('ZATCA PHASE 1')).not.toBeInTheDocument();
    });

    test('3.7  zatca=undefined → Phase 1 behaviour (Phase 1 badge shown)', async () => {
        await renderLoaded({ zatca: undefined });
        expect(screen.getByText('ZATCA PHASE 1')).toBeInTheDocument();
    });

    test('3.8  zatca.phase=undefined → Phase 1 behaviour', async () => {
        await renderLoaded({ zatca: { phase: undefined } });
        expect(screen.getByText('ZATCA PHASE 1')).toBeInTheDocument();
        expect(screen.queryByText('ZATCA PHASE 2 · B2C')).not.toBeInTheDocument();
    });

    test('3.9  zatca.phase=null → Phase 1 behaviour (null !== "2")', async () => {
        await renderLoaded({ zatca: { phase: null } });
        expect(screen.getByText('ZATCA PHASE 1')).toBeInTheDocument();
        expect(screen.queryByText('ZATCA PHASE 2 · B2C')).not.toBeInTheDocument();
    });

    test('3.10  phase "2" → exactly two Phase 2 cards (B2C and B2B)', async () => {
        await renderLoaded({ zatca: { phase: '2' } });
        expect(screen.getByText('ZATCA PHASE 2 · B2C')).toBeInTheDocument();
        expect(screen.getByText('ZATCA PHASE 2 · B2B')).toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Phase cards contain only Sales & Sales Return (Purchase is separate)
// ═══════════════════════════════════════════════════════════════════════════════

describe('4. Phase card content — Sales & Sales Return only', () => {
    test('4.1  phase "1": "Purchase · B2C" group NOT in DOM', async () => {
        await renderLoaded({ zatca: { phase: '1' } });
        expect(screen.queryByText('Purchase · B2C')).not.toBeInTheDocument();
    });

    test('4.2  phase "1": "Purchase Return · B2C" group NOT in DOM', async () => {
        await renderLoaded({ zatca: { phase: '1' } });
        expect(screen.queryByText('Purchase Return · B2C')).not.toBeInTheDocument();
    });

    test('4.3  phase "1": "Purchase · B2B" group NOT in DOM', async () => {
        await renderLoaded({ zatca: { phase: '1' } });
        expect(screen.queryByText('Purchase · B2B')).not.toBeInTheDocument();
    });

    test('4.4  phase "2": "Purchase · B2C" group IS in DOM (in the separate Purchase Titles card)', async () => {
        await renderLoaded({ zatca: { phase: '2' } });
        expect(screen.getByText('Purchase · B2C')).toBeInTheDocument();
    });

    test('4.5  phase "2": "Purchase Return · B2C" group IS in DOM', async () => {
        await renderLoaded({ zatca: { phase: '2' } });
        expect(screen.getByText('Purchase Return · B2C')).toBeInTheDocument();
    });

    test('4.6  phase "2": "Purchase · B2B" group IS in DOM', async () => {
        await renderLoaded({ zatca: { phase: '2' } });
        expect(screen.getByText('Purchase · B2B')).toBeInTheDocument();
    });

    test('4.7  phase "2": "Purchase Return · B2B" group IS in DOM', async () => {
        await renderLoaded({ zatca: { phase: '2' } });
        expect(screen.getByText('Purchase Return · B2B')).toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Purchase Titles — separate card, always visible, phase-aware content
// ═══════════════════════════════════════════════════════════════════════════════

describe('5. Purchase Titles card', () => {
    test('5.1  PURCHASE TITLES badge shown in Phase 1', async () => {
        await renderLoaded({ zatca: { phase: '1' } });
        expect(screen.getByText('PURCHASE TITLES')).toBeInTheDocument();
    });

    test('5.2  PURCHASE TITLES badge shown in Phase 2', async () => {
        await renderLoaded({ zatca: { phase: '2' } });
        expect(screen.getByText('PURCHASE TITLES')).toBeInTheDocument();
    });

    test('5.3  Phase 1: "Purchase" group title shown', async () => {
        await renderLoaded({ zatca: { phase: '1' } });
        expect(screen.getByText('Purchase')).toBeInTheDocument();
    });

    test('5.4  Phase 1: "Purchase Return" group title shown', async () => {
        await renderLoaded({ zatca: { phase: '1' } });
        expect(screen.getByText('Purchase Return')).toBeInTheDocument();
    });

    test('5.5  Phase 1: phase1 purchase input value rendered', async () => {
        await renderLoaded({ zatca: { phase: '1' } });
        expect(screen.getByDisplayValue('P1-P-Paid')).toBeInTheDocument();
    });

    test('5.6  Phase 1: phase1 purchase return input value rendered', async () => {
        await renderLoaded({ zatca: { phase: '1' } });
        expect(screen.getByDisplayValue('P1-PR-Paid')).toBeInTheDocument();
    });

    test('5.7  Phase 2: phase2 B2C purchase input value rendered', async () => {
        await renderLoaded({ zatca: { phase: '2' } });
        expect(screen.getByDisplayValue('P2-P-Paid')).toBeInTheDocument();
    });

    test('5.8  Phase 2: phase2_b2b purchase input value rendered', async () => {
        await renderLoaded({ zatca: { phase: '2' } });
        expect(screen.getByDisplayValue('B2B-P-Paid')).toBeInTheDocument();
    });

    test('5.9  Phase 1: phase2 purchase inputs NOT in DOM', async () => {
        await renderLoaded({ zatca: { phase: '1' } });
        expect(screen.queryByDisplayValue('P2-P-Paid')).not.toBeInTheDocument();
        expect(screen.queryByDisplayValue('B2B-P-Paid')).not.toBeInTheDocument();
    });

    test('5.10  Phase 2: phase1 purchase inputs NOT in DOM', async () => {
        await renderLoaded({ zatca: { phase: '2' } });
        expect(screen.queryByDisplayValue('P1-P-Paid')).not.toBeInTheDocument();
        expect(screen.queryByDisplayValue('P1-PR-Paid')).not.toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Non-VAT Sales — gated by settings.non_vat_sales
// ═══════════════════════════════════════════════════════════════════════════════

describe('6. Non-VAT Sales — settings.non_vat_sales gate', () => {
    test('6.1  non_vat_sales=false → "Non-VAT Sales" NOT shown', async () => {
        await renderLoaded({ settings: { non_vat_sales: false } });
        expect(screen.queryByText('Non-VAT Sales')).not.toBeInTheDocument();
    });

    test('6.2  non_vat_sales=false → "Non-VAT Sales Return" NOT shown', async () => {
        await renderLoaded({ settings: { non_vat_sales: false } });
        expect(screen.queryByText('Non-VAT Sales Return')).not.toBeInTheDocument();
    });

    test('6.3  non_vat_sales=true → "Non-VAT Sales" shown', async () => {
        await renderLoaded({ settings: { non_vat_sales: true } });
        expect(screen.getByText('Non-VAT Sales')).toBeInTheDocument();
    });

    test('6.4  non_vat_sales=true → "Non-VAT Sales Return" shown', async () => {
        await renderLoaded({ settings: { non_vat_sales: true } });
        expect(screen.getByText('Non-VAT Sales Return')).toBeInTheDocument();
    });

    test('6.5  non_vat_sales=true → Non-VAT paid input value present', async () => {
        await renderLoaded({ settings: { non_vat_sales: true } });
        expect(screen.getByDisplayValue('NV-Paid')).toBeInTheDocument();
    });

    test('6.6  non_vat_sales=true → Non-VAT return input value present', async () => {
        await renderLoaded({ settings: { non_vat_sales: true } });
        expect(screen.getByDisplayValue('NVR-Paid')).toBeInTheDocument();
    });

    test('6.7  non_vat_sales=undefined → treated as false (NOT shown)', async () => {
        await renderLoaded({ settings: { non_vat_sales: undefined } });
        expect(screen.queryByText('Non-VAT Sales')).not.toBeInTheDocument();
    });

    test('6.8  non_vat_sales=null → treated as false (NOT shown)', async () => {
        await renderLoaded({ settings: { non_vat_sales: null } });
        expect(screen.queryByText('Non-VAT Sales')).not.toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Quotation Sales — gated by settings.enable_sales_in_quotation
// ═══════════════════════════════════════════════════════════════════════════════

describe('7. Quotation Sales — settings.enable_sales_in_quotation gate', () => {
    test('7.1  enable_sales_in_quotation=false → "Quotation Sales" NOT shown', async () => {
        await renderLoaded({ settings: { enable_sales_in_quotation: false } });
        expect(screen.queryByText('Quotation Sales')).not.toBeInTheDocument();
    });

    test('7.2  enable_sales_in_quotation=false → "Quotation Sales Return" NOT shown', async () => {
        await renderLoaded({ settings: { enable_sales_in_quotation: false } });
        expect(screen.queryByText('Quotation Sales Return')).not.toBeInTheDocument();
    });

    test('7.3  enable_sales_in_quotation=true → "Quotation Sales" shown', async () => {
        await renderLoaded({ settings: { enable_sales_in_quotation: true } });
        expect(screen.getByText('Quotation Sales')).toBeInTheDocument();
    });

    test('7.4  enable_sales_in_quotation=true → "Quotation Sales Return" shown', async () => {
        await renderLoaded({ settings: { enable_sales_in_quotation: true } });
        expect(screen.getByText('Quotation Sales Return')).toBeInTheDocument();
    });

    test('7.5  enable_sales_in_quotation=true → QS paid input present', async () => {
        await renderLoaded({ settings: { enable_sales_in_quotation: true } });
        expect(screen.getByDisplayValue('QS-Paid')).toBeInTheDocument();
    });

    test('7.6  enable_sales_in_quotation=true → QSR paid input present', async () => {
        await renderLoaded({ settings: { enable_sales_in_quotation: true } });
        expect(screen.getByDisplayValue('QSR-Paid')).toBeInTheDocument();
    });

    test('7.7  enable_sales_in_quotation=undefined → treated as false (NOT shown)', async () => {
        await renderLoaded({ settings: { enable_sales_in_quotation: undefined } });
        expect(screen.queryByText('Quotation Sales')).not.toBeInTheDocument();
    });

    test('7.8  enable_sales_in_quotation=null → treated as false (NOT shown)', async () => {
        await renderLoaded({ settings: { enable_sales_in_quotation: null } });
        expect(screen.queryByText('Quotation Sales')).not.toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Purchase Order — gated by settings.enable_purchase_order_module
// ═══════════════════════════════════════════════════════════════════════════════

describe('8. Purchase Order title — settings.enable_purchase_order_module gate', () => {
    test('8.1  enable_purchase_order_module=false → "Purchase Order" label NOT shown', async () => {
        await renderLoaded({ settings: { enable_purchase_order_module: false } });
        expect(screen.queryByText('Purchase Order')).not.toBeInTheDocument();
    });

    test('8.2  enable_purchase_order_module=true → "Purchase Order" label shown', async () => {
        await renderLoaded({ settings: { enable_purchase_order_module: true } });
        expect(screen.getByText('Purchase Order')).toBeInTheDocument();
    });

    test('8.3  enable_purchase_order_module=true → Purchase Order input value present', async () => {
        await renderLoaded({ settings: { enable_purchase_order_module: true } });
        expect(screen.getByDisplayValue('Purchase Order')).toBeInTheDocument();
    });

    test('8.4  enable_purchase_order_module=undefined → treated as false (NOT shown)', async () => {
        await renderLoaded({ settings: { enable_purchase_order_module: undefined } });
        expect(screen.queryByText('Purchase Order')).not.toBeInTheDocument();
    });

    test('8.5  enable_purchase_order_module=null → treated as false (NOT shown)', async () => {
        await renderLoaded({ settings: { enable_purchase_order_module: null } });
        expect(screen.queryByText('Purchase Order')).not.toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Stock Transfer — gated by settings.enable_warehouse_module
// ═══════════════════════════════════════════════════════════════════════════════

describe('9. Stock Transfer title — settings.enable_warehouse_module gate', () => {
    test('9.1  enable_warehouse_module=false → "Stock Transfer" label NOT shown', async () => {
        await renderLoaded({ settings: { enable_warehouse_module: false } });
        expect(screen.queryByText('Stock Transfer')).not.toBeInTheDocument();
    });

    test('9.2  enable_warehouse_module=true → "Stock Transfer" label shown', async () => {
        await renderLoaded({ settings: { enable_warehouse_module: true } });
        expect(screen.getByText('Stock Transfer')).toBeInTheDocument();
    });

    test('9.3  enable_warehouse_module=true → Stock Transfer input value present', async () => {
        await renderLoaded({ settings: { enable_warehouse_module: true } });
        expect(screen.getByDisplayValue('Stock Transfer')).toBeInTheDocument();
    });

    test('9.4  enable_warehouse_module=undefined → treated as false (NOT shown)', async () => {
        await renderLoaded({ settings: { enable_warehouse_module: undefined } });
        expect(screen.queryByText('Stock Transfer')).not.toBeInTheDocument();
    });

    test('9.5  enable_warehouse_module=null → treated as false (NOT shown)', async () => {
        await renderLoaded({ settings: { enable_warehouse_module: null } });
        expect(screen.queryByText('Stock Transfer')).not.toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Combined module flag interactions
// ═══════════════════════════════════════════════════════════════════════════════

describe('10. Combined module flag interactions', () => {
    test('10.1  all modules disabled → none of the gated fields appear', async () => {
        await renderLoaded({
            settings: {
                non_vat_sales: false, enable_sales_in_quotation: false,
                enable_purchase_order_module: false, enable_warehouse_module: false,
            },
        });
        expect(screen.queryByText('Non-VAT Sales')).not.toBeInTheDocument();
        expect(screen.queryByText('Quotation Sales')).not.toBeInTheDocument();
        expect(screen.queryByText('Purchase Order')).not.toBeInTheDocument();
        expect(screen.queryByText('Stock Transfer')).not.toBeInTheDocument();
    });

    test('10.2  all modules enabled → all gated fields appear', async () => {
        await renderLoaded({
            settings: {
                non_vat_sales: true, enable_sales_in_quotation: true,
                enable_purchase_order_module: true, enable_warehouse_module: true,
            },
        });
        expect(screen.getByText('Non-VAT Sales')).toBeInTheDocument();
        expect(screen.getByText('Quotation Sales')).toBeInTheDocument();
        expect(screen.getByText('Purchase Order')).toBeInTheDocument();
        expect(screen.getByText('Stock Transfer')).toBeInTheDocument();
    });

    test('10.3  only non_vat_sales → only Non-VAT groups appear, rest hidden', async () => {
        await renderLoaded({
            settings: {
                non_vat_sales: true, enable_sales_in_quotation: false,
                enable_purchase_order_module: false, enable_warehouse_module: false,
            },
        });
        expect(screen.getByText('Non-VAT Sales')).toBeInTheDocument();
        expect(screen.queryByText('Quotation Sales')).not.toBeInTheDocument();
        expect(screen.queryByText('Purchase Order')).not.toBeInTheDocument();
        expect(screen.queryByText('Stock Transfer')).not.toBeInTheDocument();
    });

    test('10.4  only enable_sales_in_quotation → only Quotation Sales groups appear', async () => {
        await renderLoaded({
            settings: {
                non_vat_sales: false, enable_sales_in_quotation: true,
                enable_purchase_order_module: false, enable_warehouse_module: false,
            },
        });
        expect(screen.queryByText('Non-VAT Sales')).not.toBeInTheDocument();
        expect(screen.getByText('Quotation Sales')).toBeInTheDocument();
        expect(screen.queryByText('Purchase Order')).not.toBeInTheDocument();
        expect(screen.queryByText('Stock Transfer')).not.toBeInTheDocument();
    });

    test('10.5  only enable_purchase_order_module → only Purchase Order label appears', async () => {
        await renderLoaded({
            settings: {
                non_vat_sales: false, enable_sales_in_quotation: false,
                enable_purchase_order_module: true, enable_warehouse_module: false,
            },
        });
        expect(screen.queryByText('Non-VAT Sales')).not.toBeInTheDocument();
        expect(screen.queryByText('Quotation Sales')).not.toBeInTheDocument();
        expect(screen.getByText('Purchase Order')).toBeInTheDocument();
        expect(screen.queryByText('Stock Transfer')).not.toBeInTheDocument();
    });

    test('10.6  only enable_warehouse_module → only Stock Transfer label appears', async () => {
        await renderLoaded({
            settings: {
                non_vat_sales: false, enable_sales_in_quotation: false,
                enable_purchase_order_module: false, enable_warehouse_module: true,
            },
        });
        expect(screen.queryByText('Non-VAT Sales')).not.toBeInTheDocument();
        expect(screen.queryByText('Quotation Sales')).not.toBeInTheDocument();
        expect(screen.queryByText('Purchase Order')).not.toBeInTheDocument();
        expect(screen.getByText('Stock Transfer')).toBeInTheDocument();
    });

    test('10.7  Phase 2 + all modules disabled → still only Phase 2 cards, no gated fields', async () => {
        await renderLoaded({
            zatca: { phase: '2' },
            settings: {
                non_vat_sales: false, enable_sales_in_quotation: false,
                enable_purchase_order_module: false, enable_warehouse_module: false,
            },
        });
        expect(screen.getByText('ZATCA PHASE 2 · B2C')).toBeInTheDocument();
        expect(screen.queryByText('ZATCA PHASE 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Non-VAT Sales')).not.toBeInTheDocument();
        expect(screen.queryByText('Stock Transfer')).not.toBeInTheDocument();
    });

    test('10.8  Phase 2 + all modules enabled → Phase 2 cards + all gated fields', async () => {
        await renderLoaded({
            zatca: { phase: '2' },
            settings: {
                non_vat_sales: true, enable_sales_in_quotation: true,
                enable_purchase_order_module: true, enable_warehouse_module: true,
            },
        });
        expect(screen.getByText('ZATCA PHASE 2 · B2C')).toBeInTheDocument();
        expect(screen.getByText('Non-VAT Sales')).toBeInTheDocument();
        expect(screen.getByText('Quotation Sales')).toBeInTheDocument();
        expect(screen.getByText('Purchase Order')).toBeInTheDocument();
        expect(screen.getByText('Stock Transfer')).toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. Always-visible document title fields
// ═══════════════════════════════════════════════════════════════════════════════

describe('11. Always-visible document title fields', () => {
    test('11.1  "Quotation" label always shown (not gated)', async () => {
        await renderLoaded();
        expect(screen.getByText('Quotation')).toBeInTheDocument();
    });

    test('11.2  "Delivery Note" label always shown', async () => {
        await renderLoaded();
        expect(screen.getByText('Delivery Note')).toBeInTheDocument();
    });

    test('11.3  "Payable" label always shown', async () => {
        await renderLoaded();
        expect(screen.getByText('Payable')).toBeInTheDocument();
    });

    test('11.4  "Receivable" label always shown', async () => {
        await renderLoaded();
        expect(screen.getByText('Receivable')).toBeInTheDocument();
    });

    test('11.5  "OTHER INVOICE TITLES" badge always shown', async () => {
        await renderLoaded();
        expect(screen.getByText('OTHER INVOICE TITLES')).toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. Save — API call and flash messages
// ═══════════════════════════════════════════════════════════════════════════════

describe('12. Save — API call and flash messages', () => {
    test('12.1  Save sends PUT to correct URL', async () => {
        await renderLoaded();
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'PUT');
            expect(putCall).toBeDefined();
            expect(putCall[0]).toBe('/v1/store/store-1');
        });
    });

    test('12.2  PUT includes Authorization header', async () => {
        await renderLoaded();
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'PUT');
            expect(putCall[1].headers.Authorization).toBe('tok-abc');
        });
    });

    test('12.3  PUT body is valid JSON', async () => {
        await renderLoaded();
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'PUT');
            expect(() => JSON.parse(putCall[1].body)).not.toThrow();
        });
    });

    test('12.4  success flash shown after successful save', async () => {
        await renderLoaded();
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() =>
            expect(screen.getByText('Store settings saved successfully!')).toBeInTheDocument()
        );
    });

    test('12.5  error flash shown when server returns non-ok response', async () => {
        const store = makeStore();
        stubFetch(store, { saveOk: false });
        render(<StoreSettingsModal show={true} onHide={jest.fn()} />);
        await waitFor(() =>
            expect(screen.getByRole('heading', { name: 'General Info' })).toBeInTheDocument()
        );
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() =>
            expect(screen.getByText('Failed to save. Please check your inputs.')).toBeInTheDocument()
        );
    });

    test('12.6  error flash shown on network error (fetch rejects)', async () => {
        const store = makeStore();
        global.fetch = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ result: store }) })
            .mockRejectedValueOnce(new Error('Network failure'));
        render(<StoreSettingsModal show={true} onHide={jest.fn()} />);
        await waitFor(() =>
            expect(screen.getByRole('heading', { name: 'General Info' })).toBeInTheDocument()
        );
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() =>
            expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument()
        );
    });

    test('12.7  save button disabled while saving is in progress', async () => {
        let resolveSave;
        const store = makeStore();
        global.fetch = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ result: store }) })
            .mockReturnValueOnce(new Promise(resolve => { resolveSave = resolve; }));
        render(<StoreSettingsModal show={true} onHide={jest.fn()} />);
        await waitFor(() =>
            expect(screen.getByRole('heading', { name: 'General Info' })).toBeInTheDocument()
        );
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() =>
            expect(screen.getAllByText('Saving…')[0]).toBeInTheDocument()
        );
        const saveBtn = screen.getAllByText('Saving…')[0].closest('button');
        expect(saveBtn).toBeDisabled();
        resolveSave({ ok: true, json: jest.fn().mockResolvedValue({ result: store }) });
    });

    test('12.8  no PUT issued when store_id is missing from localStorage', async () => {
        localStorage.removeItem('store_id');
        const store = makeStore();
        stubFetch(store);
        render(<StoreSettingsModal show={true} onHide={jest.fn()} />);
        // Component will not load (no store_id), but even if it did we click save
        fireEvent.click(screen.queryAllByText('Save Changes')[0] || document.body);
        // fetch should only have been called zero times (no load, no save)
        expect(global.fetch.mock.calls.filter(([, o]) => o?.method === 'PUT')).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 13. Tab navigation
// ═══════════════════════════════════════════════════════════════════════════════

describe('13. Tab navigation', () => {
    test('13.1  General Info tab shown by default after load (section header visible)', async () => {
        await renderOnGeneral();
        expect(screen.getByRole('heading', { name: 'General Info' })).toBeInTheDocument();
    });

    test('13.2  clicking "National Address" tab shows National Address content', async () => {
        await renderOnGeneral();
        const btn = screen.getAllByRole('button').find(b => b.textContent.trim() === 'National Address');
        fireEvent.click(btn);
        await waitFor(() => expect(screen.getByText('Building Number (4 digits)*')).toBeInTheDocument());
    });

    test('13.3  clicking "Contact" tab shows Contact content', async () => {
        await renderOnGeneral();
        const btn = screen.getAllByRole('button').find(b => b.textContent.trim() === 'Contact');
        fireEvent.click(btn);
        await waitFor(() => expect(screen.getByText('Phone*')).toBeInTheDocument());
    });

    test('13.4  clicking "Invoice Titles" tab shows Invoice Titles content', async () => {
        await renderOnGeneral();
        const btn = screen.getAllByRole('button').find(b => b.textContent.trim() === 'Invoice Titles');
        fireEvent.click(btn);
        await waitFor(() => expect(screen.getByText('PURCHASE TITLES')).toBeInTheDocument());
    });

    test('13.5  clicking back to "General Info" from another tab shows General Info', async () => {
        await renderOnGeneral();
        // Navigate away first
        const addrBtn = screen.getAllByRole('button').find(b => b.textContent.trim() === 'National Address');
        fireEvent.click(addrBtn);
        await waitFor(() => expect(screen.getByText('Building Number (4 digits)*')).toBeInTheDocument());
        // Navigate back
        const genBtn = screen.getAllByRole('button').find(b => b.textContent.trim() === 'General Info');
        fireEvent.click(genBtn);
        await waitFor(() => expect(screen.getByRole('heading', { name: 'General Info' })).toBeInTheDocument());
    });

    test('13.6  sidebar shows all 6 tab labels: General Info, National Address, Contact, Invoice Titles, Bank Account, Opening Balances', async () => {
        await renderOnGeneral();
        const btns = screen.getAllByRole('button');
        const tabLabels = ['General Info', 'National Address', 'Contact', 'Invoice Titles', 'Bank Account', 'Opening Balances'];
        for (const label of tabLabels) {
            expect(btns.some(b => b.textContent.trim() === label)).toBe(true);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 14. General Info tab fields
// ═══════════════════════════════════════════════════════════════════════════════

describe('14. General Info tab fields', () => {
    test('14.1  "Registered Company Name" label visible on general tab', async () => {
        await renderOnGeneral();
        // Field renders: <label>text<span> *</span></label>
        // RTL getByText can't match text split across child elements; use a function matcher.
        expect(
            screen.getByText((_, el) =>
                el?.tagName === 'LABEL' && el.textContent.trim() === 'Registered Company Name *'
            )
        ).toBeInTheDocument();
    });

    test('14.2  "Branch Code" label visible on general tab', async () => {
        await renderOnGeneral();
        expect(
            screen.getByText((_, el) =>
                el?.tagName === 'LABEL' && el.textContent.trim() === 'Branch Code *'
            )
        ).toBeInTheDocument();
    });

    test('14.3  "VAT NO. (15 digits)" label visible on general tab', async () => {
        await renderOnGeneral();
        expect(
            screen.getByText((_, el) =>
                el?.tagName === 'LABEL' && el.textContent.trim() === 'VAT NO. (15 digits) *'
            )
        ).toBeInTheDocument();
    });

    test('14.4  Business Category select visible on general tab', async () => {
        await renderOnGeneral();
        expect(screen.getByText('Business Category*')).toBeInTheDocument();
    });

    test('14.5  store.name value appears in the name input', async () => {
        await renderOnGeneral({ name: 'Unique Name ABC' });
        expect(screen.getByDisplayValue('Unique Name ABC')).toBeInTheDocument();
    });

    test('14.6  store.code value appears in the code input', async () => {
        await renderOnGeneral({ code: 'UNIQUE-CODE-XYZ' });
        expect(screen.getByDisplayValue('UNIQUE-CODE-XYZ')).toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 15. National Address tab fields
// ═══════════════════════════════════════════════════════════════════════════════

describe('15. National Address tab fields', () => {
    async function renderOnAddress(storeOverrides = {}) {
        await renderOnGeneral(storeOverrides);
        const btn = screen.getAllByRole('button').find(b => b.textContent.trim() === 'National Address');
        fireEvent.click(btn);
        await waitFor(() => expect(screen.getByText('Building Number (4 digits)*')).toBeInTheDocument());
    }

    test('15.1  "Building Number (4 digits)*" label visible on address tab', async () => {
        await renderOnAddress();
        expect(screen.getByText('Building Number (4 digits)*')).toBeInTheDocument();
    });

    test('15.2  "Street Name*" label visible on address tab', async () => {
        await renderOnAddress();
        expect(screen.getByText('Street Name*')).toBeInTheDocument();
    });

    test('15.3  "Zipcode (5 digits)*" label visible on address tab', async () => {
        await renderOnAddress();
        expect(screen.getByText('Zipcode (5 digits)*')).toBeInTheDocument();
    });

    test('15.4  Country typeahead visible on address tab', async () => {
        await renderOnAddress();
        expect(screen.getByTestId('country-typeahead')).toBeInTheDocument();
    });

    test('15.5  store.national_address.street_name value appears in the input', async () => {
        await renderOnAddress({ national_address: { street_name: 'King Road' } });
        expect(screen.getByDisplayValue('King Road')).toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 16. Contact tab fields
// ═══════════════════════════════════════════════════════════════════════════════

describe('16. Contact tab fields', () => {
    async function renderOnContact(storeOverrides = {}) {
        await renderOnGeneral(storeOverrides);
        const btn = screen.getAllByRole('button').find(b => b.textContent.trim() === 'Contact');
        fireEvent.click(btn);
        await waitFor(() => expect(screen.getByText('Phone*')).toBeInTheDocument());
    }

    test('16.1  "Phone*" label visible on contact tab', async () => {
        await renderOnContact();
        expect(screen.getByText('Phone*')).toBeInTheDocument();
    });

    test('16.2  "Email*" label visible on contact tab', async () => {
        await renderOnContact();
        expect(screen.getByText('Email*')).toBeInTheDocument();
    });

    test('16.3  store.phone value appears in the phone input', async () => {
        await renderOnContact({ phone: '+966500000000' });
        expect(screen.getByDisplayValue('+966500000000')).toBeInTheDocument();
    });

    test('16.4  store.email value appears in the email input', async () => {
        await renderOnContact({ email: 'contact@example.com' });
        expect(screen.getByDisplayValue('contact@example.com')).toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 17. Validation — required fields
// ═══════════════════════════════════════════════════════════════════════════════

describe('17. Validation — required fields', () => {
    test('17.1  missing name → error "Registered Company Name is required" shown', async () => {
        await renderOnGeneral({ name: '' });
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() =>
            expect(screen.getByText('Registered Company Name is required')).toBeInTheDocument()
        );
    });

    test('17.2  missing name_in_arabic → error "Registered Company Name in Arabic is required" shown', async () => {
        await renderOnGeneral({ name_in_arabic: '' });
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() =>
            expect(screen.getByText('Registered Company Name in Arabic is required')).toBeInTheDocument()
        );
    });

    test('17.3  missing code → error "Branch Code is required" shown', async () => {
        await renderOnGeneral({ code: '' });
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() =>
            expect(screen.getByText('Branch Code is required')).toBeInTheDocument()
        );
    });

    test('17.4  missing branch_name → error "Branch Name is required" shown', async () => {
        await renderOnGeneral({ branch_name: '' });
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() =>
            expect(screen.getByText('Branch Name is required')).toBeInTheDocument()
        );
    });

    test('17.5  missing registration_number → error "Registration Number (CRN) is required" shown', async () => {
        await renderOnGeneral({ registration_number: '' });
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() =>
            expect(screen.getByText('Registration Number (CRN) is required')).toBeInTheDocument()
        );
    });

    test('17.6  missing vat_no → error "VAT No. is required" shown', async () => {
        await renderOnGeneral({ vat_no: '' });
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() =>
            expect(screen.getByText('VAT No. is required')).toBeInTheDocument()
        );
    });

    test('17.7  missing phone → error "Phone is required" shown in error summary', async () => {
        await renderOnGeneral({ phone: '' });
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() =>
            expect(screen.getByText('Phone is required')).toBeInTheDocument()
        );
    });

    test('17.8  missing email → error "Email is required" shown in error summary', async () => {
        await renderOnGeneral({ email: '' });
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() =>
            expect(screen.getByText('Email is required')).toBeInTheDocument()
        );
    });

    test('17.9  missing national_address.building_no → error "Building Number is required" shown', async () => {
        await renderOnGeneral({ national_address: { building_no: '' } });
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() =>
            expect(screen.getByText('Building Number is required')).toBeInTheDocument()
        );
    });

    test('17.10  all required fields present → no validation errors, PUT is called', async () => {
        await renderOnGeneral();
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'PUT');
            expect(putCall).toBeDefined();
        });
        // No validation error messages shown
        expect(screen.queryByText('Registered Company Name is required')).not.toBeInTheDocument();
        expect(screen.queryByText('Phone is required')).not.toBeInTheDocument();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 18. Trim on save
// ═══════════════════════════════════════════════════════════════════════════════

describe('18. Trim on save', () => {
    test('18.1  trailing spaces in name are trimmed before PUT', async () => {
        await renderOnGeneral({ name: 'Test Co   ' });
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'PUT');
            expect(putCall).toBeDefined();
            const body = JSON.parse(putCall[1].body);
            expect(body.name).toBe('Test Co');
        });
    });

    test('18.2  trailing spaces in national_address.street_name are trimmed before PUT', async () => {
        await renderOnGeneral({ national_address: { street_name: 'King Road   ' } });
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'PUT');
            expect(putCall).toBeDefined();
            const body = JSON.parse(putCall[1].body);
            expect(body.national_address.street_name).toBe('King Road');
        });
    });

    test('18.3  all string values have trimEnd() applied (PUT body has no trailing spaces)', async () => {
        await renderOnGeneral({ name: 'Acme Corp   ', code: 'B-01  ', branch_name: 'Main   ' });
        fireEvent.click(screen.getAllByText('Save Changes')[0]);
        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'PUT');
            expect(putCall).toBeDefined();
            const body = JSON.parse(putCall[1].body);
            function hasNoTrailingSpaces(obj) {
                if (!obj || typeof obj !== 'object') return;
                for (const v of Object.values(obj)) {
                    if (typeof v === 'string') expect(v).toBe(v.trimEnd());
                    else if (typeof v === 'object') hasNoTrailingSpaces(v);
                }
            }
            hasNoTrailingSpaces(body);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 19. ZATCA Reconnect Required banner
// ═══════════════════════════════════════════════════════════════════════════════

describe('19. ZATCA Reconnect Required banner', () => {
    test('19.1  zatca.zatca_reconnect_required=false → banner NOT shown', async () => {
        await renderOnGeneral({ zatca: { phase: '1', zatca_reconnect_required: false } });
        expect(screen.queryByText('ZATCA Reconnection Required')).not.toBeInTheDocument();
    });

    test('19.2  zatca.zatca_reconnect_required=true → "ZATCA Reconnection Required" banner shown', async () => {
        await renderOnGeneral({ zatca: { phase: '1', zatca_reconnect_required: true } });
        expect(screen.getByText('ZATCA Reconnection Required')).toBeInTheDocument();
    });

    test('19.3  zatca.zatca_reconnect_required=true → "Reconnect to ZATCA" button shown', async () => {
        await renderOnGeneral({ zatca: { phase: '1', zatca_reconnect_required: true } });
        // The banner description also contains "reconnect to ZATCA" (lowercase), so
        // getByText(/Reconnect to ZATCA/i) matches multiple elements. Use getByRole instead.
        expect(screen.getByRole('button', { name: /Reconnect to ZATCA/i })).toBeInTheDocument();
    });

    test('19.4  zatca.zatca_reconnect_required=undefined → banner NOT shown', async () => {
        await renderOnGeneral({ zatca: { phase: '1', zatca_reconnect_required: undefined } });
        expect(screen.queryByText('ZATCA Reconnection Required')).not.toBeInTheDocument();
    });

    test('19.5  zatca.zatca_reconnect_required=null → banner NOT shown (null is falsy)', async () => {
        await renderOnGeneral({ zatca: { phase: '1', zatca_reconnect_required: null } });
        expect(screen.queryByText('ZATCA Reconnection Required')).not.toBeInTheDocument();
    });

    test('19.6  zatca.zatca_reconnect_required=true + phase "2" + connected → banner shown', async () => {
        await renderOnGeneral({ zatca: { phase: '2', connected: true, zatca_reconnect_required: true } });
        expect(screen.getByText('ZATCA Reconnection Required')).toBeInTheDocument();
    });
});
