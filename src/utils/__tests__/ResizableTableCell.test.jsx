import React from "react";
import { render, fireEvent } from "@testing-library/react";
import ResizableTableCell from "../ResizableTableCell";

jest.mock("../ResizableCell.css", () => ({}));

// <td> must live inside a valid table structure in JSDOM
const Wrapper = ({ children }) => (
    <table>
        <tbody>
            <tr>{children}</tr>
        </tbody>
    </table>
);

describe("ResizableTableCell", () => {
    afterEach(() => jest.restoreAllMocks());

    test("1. Renders a <td> element", () => {
        const { container } = render(
            <Wrapper>
                <ResizableTableCell />
            </Wrapper>
        );
        expect(container.querySelector("td")).toBeInTheDocument();
    });

    test("2. Renders children inside the td", () => {
        const { container } = render(
            <Wrapper>
                <ResizableTableCell>Hello Cell</ResizableTableCell>
            </Wrapper>
        );
        const td = container.querySelector("td");
        expect(td).toHaveTextContent("Hello Cell");
    });

    test("3. Accepts and applies style prop", () => {
        const { container } = render(
            <Wrapper>
                <ResizableTableCell style={{ color: "red" }} />
            </Wrapper>
        );
        const td = container.querySelector("td");
        expect(td).toHaveStyle({ color: "red" });
    });

    test("4. Has class resizable-td", () => {
        const { container } = render(
            <Wrapper>
                <ResizableTableCell />
            </Wrapper>
        );
        expect(container.querySelector("td")).toHaveClass("resizable-td");
    });

    test("5. A resize handle div is appended after mount", () => {
        const { container } = render(
            <Wrapper>
                <ResizableTableCell />
            </Wrapper>
        );
        const td = container.querySelector("td");
        expect(td.querySelector(".resize-handle")).toBeInTheDocument();
    });

    test("6. Mousedown on handle then mousemove changes the cell width", () => {
        const { container } = render(
            <Wrapper>
                <ResizableTableCell />
            </Wrapper>
        );
        const td = container.querySelector("td");
        const handle = td.querySelector(".resize-handle");

        // startX=50, move to clientX=100 → delta=50, startWidth=offsetWidth=0 → newWidth=50
        fireEvent.mouseDown(handle, { clientX: 50, clientY: 50 });
        fireEvent.mouseMove(document, { clientX: 100, clientY: 50 });

        expect(td.style.width).toBe("50px");
    });

    test("7. Mousedown on handle then mousemove changes the cell height", () => {
        const { container } = render(
            <Wrapper>
                <ResizableTableCell />
            </Wrapper>
        );
        const td = container.querySelector("td");
        const handle = td.querySelector(".resize-handle");

        // startY=50, move to clientY=80 → delta=30, startHeight=offsetHeight=0 → newHeight=30
        fireEvent.mouseDown(handle, { clientX: 50, clientY: 50 });
        fireEvent.mouseMove(document, { clientX: 50, clientY: 80 });

        expect(td.style.height).toBe("30px");
    });

    test("8. After mouseup, subsequent mousemove does NOT change size", () => {
        const { container } = render(
            <Wrapper>
                <ResizableTableCell />
            </Wrapper>
        );
        const td = container.querySelector("td");
        const handle = td.querySelector(".resize-handle");

        fireEvent.mouseDown(handle, { clientX: 50, clientY: 50 });
        fireEvent.mouseMove(document, { clientX: 100, clientY: 80 });

        const widthAfterMove = td.style.width;
        const heightAfterMove = td.style.height;

        // mouseup removes the document listeners
        fireEvent.mouseUp(document);

        // Further moves should have no effect
        fireEvent.mouseMove(document, { clientX: 200, clientY: 200 });

        expect(td.style.width).toBe(widthAfterMove);
        expect(td.style.height).toBe(heightAfterMove);
    });

    test("9. Cell starts with minWidth of 100px", () => {
        const { container } = render(
            <Wrapper>
                <ResizableTableCell />
            </Wrapper>
        );
        const td = container.querySelector("td");
        expect(td.style.minWidth).toBe("100px");
    });

    test("10. Cell starts with width of 150px", () => {
        const { container } = render(
            <Wrapper>
                <ResizableTableCell />
            </Wrapper>
        );
        const td = container.querySelector("td");
        expect(td.style.width).toBe("150px");
    });
});
