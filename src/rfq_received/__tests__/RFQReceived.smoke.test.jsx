/**
 * Smoke tests for RFQReceivedIndex.
 *
 * Covers:
 *  1.  Renders without crashing (no storeId — skips fetch)
 *  2.  Calls /v1/rfq-received on mount when storeId is set
 *  3.  Shows loading spinner while fetching
 *  4.  Shows empty-state illustration when list is empty
 *  5.  Renders table rows when list has items
 *  6.  Renders StatusBadge for each row
 *  7.  Status filter select renders all 4 options
 *  8.  Re-process button visible only for failed/received rows
 *  9.  Clicking view (eye) button calls /v1/rfq-received/:id
 * 10.  Calls /v1/rfq-received/:id/process on re-process button click
 * 11.  showToastMessage called when fetch fails
 */

import React from 'react';
import { render, act, waitFor, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-i18next', () => {
    const mockT = (key) => key;
    return { useTranslation: () => ({ t: mockT }) };
});

jest.useFakeTimers();

jest.mock('react-bootstrap', () => {
    const Spinner = ({ animation, size }) => <span data-testid="rb-spinner" />;
    const Badge = ({ children, bg, text, className, style }) => (
        <span data-testid={`badge-${bg}`} className={className}>{children}</span>
    );
    const Button = ({ children, onClick, variant, size, disabled, title }) => (
        <button onClick={onClick} disabled={disabled} title={title} data-variant={variant}>{children}</button>
    );
    const Modal = ({ children, show, onHide, size, centered }) => show ? <div data-testid="modal">{children}</div> : null;
    Modal.Header = ({ children, closeButton }) => <div data-testid="modal-header">{children}</div>;
    Modal.Title = ({ children }) => <div>{children}</div>;
    Modal.Body = ({ children }) => <div data-testid="modal-body">{children}</div>;
    Modal.Footer = ({ children }) => <div>{children}</div>;
    return { Spinner, Badge, Button, Modal };
});

jest.mock('react-paginate', () => () => <div data-testid="paginate" />);

const NOW = new Date().toISOString();

const MOCK_RFQ_WITH_CATEGORY = {
    id: 'rfq-001',
    received_at: NOW,
    from_phone: '966501234567',
    from_name: 'Test Buyer',
    message_type: 'text',
    text_content: 'I need 50 steel pipes',
    categories: ['Steel Pipes'],
    status: 'forwarded',
    forwarded_to: [
        { supplier_name: 'Alpha Metals', phone: '966509876543', status: 'sent', category: 'Steel Pipes', purchase_market: 'Jeddah' },
        { supplier_name: 'Beta Supply', phone: '966501111111', status: 'sent', category: '', purchase_market: 'Dammam' },
    ],
};

const MOCK_RFQ_LIST = {
    items: [
        {
            ...MOCK_RFQ_WITH_CATEGORY,
            forwarded_to: [{ supplier_name: 'Alpha Metals', phone: '966509876543', status: 'sent' }],
        },
        {
            id: 'rfq-002',
            received_at: NOW,
            from_phone: '966502000000',
            message_type: 'image',
            categories: [],
            status: 'failed',
            forwarded_to: [],
        },
        {
            id: 'rfq-003',
            received_at: NOW,
            from_phone: '966503000000',
            message_type: 'text',
            categories: [],
            status: 'received',
            forwarded_to: [],
        },
    ],
    total_count: 3,
};

// jsdom doesn't implement EventSource — stub it out
class MockEventSource {
    constructor() { this._listeners = {}; }
    addEventListener(type, fn) { this._listeners[type] = fn; }
    close() {}
}

beforeEach(() => {
    global.EventSource = MockEventSource;
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_RFQ_LIST),
    });
    localStorage.setItem('store_id', 'store-abc');
    localStorage.setItem('access_token', 'tok');
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    localStorage.clear();
});

let RFQReceivedIndex;
beforeAll(async () => {
    RFQReceivedIndex = (await import('../index')).default;
});

