import React, { createRef } from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import imageCompression from "browser-image-compression";
import ImageGallery from "../ImageGallery";

// ---------------------------------------------------------------------------
// browser-image-compression: identity mock — returns the original file
// ---------------------------------------------------------------------------
jest.mock("browser-image-compression", () =>
    jest.fn((file) => Promise.resolve(file))
);

// ---------------------------------------------------------------------------
// react-bootstrap: Modal, Badge, Button
//
// Modal wires onHide to Modal.Header via React context so that closeButton
// works the same way as the real library.
// ---------------------------------------------------------------------------
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

    MockModal.Footer = ({ children }) => <div>{children}</div>;
    MockModal.Title = ({ children }) => <span>{children}</span>;

    const MockBadge = ({ bg, children }) => (
        <span data-bg={bg}>{children}</span>
    );

    const MockButton = ({ onClick, children, ...rest }) => (
        <button onClick={onClick} {...rest}>
            {children}
        </button>
    );

    return { Modal: MockModal, Badge: MockBadge, Button: MockButton };
});

// ---------------------------------------------------------------------------
// URL.createObjectURL — not available in jsdom; set once, refreshed each test
// ---------------------------------------------------------------------------
beforeAll(() => {
    global.URL.createObjectURL = jest.fn(() => "blob:mock-preview-url");
});

// ---------------------------------------------------------------------------
// Per-test setup
// ---------------------------------------------------------------------------
beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => "application/json" },
        json: () =>
            Promise.resolve({ url: "/uploaded/image.jpg", result: [], images: [] }),
    });
    // Restore createObjectURL in case clearAllMocks wiped the implementation
    global.URL.createObjectURL = jest.fn(() => "blob:mock-preview-url");
    localStorage.clear();
});

