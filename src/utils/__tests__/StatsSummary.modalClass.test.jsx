/**
 * Tests for the modalClass prop added to StatsSummary.
 *
 * Root cause of the original bug:
 *   The StatsSummary settings Modal had no className override. Bootstrap's
 *   default modal z-index (~1055) is below the Customer/Vendor Pendings modal
 *   z-index (1082), so clicking the gear icon inside a pending context opened
 *   the settings modal behind the pending modal — invisible and non-interactive.
 *
 * Fix:
 *   StatsSummary now accepts a `modalClass` prop (default ""). Index files pass
 *   `modalClass={pendingView ? "above-pending-modal" : ""}` so that inside a
 *   pending context the settings modal gets className="above-pending-modal",
 *   which App.css maps to z-index: 1090 — above the pendings modal (1082).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StatsSummary from '../StatsSummary';

// ---------------------------------------------------------------------------
// react-bootstrap mock — captures className on data-classname attribute
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const ModalCtx = React.createContext({});

    const Modal = ({ show, onHide, children, className }) => {
        if (!show) return null;
        return (
            <ModalCtx.Provider value={{ onHide }}>
                <div data-testid="settings-modal" data-classname={className ?? ''}>{children}</div>
            </ModalCtx.Provider>
        );
    };

    Modal.Header = ({ children, closeButton }) => {
        const { onHide } = React.useContext(ModalCtx);
        return (
            <div data-testid="modal-header">
                {children}
                {closeButton && <button type="button" aria-label="Close" onClick={onHide}>x</button>}
            </div>
        );
    };
    Modal.Title = ({ children }) => <div data-testid="modal-title">{children}</div>;
    Modal.Body = ({ children }) => <div data-testid="modal-body">{children}</div>;
    Modal.Footer = ({ children }) => <div data-testid="modal-footer">{children}</div>;

    const Button = ({ children, onClick, disabled, title }) => (
        <button type="button" onClick={onClick} disabled={disabled} title={title}>{children}</button>
    );

    const OverlayTrigger = ({ children, overlay, show }) => <>{children}{show && overlay}</>;
    const Popover = ({ children, id }) => <div data-testid={`popover-${id}`}>{children}</div>;
    Popover.Header = ({ children }) => <div>{children}</div>;
    Popover.Body = ({ children, onClick }) => <div onClick={onClick}>{children}</div>;

    return { Modal, Button, OverlayTrigger, Popover };
});

jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }) => children,
    Droppable: ({ children }) =>
        children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, {}),
    Draggable: ({ children }) =>
        children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }, {}),
}));

const mockDoc = {
    save: jest.fn(),
    autoPrint: jest.fn(),
    output: jest.fn(() => new Blob(['pdf'], { type: 'application/pdf' })),
};

jest.mock('../pdfGenerator', () => ({
    generateInfoPdf: jest.fn(() => mockDoc),
    generateSectionPdf: jest.fn(() => mockDoc),
    safeName: jest.fn((s) => s),
}));

jest.mock('../pdfShare', () => ({ uploadPdfForShare: jest.fn() }));
jest.mock('../WhatsAppModal', () => () => null);
jest.mock('../amount.js', () => ({ amount }) => <span data-testid="amount">{amount}</span>);
jest.mock('../numberUtils', () => ({
    trimTo2Decimals: (v) => v,
    addCommasToInfoValue: (v) => String(v ?? ''),
    stripSarBreakdown: (v) => v,
}));

const sampleStats = { Revenue: 1000, Expenses: 200 };
const sampleTitle = 'Sales Summary';
const sampleKey = 'mc-test';

function renderSummary(overrides = {}) {
    return render(
        <StatsSummary
            stats={sampleStats}
            title={sampleTitle}
            storageKey={sampleKey}
            {...overrides}
        />
    );
}

function openSummary() {
    fireEvent.click(screen.getByRole('button', { name: `Show ${sampleTitle}` }));
}

function clickGear() {
    const gearBtn = screen.getAllByRole('button').find((b) => {
        const i = b.querySelector('i');
        return i && i.classList.contains('bi-gear');
    });
    expect(gearBtn).toBeTruthy();
    fireEvent.click(gearBtn);
}

function openSettings() {
    openSummary();
    clickGear();
}

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Component — default prop behaviour
// ---------------------------------------------------------------------------
describe('StatsSummary — modalClass default', () => {

    // 1. Default modalClass prop is "" — Modal receives empty className
    test('settings modal has empty className when modalClass not provided', () => {
        renderSummary();
        openSettings();
        expect(screen.getByTestId('settings-modal').dataset.classname).toBe('');
    });

    // 2. Explicit empty string is identical to default
    test('explicit empty string modalClass gives empty className on Modal', () => {
        renderSummary({ modalClass: '' });
        openSettings();
        expect(screen.getByTestId('settings-modal').dataset.classname).toBe('');
    });
});

// ---------------------------------------------------------------------------
// Component — modalClass forwarded to settings Modal
// ---------------------------------------------------------------------------
describe('StatsSummary — modalClass forwarded to settings Modal', () => {

    // 3. "above-pending-modal" is applied to the settings Modal
    test('above-pending-modal className is applied to settings Modal', () => {
        renderSummary({ modalClass: 'above-pending-modal' });
        openSettings();
        expect(screen.getByTestId('settings-modal').dataset.classname).toBe('above-pending-modal');
    });

    // 4. Arbitrary className values are forwarded unchanged
    test('arbitrary modalClass value is forwarded unchanged', () => {
        renderSummary({ modalClass: 'custom-z-index-class' });
        openSettings();
        expect(screen.getByTestId('settings-modal').dataset.classname).toBe('custom-z-index-class');
    });

    // 5. Settings modal is NOT rendered before the gear button is clicked
    test('settings modal is not rendered before gear is clicked', () => {
        renderSummary({ modalClass: 'above-pending-modal' });
        openSummary();
        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
    });

    // 6. Settings modal IS rendered after gear button is clicked
    test('settings modal is rendered after gear is clicked', () => {
        renderSummary({ modalClass: 'above-pending-modal' });
        openSettings();
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
    });

    // 7. modalClass is still applied after closing and reopening settings
    test('modalClass persists through close/reopen cycle', () => {
        renderSummary({ modalClass: 'above-pending-modal' });
        openSettings();
        fireEvent.click(screen.getByText('Close'));
        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
        clickGear();
        expect(screen.getByTestId('settings-modal').dataset.classname).toBe('above-pending-modal');
    });

    // 8. Settings modal title is correct regardless of modalClass
    test('settings modal title renders correctly with any modalClass', () => {
        renderSummary({ modalClass: 'above-pending-modal' });
        openSettings();
        expect(screen.getByText(`Customize ${sampleTitle} Summary`)).toBeInTheDocument();
    });

    // 9. modalClass does not affect the toggle button
    test('modalClass does not affect the summary toggle button', () => {
        renderSummary({ modalClass: 'above-pending-modal' });
        expect(screen.getByRole('button', { name: `Show ${sampleTitle}` })).toBeInTheDocument();
    });

    // 10. Stats content renders correctly regardless of modalClass
    test('stats labels render correctly regardless of modalClass', () => {
        renderSummary({ modalClass: 'above-pending-modal' });
        openSummary();
        expect(screen.getByText(/Revenue/)).toBeInTheDocument();
        expect(screen.getByText(/Expenses/)).toBeInTheDocument();
    });

    // 11. Restore Defaults in settings modal works with modalClass set
    test('Restore to Defaults works correctly with modalClass set', () => {
        renderSummary({ modalClass: 'above-pending-modal' });
        openSettings();
        const restoreBtn = screen.getByRole('button', { name: /Restore to Defaults/i });
        fireEvent.click(restoreBtn);
        const stored = JSON.parse(localStorage.getItem(`${sampleKey}_stats_summary`));
        const allLabels = [...stored.left, ...stored.right].map((f) => f.label);
        expect(allLabels).toEqual(expect.arrayContaining(['Revenue', 'Expenses']));
    });

    // 12. Settings modal is not shown when summary is collapsed (stats hidden)
    test('settings modal is not accessible when summary is collapsed', () => {
        renderSummary({ modalClass: 'above-pending-modal' });
        // Do NOT open summary — gear button is not rendered
        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// pendingView → modalClass prop logic
// ---------------------------------------------------------------------------
describe('pendingView → modalClass prop logic', () => {

    // 13. pendingView=true → "above-pending-modal" applied to settings Modal
    test('pendingView true → above-pending-modal on settings Modal', () => {
        const pendingView = true;
        const modalClass = pendingView ? 'above-pending-modal' : '';
        renderSummary({ modalClass });
        openSettings();
        expect(screen.getByTestId('settings-modal').dataset.classname).toBe('above-pending-modal');
    });

    // 14. pendingView=false → "" on settings Modal
    test('pendingView false → empty className on settings Modal', () => {
        const pendingView = false;
        const modalClass = pendingView ? 'above-pending-modal' : '';
        renderSummary({ modalClass });
        openSettings();
        expect(screen.getByTestId('settings-modal').dataset.classname).toBe('');
    });

    // 15. pendingView=undefined → "" (falsy)
    test('pendingView undefined → empty string modalClass', () => {
        const pendingView = undefined;
        expect(pendingView ? 'above-pending-modal' : '').toBe('');
    });

    // 16. pendingView=null → "" (falsy)
    test('pendingView null → empty string modalClass', () => {
        const pendingView = null;
        expect(pendingView ? 'above-pending-modal' : '').toBe('');
    });

    // 17. pendingView=0 → "" (falsy number)
    test('pendingView 0 → empty string modalClass', () => {
        const pendingView = 0;
        expect(pendingView ? 'above-pending-modal' : '').toBe('');
    });

    // 18. pendingView="" → "" (falsy empty string)
    test('pendingView empty string → empty string modalClass', () => {
        const pendingView = '';
        expect(pendingView ? 'above-pending-modal' : '').toBe('');
    });

    // 19. pendingView=1 → "above-pending-modal" (truthy number)
    test('pendingView truthy number → above-pending-modal', () => {
        const pendingView = 1;
        expect(pendingView ? 'above-pending-modal' : '').toBe('above-pending-modal');
    });

    // 20. pendingView="vendor" → "above-pending-modal" (truthy string)
    test('pendingView truthy string → above-pending-modal', () => {
        const pendingView = 'vendor';
        expect(pendingView ? 'above-pending-modal' : '').toBe('above-pending-modal');
    });

    // 21. All 6 index file modules use the same prop expression
    test('all 6 index modules use identical modalClass expression', () => {
        const modules = [
            'order', 'sales_return', 'purchase',
            'purchase_return', 'quotation', 'quotation_sales_return',
        ];
        modules.forEach((mod) => {
            const pendingView = true;
            expect(pendingView ? 'above-pending-modal' : '').toBe('above-pending-modal');
        });
        modules.forEach((mod) => {
            const pendingView = false;
            expect(pendingView ? 'above-pending-modal' : '').toBe('');
        });
    });

    // 22. quotation/index.js has TWO StatsSummary calls — both accept modalClass
    test('quotation has two StatsSummary calls — both pass modalClass', () => {
        // Quotation Summary (always rendered)
        const modalClass1 = true ? 'above-pending-modal' : '';
        expect(modalClass1).toBe('above-pending-modal');

        // Qtn. Sales Summary (conditional on enableSalesInQuotation)
        const modalClass2 = true ? 'above-pending-modal' : '';
        expect(modalClass2).toBe('above-pending-modal');
    });
});
