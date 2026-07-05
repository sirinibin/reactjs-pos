import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SuccessModal from "../SuccessModal";

describe("SuccessModal component", () => {
    test("when show=false modal content is NOT visible", () => {
        render(
            <SuccessModal show={false} message="Operation done" onClose={() => {}} />
        );
        expect(screen.queryByText("Success")).not.toBeInTheDocument();
    });

    test("when show=true title 'Success' is visible", () => {
        render(
            <SuccessModal show={true} message="Operation done" onClose={() => {}} />
        );
        expect(screen.getByText("Success")).toBeInTheDocument();
    });

    test("when show=true message text is visible", () => {
        render(
            <SuccessModal show={true} message="Record saved successfully" onClose={() => {}} />
        );
        expect(screen.getByText("Record saved successfully")).toBeInTheDocument();
    });

    test("click Close button calls onClose", () => {
        const onClose = jest.fn();
        render(
            <SuccessModal show={true} message="Done" onClose={onClose} />
        );
        fireEvent.click(screen.getByText("Close"));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
