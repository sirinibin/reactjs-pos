import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- CSS / image mocks ---
jest.mock("react-bootstrap/dist/react-bootstrap.css", () => {}, { virtual: true });

// --- react-bootstrap ---
jest.mock("react-bootstrap", () => ({
    Modal: Object.assign(
        ({ show, children }) => (show ? <div data-testid="modal">{children}</div> : null),
        {
            Header: ({ children }) => <div>{children}</div>,
            Title: ({ children }) => <div>{children}</div>,
            Body: ({ children }) => <div>{children}</div>,
            Footer: ({ children }) => <div>{children}</div>,
        }
    ),
    Spinner: () => <span data-testid="spinner" />,
    Button: ({ children, onClick, disabled }) => (
        <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
    Form: Object.assign(
        ({ children }) => <form>{children}</form>,
        {
            Group: ({ children }) => <div>{children}</div>,
            Label: ({ children }) => <label>{children}</label>,
            Control: (props) => <input {...props} />,
            Check: (props) => <input type="checkbox" {...props} />,
            Select: ({ children, ...props }) => <select {...props}>{children}</select>,
            Text: ({ children }) => <small>{children}</small>,
        }
    ),
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
    Table: ({ children }) => <table>{children}</table>,
    Alert: ({ children }) => <div role="alert">{children}</div>,
    Badge: ({ children }) => <span>{children}</span>,
    InputGroup: ({ children }) => <div>{children}</div>,
    Dropdown: Object.assign(
        ({ children }) => <div>{children}</div>,
        {
            Toggle: ({ children }) => <button>{children}</button>,
            Menu: ({ children }) => <div>{children}</div>,
            Item: ({ children, onClick }) => <div onClick={onClick}>{children}</div>,
        }
    ),
}));

// --- react-router-dom (keep MemoryRouter real) ---
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useHistory: () => ({ push: jest.fn(), replace: jest.fn(), goBack: jest.fn() }),
    useParams: () => ({}),
    useLocation: () => ({ pathname: "/", search: "", hash: "", state: undefined }),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// --- sidebar_menu_config ---
jest.mock("../sidebar_menu_config.js", () => ({
    DEFAULT_MENU: [
        { id: "dashboard", resource: "dashboard", label: "Dashboard", path: "/dashboard/business-dashboard", icon: "bi-speedometer2" },
        { id: "sales", resource: "sales", label: "Sales", path: "/dashboard/sales", icon: "bi-receipt" },
    ],
}), { virtual: true });

// ---- component under test ----
import UserRoleCreate from "../create";

// ---- test setup ----
jest.useFakeTimers();

const mockFetchResponse = {
    ok: true,
    headers: { get: () => "application/json" },
    json: () =>
        Promise.resolve({
            result: {},
            data: [],
            total_count: 0,
            store: {},
            settings: {},
        }),
};

beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);
    localStorage.setItem("access_token", "test-token");
    localStorage.setItem("store_id", "store-123");
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    localStorage.clear();
});

// ---- tests ----
describe("UserRoleCreate smoke tests", () => {
    it("renders without crashing when modal is closed (default)", () => {
        const ref = React.createRef();
        const { container } = render(
            <MemoryRouter>
                <UserRoleCreate ref={ref} />
            </MemoryRouter>
        );
        expect(container).toBeTruthy();
    });

    it("renders modal open via imperative ref.open()", () => {
        const ref = React.createRef();
        render(
            <MemoryRouter>
                <UserRoleCreate ref={ref} />
            </MemoryRouter>
        );
        expect(() => ref.current.open()).not.toThrow();
    });

    it("opens with an id and triggers fetch", () => {
        const ref = React.createRef();
        render(
            <MemoryRouter>
                <UserRoleCreate ref={ref} />
            </MemoryRouter>
        );
        expect(() => ref.current.open("role-abc")).not.toThrow();
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/v1/user-role/role-abc"),
            expect.any(Object)
        );
    });

    it("renders with optional props without crashing", () => {
        const ref = React.createRef();
        const { container } = render(
            <MemoryRouter>
                <UserRoleCreate
                    ref={ref}
                    showToastMessage={jest.fn()}
                    refreshList={jest.fn()}
                    openDetailsView={jest.fn()}
                />
            </MemoryRouter>
        );
        expect(container).toBeTruthy();
    });
});
