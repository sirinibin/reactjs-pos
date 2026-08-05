import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import StatsSummary from '../StatsSummary';

// ---------------------------------------------------------------------------
// react-bootstrap mock
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => {
    const React = require('react');

    const ModalCtx = React.createContext({});

    const Modal = ({ show, onHide, children }) => {
        if (!show) return null;
        return (
            <ModalCtx.Provider value={{ onHide }}>
                <div data-testid="modal">{children}</div>
            </ModalCtx.Provider>
        );
    };

    Modal.Header = ({ children, closeButton }) => {
        const { onHide } = React.useContext(ModalCtx);
        return (
            <div data-testid="modal-header">
                {children}
                {closeButton && (
                    <button type="button" aria-label="Close" onClick={onHide}>x</button>
                )}
            </div>
        );
    };

    Modal.Title = ({ children }) => <div data-testid="modal-title">{children}</div>;
    Modal.Body = ({ children }) => <div data-testid="modal-body">{children}</div>;
    Modal.Footer = ({ children }) => <div data-testid="modal-footer">{children}</div>;

    const Button = ({ children, onClick, disabled, title, variant }) => (
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

    const OverlayTrigger = ({ children, overlay, show }) => (
        <>
            {children}
            {show && overlay}
        </>
    );

    const Popover = ({ children, id }) => (
        <div data-testid={`popover-${id}`}>{children}</div>
    );
    Popover.Header = ({ children }) => <div>{children}</div>;
    Popover.Body = ({ children, onClick, onMouseEnter, onMouseLeave }) => (
        <div onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            {children}
        </div>
    );

    return { Modal, Button, OverlayTrigger, Popover };
});

// ---------------------------------------------------------------------------
// react-beautiful-dnd mock — passthrough wrappers
// ---------------------------------------------------------------------------
jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }) => children,
    Droppable: ({ children }) =>
        children(
            { innerRef: () => { }, droppableProps: {}, placeholder: null },
            {}
        ),
    Draggable: ({ children }) =>
        children(
            { innerRef: () => { }, draggableProps: {}, dragHandleProps: {} },
            {}
        ),
}));

// ---------------------------------------------------------------------------
// pdfGenerator mock
// NOTE: variables must start with "mock" so Jest's hoist allows them in the factory.
// ---------------------------------------------------------------------------
const mockSave = jest.fn();
const mockAutoPrint = jest.fn();
const mockOutput = jest.fn(() => new Blob(['pdf'], { type: 'application/pdf' }));
const mockDoc = { save: mockSave, autoPrint: mockAutoPrint, output: mockOutput };

jest.mock('../pdfGenerator', () => ({
    generateInfoPdf: jest.fn(() => mockDoc),
    generateSectionPdf: jest.fn(() => mockDoc),
    safeName: jest.fn((s) => s),
}));

// ---------------------------------------------------------------------------
// pdfShare mock
// ---------------------------------------------------------------------------
jest.mock('../pdfShare', () => ({
    uploadPdfForShare: jest.fn(),
}));

// ---------------------------------------------------------------------------
// WhatsAppModal mock
// ---------------------------------------------------------------------------
jest.mock('../WhatsAppModal', () => () => null);

// ---------------------------------------------------------------------------
// amount.js mock
// ---------------------------------------------------------------------------
jest.mock('../amount.js', () => ({ amount }) => <span data-testid="amount">{amount}</span>);

// ---------------------------------------------------------------------------
// numberUtils mock (used internally by the component)
// ---------------------------------------------------------------------------
jest.mock('../numberUtils', () => ({
    trimTo2Decimals: (v) => v,
    addCommasToInfoValue: (v) => String(v ?? ''),
    stripSarBreakdown: (v) => v,
}));

// ---------------------------------------------------------------------------
// Grab mocked function refs after jest.mock declarations
// ---------------------------------------------------------------------------
import { generateInfoPdf, generateSectionPdf } from '../pdfGenerator';
import { uploadPdfForShare } from '../pdfShare';

// ---------------------------------------------------------------------------
// Shared sample props
// ---------------------------------------------------------------------------
const sampleStats = { Revenue: 1000, Expenses: 200, Profit: 800 };
const sampleTitle = 'Financial Summary';
const sampleKey = 'test-stats';

function renderSummary(overrides = {}) {
    const onToggle = jest.fn();
    const utils = render(
        <StatsSummary
            stats={sampleStats}
            title={sampleTitle}
            storageKey={sampleKey}
            onToggle={onToggle}
            {...overrides}
        />
    );
    return { onToggle, ...utils };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    // CRA's jest config sets resetMocks: true, which strips the
    // implementation set inside the jest.mock() factory before every test,
    // so it must be re-established here.
    generateInfoPdf.mockReturnValue(mockDoc);
    generateSectionPdf.mockReturnValue(mockDoc);
    mockOutput.mockReturnValue(new Blob(['pdf'], { type: 'application/pdf' }));
});

