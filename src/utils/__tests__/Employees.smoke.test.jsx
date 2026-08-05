import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock react-bootstrap components
jest.mock("react-bootstrap", () => ({
    Modal: Object.assign(
        ({ show, children }) => (show ? <div>{children}</div> : null),
        {
            Header: ({ children }) => <div>{children}</div>,
            Title: ({ children }) => <div>{children}</div>,
            Body: ({ children }) => <div>{children}</div>,
            Footer: ({ children }) => <div>{children}</div>,
        }
    ),
    Button: ({ children, ...props }) => <button {...props}>{children}</button>,
    Form: Object.assign(
        ({ children }) => <form>{children}</form>,
        {
            Group: ({ children }) => <div>{children}</div>,
            Control: (props) => <input {...props} />,
            Label: ({ children }) => <label>{children}</label>,
            Check: (props) => <input type="checkbox" {...props} />,
            Select: ({ children, ...props }) => <select {...props}>{children}</select>,
        }
    ),
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
    Table: ({ children }) => <table>{children}</table>,
    Spinner: () => <div />,
    Alert: ({ children }) => <div>{children}</div>,
    Dropdown: Object.assign(
        ({ children }) => <div>{children}</div>,
        {
            Toggle: ({ children }) => <button>{children}</button>,
            Menu: ({ children }) => <div>{children}</div>,
            Item: ({ children }) => <div>{children}</div>,
        }
    ),
}));

// Mock react-draggable
jest.mock("react-draggable", () => {
    const Draggable = ({ children }) => <div>{children}</div>;
    return Draggable;
});

// Mock child domain component
jest.mock("../../employee/index.js", () => (props) => {
    const React = require("react");
    return React.createElement(
        "button",
        { "data-testid": "employee-select", onClick: () => props.onSelectEmployee && props.onSelectEmployee({ id: "e1" }) },
        "select"
    );
});

// Setup fake timers and global fetch
beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
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
    });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
});

import { createRef } from "react";
import { screen, act } from "@testing-library/react";
import Employees from "../employees.js";

describe("Employees (smoke)", () => {
    it("renders without crashing", () => {
        render(
            <MemoryRouter>
                <Employees />
            </MemoryRouter>
        );
    });

    it("open() shows the modal with the Select Employee title", () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <Employees ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open());
        expect(screen.getByText("Select Employee")).toBeInTheDocument();
    });

    it("selecting an employee calls onSelectEmployee (when provided) and closes the modal", () => {
        const onSelectEmployee = jest.fn();
        const ref = createRef();
        render(
            <MemoryRouter>
                <Employees ref={ref} onSelectEmployee={onSelectEmployee} />
            </MemoryRouter>
        );
        act(() => ref.current.open());
        act(() => screen.getByTestId("employee-select").click());
        expect(onSelectEmployee).toHaveBeenCalledWith({ id: "e1" });
        expect(screen.queryByText("Select Employee")).not.toBeInTheDocument();
    });

    it("selecting an employee without an onSelectEmployee prop does not throw (optional callback guard)", () => {
        const ref = createRef();
        render(
            <MemoryRouter>
                <Employees ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open());
        expect(() => {
            act(() => screen.getByTestId("employee-select").click());
        }).not.toThrow();
        expect(screen.queryByText("Select Employee")).not.toBeInTheDocument();
    });

    it("clicking the close button hides the modal", () => {
        const ref = createRef();
        const { container } = render(
            <MemoryRouter>
                <Employees ref={ref} />
            </MemoryRouter>
        );
        act(() => ref.current.open());
        expect(screen.getByText("Select Employee")).toBeInTheDocument();
        act(() => container.querySelector(".btn-close").click());
        expect(screen.queryByText("Select Employee")).not.toBeInTheDocument();
    });
});
