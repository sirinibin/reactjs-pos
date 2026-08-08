/**
 * Tests for the "No Tax for Quotation Invoice & Quotation Sales Return" checkbox
 * added to the Quotation Settings section of the store settings form.
 */
import React, { createRef } from 'react';
import { render, act, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── react-bootstrap: Modal always renders children so form content is visible ─
jest.mock('react-bootstrap', () => {
    const P = ({ children }) => <>{children || null}</>;
    const Modal = ({ children }) => <div data-testid="modal">{children}</div>;
    Modal.Header = P;
    Modal.Title = P;
    Modal.Body = P;
    Modal.Footer = P;
    return {
        Modal, Button: P, Spinner: () => null,
        Form: P, Row: P, Col: P, Alert: P, Table: P,
    };
});

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: () => ({ push: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: '/' }),
}));

jest.mock('react-bootstrap-typeahead', () => ({
    Typeahead: () => null,
    AsyncTypeahead: () => null,
}));

jest.mock('react-image-file-resizer', () => ({ imageFileResizer: jest.fn() }));
jest.mock('react-select-country-list', () => () => ({ getData: () => [] }));

jest.mock('../../utils/useEnterKeyNavigation.js', () => ({
    useEnterKeyNavigation: jest.fn(),
}));
jest.mock('../../utils/timezone.js', () => ({
    toStoreLocalDate: jest.fn((v) => (v ? new Date(v) : null)),
    fromStoreLocalDate: jest.fn((d) => (d ? d.toISOString() : null)),
}));
jest.mock('../../sidebar_menu_config', () => ({
    applyAutomobileMenuOrder: jest.fn((x) => x),
    DEFAULT_MENU: [],
    loadSidebarConfig: jest.fn(() => []),
    saveSidebarConfig: jest.fn(),
}));

jest.useFakeTimers();

function makeStoreFetch(settingsOverride = {}) {
    return jest.fn((url) => {
        const isListEndpoint = url && (
            url.includes('customer-package') ||
            url.includes('customer?') ||
            url.includes('product?') ||
            url.includes('employee?')
        );
        return Promise.resolve({
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve(
                isListEndpoint
                    ? { status: true, result: [], data: [], total_count: 0 }
                    : { result: { settings: { ...settingsOverride } }, data: [], total_count: 0, store: {}, status: true }
            ),
        });
    });
}

beforeEach(() => {
    localStorage.clear();
    global.fetch = makeStoreFetch();
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

import StoreCreate from '../create.js';

describe('StoreCreate — No Tax for Quotation Invoice checkbox', () => {
    async function renderForm() {
        const ref = createRef();
        await act(async () => {
            render(<MemoryRouter><StoreCreate ref={ref} /></MemoryRouter>);
        });
        // open() sets show=true
        await act(async () => {
            ref.current.open();
            await Promise.resolve();
            await Promise.resolve();
        });
        // The checkbox is inside the 'Settings' tab — click it to reveal
        await act(async () => {
            const settingsTabBtn = screen.getAllByRole('button').find(
                btn => btn.textContent.trim() === 'Settings'
            );
            if (settingsTabBtn) fireEvent.click(settingsTabBtn);
        });
        return ref;
    }

    test('renders without crashing', async () => {
        await expect(renderForm()).resolves.not.toThrow();
    });

    test('"No Tax for Quotation Invoice & Quotation Sales Return" label is in the document', async () => {
        await renderForm();
        // The &amp; in JSX renders as a literal & in the DOM
        const label = screen.queryByText(/No Tax for Quotation Invoice & Quotation Sales Return/i);
        expect(label).not.toBeNull();
    });

    test('checkbox for no_tax_for_quotation_invoice is present', async () => {
        await renderForm();
        const checkbox = document.getElementById('no_tax_for_quotation_invoice');
        expect(checkbox).not.toBeNull();
        expect(checkbox.type).toBe('checkbox');
    });

    test('checkbox is initially unchecked when store returns no setting', async () => {
        await renderForm();
        const checkbox = document.getElementById('no_tax_for_quotation_invoice');
        expect(checkbox.checked).toBe(false);
    });

    test('checkbox reflects true when store returns flag=true', async () => {
        global.fetch = makeStoreFetch({ no_tax_for_quotation_invoice: true });
        const ref = createRef();
        await act(async () => {
            render(<MemoryRouter><StoreCreate ref={ref} /></MemoryRouter>);
        });
        // Pass an ID so getStore() is called and settings are loaded from fetch
        await act(async () => {
            ref.current.open('test-store-123');
            await Promise.resolve();
            await Promise.resolve();
        });
        await act(async () => {
            const settingsTabBtn = screen.getAllByRole('button').find(
                btn => btn.textContent.trim() === 'Settings'
            );
            if (settingsTabBtn) fireEvent.click(settingsTabBtn);
        });
        const checkbox = document.getElementById('no_tax_for_quotation_invoice');
        expect(checkbox).not.toBeNull();
        expect(checkbox.checked).toBe(true);
    });
});
