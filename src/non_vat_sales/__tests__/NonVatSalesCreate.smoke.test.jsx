/**
 * Smoke test for NonVATSalesIndex (non_vat_sales/index.js)
 *
 * Goal: render the component without throwing, while mocking all
 * complex dependencies (API calls, child components, CSS, etc.).
 *
 * NOTE: non_vat_sales/create.js does not exist; the component that owns
 * the "create" workflow lives in index.js as NonVATSalesIndex.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── timers & fetch setup ──────────────────────────────────────────────────────
beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ result: {}, store: {}, data: [] }),
    });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

// ── WebSocketContext — provide a stable context default ───────────────────────
jest.mock('../../utils/WebSocketContext.js', () => {
    const React = require('react');
    const WebSocketContext = React.createContext({ lastMessage: null });
    return { WebSocketContext };
});

// ── child components → lightweight stubs ──────────────────────────────────────
const Stub = () => null;

jest.mock('../../quotation/QuotationType3Form.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../repair_job/card_view.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../customer/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../product/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../service/create.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../order/preview.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../quotation/view.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/PaginationControls.js', () => ({ __esModule: true, default: Stub }));
jest.mock('../../utils/amount.js', () => ({ __esModule: true, default: Stub }));

// ── utility helpers ───────────────────────────────────────────────────────────
jest.mock('../../utils/search.js', () => ({
    highlightWords: (text) => text,
}));

// ── react-bootstrap mock — passthrough for children ───────────────────────────
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children }) => React.createElement(React.Fragment, null, children || null);
    return {
        Button: passthrough,
        Spinner: () => null,
        Modal: passthrough,
        Dropdown: passthrough,
        OverlayTrigger: passthrough,
        Tooltip: passthrough,
        Popover: passthrough,
    };
});

// ── react-bootstrap-typeahead mock ────────────────────────────────────────────
jest.mock('react-bootstrap-typeahead', () => ({
    Typeahead: () => null,
    Menu: () => null,
    MenuItem: () => null,
}));

// ── react-datepicker mock ─────────────────────────────────────────────────────
jest.mock('react-datepicker', () => () => null);
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ── now import the component ──────────────────────────────────────────────────
import NonVATSalesIndex from '../index.js';

// ── tests ─────────────────────────────────────────────────────────────────────
describe('NonVATSalesIndex smoke test', () => {
    test('renders without crashing inside MemoryRouter', () => {
        expect(() =>
            render(
                <MemoryRouter>
                    <NonVATSalesIndex />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