function renderPage(props = {}) {
    const defaults = { showToastMessage: jest.fn() };
    return render(<RFQReceivedIndex {...defaults} {...props} />);
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('RFQReceivedIndex smoke tests', () => {
    it('1. renders without crashing when storeId is missing', async () => {
        localStorage.removeItem('store_id');
        await act(async () => { renderPage(); });
    });

    it('2. calls /v1/rfq-received on mount when storeId is set', async () => {
        await act(async () => { renderPage(); });
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/v1/rfq-received'),
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
        await waitFor(() => expect(screen.getByText('no_rfq_messages')).toBeTruthy());
    });

    it('5. renders rows when list has items', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => expect(screen.getByText('966501234567')).toBeTruthy());
        expect(screen.getByText('966502000000')).toBeTruthy();
    });

    it('6. renders status badges for each row', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => {
            const badges = screen.getAllByTestId(/^badge-/);
            expect(badges.length).toBeGreaterThan(0);
        });
    });

    it('7. status filter select renders all four status options', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => {
            const select = screen.getByRole('combobox');
            const options = select.querySelectorAll('option');
            expect(options.length).toBe(5); // "all" + 4 statuses
        });
    });

    it('8a. re-process button is visible for failed row', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => {
            const reprocessBtns = screen.getAllByTitle('re_process');
            expect(reprocessBtns.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('8b. re-process button is NOT shown for forwarded row', async () => {
        // Only failed and received rows get the button; forwarded row (rfq-001) should not
        await act(async () => { renderPage(); });
        await waitFor(() => screen.getByText('966501234567'));
        // There are 3 rows: forwarded (no btn), failed (btn), received (btn) → 2 buttons
        const reprocessBtns = screen.getAllByTitle('re_process');
        expect(reprocessBtns.length).toBe(2);
    });

    it('9. clicking view button calls /v1/rfq-received/:id', async () => {
        const detailData = { ...MOCK_RFQ_LIST.items[0] };
        let fetchCount = 0;
        global.fetch = jest.fn().mockImplementation((url) => {
            fetchCount++;
            if (fetchCount === 1) return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RFQ_LIST) });
            return Promise.resolve({ ok: true, json: () => Promise.resolve(detailData) });
        });

        await act(async () => { renderPage(); });
        await waitFor(() => screen.getAllByTitle('view_detail'));

        await act(async () => {
            screen.getAllByTitle('view_detail')[0].click();
            await Promise.resolve();
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/v1/rfq-received/rfq-001'),
            expect.any(Object)
        );
    });

    it('10. clicking re-process button calls /process endpoint', async () => {
        let fetchCount = 0;
        global.fetch = jest.fn().mockImplementation((url) => {
            fetchCount++;
            if (fetchCount === 1) return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RFQ_LIST) });
            if (url.includes('/process')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
            return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RFQ_LIST) });
        });

        await act(async () => { renderPage(); });
        await waitFor(() => screen.getAllByTitle('re_process'));

        await act(async () => {
            screen.getAllByTitle('re_process')[0].click();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/process'),
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('11. calls showToastMessage on fetch error', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Network down'));
        const showToastMessage = jest.fn();
        await act(async () => { renderPage({ showToastMessage }); });
        await waitFor(() => expect(showToastMessage).toHaveBeenCalledWith(
            expect.stringContaining('error_load_rfqs'),
            'danger'
        ));
    });

    it('12. fetches at least once on mount with storeId', async () => {
        await act(async () => { renderPage(); });
        await waitFor(() => screen.getByText('966501234567'));
        // At least the list fetch happened
        expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(1);
        expect(global.fetch.mock.calls[0][0]).toContain('/v1/rfq-received');
    });

    // ── Category column in detail modal ──────────────────────────────────────

    it('13. detail modal shows col_category header when forwarded_to has entries', async () => {
        // Set up: first fetch returns list, second fetch returns RFQ detail with forwarded_to
        let fetchCount = 0;
        global.fetch = jest.fn().mockImplementation((url) => {
            fetchCount++;
            if (fetchCount === 1) return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RFQ_LIST) });
            return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RFQ_WITH_CATEGORY) });
        });

        await act(async () => { renderPage(); });
        await waitFor(() => screen.getAllByTitle('view_detail'));

        await act(async () => {
            screen.getAllByTitle('view_detail')[0].click();
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => {
            // The modal should render the col_category header (i18n key)
            const headers = screen.getAllByText('col_category');
            expect(headers.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('14. category badge shown when forwarded_to entry has category', async () => {
        let fetchCount = 0;
        global.fetch = jest.fn().mockImplementation((url) => {
            fetchCount++;
            if (fetchCount === 1) return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RFQ_LIST) });
            return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RFQ_WITH_CATEGORY) });
        });

        await act(async () => { renderPage(); });
        await waitFor(() => screen.getAllByTitle('view_detail'));

        await act(async () => {
            screen.getAllByTitle('view_detail')[0].click();
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => {
            // 'Steel Pipes' appears at least once (category list + forwarded_to badge)
            const matches = screen.getAllByText('Steel Pipes');
            expect(matches.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('15. dash shown for forwarded_to entry without category', async () => {
        let fetchCount = 0;
        global.fetch = jest.fn().mockImplementation((url) => {
            fetchCount++;
            if (fetchCount === 1) return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RFQ_LIST) });
            return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RFQ_WITH_CATEGORY) });
        });

        await act(async () => { renderPage(); });
        await waitFor(() => screen.getAllByTitle('view_detail'));

        await act(async () => {
            screen.getAllByTitle('view_detail')[0].click();
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => {
            // Beta Supply has no category → dash placeholder
            const dashes = screen.getAllByText('—');
            expect(dashes.length).toBeGreaterThanOrEqual(1);
        });
    });
});
