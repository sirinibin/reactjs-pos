/**
 * Unit tests for the ServiceCreate-outside-modal change in utils/products.js.
 *
 * Changes:
 *  1. ServiceCreate is now rendered OUTSIDE the <Modal> so it portals to body
 *     as an independent sibling, avoiding z-index stacking-context issues.
 *     It is always mounted (even when the selection modal is hidden).
 *
 *  2. serviceCreateRef — Products holds a ref to ServiceCreate and passes
 *     onOpenCreate={() => serviceCreateRef.current?.open()} to ServiceIndex.
 *
 *  3. serviceRefreshKey — a counter incremented by ServiceCreate's refreshList
 *     prop; passed as refreshTrigger to ServiceIndex so it re-fetches after
 *     a service is created.
 *
 *  4. selectionModalRef — Products holds a ref to the selection <Modal> and sets
 *     z-index 1085 via DOM on show, so pw-modal-wrap (1096) always renders above.
 *
 *  5. DraggableDialog uses position: "absolute" (was "fixed") and no zIndex inline.
 *
 * Source-code checks (no need to render the full component):
 *  - ServiceCreate is before <Modal> in JSX source (outside stacking context)
 *  - DraggableDialog style has position: "absolute"
 *  - DraggableDialog style does NOT have zIndex: 1060
 *  - selectionModalRef z-index is set to 1085 in the useEffect
 */

import React, { createRef } from 'react';
import { render, screen, act } from '@testing-library/react';

// ─── module mocks ─────────────────────────────────────────────────────────────

jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

jest.mock('react-draggable', () => ({
    __esModule: true,
    default: ({ children }) => <>{children}</>,
}));

jest.mock('react-bootstrap', () => {
    const Modal = ({ show, children }) =>
        show ? <div data-testid="modal">{children}</div> : null;
    Modal.Header = ({ children }) => <div data-testid="modal-header">{children}</div>;
    Modal.Title  = ({ children }) => <div data-testid="modal-title">{children}</div>;
    Modal.Body   = ({ children }) => <div data-testid="modal-body">{children}</div>;
    return { Modal };
});

// ServiceCreate: capture props so tests can inspect and trigger callbacks
let capturedServiceCreateProps = {};
jest.mock('../../service/create.js', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: React.forwardRef(function MockServiceCreate(props, _ref) {
            capturedServiceCreateProps = props;
            return <div data-testid="service-create" />;
        }),
    };
});

// ServiceIndex: capture props so tests can inspect
let capturedServiceProps = {};
jest.mock('../../service/index.js', () => ({
    __esModule: true,
    default: function MockServiceIndex(props) {
        capturedServiceProps = props;
        return <div data-testid="service-index" />;
    },
}));

// ProductIndex: capture props
let capturedProductProps = {};
jest.mock('../../product/index.js', () => ({
    __esModule: true,
    default: function MockProductIndex(props) {
        capturedProductProps = props;
        return <div data-testid="product-index" />;
    },
}));

// ─── subject ──────────────────────────────────────────────────────────────────

import Products from '../products.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function renderProducts(extraProps = {}) {
    const ref = createRef();
    const utils = render(<Products ref={ref} {...extraProps} />);
    return { ref, ...utils };
}

// ─── setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
    capturedServiceCreateProps = {};
    capturedServiceProps       = {};
    capturedProductProps       = {};
});

