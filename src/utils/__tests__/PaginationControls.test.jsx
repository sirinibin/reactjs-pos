import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PaginationControls from "../PaginationControls";

const defaultProps = {
    totalPages: 5,
    page: 1,
    totalItems: 100,
    offset: 0,
    currentPageItemsCount: 20,
    pageSize: "20",
    onPageChange: jest.fn(),
    onPageSizeChange: jest.fn(),
    showSizePicker: true,
    showCount: true,
};

describe("PaginationControls component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("renders size picker with correct default options (20, 40, 50, 100)", () => {
        render(<PaginationControls {...defaultProps} />);
        const select = screen.getByRole("combobox");
        expect(select).toBeInTheDocument();
        const options = select.querySelectorAll("option");
        const values = Array.from(options).map((o) => o.textContent);
        expect(values).toEqual(["20", "40", "50", "100"]);
    });

    test("hides size picker when showSizePicker=false", () => {
        render(<PaginationControls {...defaultProps} showSizePicker={false} />);
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    test("hides size picker when totalItems=0", () => {
        render(<PaginationControls {...defaultProps} totalItems={0} />);
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    test("shows count text when showCount=true and totalItems > 0", () => {
        render(<PaginationControls {...defaultProps} />);
        // i18n mock interpolates: "Showing {{from}}-{{to}} of {{totalItems}}"
        // => "Showing 1-20 of 100"
        expect(screen.getByText(/Showing 1-20 of 100/)).toBeInTheDocument();
    });

    test("count text shows correct from/to/totalItems", () => {
        render(
            <PaginationControls
                {...defaultProps}
                offset={40}
                currentPageItemsCount={20}
                totalItems={100}
                page={3}
            />
        );
        expect(screen.getByText(/Showing 41-60 of 100/)).toBeInTheDocument();
    });

    test("hides count when showCount=false", () => {
        render(<PaginationControls {...defaultProps} showCount={false} />);
        expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    });

    test("hides count when totalItems=0 even with showCount=true", () => {
        render(<PaginationControls {...defaultProps} totalItems={0} showCount={true} />);
        expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    });

    test("onPageSizeChange called when size select changes", () => {
        const onPageSizeChange = jest.fn();
        render(<PaginationControls {...defaultProps} onPageSizeChange={onPageSizeChange} />);
        const select = screen.getByRole("combobox");
        fireEvent.change(select, { target: { value: "50" } });
        expect(onPageSizeChange).toHaveBeenCalledWith("50");
    });

    test("renders page numbers via ReactPaginate when totalPages provided", () => {
        render(<PaginationControls {...defaultProps} totalPages={3} />);
        // ReactPaginate renders navigation links
        expect(screen.getByText("< prev")).toBeInTheDocument();
        expect(screen.getByText("next >")).toBeInTheDocument();
    });

    test("does not render pagination when totalPages is 0/falsy", () => {
        render(<PaginationControls {...defaultProps} totalPages={0} />);
        expect(screen.queryByText("< prev")).not.toBeInTheDocument();
    });
});
