import React, { createRef } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ImageViewerModal from "../ImageViewerModal";

// Modal mock that forwards event handlers and style so drag/cursor tests work.
jest.mock("react-bootstrap", () => {
    const React = require("react");
    const ModalContext = React.createContext(null);

    const MockModal = ({ show, onHide, children }) => {
        if (!show) return null;
        return (
            <ModalContext.Provider value={{ onHide }}>
                <div data-testid="modal">{children}</div>
            </ModalContext.Provider>
        );
    };

    MockModal.Header = ({ closeButton, children }) => {
        const ctx = React.useContext(ModalContext);
        return (
            <div data-testid="modal-header">
                {closeButton && (
                    <button
                        data-testid="close-button"
                        aria-label="Close"
                        onClick={ctx ? ctx.onHide : undefined}
                    >
                        Close
                    </button>
                )}
                {children}
            </div>
        );
    };

    // Spread all props so onMouseMove/onMouseUp/onMouseLeave/style reach the DOM node.
    MockModal.Body = ({ children, ...rest }) => (
        <div data-testid="modal-body" {...rest}>{children}</div>
    );

    return { Modal: MockModal };
});

afterEach(() => jest.restoreAllMocks());

// ─── helpers ────────────────────────────────────────────────────────────────

function setup(images = ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]) {
    const ref = createRef();
    render(<ImageViewerModal ref={ref} images={images} />);
    return ref;
}

function open(ref, index = 0) {
    act(() => { ref.current.open(index); });
}

function img() { return screen.getByRole("img"); }
function body() { return screen.getByTestId("modal-body"); }
function zoomInBtn() { return screen.getByText("+"); }
function zoomOutBtn() { return screen.getByText("−"); }
function resetBtn() { return screen.getByText("Reset"); }
function prevBtn() { return screen.getByText("←"); }
function nextBtn() { return screen.getByText("→"); }

// ─── 1. Mount / visibility ───────────────────────────────────────────────────

describe("1. mount / visibility", () => {
    test("does not render before open() is called", () => {
        setup();
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });

    test("renders after ref.open()", () => {
        const ref = setup();
        open(ref);
        expect(screen.getByTestId("modal")).toBeInTheDocument();
    });

    test("hides after ref.close()", () => {
        const ref = setup();
        open(ref);
        act(() => { ref.current.close(); });
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });

    test("hides after clicking the close button", () => {
        const ref = setup();
        open(ref);
        fireEvent.click(screen.getByTestId("close-button"));
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });

    test("shows fallback text and no image when images array is empty", () => {
        const ref = setup([]);
        open(ref);
        expect(screen.getByText("No images to display")).toBeInTheDocument();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
});

// ─── 2. Image source / navigation ───────────────────────────────────────────

describe("2. image source / navigation", () => {
    const images = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
        "https://example.com/photo3.jpg",
    ];

    test("shows the image at startIndex 0", () => {
        const ref = setup(images);
        open(ref, 0);
        expect(img()).toHaveAttribute("src", images[0]);
    });

    test("opens at a non-zero startIndex", () => {
        const ref = setup(images);
        open(ref, 1);
        expect(img()).toHaveAttribute("src", images[1]);
    });

    test("next button advances to the next image", () => {
        const ref = setup(images);
        open(ref, 0);
        fireEvent.click(nextBtn());
        expect(img()).toHaveAttribute("src", images[1]);
    });

    test("next button wraps from last to first image", () => {
        const ref = setup(images);
        open(ref, images.length - 1);
        fireEvent.click(nextBtn());
        expect(img()).toHaveAttribute("src", images[0]);
    });

    test("prev button goes to the previous image", () => {
        const ref = setup(images);
        open(ref, 1);
        fireEvent.click(prevBtn());
        expect(img()).toHaveAttribute("src", images[0]);
    });

    test("prev button wraps from first to last image", () => {
        const ref = setup(images);
        open(ref, 0);
        fireEvent.click(prevBtn());
        expect(img()).toHaveAttribute("src", images[images.length - 1]);
    });
});

// ─── 3. Zoom controls ───────────────────────────────────────────────────────

describe("3. zoom controls", () => {
    test("initial transform is translate(0px, 0px) scale(1)", () => {
        const ref = setup();
        open(ref);
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1)");
    });

    test("zoom-in button increases scale by 0.25", () => {
        const ref = setup();
        open(ref);
        fireEvent.click(zoomInBtn());
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1.25)");
    });

    test("zoom-in button is clamped at scale 3", () => {
        const ref = setup();
        open(ref);
        // 8 clicks: 1 → 3 in steps of 0.25 = 8 steps needed
        for (let i = 0; i < 10; i++) fireEvent.click(zoomInBtn());
        expect(img().style.transform).toBe("translate(0px, 0px) scale(3)");
    });

    test("zoom-out button decreases scale by 0.25", () => {
        const ref = setup();
        open(ref);
        fireEvent.click(zoomInBtn()); // 1.25
        fireEvent.click(zoomInBtn()); // 1.50
        fireEvent.click(zoomOutBtn()); // 1.25
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1.25)");
    });

    test("zoom-out button is clamped at scale 1", () => {
        const ref = setup();
        open(ref);
        // Already at 1, clicking out should stay at 1
        fireEvent.click(zoomOutBtn());
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1)");
    });

    test("reset button restores scale to 1", () => {
        const ref = setup();
        open(ref);
        fireEvent.click(zoomInBtn());
        fireEvent.click(zoomInBtn());
        fireEvent.click(resetBtn());
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1)");
    });

    test("ref.open() resets zoom to 1", () => {
        const ref = setup();
        open(ref);
        fireEvent.click(zoomInBtn());
        open(ref); // re-open
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1)");
    });

    test("navigating to next image resets zoom to 1", () => {
        const ref = setup();
        open(ref);
        fireEvent.click(zoomInBtn());
        fireEvent.click(nextBtn());
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1)");
    });

    test("navigating to prev image resets zoom to 1", () => {
        const ref = setup();
        open(ref);
        fireEvent.click(zoomInBtn());
        fireEvent.click(prevBtn());
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1)");
    });
});

