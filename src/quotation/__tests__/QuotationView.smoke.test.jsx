/**
 * Smoke test for QuotationView (quotation/view.js)
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
    const Modal = ({ children }) => React.createElement(React.Fragment, null, children);
    Modal.Header = ({ children }) => React.createElement(React.Fragment, null, children);
    Modal.Title = ({ children }) => React.createElement(React.Fragment, null, children);
    Modal.Body = ({ children }) => React.createElement(React.Fragment, null, children);
    Modal.Footer = ({ children }) => React.createElement(React.Fragment, null, children);
    return { Modal };
});

// ── react-number-format ───────────────────────────────────────────────────────
jest.mock('react-number-format', () => () => null);

// ── react-i18next ─────────────────────────────────────────────────────────────
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

// ── child domain components (both use forwardRef + imperative .open()) ────────
jest.mock('../../order/preview.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));
jest.mock('../../order/print.js', () => ({
    __esModule: true,
    default: require('react').forwardRef(() => null),
}));

// ── utils ─────────────────────────────────────────────────────────────────────
jest.mock('../../utils/numberUtils', () => ({
    trimTo2Decimals: (v) => String(v ?? ''),
    trimTo8Decimals: (v) => String(v ?? ''),
}));

jest.mock('../../utils/queryUtils.js', () => ({
    ObjectToSearchQueryParams: () => '',
}));

jest.mock('../../utils/dateUtils.js', () => ({
    formatInStoreTimezone: (d) => String(d ?? ''),
    formatPaymentMethod: (m) => String(m ?? ''),
}));

jest.mock('../../utils/storeUtils.js', () => ({
    fetchStore: jest.fn().mockResolvedValue({}),
}));

// ── fake timers & global fetch ────────────────────────────────────────────────
jest.useFakeTimers();

global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

// ── component under test ──────────────────────────────────────────────────────
import QuotationView from '../view.js';

describe('QuotationView smoke test', () => {
    test('renders without crashing', () => {
        expect(() =>
            render(
                <MemoryRouter>
                    <QuotationView />
                </MemoryRouter>
            )
        ).not.toThrow();
    });
});
