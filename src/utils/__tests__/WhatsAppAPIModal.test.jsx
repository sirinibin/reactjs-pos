import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import WhatsAppAPIModal, {
    normalisePhone,
    isSaudiLocal,
    needsCountryCode,
} from '../WhatsAppAPIModal';

// ─────────────────────────────────────────────────────────────────────────────
// react-bootstrap mock
// Modal wires onHide through context so Modal.Header's close button works.
// ─────────────────────────────────────────────────────────────────────────────
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const ModalCtx = React.createContext({});

    const Modal = ({ show, onHide, children, centered, size, className }) => {
        if (!show) return null;
        return (
            <ModalCtx.Provider value={{ onHide }}>
                <div data-testid="modal" className={className}>
                    {children}
                </div>
            </ModalCtx.Provider>
        );
    };

    Modal.Header = ({ children, closeButton }) => {
        const { onHide } = React.useContext(ModalCtx);
        return (
            <div data-testid="modal-header">
                {children}
                {closeButton && (
                    <button type="button" aria-label="Close" onClick={onHide}>
                        x
                    </button>
                )}
            </div>
        );
    };
    Modal.Title  = ({ children }) => <div>{children}</div>;
    Modal.Body   = ({ children }) => <div data-testid="modal-body">{children}</div>;
    Modal.Footer = ({ children }) => <div data-testid="modal-footer">{children}</div>;

    const Button = ({ children, onClick, disabled, variant, size, title, style }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            data-variant={variant}
        >
            {children}
        </button>
    );

    const Spinner = ({ size, animation, variant, className }) => (
        <span data-testid="spinner" aria-hidden="true" />
    );

    const Alert = ({ children, variant, className, style }) => (
        <div data-testid={`alert-${variant}`} role="alert">
            {children}
        </div>
    );

    const Form = ({ children }) => <div>{children}</div>;
    Form.Group = ({ children, className }) => <div>{children}</div>;
    Form.Label = ({ children, className }) => <label>{children}</label>;
    Form.Control = ({ as, value, onChange, placeholder, rows, type, size, style }) => {
        if (as === 'textarea') {
            return (
                <textarea
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    rows={rows}
                />
            );
        }
        return (
            <input
                type={type || 'text'}
                value={value !== undefined ? value : ''}
                onChange={onChange}
                placeholder={placeholder}
            />
        );
    };
    Form.Check = ({ checked, onChange, onClick, type }) => (
        <input
            type={type || 'checkbox'}
            checked={!!checked}
            onChange={onChange || (() => {})}
            onClick={onClick}
        />
    );

    const Badge = ({ children, bg, text, style, onClick }) => (
        <span data-testid="badge" onClick={onClick}>
            {children}
        </span>
    );

    return { Modal, Button, Spinner, Alert, Form, Badge };
});

// ─────────────────────────────────────────────────────────────────────────────
// MSW server — default happy-path handlers
// ─────────────────────────────────────────────────────────────────────────────
const server = setupServer(
    rest.get('/v1/whatsapp/status', (_req, res, ctx) =>
        res(ctx.json({ connected: true }))
    ),
    rest.post('/v1/whatsapp/sync-contacts', (_req, res, ctx) =>
        res(ctx.json({ success: true, count: 5 }))
    ),
    rest.get('/v1/whatsapp/contacts', (_req, res, ctx) =>
        res(ctx.json({ contacts: [], total_count: 0, total_pages: 0 }))
    ),
    rest.post('/v1/whatsapp/check-numbers', (_req, res, ctx) =>
        res(ctx.json([
            { number: '966512345678', exists: true, jid: '966512345678@s.whatsapp.net' },
        ]))
    ),
    rest.post('/v1/whatsapp/send-document', (_req, res, ctx) =>
        res(ctx.json({ success: true }))
    ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
    server.resetHandlers();
    localStorage.clear();
});
afterAll(() => server.close());

// ─────────────────────────────────────────────────────────────────────────────
// Shared props factory
// ─────────────────────────────────────────────────────────────────────────────
const PDF_BLOB = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });

function makeProps(overrides = {}) {
    return {
        show: true,
        onClose: jest.fn(),
        pdfBlob: PDF_BLOB,
        pdfFileName: 'invoice.pdf',
        storeId: 'store-1',
        customer: { phone: '0512345678', phone2: null, name: 'Ali' },
        ...overrides,
    };
}

/**
 * Wait until the component has reached "connected" state AND the customer phone
 * number has been validated (status → 'valid'), which enables the Send PDF button.
 * Relies on the check-numbers MSW handler returning the number as valid.
 */
async function waitForSendEnabled() {
    await waitFor(
        () => {
            const buttons = screen.getAllByRole('button');
            const btn = buttons.find(b => /Send PDF/.test(b.textContent));
            expect(btn).toBeTruthy();
            expect(btn).not.toBeDisabled();
        },
        { timeout: 4000 },
    );
}

