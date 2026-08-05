import React, { createRef } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Purchases from "../purchases";

// Mock CSS import so Jest doesn't choke on it
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// Mock react-bootstrap — Modal conditionally renders children based on show prop
jest.mock("react-bootstrap", () => {
    const Modal = ({ show, children }) =>
        show ? <div data-testid="modal">{children}</div> : null;
    Modal.Header = ({ children }) => (
        <div data-testid="modal-header">{children}</div>
    );
    Modal.Title = ({ children }) => (
        <span data-testid="modal-title">{children}</span>
    );
    Modal.Body = ({ children }) => (
        <div data-testid="modal-body">{children}</div>
    );
    return { Modal };
});

// Mock react-draggable as a passthrough so the dialogAs render path doesn't break
jest.mock("react-draggable", () => ({
    __esModule: true,
    default: ({ children }) => <>{children}</>,
}));

// Mock PurchaseIndex — renders a button that triggers onSelectPurchase so
// tests can drive selection without importing the real component tree.
// It also surfaces selectedVendors via a data attribute for assertion.
jest.mock("../../purchase/index.js", () => {
    const React = require("react");
    return function MockPurchaseIndex({
        onSelectPurchase,
        selectedVendors,
        enableSelection,
    }) {
        return (
            <div
                data-testid="purchase-index"
                data-vendors={JSON.stringify(selectedVendors || [])}
                data-enable-selection={String(enableSelection)}
            >
                <button
                    data-testid="purchase-select-trigger"
                    onClick={() =>
                        onSelectPurchase &&
                        onSelectPurchase({ id: "test-purchase" })
                    }
                >
                    Select
                </button>
            </div>
        );
    };
});

// ─── helpers ────────────────────────────────────────────────────────────────

function renderPurchases(extraProps = {}) {
    const ref = createRef();
    const utils = render(
        <Purchases ref={ref} onSelectPurchase={jest.fn()} {...extraProps} />
    );
    return { ref, ...utils };
}

// ─── suite ──────────────────────────────────────────────────────────────────

describe("Purchases modal component", () => {
    afterEach(() => jest.restoreAllMocks());

    // 1. Smoke test
    test("1. renders without crashing", () => {
        expect(() => renderPurchases()).not.toThrow();
    });

    // 2. Initially hidden
    test("2. modal is initially hidden", () => {
        renderPurchases();
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });

    // 3. open(false) → "Purchases" title
    test('3. after open(false, [], []), modal shows "Purchases" title', () => {
        const { ref } = renderPurchases();
        act(() => {
            ref.current.open(false, [], []);
        });
        expect(screen.getByTestId("modal-title")).toHaveTextContent("Purchases");
    });

    // 4. open(true) → "Select Purchase" title
    test('4. after open(true, [], []), modal shows "Select Purchase" title', () => {
        const { ref } = renderPurchases();
        act(() => {
            ref.current.open(true, [], []);
        });
        expect(screen.getByTestId("modal-title")).toHaveTextContent(
            "Select Purchase"
        );
    });

    // 5. Close button hides the modal
    test("5. close button hides the modal", () => {
        const { ref } = renderPurchases();
        act(() => {
            ref.current.open(false, [], []);
        });
        expect(screen.getByTestId("modal")).toBeInTheDocument();

        const closeBtn = document.querySelector(".btn-close");
        fireEvent.click(closeBtn);

        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });

    // 6. onSelectPurchase prop is called when PurchaseIndex triggers selection
    test("6. onSelectPurchase prop called when PurchaseIndex triggers onSelectPurchase", () => {
        const onSelectPurchase = jest.fn();
        const { ref } = renderPurchases({ onSelectPurchase });
        act(() => {
            ref.current.open(true, [], []);
        });

        fireEvent.click(screen.getByTestId("purchase-select-trigger"));

        expect(onSelectPurchase).toHaveBeenCalledTimes(1);
        expect(onSelectPurchase).toHaveBeenCalledWith({ id: "test-purchase" });
    });

    // 7. Modal closes automatically after a purchase is selected
    test("7. modal closes after selection", () => {
        const { ref } = renderPurchases();
        act(() => {
            ref.current.open(true, [], []);
        });
        expect(screen.getByTestId("modal")).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("purchase-select-trigger"));

        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });

    // 8. selectedVendors forwarded to PurchaseIndex
    test("8. selectedVendors passed through to PurchaseIndex after open", () => {
        const vendors = [{ id: "v1", name: "Vendor A" }];
        const { ref } = renderPurchases();
        act(() => {
            ref.current.open(false, vendors, []);
        });

        const purchaseIndex = screen.getByTestId("purchase-index");
        const passedVendors = JSON.parse(purchaseIndex.dataset.vendors);
        expect(passedVendors).toEqual(vendors);
    });
});