afterEach(() => {
    jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: find the gear settings button by its bi-gear icon class
// ---------------------------------------------------------------------------
function findGearButton() {
    return screen.getAllByRole('button').find((b) => {
        const i = b.querySelector('i');
        return i && i.classList.contains('bi-gear');
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('StatsSummary', () => {

    // 1. Toggle button shows "Show [title]" initially
    test('renders the toggle button with "Show [title]" text initially', () => {
        renderSummary();
        expect(screen.getByRole('button', { name: `Show ${sampleTitle}` })).toBeInTheDocument();
    });

    // 2. Toggle button text changes to "Hide [title]" when open
    test('toggle button changes to "Hide [title]" when open', () => {
        renderSummary();
        fireEvent.click(screen.getByRole('button', { name: `Show ${sampleTitle}` }));
        expect(screen.getByRole('button', { name: `Hide ${sampleTitle}` })).toBeInTheDocument();
    });

    // 3. onToggle prop is called with new open state
    test('onToggle prop is called with new open state', () => {
        const { onToggle } = renderSummary();
        fireEvent.click(screen.getByRole('button', { name: `Show ${sampleTitle}` }));
        expect(onToggle).toHaveBeenCalledWith(true);
    });

    // 4. Stats section is hidden initially
    test('stats section is hidden initially', () => {
        renderSummary();
        // The h4 heading with the title only renders after opening
        expect(screen.queryByRole('heading', { name: sampleTitle })).not.toBeInTheDocument();
        // No Amount components should be rendered while closed
        expect(screen.queryAllByTestId('amount')).toHaveLength(0);
    });

    // 5. After clicking toggle, stats values appear
    test('after clicking toggle, stats values appear', () => {
        renderSummary();
        fireEvent.click(screen.getByRole('button', { name: `Show ${sampleTitle}` }));
        const amounts = screen.getAllByTestId('amount');
        expect(amounts.length).toBeGreaterThan(0);
    });

    // 6. Each stat label is rendered after opening
    test('each stat label is rendered after opening', () => {
        renderSummary();
        fireEvent.click(screen.getByRole('button', { name: `Show ${sampleTitle}` }));
        expect(screen.getByText(/Revenue/)).toBeInTheDocument();
        expect(screen.getByText(/Expenses/)).toBeInTheDocument();
        expect(screen.getByText(/Profit/)).toBeInTheDocument();
    });

    // 7. Each stat value is rendered as Amount component
    test('each stat value is rendered as Amount component', () => {
        renderSummary();
        fireEvent.click(screen.getByRole('button', { name: `Show ${sampleTitle}` }));
        const amounts = screen.getAllByTestId('amount');
        const renderedValues = amounts.map((el) => Number(el.textContent));
        expect(renderedValues).toEqual(expect.arrayContaining([1000, 200, 800]));
    });

    // 8. Settings modal opens when gear button is clicked (after toggle open)
    test('settings modal opens when gear button is clicked after toggle open', () => {
        renderSummary();
        fireEvent.click(screen.getByRole('button', { name: `Show ${sampleTitle}` }));
        const gearBtn = findGearButton();
        expect(gearBtn).toBeTruthy();
        fireEvent.click(gearBtn);
        expect(screen.getByTestId('modal')).toBeInTheDocument();
        expect(screen.getByText(`Customize ${sampleTitle} Summary`)).toBeInTheDocument();
    });

    // 9. Restore to Defaults button in settings modal calls setLeftFields/setRightFields with defaults
    test('Restore to Defaults button resets fields in settings modal', () => {
        renderSummary();
        fireEvent.click(screen.getByRole('button', { name: `Show ${sampleTitle}` }));
        fireEvent.click(findGearButton());
        const restoreBtn = screen.getByRole('button', { name: /Restore to Defaults/i });
        expect(restoreBtn).toBeInTheDocument();
        fireEvent.click(restoreBtn);
        // After restore, labels should still be present in the open modal
        // (both the summary section and the settings modal show "Revenue").
        expect(screen.getAllByText(/Revenue/).length).toBeGreaterThan(0);
        // localStorage should be updated to the defaults
        const stored = JSON.parse(localStorage.getItem(`${sampleKey}_stats_summary`));
        const allLabels = [...stored.left, ...stored.right].map((f) => f.label);
        expect(allLabels).toEqual(expect.arrayContaining(['Revenue', 'Expenses', 'Profit']));
    });

    // 10. Stats persisted to localStorage with storageKey
    test('stats configuration is persisted to localStorage with storageKey', () => {
        renderSummary();
        const stored = localStorage.getItem(`${sampleKey}_stats_summary`);
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored);
        expect(parsed).toHaveProperty('left');
        expect(parsed).toHaveProperty('right');
        const allLabels = [...parsed.left, ...parsed.right].map((f) => f.label);
        expect(allLabels).toEqual(expect.arrayContaining(['Revenue', 'Expenses', 'Profit']));
    });

    // 11. Existing localStorage config is loaded on mount
    test('existing localStorage config is loaded on mount', () => {
        const savedConfig = {
            left: [{ label: 'Revenue', value: 1000, visible: true }],
            right: [
                { label: 'Expenses', value: 200, visible: false },
                { label: 'Profit', value: 800, visible: true },
            ],
        };
        localStorage.setItem(`${sampleKey}_stats_summary`, JSON.stringify(savedConfig));
        renderSummary();
        const stored = JSON.parse(localStorage.getItem(`${sampleKey}_stats_summary`));
        expect(stored.left.some((f) => f.label === 'Revenue')).toBe(true);
        // Expenses was saved with visible: false — should survive the load
        const expensesField = stored.right.find((f) => f.label === 'Expenses');
        expect(expensesField).toBeTruthy();
        expect(expensesField.visible).toBe(false);
    });

    // 12. Stats from object-format statsWithInfo are correctly rendered
    test('stats from object-format statsWithInfo are correctly rendered', () => {
        renderSummary({
            statsWithInfo: {
                Revenue: 'Total revenue from sales',
                Expenses: 'Total operating costs',
            },
        });
        fireEvent.click(screen.getByRole('button', { name: `Show ${sampleTitle}` }));
        expect(screen.getByText(/Revenue/)).toBeInTheDocument();
        expect(screen.getByText(/Expenses/)).toBeInTheDocument();
    });

    // 13. Stats from array-format statsWithInfo are correctly rendered
    test('stats from array-format statsWithInfo are correctly rendered', () => {
        renderSummary({
            statsWithInfo: [
                { label: 'Revenue', info: 'Total revenue from sales', value: 1000 },
                { label: 'Expenses', info: 'Total operating costs', value: 200 },
            ],
        });
        fireEvent.click(screen.getByRole('button', { name: `Show ${sampleTitle}` }));
        expect(screen.getByText(/Revenue/)).toBeInTheDocument();
        expect(screen.getByText(/Expenses/)).toBeInTheDocument();
        const amounts = screen.getAllByTestId('amount');
        const values = amounts.map((el) => Number(el.textContent));
        expect(values).toEqual(expect.arrayContaining([1000, 200]));
    });

    // 14. statsDefaultVisibility controls initial visibility
    test('statsDefaultVisibility controls initial visibility of fields', () => {
        renderSummary({
            statsDefaultVisibility: { Revenue: false, Expenses: true, Profit: true },
        });
        renderSummary();
        // Check the stored config reflects the visibility set by statsDefaultVisibility
        // (first render with visibility props writes to localStorage)
        const stored = JSON.parse(localStorage.getItem(`${sampleKey}_stats_summary`));
        const allFields = [...stored.left, ...stored.right];
        const revenueField = allFields.find((f) => f.label === 'Revenue');
        expect(revenueField).toBeTruthy();
        expect(revenueField.visible).toBe(false);
    });

    // 15. Download button calls generateSectionPdf and doc.save
    test('download button calls generateSectionPdf and doc.save', async () => {
        renderSummary();
        fireEvent.click(screen.getByRole('button', { name: `Show ${sampleTitle}` }));
        const downloadBtn = screen.getByTitle('Download PDF');
        await act(async () => {
            fireEvent.click(downloadBtn);
        });
        expect(generateSectionPdf).toHaveBeenCalled();
        expect(mockSave).toHaveBeenCalled();
    });

    // 16. Print button calls generateSectionPdf and doc.autoPrint
    test('print button calls generateSectionPdf and doc.autoPrint', () => {
        renderSummary();
        fireEvent.click(screen.getByRole('button', { name: `Show ${sampleTitle}` }));
        const printBtn = screen.getByTitle('Print A4');
        fireEvent.click(printBtn);
        expect(generateSectionPdf).toHaveBeenCalled();
        expect(mockAutoPrint).toHaveBeenCalled();
    });

    // 17. WhatsApp share button calls generateSectionPdf and uploadPdfForShare
    test('WhatsApp share button calls generateSectionPdf and uploadPdfForShare', async () => {
        uploadPdfForShare.mockResolvedValue('https://example.com/shared.pdf');
        renderSummary();
        fireEvent.click(screen.getByRole('button', { name: `Show ${sampleTitle}` }));
        const waBtn = screen.getByTitle('Share via WhatsApp');
        await act(async () => {
            fireEvent.click(waBtn);
        });
        expect(generateSectionPdf).toHaveBeenCalled();
        expect(mockOutput).toHaveBeenCalledWith('blob');
        await waitFor(() => {
            expect(uploadPdfForShare).toHaveBeenCalled();
        });
    });
});
