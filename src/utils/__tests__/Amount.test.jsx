import React from "react";
import { render, screen } from "@testing-library/react";
import Amount from "../amount";

describe("Amount component", () => {
    test("renders 1000 as '1,000.00' with 2 decimals default", () => {
        render(<Amount amount={1000} />);
        expect(screen.getByText("1,000.00")).toBeInTheDocument();
    });

    test("renders 1234.5678 as '1,234.57' (rounds to 2 decimals)", () => {
        render(<Amount amount={1234.5678} />);
        expect(screen.getByText("1,234.57")).toBeInTheDocument();
    });

    test("renders 0 as '0.00'", () => {
        render(<Amount amount={0} />);
        expect(screen.getByText("0.00")).toBeInTheDocument();
    });

    test("decimals=0 renders 1234 as '1,234'", () => {
        render(<Amount amount={1234} decimals={0} />);
        expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    test("decimals=8 renders 1.12345678 with 8 decimal places", () => {
        render(<Amount amount={1.12345678} decimals={8} />);
        expect(screen.getByText("1.12345678")).toBeInTheDocument();
    });

    test("negative number renders with minus sign", () => {
        render(<Amount amount={-500.5} />);
        expect(screen.getByText("-500.50")).toBeInTheDocument();
    });

    test("very large number renders with commas", () => {
        render(<Amount amount={1234567890} />);
        expect(screen.getByText("1,234,567,890.00")).toBeInTheDocument();
    });
});