afterEach(() => {
    jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Shared props / helper
// ---------------------------------------------------------------------------
const DEFAULT_PROPS = {
    id: "entity-123",
    storeID: "store-456",
    modelName: "product",
    storedImages: [],
};

function renderGallery(extraProps = {}) {
    const ref = createRef();
    const utils = render(
        <ImageGallery ref={ref} {...DEFAULT_PROPS} {...extraProps} />
    );
    return { ref, ...utils };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ImageGallery", () => {
    // 1. Smoke ----------------------------------------------------------------
    test("1. renders without crashing", () => {
        const { container } = renderGallery();
        expect(container.firstChild).toBeInTheDocument();
        // The upload drop-zone label is always visible
        expect(screen.getByText(/click or drag images here/i)).toBeInTheDocument();
    });

    // 2. Lightbox modal is initially hidden -----------------------------------
    test("2. lightbox modal is not visible on initial render", () => {
        renderGallery();
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });

    // 3. ref.current.open() loads images; thumbnail click opens lightbox ------
    test("3. ref.current.open() loads images and clicking a thumbnail opens the lightbox", async () => {
        const { ref } = renderGallery({
            storedImages: ["/img/photo.jpg"],
        });

        await act(async () => {
            ref.current.open();
        });

        // Thumbnails must appear after open()
        await waitFor(() => {
            expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
        });

        // Clicking the thumbnail wrapper (has the onClick handler) opens the lightbox
        const clickableDiv = screen
            .getAllByRole("img")[0]
            .closest(".position-relative");
        await act(async () => {
            fireEvent.click(clickableDiv);
        });

        expect(screen.getByTestId("modal")).toBeInTheDocument();
    });

    // 4. Shows existing images when opened with storedImages prop -------------
    test("4. shows existing images from storedImages prop after open()", async () => {
        const { ref } = renderGallery({
            storedImages: ["/images/store/products/123/photo.jpg"],
        });

        await act(async () => {
            ref.current.open();
        });

        await waitFor(() => {
            const img = screen.getAllByRole("img")[0];
            expect(img).toHaveAttribute(
                "src",
                "/images/store/products/123/photo.jpg"
            );
        });
    });

    // 5. Upload input accepts image files and supports multiple selection ------
    test("5. upload input accepts image files and is multiple", () => {
        const { container } = renderGallery();
        const input = container.querySelector("input[type='file']");
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute("accept", "image/*");
        expect(input).toHaveAttribute("multiple");
    });

    // 6. Selecting a file triggers compression and upload fetch ---------------
    test("6. selecting a file triggers imageCompression and upload fetch", async () => {
        const { container } = renderGallery();

        const file = new File(["img-data"], "photo.jpg", { type: "image/jpeg" });
        const input = container.querySelector("input[type='file']");

        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
        });

        await waitFor(() => {
            expect(imageCompression).toHaveBeenCalledWith(
                file,
                expect.objectContaining({ maxSizeMB: 1.0 })
            );
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/v1/product/upload-image",
                expect.objectContaining({ method: "POST" })
            );
        });
    });

    // 7. Failed upload shows "Not Saved" error badge --------------------------
    test("7. upload error shows 'Not Saved' badge", async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false });

        const { container } = renderGallery();

        const file = new File(["img-data"], "bad.jpg", { type: "image/jpeg" });
        const input = container.querySelector("input[type='file']");

        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
        });

        await waitFor(() => {
            expect(screen.getByText("Not Saved")).toBeInTheDocument();
        });
    });

    // 8. Clicking the delete button shows an inline confirmation dialog --------
    test("8. clicking the delete (×) button shows an inline confirmation dialog", async () => {
        const { ref, container } = renderGallery({
            storedImages: ["/img/photo.jpg"],
        });

        await act(async () => {
            ref.current.open();
        });

        await waitFor(() => {
            expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
        });

        // The × button has btn-danger class; there should be exactly one at this point
        const deleteBtn = container.querySelector("button.btn-danger");
        expect(deleteBtn).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        // The component shows an inline confirm dialog (not react-bootstrap-confirmation)
        await waitFor(() => {
            expect(
                screen.getByText(/are you sure you want to delete this image/i)
            ).toBeInTheDocument();
        });
    });

    // 9. Confirmed delete calls fetch with the delete-image endpoint ----------
    test("9. confirmed delete POSTs to the delete-image endpoint", async () => {
        const { ref, container } = renderGallery({
            storedImages: ["/img/photo.jpg"],
        });

        await act(async () => {
            ref.current.open();
        });

        await waitFor(() => {
            expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
        });

        global.fetch.mockClear();

        // Click × to open the inline confirm dialog
        const deleteBtn = container.querySelector("button.btn-danger");
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        // Wait for the inline dialog to appear
        await waitFor(() => {
            expect(
                screen.getByText(/are you sure you want to delete this image/i)
            ).toBeInTheDocument();
        });

        // Click the "Delete" button inside the inline dialog to confirm
        const confirmDeleteBtn = screen.getByRole("button", { name: /^delete$/i });
        await act(async () => {
            fireEvent.click(confirmDeleteBtn);
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/v1/product/delete-image"),
                expect.objectContaining({ method: "POST" })
            );
        });
    });

    // 10. Close button closes the lightbox ------------------------------------
    test("10. close button in the lightbox header closes the modal", async () => {
        const { ref } = renderGallery({
            storedImages: ["/img/photo.jpg"],
        });

        await act(async () => {
            ref.current.open();
        });

        await waitFor(() => {
            expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
        });

        // Open the lightbox by clicking the thumbnail wrapper
        const clickableDiv = screen
            .getAllByRole("img")[0]
            .closest(".position-relative");
        await act(async () => {
            fireEvent.click(clickableDiv);
        });

        await waitFor(() => {
            expect(screen.getByTestId("modal")).toBeInTheDocument();
        });

        // Click the mocked close button (wired to onHide via context)
        const closeBtn = screen.getByTestId("close-button");
        await act(async () => {
            fireEvent.click(closeBtn);
        });

        await waitFor(() => {
            expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
        });
    });

    // 11. Thumbnails are rendered with the correct src attributes -------------
    test("11. thumbnails are displayed with the correct src for each stored image", async () => {
        const { ref } = renderGallery({
            storedImages: ["/img/a.jpg", "/img/b.jpg"],
        });

        await act(async () => {
            ref.current.open();
        });

        await waitFor(() => {
            const imgs = screen.getAllByRole("img");
            expect(imgs).toHaveLength(2);
            expect(imgs[0]).toHaveAttribute("src", "/img/a.jpg");
            expect(imgs[1]).toHaveAttribute("src", "/img/b.jpg");
        });
    });

    // 12. Clicking a thumbnail opens the lightbox with the selected image -----
    test("12. clicking a thumbnail opens the lightbox and renders the full-size image", async () => {
        const { ref } = renderGallery({
            storedImages: ["/img/photo.jpg"],
        });

        await act(async () => {
            ref.current.open();
        });

        await waitFor(() => {
            expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
        });

        // Lightbox should be closed before the click
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();

        const clickableDiv = screen
            .getAllByRole("img")[0]
            .closest(".position-relative");
        await act(async () => {
            fireEvent.click(clickableDiv);
        });

        await waitFor(() => {
            expect(screen.getByTestId("modal")).toBeInTheDocument();
        });

        // The full-size lightbox image has alt="Zoom" (as coded in the component)
        const lightboxImg = screen.getByAltText("Zoom");
        expect(lightboxImg).toBeInTheDocument();
        expect(lightboxImg).toHaveAttribute("src", "/img/photo.jpg");
    });
});
