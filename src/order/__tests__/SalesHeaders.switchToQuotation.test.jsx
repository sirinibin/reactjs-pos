// Functional tests: the "Switch to Quotation" button in the extracted sales
// form headers (types 1, 4 and 5). It must show on the Create form only, never
// on the Update form, and call onSwitchToQuotation when clicked.
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));
jest.mock("react-datepicker", () => ({ __esModule: true, default: () => null }));
jest.mock("../SalesImportDropdown.js", () => ({ __esModule: true, default: () => null }));
jest.mock("../../vehicle/create.js", () => ({ __esModule: true, default: () => null }));
jest.mock("../../vehicle/view.js", () => ({ __esModule: true, default: () => null }));
jest.mock("../../customer/history_modal.js", () => ({ __esModule: true, default: () => null }));
jest.mock("../../utils/TableSettingsModal.js", () => ({ __esModule: true, default: () => null }));

const { SalesType1Header } = require("../SalesType1Form");
const { SalesType5Header } = require("../SalesType5Form");
const { SalesVanStoreHeader } = require("../SalesVanStoreForm");

const noop = () => {};
const baseProps = {
    formData: { code: "S-0007", enable_report_to_zatca: false },
    setFormData: noop,
    isResumingDraft: false,
    store: { settings: {}, zatca: {} },
    formType: "type1",
    setFormType: noop,
    disablePreviousButton: false,
    isSubmitting: false,
    dnNotifications: [],
    openPreviousForm: noop,
    openLastForm: noop,
    openNextForm: noop,
    openCreateForm: noop,
    openPrint: noop,
    openPreview: noop,
    handleCreate: noop,
    handleClose: noop,
    openSalesFromDnInForm: noop,
    dismissDnNotification: noop,
    repairJobInfos: [],
};

const HEADERS = [
    { name: "type 1", Header: SalesType1Header, label: /Switch to Quotation/ },
    { name: "type 5 (workshop)", Header: SalesType5Header, label: /Switch to Quotation/ },
    { name: "type 4 (van store)", Header: SalesVanStoreHeader, label: /^Quotation$/ },
];

function findSwitch(label) {
    return screen.queryAllByRole("button").find((b) => label.test(b.textContent.trim())) || null;
}

describe.each(HEADERS)("Sales $name header — Switch to Quotation", ({ Header, label }) => {
    test("shows on the Create form and calls onSwitchToQuotation once when clicked", () => {
        const onSwitch = jest.fn();
        render(<Header {...baseProps} isUpdateForm={false} onSwitchToQuotation={onSwitch} />);
        const btn = findSwitch(label);
        expect(btn).not.toBeNull();
        fireEvent.click(btn);
        expect(onSwitch).toHaveBeenCalledTimes(1);
    });

    test("is hidden on the Update form even when a handler is passed", () => {
        render(<Header {...baseProps} isUpdateForm={true} onSwitchToQuotation={jest.fn()} />);
        expect(findSwitch(label)).toBeNull();
    });

    test("is hidden when the parent gives no switch handler (forms opened outside the Sales page)", () => {
        render(<Header {...baseProps} isUpdateForm={false} />);
        expect(findSwitch(label)).toBeNull();
    });
});
