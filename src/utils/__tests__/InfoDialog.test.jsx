import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import InfoDialog from "../InfoDialog";

describe("InfoDialog component", () => {
    test("when show=false modal content is NOT in document", () => {
        render(
            <InfoDialog show={false} message="Something happened" onClose={() => {}} />
        );
        expect(screen.queryByText("Information")).not.toBeInTheDocument();
    });

    test("when show=true 'Information' title is visible", () => {
        render(
            <InfoDialog show={true} message="Something happened" onClose={() => {}} />
        );
        expect(screen.getByText("Information")).toBeInTheDocument();
    });

    test("when show=true message text is visible", () => {
        render(
            <InfoDialog show={true} message="File saved successfully" onClose={() => {}} />
        );
        expect(screen.getByText("File saved successfully")).toBeInTheDocument();
    });

    test("click OK button calls onClose", () => {
        const onClose = jest.fn();
        render(
            <InfoDialog show={true} message="Test message" onClose={onClose} />
        );
        fireEvent.click(screen.getByText("OK"));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
