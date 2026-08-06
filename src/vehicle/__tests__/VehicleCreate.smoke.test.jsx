import React, { createRef } from "react";
import { render, fireEvent, act } from "@testing-library/react";

// ── react-i18next ──────────────────────────────────────────────────────────────
jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

// ── react-bootstrap ────────────────────────────────────────────────────────────
jest.mock("react-bootstrap", () => {
    const PassThrough = ({ children }) => children || null;

    const Modal = ({ show, children }) => (show ? children : null);
    Modal.Header = PassThrough;
    Modal.Title = PassThrough;
    Modal.Body = PassThrough;

    const Spinner = () => null;

    const Dropdown = ({ children }) => children || null;
    Dropdown.Toggle = ({ children }) => children || null;
    Dropdown.Menu = ({ children }) => children || null;
    Dropdown.Item = ({ children, onClick }) => children || null;
    Dropdown.Divider = () => null;

    return { Modal, Spinner, Dropdown };
});

// ── react-bootstrap-typeahead ──────────────────────────────────────────────────
jest.mock("react-bootstrap-typeahead", () => {
    // eslint-disable-next-line no-shadow
    const React = require("react");
    return {
        Typeahead: React.forwardRef(function Typeahead(_props, _ref) { return null; }),
        Menu: function Menu({ children }) { return children || null; },
        MenuItem: function MenuItem({ children }) { return children || null; },
    };
});

// ── utils ──────────────────────────────────────────────────────────────────────
jest.mock("../../utils/queryUtils.js", () => ({
    ObjectToSearchQueryParams: jest.fn(() => ""),
}));

jest.mock("../../utils/storeUtils.js", () => ({
    fetchStore: jest.fn(() => Promise.resolve({})),
}));

jest.mock("../../utils/search.js", () => ({
    highlightWords: jest.fn((text) => text),
}));

// ── Component under test ───────────────────────────────────────────────────────
import VehicleCreate from "../create.js";

// ── Test setup ─────────────────────────────────────────────────────────────────
beforeAll(() => {
    jest.useFakeTimers();
});

beforeEach(() => {
    localStorage.setItem("access_token", "test-token");
    localStorage.setItem("store_id", "store-001");

    global.fetch = jest.fn().mockImplementation((url) =>
        Promise.resolve({
            ok: true,
            headers: { get: () => "application/json" },
            // /brands endpoint returns an array; all others return an empty object
            json: () => Promise.resolve({ result: typeof url === "string" && url.includes("/brands") ? [] : {} }),
        })
    );
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    localStorage.clear();
});

// ── Tests ──────────────────────────────────────────────────────────────────────
describe("VehicleCreate smoke test", () => {
    it("renders without crashing (modal hidden by default)", () => {
        const ref = createRef();
        const { container } = render(<VehicleCreate ref={ref} />);
        expect(container).toBeTruthy();
    });

    it("opens the modal without crashing when ref.open() is called", () => {
        const ref = createRef();
        render(<VehicleCreate ref={ref} />);
        expect(() => {
            ref.current.open(null, null, null);
        }).not.toThrow();
    });

    it("opens with a customer pre-filled without crashing", () => {
        const ref = createRef();
        render(<VehicleCreate ref={ref} />);
        expect(() => {
            ref.current.open(null, "cust-001", { name: "Test Customer", name_in_arabic: "" });
        }).not.toThrow();
    });

    it("opens in edit mode (vehicle id) without crashing", () => {
        const ref = createRef();
        render(<VehicleCreate ref={ref} />);
        expect(() => {
            ref.current.open("veh-001", null, null);
        }).not.toThrow();
    });

    it("renders with optional callback props without crashing", () => {
        const ref = createRef();
        expect(() => {
            render(
                <VehicleCreate
                    ref={ref}
                    showToastMessage={jest.fn()}
                    refreshList={jest.fn()}
                    openDetailsView={jest.fn()}
                    onOpenCustomerForm={jest.fn()}
                />
            );
        }).not.toThrow();
    });
});

// ── onClose prop tests ──────────────────────────────────────────────────────
describe("VehicleCreate onClose prop", () => {
    it("does not crash when onClose is not provided and the close button is clicked", async () => {
        const ref = createRef();
        render(<VehicleCreate ref={ref} />);

        await act(async () => { ref.current.open(null, "cust-001", { name: "Test" }); });

        const closeBtn = document.querySelector('[aria-label="Close"]');
        expect(closeBtn).toBeTruthy();
        expect(() => fireEvent.click(closeBtn)).not.toThrow();
    });

    it("calls onClose when the close button is clicked", async () => {
        const onClose = jest.fn();
        const ref = createRef();
        render(<VehicleCreate ref={ref} onClose={onClose} />);

        await act(async () => { ref.current.open(null, "cust-001", { name: "Test" }); });

        fireEvent.click(document.querySelector('[aria-label="Close"]'));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose exactly once per close, not on open", async () => {
        const onClose = jest.fn();
        const ref = createRef();
        render(<VehicleCreate ref={ref} onClose={onClose} />);

        await act(async () => { ref.current.open(null, "cust-001", { name: "Test" }); });
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.click(document.querySelector('[aria-label="Close"]'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose each time the modal is closed across multiple open/close cycles", async () => {
        const onClose = jest.fn();
        const ref = createRef();
        render(<VehicleCreate ref={ref} onClose={onClose} />);

        // First open-close cycle
        await act(async () => { ref.current.open(null, "cust-001", { name: "Test" }); });
        fireEvent.click(document.querySelector('[aria-label="Close"]'));
        expect(onClose).toHaveBeenCalledTimes(1);

        // Second open-close cycle
        await act(async () => { ref.current.open(null, "cust-001", { name: "Test" }); });
        fireEvent.click(document.querySelector('[aria-label="Close"]'));
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