afterEach(() => {
    jest.restoreAllMocks();
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe('Products — ServiceCreate rendered outside the selection modal', () => {
    test('ServiceCreate is in the DOM before the selection modal is opened', () => {
        renderProducts();
        // Modal is hidden (show=false) → selection modal itself is null in DOM
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
        // But ServiceCreate must already be mounted
        expect(screen.getByTestId('service-create')).toBeInTheDocument();
    });

    test('ServiceCreate stays in the DOM when the selection modal is open', () => {
        const { ref } = renderProducts();

        act(() => { ref.current.open(true, '', {}, true); });

        expect(screen.getByTestId('modal')).toBeInTheDocument();
        expect(screen.getByTestId('service-create')).toBeInTheDocument();
    });

    test('ServiceCreate stays in the DOM when the selection modal is closed', () => {
        const { ref } = renderProducts();

        act(() => { ref.current.open(true, '', {}, true); });
        // Close the modal
        act(() => { ref.current.open(true, '', {}, false); });

        expect(screen.getByTestId('service-create')).toBeInTheDocument();
    });
});

describe('Products — onOpenCreate prop forwarded to ServiceIndex', () => {
    test('ServiceIndex receives onOpenCreate as a function in service mode', () => {
        const { ref } = renderProducts();
        act(() => { ref.current.open(true, '', {}, true); });

        expect(typeof capturedServiceProps.onOpenCreate).toBe('function');
    });

    test('calling onOpenCreate does not throw', () => {
        const { ref } = renderProducts();
        act(() => { ref.current.open(true, '', {}, true); });

        expect(() => {
            act(() => { capturedServiceProps.onOpenCreate(); });
        }).not.toThrow();
    });

    test('ProductIndex does NOT receive onOpenCreate (product mode only)', () => {
        const { ref } = renderProducts();
        act(() => { ref.current.open(true, '', {}, false); });

        // ProductIndex should be mounted
        expect(screen.getByTestId('product-index')).toBeInTheDocument();
        // onOpenCreate is a Products-specific concept; ProductIndex doesn't use it
        expect(capturedProductProps.onOpenCreate).toBeUndefined();
    });
});

describe('Products — refreshTrigger passed to ServiceIndex', () => {
    test('ServiceIndex receives refreshTrigger=0 initially', () => {
        const { ref } = renderProducts();
        act(() => { ref.current.open(true, '', {}, true); });

        expect(capturedServiceProps.refreshTrigger).toBe(0);
    });

    test('refreshTrigger increments when ServiceCreate refreshList is called', () => {
        const { ref } = renderProducts();
        act(() => { ref.current.open(true, '', {}, true); });

        const before = capturedServiceProps.refreshTrigger; // 0

        // Simulate ServiceCreate calling back after a service is created
        act(() => { capturedServiceCreateProps.refreshList(); });

        expect(capturedServiceProps.refreshTrigger).toBe(before + 1);
    });

    test('refreshTrigger increments twice after two refreshList calls', () => {
        const { ref } = renderProducts();
        act(() => { ref.current.open(true, '', {}, true); });

        act(() => { capturedServiceCreateProps.refreshList(); });
        act(() => { capturedServiceCreateProps.refreshList(); });

        expect(capturedServiceProps.refreshTrigger).toBe(2);
    });

    test('ServiceCreate receives a refreshList function', () => {
        renderProducts();
        expect(typeof capturedServiceCreateProps.refreshList).toBe('function');
    });
});

describe('Products — source-code checks for DraggableDialog and selectionModalRef', () => {
    const fs   = require('fs');
    const path = require('path');

    const PRODUCTS_JS = fs.readFileSync(
        path.join(__dirname, '../products.js'), 'utf8'
    );

    test('DraggableDialog uses position: "absolute" (not "fixed")', () => {
        expect(PRODUCTS_JS).toMatch(/position\s*:\s*["']absolute["']/);
        expect(PRODUCTS_JS).not.toMatch(/position\s*:\s*["']fixed["']/);
    });

    test('DraggableDialog does NOT hardcode zIndex: 1060 inline', () => {
        expect(PRODUCTS_JS).not.toMatch(/zIndex\s*:\s*1060/);
    });

    test('selectionModalRef z-index is set conditionally: 1096 in pendingView, 1085 otherwise', () => {
        expect(PRODUCTS_JS).toMatch(
            /props\.pendingView\s*\?\s*'1096'\s*:\s*'1085'/
        );
        expect(PRODUCTS_JS).toMatch(
            /selectionModalRef\.current.*dialog.*setProperty.*z-index.*zIndex/s
        );
    });

    test('ServiceCreate is rendered before <Modal in JSX source', () => {
        const scIdx    = PRODUCTS_JS.indexOf('<ServiceCreate');
        const modalIdx = PRODUCTS_JS.indexOf('<Modal ref={selectionModalRef}');
        expect(scIdx).toBeGreaterThan(-1);
        expect(modalIdx).toBeGreaterThan(-1);
        expect(scIdx).toBeLessThan(modalIdx);
    });

    test('ServiceIndex receives both onOpenCreate and refreshTrigger in JSX source', () => {
        expect(PRODUCTS_JS).toMatch(/onOpenCreate=\{/);
        expect(PRODUCTS_JS).toMatch(/refreshTrigger=\{serviceRefreshKey\}/);
    });

    test('serviceRefreshKey is initialised with useState(0)', () => {
        expect(PRODUCTS_JS).toMatch(/serviceRefreshKey.*useState\(0\)/);
    });
});
