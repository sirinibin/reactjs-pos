import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TableSettingsModal from "../TableSettingsModal";

// Mock react-bootstrap — always render children so the component's own
// {show && ...} guard inside Modal.Body remains the visibility control.
jest.mock("react-bootstrap", () => {
    const Modal = ({ children }) => (
        <div data-testid="modal">{children}</div>
    );
    Modal.Header = ({ children }) => (
        <div data-testid="modal-header">{children}</div>
    );
    Modal.Title = ({ children }) => (
        <span data-testid="modal-title">{children}</span>
    );
    Modal.Body = ({ children }) => (
        <div data-testid="modal-body">{children}</div>
    );
    Modal.Footer = ({ children }) => (
        <div data-testid="modal-footer">{children}</div>
    );
    const Button = ({ children, onClick }) => (
        <button onClick={onClick}>{children}</button>
    );
    return { Modal, Button };
});

// Mock react-beautiful-dnd — passthrough wrappers that invoke render props.
jest.mock("react-beautiful-dnd", () => ({
    DragDropContext: ({ children }) => <>{children}</>,
    Droppable: ({ children }) =>
        children(
            { innerRef: () => {}, droppableProps: {}, placeholder: null },
            {}
        ),
    Draggable: ({ children }) =>
        children(
            { innerRef: () => {}, draggableProps: {}, dragHandleProps: {} },
            {}
        ),
}));

const sampleColumns = [
    { key: "name",   label: "Name",   visible: true  },
    { key: "price",  label: "Price",  visible: false },
    { key: "select", label: "Select", visible: true  },
];

const defaultProps = {
    show: true,
    onHide: jest.fn(),
    title: "Table Settings",
    columns: sampleColumns,
    onToggleColumn: jest.fn(),
    onDragEnd: jest.fn(),
};

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe("TableSettingsModal", () => {
    test("1. renders when show=true and displays the title text", () => {
        render(<TableSettingsModal {...defaultProps} />);
        expect(screen.getByText("Table Settings")).toBeInTheDocument();
    });

    test("2. does not render column list when show=false", () => {
        // Modal mock always renders children; the component's own {show && ...}
        // guard inside Modal.Body controls whether columns appear.
        render(<TableSettingsModal {...defaultProps} show={false} />);
        expect(screen.queryByText("Name")).not.toBeInTheDocument();
        expect(screen.queryByText("Price")).not.toBeInTheDocument();
    });

    test("3. renders each column as a checkbox list item", () => {
        render(<TableSettingsModal {...defaultProps} enableSelection={true} />);
        expect(screen.getByText("Name")).toBeInTheDocument();
        expect(screen.getByText("Price")).toBeInTheDocument();
        expect(screen.getByText("Select")).toBeInTheDocument();
    });

    test("4. visible column has a checked checkbox", () => {
        render(<TableSettingsModal {...defaultProps} enableSelection={true} />);
        // Name is columns[0], visible=true → first checkbox is checked.
        const checkboxes = screen.getAllByRole("checkbox");
        expect(checkboxes[0]).toBeChecked();
    });

    test("5. hidden column has an unchecked checkbox", () => {
        render(<TableSettingsModal {...defaultProps} enableSelection={true} />);
        // Price is columns[1], visible=false → second checkbox is unchecked.
        const checkboxes = screen.getAllByRole("checkbox");
        expect(checkboxes[1]).not.toBeChecked();
    });

    test("6. clicking a column checkbox calls onToggleColumn with the column index", () => {
        const onToggleColumn = jest.fn();
        render(
            <TableSettingsModal
                {...defaultProps}
                onToggleColumn={onToggleColumn}
                enableSelection={true}
            />
        );
        // Price is columns[1]; its checkbox is the second rendered checkbox.
        const checkboxes = screen.getAllByRole("checkbox");
        fireEvent.click(checkboxes[1]);
        expect(onToggleColumn).toHaveBeenCalledWith(1);
    });

    test("7. Close button calls onHide", () => {
        const onHide = jest.fn();
        render(<TableSettingsModal {...defaultProps} onHide={onHide} />);
        fireEvent.click(screen.getByText("Close"));
        expect(onHide).toHaveBeenCalledTimes(1);
    });

    test("8. Restore to Default button calls onRestoreDefaults when prop is provided", () => {
        const onRestoreDefaults = jest.fn();
        render(
            <TableSettingsModal
                {...defaultProps}
                onRestoreDefaults={onRestoreDefaults}
            />
        );
        fireEvent.click(screen.getByText("Restore to Default"));
        expect(onRestoreDefaults).toHaveBeenCalledTimes(1);
    });

    test("9. Restore to Default button is not rendered when onRestoreDefaults is not provided", () => {
        render(<TableSettingsModal {...defaultProps} />);
        expect(screen.queryByText("Restore to Default")).not.toBeInTheDocument();
    });

    test("10. Check All button calls onCheckAll when prop is provided", () => {
        const onCheckAll = jest.fn();
        render(<TableSettingsModal {...defaultProps} onCheckAll={onCheckAll} />);
        fireEvent.click(screen.getByText("Check All"));
        expect(onCheckAll).toHaveBeenCalledTimes(1);
    });

    test("11. Uncheck All button calls onUncheckAll when prop is provided", () => {
        const onUncheckAll = jest.fn();
        render(
            <TableSettingsModal {...defaultProps} onUncheckAll={onUncheckAll} />
        );
        fireEvent.click(screen.getByText("Uncheck All"));
        expect(onUncheckAll).toHaveBeenCalledTimes(1);
    });

    test("12. Select column is hidden when enableSelection=false", () => {
        render(<TableSettingsModal {...defaultProps} enableSelection={false} />);
        expect(screen.queryByText("Select")).not.toBeInTheDocument();
        // Other columns are still visible.
        expect(screen.getByText("Name")).toBeInTheDocument();
        expect(screen.getByText("Price")).toBeInTheDocument();
    });

    test("13. Select column is shown when enableSelection=true", () => {
        render(<TableSettingsModal {...defaultProps} enableSelection={true} />);
        expect(screen.getByText("Select")).toBeInTheDocument();
    });
});
