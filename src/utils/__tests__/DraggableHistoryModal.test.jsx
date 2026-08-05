import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DraggableHistoryModal from "../DraggableHistoryModal";

// Mock react-bootstrap: Modal renders children only when show=true.
// Sub-components are thin wrappers that pass children through.
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

// Mock react-draggable: render the single child unchanged.
jest.mock("react-draggable", () => ({
    __esModule: true,
    default: ({ children }) => <>{children}</>,
}));

afterEach(() => jest.restoreAllMocks());

describe("DraggableHistoryModal", () => {
    // ── 1. Renders children when show=true ──────────────────────────────────
    test("1. renders children when show=true", () => {
        render(
            <DraggableHistoryModal show={true} onClose={jest.fn()} title="Title">
                <div>Child Content</div>
            </DraggableHistoryModal>
        );
        expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    // ── 2. Children not rendered when show=false ─────────────────────────────
    test("2. children are not rendered when show=false", () => {
        render(
            <DraggableHistoryModal show={false} onClose={jest.fn()} title="Title">
                <div>Child Content</div>
            </DraggableHistoryModal>
        );
        expect(screen.queryByText("Child Content")).not.toBeInTheDocument();
    });

    // ── 3. Title prop is displayed ───────────────────────────────────────────
    // The component nests <Modal.Title> twice, so the title text appears in
    // more than one element. Use getAllByText to avoid the "multiple elements"
    // error and simply assert at least one is present.
    test("3. title prop is displayed in the modal header", () => {
        render(
            <DraggableHistoryModal show={true} onClose={jest.fn()} title="My Modal Title">
                <div>content</div>
            </DraggableHistoryModal>
        );
        const titleNodes = screen.getAllByText("My Modal Title");
        expect(titleNodes.length).toBeGreaterThan(0);
    });

    // ── 4. Close button calls onClose ────────────────────────────────────────
    test("4. close button calls onClose when clicked", () => {
        const onClose = jest.fn();
        render(
            <DraggableHistoryModal show={true} onClose={onClose} title="Title">
                <div>content</div>
            </DraggableHistoryModal>
        );
        // The button has aria-label="Close" so getByRole resolves it correctly.
        fireEvent.click(screen.getByRole("button", { name: /close/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // ── 5. Escape key calls onClose when show=true ───────────────────────────
    test("5. Escape key press calls onClose when show=true", () => {
        const onClose = jest.fn();
        render(
            <DraggableHistoryModal show={true} onClose={onClose} title="Title">
                <div>content</div>
            </DraggableHistoryModal>
        );
        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // ── 6. Escape key does NOT call onClose when show=false ──────────────────
    test("6. Escape key does NOT call onClose when show=false", () => {
        const onClose = jest.fn();
        render(
            <DraggableHistoryModal show={false} onClose={onClose} title="Title">
                <div>content</div>
            </DraggableHistoryModal>
        );
        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).not.toHaveBeenCalled();
    });

    // ── 7. Listener cleaned up when show changes to false ────────────────────
    test("7. Escape key listener is cleaned up when show changes from true to false", () => {
        const onClose = jest.fn();
        const { rerender } = render(
            <DraggableHistoryModal show={true} onClose={onClose} title="Title">
                <div>content</div>
            </DraggableHistoryModal>
        );
        // Transition to hidden — useEffect cleanup removes the listener.
        rerender(
            <DraggableHistoryModal show={false} onClose={onClose} title="Title">
                <div>content</div>
            </DraggableHistoryModal>
        );
        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).not.toHaveBeenCalled();
    });

    // ── 8. No duplicate handlers accumulate on re-renders ────────────────────
    // Each re-render with show=true should remove the old listener and add
    // exactly one new one. Two Escape presses must produce exactly two calls,
    // not four (which would indicate stale duplicate listeners).
    test("8. multiple Escape presses only call onClose once per press (no duplicate handlers)", () => {
        const onClose = jest.fn();
        const { rerender } = render(
            <DraggableHistoryModal show={true} onClose={onClose} title="Title">
                <div>content</div>
            </DraggableHistoryModal>
        );
        // Re-render with show still true — old listener replaced by a single new one.
        rerender(
            <DraggableHistoryModal show={true} onClose={onClose} title="Title">
                <div>content</div>
            </DraggableHistoryModal>
        );
        fireEvent.keyDown(document, { key: "Escape" });
        fireEvent.keyDown(document, { key: "Escape" });
        // Exactly 2 calls (one per press), not 4 from duplicated listeners.
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    // ── 9. Children can be arbitrary JSX content ─────────────────────────────
    test("9. children can be arbitrary JSX content", () => {
        render(
            <DraggableHistoryModal show={true} onClose={jest.fn()} title="Title">
                <table>
                    <tbody>
                        <tr>
                            <td>Row 1</td>
                        </tr>
                    </tbody>
                </table>
                <span>Arbitrary Span</span>
                <input placeholder="Some Input" />
            </DraggableHistoryModal>
        );
        expect(screen.getByText("Row 1")).toBeInTheDocument();
        expect(screen.getByText("Arbitrary Span")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Some Input")).toBeInTheDocument();
    });

    // ── 10. Single click fires onClose exactly once ──────────────────────────
    // Verifies no event-bubbling duplication or double-binding causes extra calls.
    test("10. onClose is only called once when close button is clicked", () => {
        const onClose = jest.fn();
        render(
            <DraggableHistoryModal show={true} onClose={onClose} title="Title">
                <div>content</div>
            </DraggableHistoryModal>
        );
        fireEvent.click(screen.getByRole("button", { name: /close/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
