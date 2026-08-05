import React, { createRef } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ImageViewerModal from "../ImageViewerModal";

// Mock react-bootstrap Modal family.
// Modal.Header receives `closeButton` but react-bootstrap normally wires
// its x button to the parent Modal's `onHide` via internal context.
// We replicate that with a tiny React context so clicking the mock close
// button triggers the same `onHide` the real library would call.
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

    MockModal.Body = ({ children }) => (
        <div data-testid="modal-body">{children}</div>
    );

    return { Modal: MockModal };
});

afterEach(() => jest.restoreAllMocks());

describe("ImageViewerModal", () => {
    const images = [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
    ];

    // ------------------------------------------------------------------ //
    // 1. Renders when show=true (opened via ref)
    // ------------------------------------------------------------------ //
    test("1. renders modal when ref.open() is called", () => {
        const ref = createRef();
        render(<ImageViewerModal ref={ref} images={images} />);

        act(() => {
            ref.current.open(0);
        });

        expect(screen.getByTestId("modal")).toBeInTheDocument();
    });

    // ------------------------------------------------------------------ //
    // 2. Does not render when show=false (before open() is called)
    // ------------------------------------------------------------------ //
    test("2. does not render modal before ref.open() is called", () => {
        const ref = createRef();
        render(<ImageViewerModal ref={ref} images={images} />);

        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });

    // ------------------------------------------------------------------ //
    // 3. Displays the image at the provided URL
    // ------------------------------------------------------------------ //
    test("3. displays an image element when the modal is open", () => {
        const ref = createRef();
        render(<ImageViewerModal ref={ref} images={images} />);

        act(() => {
            ref.current.open(0);
        });

        expect(screen.getByRole("img")).toBeInTheDocument();
    });

    // ------------------------------------------------------------------ //
    // 4. Close button closes the modal (equivalent to calling onClose)
    // ------------------------------------------------------------------ //
    test("4. close button closes the modal", () => {
        const ref = createRef();
        render(<ImageViewerModal ref={ref} images={images} />);

        act(() => {
            ref.current.open(0);
        });
        expect(screen.getByTestId("modal")).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("close-button"));

        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });

    // ------------------------------------------------------------------ //
    // 5. Image has correct src attribute
    // ------------------------------------------------------------------ //
    test("5. image src matches the URL passed in images prop at the opened index", () => {
        const ref = createRef();
        render(<ImageViewerModal ref={ref} images={images} />);

        act(() => {
            ref.current.open(0);
        });

        expect(screen.getByRole("img")).toHaveAttribute("src", images[0]);
    });

    // ------------------------------------------------------------------ //
    // Bonus: opening at index 1 shows the second image
    // ------------------------------------------------------------------ //
    test("6. opens at the correct index when a non-zero startIndex is provided", () => {
        const ref = createRef();
        render(<ImageViewerModal ref={ref} images={images} />);

        act(() => {
            ref.current.open(1);
        });

        expect(screen.getByRole("img")).toHaveAttribute("src", images[1]);
    });

    // ------------------------------------------------------------------ //
    // Bonus: ref.close() hides the modal
    // ------------------------------------------------------------------ //
    test("7. ref.close() hides the modal", () => {
        const ref = createRef();
        render(<ImageViewerModal ref={ref} images={images} />);

        act(() => {
            ref.current.open(0);
        });
        expect(screen.getByTestId("modal")).toBeInTheDocument();

        act(() => {
            ref.current.close();
        });
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });

    // ------------------------------------------------------------------ //
    // Bonus: shows fallback text when images array is empty
    // ------------------------------------------------------------------ //
    test("8. shows fallback message when images array is empty", () => {
        const ref = createRef();
        render(<ImageViewerModal ref={ref} images={[]} />);

        act(() => {
            ref.current.open(0);
        });

        expect(screen.getByText("No images to display")).toBeInTheDocument();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
});
