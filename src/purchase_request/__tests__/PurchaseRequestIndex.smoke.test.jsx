import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- mock child domain components ---
jest.mock("../create.js", () => {
    const React = require("react");
    return React.forwardRef((_props, _ref) => null);
});

jest.mock("../view.js", () => {
    const React = require("react");
    return React.forwardRef((_props, _ref) => null);
});

jest.mock("../../purchase_order/create.js", () => {
    const React = require("react");
    return React.forwardRef((_props, _ref) => null);
});

jest.mock("../../order/preview.js", () => {
    const React = require("react");
    return React.forwardRef((_props, _ref) => null);
});

// --- mock react-bootstrap ---
jest.mock("react-bootstrap", () => {
    const React = require("react");
    const passthrough = ({ children, ...rest }) => React.createElement("div", rest, children);
    return {
        Button: passthrough,
        Spinner: () => null,
        Badge: passthrough,
        Modal: passthrough,
        Form: passthrough,
        Table: passthrough,
        Row: passthrough,
        Col: passthrough,
        Alert: passthrough,
    };
});

// --- mock react-paginate ---
jest.mock("react-paginate", () => () => null);

// --- mock eventEmitter ---
jest.mock("../../utils/eventEmitter", () => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
}));

// --- mock react-router-dom (keep MemoryRouter real) ---
jest.mock("react-router-dom", () => {
    const actual = jest.requireActual("react-router-dom");
    return {
        ...actual,
        useHistory: () => ({ push: jest.fn(), replace: jest.fn() }),
        useParams: () => ({}),
        useLocation: () => ({ pathname: "/", search: "", hash: "", state: undefined }),
        Link: ({ children, to, ...rest }) => {
            const React = require("react");
            return React.createElement("a", { href: to, ...rest }, children);
        },
    };
});

// ----------------------------------------------------------------

jest.useFakeTimers();

global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => "application/json" },
    json: () =>
        Promise.resolve({
            status: true,
            result: [],
            data: [],
            total_count: 0,
            store: {},
            settings: {},
        }),
});

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("user_id", "test-user-id");
    localStorage.setItem("store_id", "test-store-id");
    localStorage.setItem("access_token", "test-token");
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

// ----------------------------------------------------------------

import PurchaseRequestIndex from "../index.js";

describe("PurchaseRequestIndex smoke test", () => {
    it("renders without crashing", () => {
        const { getByText } = render(
            <MemoryRouter>
                <PurchaseRequestIndex showToastMessage={jest.fn()} />
            </MemoryRouter>
        );
        expect(getByText("Purchase Requests")).toBeTruthy();
    });

    it("renders Sent and Received tabs", () => {
        const { getByText } = render(
            <MemoryRouter>
                <PurchaseRequestIndex showToastMessage={jest.fn()} />
            </MemoryRouter>
        );
        expect(getByText(/Sent/i)).toBeTruthy();
        expect(getByText(/Received/i)).toBeTruthy();
    });

    it("renders New P.R button", () => {
        const { getByText } = render(
            <MemoryRouter>
                <PurchaseRequestIndex showToastMessage={jest.fn()} />
            </MemoryRouter>
        );
        expect(getByText("New P.R")).toBeTruthy();
    });

    it("renders empty state message when list is empty", async () => {
        const { findAllByText } = render(
            <MemoryRouter>
                <PurchaseRequestIndex showToastMessage={jest.fn()} />
            </MemoryRouter>
        );
        // flush fetch promise
        await Promise.resolve();
        jest.runAllTimers();
        const emptyMessages = await findAllByText(/No purchase requests found/i);
        expect(emptyMessages.length).toBeGreaterThan(0);
    });

    it("shows 0 records count", async () => {
        const { findByText } = render(
            <MemoryRouter>
                <PurchaseRequestIndex showToastMessage={jest.fn()} />
            </MemoryRouter>
        );
        await Promise.resolve();
        jest.runAllTimers();
        const countEl = await findByText(/0 records/i);
        expect(countEl).toBeTruthy();
    });
});