// ─── 4. Drag-to-pan ─────────────────────────────────────────────────────────

describe("4. drag-to-pan", () => {
    function zoomTo(steps = 4) {
        for (let i = 0; i < steps; i++) fireEvent.click(zoomInBtn()); // 4 steps → scale 2
    }

    test("mousedown on image when zoom=1 does not change transform", () => {
        const ref = setup();
        open(ref);
        // zoom is 1 — mousedown should be a no-op for pan
        fireEvent.mouseDown(img(), { clientX: 100, clientY: 100 });
        fireEvent.mouseMove(body(), { clientX: 200, clientY: 200 });
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1)");
    });

    test("dragging when zoomed in translates the image", () => {
        const ref = setup();
        open(ref);
        zoomTo(4); // scale 2
        fireEvent.mouseDown(img(), { clientX: 100, clientY: 100 });
        fireEvent.mouseMove(body(), { clientX: 150, clientY: 130 });
        expect(img().style.transform).toBe("translate(50px, 30px) scale(2)");
    });

    test("drag accumulates correctly from a non-zero pan origin", () => {
        const ref = setup();
        open(ref);
        zoomTo(4); // scale 2
        // First drag: +50, +30
        fireEvent.mouseDown(img(), { clientX: 0, clientY: 0 });
        fireEvent.mouseMove(body(), { clientX: 50, clientY: 30 });
        fireEvent.mouseUp(body());
        // Second drag from current pan
        fireEvent.mouseDown(img(), { clientX: 0, clientY: 0 });
        fireEvent.mouseMove(body(), { clientX: 20, clientY: 10 });
        expect(img().style.transform).toBe("translate(70px, 40px) scale(2)");
    });

    test("mouseup on body stops dragging (further moves have no effect)", () => {
        const ref = setup();
        open(ref);
        zoomTo(4); // scale 2
        fireEvent.mouseDown(img(), { clientX: 0, clientY: 0 });
        fireEvent.mouseMove(body(), { clientX: 50, clientY: 50 });
        fireEvent.mouseUp(body());
        // Move after releasing — should not change pan
        fireEvent.mouseMove(body(), { clientX: 200, clientY: 200 });
        expect(img().style.transform).toBe("translate(50px, 50px) scale(2)");
    });

    test("mouseleave on body stops dragging", () => {
        const ref = setup();
        open(ref);
        zoomTo(4); // scale 2
        fireEvent.mouseDown(img(), { clientX: 0, clientY: 0 });
        fireEvent.mouseMove(body(), { clientX: 40, clientY: 20 });
        fireEvent.mouseLeave(body());
        // Move after leave — should not change pan
        fireEvent.mouseMove(body(), { clientX: 200, clientY: 200 });
        expect(img().style.transform).toBe("translate(40px, 20px) scale(2)");
    });

    test("pan is reset to (0, 0) when zoom-out reaches scale 1", () => {
        const ref = setup();
        open(ref);
        zoomTo(1); // scale 1.25
        fireEvent.mouseDown(img(), { clientX: 0, clientY: 0 });
        fireEvent.mouseMove(body(), { clientX: 50, clientY: 50 });
        fireEvent.mouseUp(body());
        fireEvent.click(zoomOutBtn()); // back to 1
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1)");
    });

    test("pan is reset to (0, 0) when Reset button is clicked", () => {
        const ref = setup();
        open(ref);
        zoomTo(4); // scale 2
        fireEvent.mouseDown(img(), { clientX: 0, clientY: 0 });
        fireEvent.mouseMove(body(), { clientX: 80, clientY: 60 });
        fireEvent.mouseUp(body());
        fireEvent.click(resetBtn());
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1)");
    });

    test("pan resets when navigating to next image", () => {
        const ref = setup();
        open(ref);
        zoomTo(4); // scale 2
        fireEvent.mouseDown(img(), { clientX: 0, clientY: 0 });
        fireEvent.mouseMove(body(), { clientX: 80, clientY: 60 });
        fireEvent.mouseUp(body());
        fireEvent.click(nextBtn());
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1)");
    });

    test("pan resets when navigating to prev image", () => {
        const ref = setup();
        open(ref, 1);
        zoomTo(4); // scale 2
        fireEvent.mouseDown(img(), { clientX: 0, clientY: 0 });
        fireEvent.mouseMove(body(), { clientX: 80, clientY: 60 });
        fireEvent.mouseUp(body());
        fireEvent.click(prevBtn());
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1)");
    });

    test("pan resets when modal is reopened via ref.open()", () => {
        const ref = setup();
        open(ref);
        zoomTo(4); // scale 2
        fireEvent.mouseDown(img(), { clientX: 0, clientY: 0 });
        fireEvent.mouseMove(body(), { clientX: 80, clientY: 60 });
        fireEvent.mouseUp(body());
        open(ref); // re-open resets state
        expect(img().style.transform).toBe("translate(0px, 0px) scale(1)");
    });
});

