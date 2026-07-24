import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { useEnterKeyNavigation } from "../useEnterKeyNavigation";

function FormHarness({ stayClass, onStay }) {
    useEnterKeyNavigation({ stayClass: stayClass || "barcode", onStay });
    return (
        <form>
            <input id="f1" data-testid="f1" />
            <input id="f2" data-testid="f2" />
            <input id="f3" data-testid="f3" className={stayClass || ""} />
            <input id="f4" data-testid="f4" />
        </form>
    );
}

// ── Enter advances focus ──────────────────────────────────────────────────────

test("Enter on first input focuses second", () => {
    const { getByTestId } = render(<FormHarness />);
    getByTestId("f1").focus();

    fireEvent.keyDown(document.activeElement, { code: "Enter" });

    expect(document.activeElement).toBe(getByTestId("f2"));
});

test("NumpadEnter on first input also focuses second", () => {
    const { getByTestId } = render(<FormHarness />);
    getByTestId("f1").focus();

    fireEvent.keyDown(document.activeElement, { code: "NumpadEnter" });

    expect(document.activeElement).toBe(getByTestId("f2"));
});

test("Enter advances focus sequentially through the whole form", () => {
    const { getByTestId } = render(<FormHarness />);
    getByTestId("f1").focus();

    // f1 → f2
    fireEvent.keyDown(document.activeElement, { code: "Enter" });
    expect(document.activeElement).toBe(getByTestId("f2"));

    // f2 → f3  (f3 has no stayClass: className="" which is not "barcode")
    fireEvent.keyDown(document.activeElement, { code: "Enter" });
    expect(document.activeElement).toBe(getByTestId("f3"));

    // f3 → f4
    fireEvent.keyDown(document.activeElement, { code: "Enter" });
    expect(document.activeElement).toBe(getByTestId("f4"));
});

// ── stayClass triggers onStay instead of advancing ───────────────────────────

test("Enter on stayClass element calls onStay with the element", () => {
    const onStay = jest.fn();
    const { getByTestId } = render(
        <FormHarness stayClass="barcode" onStay={onStay} />
    );
    getByTestId("f1").focus();

    // navigate to the barcode (stayClass) input
    fireEvent.keyDown(document.activeElement, { code: "Enter" }); // f1 → f2
    fireEvent.keyDown(document.activeElement, { code: "Enter" }); // f2 → f3 (barcode)

    const barcodeInput = getByTestId("f3");
    expect(document.activeElement).toBe(barcodeInput);

    // Enter on barcode should call onStay, NOT move focus
    fireEvent.keyDown(document.activeElement, { code: "Enter" });

    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onStay).toHaveBeenCalledWith(barcodeInput);
    expect(document.activeElement).toBe(barcodeInput);
});

test("Enter on stayClass element without onStay does not throw", () => {
    const { getByTestId } = render(<FormHarness stayClass="barcode" />);
    getByTestId("f1").focus();

    // navigate to barcode input
    fireEvent.keyDown(document.activeElement, { code: "Enter" }); // f1 → f2
    fireEvent.keyDown(document.activeElement, { code: "Enter" }); // f2 → f3

    expect(() => {
        fireEvent.keyDown(document.activeElement, { code: "Enter" });
    }).not.toThrow();
});

// ── non-Enter keys are ignored ────────────────────────────────────────────────

test("non-Enter key does not move focus", () => {
    const { getByTestId } = render(<FormHarness />);
    const f1 = getByTestId("f1");
    f1.focus();

    fireEvent.keyDown(document.activeElement, { code: "Tab" });

    expect(document.activeElement).toBe(f1);
});

test("Space key does not move focus", () => {
    const { getByTestId } = render(<FormHarness />);
    const f1 = getByTestId("f1");
    f1.focus();

    fireEvent.keyDown(document.activeElement, { code: "Space" });

    expect(document.activeElement).toBe(f1);
});

// ── listener is removed on unmount ────────────────────────────────────────────

test("listener is removed on unmount — no error when Enter fires afterward", () => {
    const { unmount } = render(<FormHarness />);
    unmount();

    expect(() => {
        fireEvent.keyDown(document.body, { code: "Enter" });
    }).not.toThrow();
});

// ── no form guard ─────────────────────────────────────────────────────────────

test("Enter on element outside a form does not throw", () => {
    function NoFormHarness() {
        useEnterKeyNavigation({});
        return <input id="lone" data-testid="lone" />;
    }
    const { getByTestId } = render(<NoFormHarness />);
    getByTestId("lone").focus();

    expect(() => {
        fireEvent.keyDown(document.activeElement, { code: "Enter" });
    }).not.toThrow();
});