/**
 * Replace global.fetch for calls to /v1/whatsapp/send-document with a simple
 * mock that avoids MSW's jsdom-FormData body-buffering bug. All other URLs
 * delegate to the original fetch (which MSW intercepts at the Node http layer).
 *
 * Returns a restore function — call it in finally / afterEach.
 */
function patchSendDocument(responseFactory) {
    const original = global.fetch;
    global.fetch = jest.fn().mockImplementation((url, opts) => {
        if (typeof url === 'string' && url.includes('/v1/whatsapp/send-document')) {
            return Promise.resolve(responseFactory());
        }
        return original(url, opts);
    });
    return () => { global.fetch = original; };
}

// ─────────────────────────────────────────────────────────────────────────────
// normalisePhone — pure function (tests 1–7)
// ─────────────────────────────────────────────────────────────────────────────
describe('normalisePhone', () => {
    // 1
    test('Saudi local 05XXXXXXXX → 966XXXXXXXXX', () => {
        expect(normalisePhone('0512345678')).toBe('966512345678');
    });

    // 2
    test('already-full 966XXXXXXXXX → unchanged', () => {
        expect(normalisePhone('966512345678')).toBe('966512345678');
    });

    // 3
    test('+966XXXXXXXXX → strips + prefix', () => {
        expect(normalisePhone('+966512345678')).toBe('966512345678');
    });

    // 4  — source strips + only; 00 prefix is NOT specially handled
    test('00966XXXXXXXXX → returned as-is (00 prefix not stripped)', () => {
        expect(normalisePhone('00966512345678')).toBe('00966512345678');
    });

    // 5  — generic 8-digit number with no recognised prefix
    test('8-digit number without any known prefix → returned as-is', () => {
        expect(normalisePhone('12345678')).toBe('12345678');
    });

    // 6  — empty string is falsy → null
    test('empty string → null', () => {
        expect(normalisePhone('')).toBeNull();
    });

    // 7a
    test('null → null (does not throw)', () => {
        expect(normalisePhone(null)).toBeNull();
    });

    // 7b
    test('undefined → null (does not throw)', () => {
        expect(normalisePhone(undefined)).toBeNull();
    });

    // Extra — 9-digit Saudi local without leading 0
    test('5XXXXXXXXX (9 digits) → 9665XXXXXXXXX', () => {
        expect(normalisePhone('512345678')).toBe('966512345678');
    });

    // Extra — separators stripped before check
    test('strips spaces and hyphens before normalising', () => {
        expect(normalisePhone('05 12-345 678')).toBe('966512345678');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// isSaudiLocal — pure function (tests 8–10)
// ─────────────────────────────────────────────────────────────────────────────
describe('isSaudiLocal', () => {
    // 8
    test('0512345678 → true', () => {
        expect(isSaudiLocal('0512345678')).toBe(true);
    });

    // 9
    test('966512345678 (full international) → false', () => {
        expect(isSaudiLocal('966512345678')).toBe(false);
    });

    // 10
    test('empty string → false', () => {
        expect(isSaudiLocal('')).toBe(false);
    });

    test('null → false (does not throw)', () => {
        expect(isSaudiLocal(null)).toBe(false);
    });

    test('5XXXXXXXXX (9 digits starting with 5) → true', () => {
        expect(isSaudiLocal('512345678')).toBe(true);
    });

    test('+0512345678 → false (isSaudiLocal does not strip +)', () => {
        // The helper's replace list does not include +, so +0512345678 stays
        // as +0512345678 and fails both regex tests.
        expect(isSaudiLocal('+0512345678')).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// needsCountryCode — pure function (tests 11–13)
// ─────────────────────────────────────────────────────────────────────────────
describe('needsCountryCode', () => {
    // 11 — Saudi local is handled internally; no country code input needed
    test('0512345678 (Saudi local) → false', () => {
        expect(needsCountryCode('0512345678')).toBe(false);
    });

    // 12
    test('966512345678 (starts with 966) → false', () => {
        expect(needsCountryCode('966512345678')).toBe(false);
    });

    // 13
    test('empty string → false', () => {
        expect(needsCountryCode('')).toBe(false);
    });

    test('null → false (does not throw)', () => {
        expect(needsCountryCode(null)).toBe(false);
    });

    test('+441234567890 (has + prefix) → false', () => {
        expect(needsCountryCode('+441234567890')).toBe(false);
    });

    test('ambiguous short local without any prefix → true', () => {
        // Not Saudi, no +, no 966 → the helper flags it as needing a country code
        expect(needsCountryCode('12345')).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// WhatsAppAPIModal component (tests 14–20)
// ─────────────────────────────────────────────────────────────────────────────
describe('WhatsAppAPIModal component', () => {
    // ── 14. renders when show=true ────────────────────────────────────────────
    test('14. renders modal when show=true', async () => {
        render(<WhatsAppAPIModal {...makeProps({ show: true })} />);
        expect(screen.getByTestId('modal')).toBeInTheDocument();

        // Drain pending async effects to avoid act() warnings
        await act(async () => {
            await new Promise(r => setTimeout(r, 0));
        });
    });

    // ── 15. does not render when show=false ───────────────────────────────────
    test('15. does not render modal when show=false', () => {
        render(<WhatsAppAPIModal {...makeProps({ show: false })} />);
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    // ── 16. phone number input is present ────────────────────────────────────
    test('16. customer phone number input is present when connected', async () => {
        render(<WhatsAppAPIModal {...makeProps()} />);

        // The "Phone number" input appears only after the status check resolves
        // and the component renders the connected UI.
        await waitFor(
            () => expect(screen.getByPlaceholderText('Phone number')).toBeInTheDocument(),
            { timeout: 3000 },
        );

        // Verify the customer's raw phone value is pre-filled
        expect(screen.getByDisplayValue('0512345678')).toBeInTheDocument();
    });

    // ── 17. Send button calls send-document with normalised phone ─────────────
    test('17. clicking Send PDF triggers /v1/whatsapp/send-document', async () => {
        // MSW v1 in Node cannot buffer a jsdom FormData/Blob request body, so we
        // intercept send-document at the fetch level instead of via MSW.
        let callCount = 0;
        const restore = patchSendDocument(() => {
            callCount += 1;
            return { ok: true, json: () => Promise.resolve({ success: true }) };
        });

        try {
            render(<WhatsAppAPIModal {...makeProps()} />);
            await waitForSendEnabled();

            const sendBtn = screen
                .getAllByRole('button')
                .find(b => /Send PDF/.test(b.textContent));

            await act(async () => {
                fireEvent.click(sendBtn);
            });

            await waitFor(() => expect(callCount).toBe(1));
        } finally {
            restore();
        }
    });

    // ── 18. shows success alert on successful send ────────────────────────────
    test('18. shows success alert after a successful send', async () => {
        const restore = patchSendDocument(() => ({
            ok: true,
            json: () => Promise.resolve({ success: true }),
        }));

        try {
            render(<WhatsAppAPIModal {...makeProps()} />);
            await waitForSendEnabled();

            const sendBtn = screen
                .getAllByRole('button')
                .find(b => /Send PDF/.test(b.textContent));

            await act(async () => {
                fireEvent.click(sendBtn);
            });

            await waitFor(
                () => expect(screen.getByTestId('alert-success')).toBeInTheDocument(),
                { timeout: 3000 },
            );
        } finally {
            restore();
        }
    });

    // ── 19. shows error alert on failed send ──────────────────────────────────
    test('19. shows danger alert after a failed send', async () => {
        server.use(
            rest.post('/v1/whatsapp/send-document', (_req, res, ctx) =>
                res(ctx.status(500), ctx.json({ success: false, error: 'Network failure' }))
            ),
        );

        render(<WhatsAppAPIModal {...makeProps()} />);
        await waitForSendEnabled();

        const sendBtn = screen
            .getAllByRole('button')
            .find(b => /Send PDF/.test(b.textContent));

        await act(async () => {
            fireEvent.click(sendBtn);
        });

        await waitFor(
            () => expect(screen.getByTestId('alert-danger')).toBeInTheDocument(),
            { timeout: 3000 },
        );
    });

    // ── 20. shows loading indicator while send is in flight ───────────────────
    test('20. button shows "Sending…" while the send fetch is in flight', async () => {
        // Create a deferred send: the response is withheld until resolveSend() is called.
        let resolveSend;
        server.use(
            rest.post('/v1/whatsapp/send-document', (_req, res, ctx) =>
                new Promise(resolve => {
                    resolveSend = () => resolve(res(ctx.json({ success: true })));
                })
            ),
        );

        render(<WhatsAppAPIModal {...makeProps()} />);
        await waitForSendEnabled();

        const sendBtn = screen
            .getAllByRole('button')
            .find(b => /Send PDF/.test(b.textContent));

        // Click without awaiting completion — the send stays in-flight.
        // setSendingCustomer(true) runs synchronously before the first await in
        // sendToCustomer, so React commits the re-render before act() returns.
        act(() => {
            fireEvent.click(sendBtn);
        });

        // The button text should now read "Sending…"
        await waitFor(() =>
            expect(screen.getByText(/Sending/)).toBeInTheDocument()
        );

        // Release the held response and let the component settle.
        await act(async () => {
            resolveSend?.();
            await new Promise(r => setTimeout(r, 50));
        });
    });
});