// ─── 5. Cursor style ────────────────────────────────────────────────────────

describe("5. cursor style", () => {
    function zoomTo(steps = 4) {
        for (let i = 0; i < steps; i++) fireEvent.click(zoomInBtn());
    }

    test("cursor is 'default' at zoom=1", () => {
        const ref = setup();
        open(ref);
        expect(body().style.cursor).toBe("default");
    });

    test("cursor is 'grab' when zoomed in and not dragging", () => {
        const ref = setup();
        open(ref);
        zoomTo(4); // scale 2
        expect(body().style.cursor).toBe("grab");
    });

    test("cursor is 'grabbing' while dragging", () => {
        const ref = setup();
        open(ref);
        zoomTo(4); // scale 2
        fireEvent.mouseDown(img(), { clientX: 0, clientY: 0 });
        expect(body().style.cursor).toBe("grabbing");
    });

    test("cursor returns to 'grab' after releasing the mouse", () => {
        const ref = setup();
        open(ref);
        zoomTo(4); // scale 2
        fireEvent.mouseDown(img(), { clientX: 0, clientY: 0 });
        fireEvent.mouseUp(body());
        expect(body().style.cursor).toBe("grab");
    });

    test("cursor returns to 'default' after reset zoom", () => {
        const ref = setup();
        open(ref);
        zoomTo(4); // scale 2
        fireEvent.click(resetBtn());
        expect(body().style.cursor).toBe("default");
    });
});

// ─── 6. Transition style ────────────────────────────────────────────────────

describe("6. transition style", () => {
    test("transition is smooth when not dragging", () => {
        const ref = setup();
        open(ref);
        expect(img().style.transition).toBe("transform 0.2s ease");
    });

    test("transition is 'none' while actively dragging (no animation lag)", () => {
        const ref = setup();
        open(ref);
        for (let i = 0; i < 4; i++) fireEvent.click(zoomInBtn()); // scale 2
        fireEvent.mouseDown(img(), { clientX: 0, clientY: 0 });
        expect(img().style.transition).toBe("none");
    });

    test("transition is restored after releasing the mouse", () => {
        const ref = setup();
        open(ref);
        for (let i = 0; i < 4; i++) fireEvent.click(zoomInBtn()); // scale 2
        fireEvent.mouseDown(img(), { clientX: 0, clientY: 0 });
        fireEvent.mouseUp(body());
        expect(img().style.transition).toBe("transform 0.2s ease");
    });
});

// ─── 7. Image attributes ────────────────────────────────────────────────────

describe("7. image attributes", () => {
    test("img has draggable=false to prevent browser native drag interfering", () => {
        const ref = setup();
        open(ref);
        expect(img()).toHaveAttribute("draggable", "false");
    });
});

// ─── 8. Keyboard / ESC ──────────────────────────────────────────────────────

describe("8. Escape key", () => {
    test("Escape key closes the modal", () => {
        const ref = setup();
        open(ref);
        fireEvent.keyDown(document, { key: "Escape" });
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });
});
