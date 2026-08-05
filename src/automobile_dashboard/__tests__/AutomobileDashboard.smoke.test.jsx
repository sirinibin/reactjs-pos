// Smoke test — AutoMobileDashboard renders without crashing
// React 17 · CRA · @testing-library/react v11 · NO TypeScript

// ── CSS / image stubs ──────────────────────────────────────────────────────────
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── react-bootstrap ────────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children }) => React.createElement(React.Fragment, null, children);
    return {
        Spinner: () => null,
        Modal: passthrough,
        Button: passthrough,
        Form: Object.assign(passthrough, {
            Group: passthrough,
            Label: passthrough,
            Control: () => null,
            Select: () => null,
            Check: () => null,
        }),
        Table: passthrough,
        Row: passthrough,
        Col: passthrough,
        Alert: passthrough,
        Dropdown: Object.assign(passthrough, {
            Toggle: passthrough,
            Menu: passthrough,
            Item: passthrough,
        }),
        Container: passthrough,
        Nav: passthrough,
        Navbar: passthrough,
        Card: Object.assign(passthrough, {
            Body: passthrough,
            Header: passthrough,
            Footer: passthrough,
        }),
        Badge: passthrough,
        ListGroup: Object.assign(passthrough, { Item: passthrough }),
        InputGroup: Object.assign(passthrough, { Text: passthrough }),
        OverlayTrigger: passthrough,
        Tooltip: passthrough,
        Popover: Object.assign(passthrough, { Header: passthrough, Body: passthrough }),
        Collapse: passthrough,
        Tab: Object.assign(passthrough, { Pane: passthrough }),
        Tabs: passthrough,
        ProgressBar: () => null,
        Pagination: Object.assign(passthrough, {
            Item: passthrough,
            First: () => null,
            Prev: () => null,
            Next: () => null,
            Last: () => null,
        }),
    };
});

// ── react-router-dom ──────────────────────────────────────────────────────────
jest.mock('react-router-dom', () => {
    const actual = jest.requireActual('react-router-dom');
    return {
        ...actual,
        useHistory: () => ({ push: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
        useParams: () => ({}),
        Link: () => null,
    };
});

// ── react-datepicker ──────────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);

// ── react-google-charts ───────────────────────────────────────────────────────
jest.mock('react-google-charts', () => ({
    Chart: () => null,
    default: { Chart: () => null },
}));

// ── react-i18next ─────────────────────────────────────────────────────────────
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k) => k, i18n: { changeLanguage: jest.fn() } }),
    Trans: ({ children }) => children,
    initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

// ── child domain components ───────────────────────────────────────────────────
jest.mock('../../posting/index.js', () => {
    const React = require('react');
    const Comp = React.forwardRef((_props, _ref) => null);
    Comp.displayName = 'PostingIndex';
    return Comp;
});

jest.mock('../../utils/vendor_pending.js', () => {
    const React = require('react');
    const Comp = React.forwardRef((_props, _ref) => null);
    Comp.displayName = 'VendorPending';
    return Comp;
});

jest.mock('../../utils/customer_pending.js', () => {
    const React = require('react');
    const Comp = React.forwardRef((_props, _ref) => null);
    Comp.displayName = 'CustomerPending';
    return Comp;
});

jest.mock('../../expense/create.js', () => {
    const React = require('react');
    const Comp = React.forwardRef((_props, _ref) => null);
    Comp.displayName = 'ExpenseCreate';
    return Comp;
});

jest.mock('../../order/create.js', () => {
    const React = require('react');
    const Comp = React.forwardRef((_props, _ref) => null);
    Comp.displayName = 'OrderCreate';
    return Comp;
});

jest.mock('../../purchase/create.js', () => {
    const React = require('react');
    const Comp = React.forwardRef((_props, _ref) => null);
    Comp.displayName = 'PurchaseCreate';
    return Comp;
});

jest.mock('../../purchase_return/create.js', () => {
    const React = require('react');
    const Comp = React.forwardRef((_props, _ref) => null);
    Comp.displayName = 'PurchaseReturnedCreate';
    return Comp;
});

jest.mock('../../sales_return/create.js', () => {
    const React = require('react');
    const Comp = React.forwardRef((_props, _ref) => null);
    Comp.displayName = 'SalesReturnCreate';
    return Comp;
});

jest.mock('../../vendor/create.js', () => {
    const React = require('react');
    const Comp = React.forwardRef((_props, _ref) => null);
    Comp.displayName = 'VendorCreate';
    return Comp;
});

jest.mock('../../customer/create.js', () => {
    const React = require('react');
    const Comp = React.forwardRef((_props, _ref) => null);
    Comp.displayName = 'CustomerCreate';
    return Comp;
});

// ── business_dashboard/charts utilities ───────────────────────────────────────
jest.mock('../../business_dashboard/charts/chartTooltipSetup', () => ({
    tooltipHtml: jest.fn(() => ''),
    onChartSelect: jest.fn(),
}));

// ── utils ─────────────────────────────────────────────────────────────────────
jest.mock('../../utils/pdfGenerator', () => ({
    generateInfoPdf: jest.fn(),
    generateSectionPdf: jest.fn(),
    safeName: jest.fn((s) => s),
}));

jest.mock('../../utils/pdfShare', () => ({
    uploadPdfForShare: jest.fn(),
}));

// ── html2pdf.js ───────────────────────────────────────────────────────────────
jest.mock('html2pdf.js', () =>
    jest.fn(() => ({
        from: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        outputPdf: jest.fn(),
        save: jest.fn(),
    }))
);

// ── react-to-print ────────────────────────────────────────────────────────────
jest.mock('react-to-print', () => ({
    useReactToPrint: jest.fn(() => jest.fn()),
}));

// ── Timers & fetch ────────────────────────────────────────────────────────────
jest.useFakeTimers();

global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
        Promise.resolve({
            status: true,
            result: {},
            data: [],
            total_count: 0,
            store: {},
            settings: {},
        }),
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

// ── Test ──────────────────────────────────────────────────────────────────────
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AutoMobileDashboard from '../index.js';

describe('AutoMobileDashboard smoke test', () => {
    it('renders without crashing', () => {
        render(
            <MemoryRouter>
                <AutoMobileDashboard />
            </MemoryRouter>
        );
    });
});
