/**
 * Smoke test for QuotationSalesReturnIndex (quotation_sales_return/index.js)
 *
 * Goal: render the component without throwing, while mocking all
 * complex dependencies (API calls, child components, CSS, etc.).
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── react-bootstrap ───────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const Passthrough = ({ children }) => children || null;
    const PassthroughDiv = ({ children }) => React.createElement('div', null, children);
    const ButtonWithRef = React.forwardRef(({ children, onClick, onKeyDown }, ref) =>
        React.createElement('button', { ref, onClick, onKeyDown }, children)
    );
    return {
        Modal: Object.assign(PassthroughDiv, {
            Header: PassthroughDiv,
            Title: PassthroughDiv,
            Body: PassthroughDiv,
            Footer: PassthroughDiv,
        }),
        Button: ButtonWithRef,
        Spinner: () => null,
        Form: Object.assign(PassthroughDiv, {
            Group: PassthroughDiv,
            Label: PassthroughDiv,
            Control: () => null,
            Check: () => null,
        }),
        Row: PassthroughDiv,
        Col: PassthroughDiv,
        Table: PassthroughDiv,
        Alert: PassthroughDiv,
        Badge: Passthrough,
        InputGroup: Object.assign(PassthroughDiv, { Text: PassthroughDiv }),
        Collapse: Passthrough,
        ProgressBar: () => null,
        CloseButton: () => null,
    };
});

// ── react-datepicker ──────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-bootstrap-typeahead ─────────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
    Typeahead: () => null,
    AsyncTypeahead: () => null,
}));

// ── react-data-export ─────────────────────────────────────────────────────────
jest.mock('react-data-export', () => {
    const ExcelFile = ({ children }) => children || null;
    ExcelFile.ExcelSheet = () => null;
    return { __esModule: true, default: { ExcelFile } };
});

// ── WebSocketContext ──────────────────────────────────────────────────────────
jest.mock('../../utils/WebSocketContext.js', () => {
    const { createContext } = require('react');
    return { WebSocketContext: createContext({ lastMessage: null }) };
});

// ── eventEmitter ──────────────────────────────────────────────────────────────
jest.mock('../../utils/eventEmitter', () => ({
    __esModule: true,
    default: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}));

// ── useTableSettings ──────────────────────────────────────────────────────────
jest.mock('../../utils/useTableSettings.js', () => ({
    useTableSettings: () => ({
        columns: [
            { key: 'actions', label: 'Actions', fieldName: 'actions', visible: true },
            { key: 'id', label: 'Qtn. Sales Return ID', fieldName: 'code', visible: true },
            { key: 'date', label: 'Date', fieldName: 'date', visible: true },
            { key: 'customer', label: 'Customer', fieldName: 'customer_name', visible: true },
            { key: 'net_total', label: 'Net Total', fieldName: 'net_total', visible: true },
            { key: 'payment_status', label: 'Payment Status', fieldName: 'payment_status', visible: true },
            { key: 'payment_methods', label: 'Payment Methods', fieldName: 'payment_methods', visible: true },
            { key: 'created_by', label: 'Created By', fieldName: 'created_by', visible: true },
            { key: 'created_at', label: 'Created At', fieldName: 'created_at', visible: true },
            { key: 'actions_end', label: 'Actions', fieldName: 'actions_end', visible: true },
        ],
        showSettings: false,
        setShowSettings: jest.fn(),
        handleToggleColumn: jest.fn(),
        onDragEnd: jest.fn(),
        restoreDefaults: jest.fn(),
    }),
}));

// ── domain child components ───────────────────────────────────────────────────
const Stub = () => null;

jest.mock('../create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../view.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation_sales_return_payment/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation_sales_return_payment/view.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation_sales_return_payment/index.js', () => ({ __esModule: true, default: Stub }));

// ── order / preview / print ───────────────────────────────────────────────────
jest.mock('../../order/preview.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/report.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/print.js', () => ({ __esModule: true, default: Stub }));

// ── util components ───────────────────────────────────────────────────────────
jest.mock('../../utils/OverflowTooltip.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/amount.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/StatsSummary.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/quotations.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/SuccessModal.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/PaginationControls.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/TableSettingsModal.js', () => ({ __esModule: true, default: Stub }));

// ── util functions ────────────────────────────────────────────────────────────
jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: (v) => String(v),
    trimTo8Decimals: (v) => String(v),
}));

jest.mock('../../utils/queryUtils.js', () => ({
    ObjectToSearchQueryParams: () => '',
}));

jest.mock('../../utils/storeUtils.js', () => ({
    fetchStore: jest.fn().mockResolvedValue({}),
}));

// ── now import the component ──────────────────────────────────────────────────
import QuotationSalesReturnIndex from '../index.js';

describe('QuotationSalesReturnIndex smoke test', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () =>
                Promise.resolve({
                    result: [],
                    total_count: 0,
                    meta: {
                        total_quotation_sales_return: 0,
                        net_profit: 0,
                        net_loss: 0,
                        vat_price: 0,
                        shipping_handling_fees: 0,
                        discount: 0,
                        cash_discount: 0,
                        paid_quotation_sales_return: 0,
                        unpaid_quotation_sales_return: 0,
                        cash_quotation_sales_return: 0,
                        quotation_sales_quotation_sales_return: 0,
                        bank_account_quotation_sales_return: 0,
                    },
                    store: {},
                    settings: {},
                }),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    test('renders without crashing inside MemoryRouter', () => {
        expect(() =>
            render(
                <MemoryRouter>
                    <QuotationSalesReturnIndex />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
