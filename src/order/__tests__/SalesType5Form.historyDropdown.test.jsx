// Diagnostic test #2 — SalesType5Form customer/vehicle history dropdown,
// using the REAL CustomerHistoryModal and VehicleView components (not mocked),
// only stubbing their heavy grandchild dependencies (repair job / other order
// forms) so the test stays lightweight.

jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (k) => k }),
}));

jest.mock("react-bootstrap-typeahead", () => {
    const React = require("react");
    const Typeahead = React.forwardRef((_props, _ref) =>
        React.createElement("input", { "data-testid": "typeahead" })
    );
    Typeahead.displayName = "Typeahead";
    return {
        Typeahead,
        AsyncTypeahead: Typeahead,
        Menu: ({ children }) => React.createElement("div", null, children || null),
        MenuItem: ({ children }) => React.createElement("div", null, children || null),
    };
});

jest.mock("react-number-format", () => {
    const React = require("react");
    return {
        __esModule: true,
        default: ({ value, renderText }) =>
            React.createElement("span", null, renderText ? renderText(String(value ?? "")) : String(value ?? "")),
    };
});

jest.mock("react-datepicker", () => {
    const React = require("react");
    return { __esModule: true, default: () => React.createElement("input", { "data-testid": "datepicker" }) };
});

jest.mock("react-debounce-input", () => {
    const React = require("react");
    return {
        DebounceInput: React.forwardRef((props, ref) =>
            React.createElement("input", { ref, "data-testid": "debounce-input", onChange: props.onChange })
        ),
    };
});

jest.mock("../../utils/numberUtils", () => ({
    trimTo2Decimals: (v) => Number(v).toFixed(2),
    trimTo8Decimals: (v) => Number(v).toFixed(8),
}));

jest.mock("../../utils/search.js", () => ({ highlightWords: (text) => text }));

// ── Stub the heavy grandchild dependencies of the REAL history/view modals ──
const Stub = () => null;
jest.mock("../../repair_job/create.js", () => ({ __esModule: true, default: Stub }));
jest.mock("../../repair_job/kanban.js", () => ({ __esModule: true, default: Stub }));
jest.mock("../../repair_job/card_view.js", () => ({ __esModule: true, default: Stub }));
jest.mock("../create.js", () => ({ __esModule: true, default: Stub }));
jest.mock("../../sales_return/create.js", () => ({ __esModule: true, default: Stub }));
jest.mock("../../quotation/QuotationType3Form.js", () => ({ __esModule: true, default: Stub }));
// vehicle/create.js is used both directly by SalesType5Form AND as a grandchild
// of history_modal.js — keep it a lightweight functioning mock so we can see
// its `open()` calls without needing its own real network/deps.
jest.mock("../../vehicle/create.js", () => {
    const React = require("react");
    const MockVehicleCreate = React.forwardRef((props, ref) => {
        React.useImperativeHandle(ref, () => ({ open: () => {} }));
        return null;
    });
    return { __esModule: true, default: MockVehicleCreate };
});

global.fetch = jest.fn();
beforeEach(() => {
    global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({ result: [] }),
    });
});
afterEach(() => {
    jest.clearAllMocks();
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SalesType5Body } from "../SalesType5Form.js";

const noop = () => {};
const noopRef = { current: null };

const baseStore = {
    zatca: { phase: "1", connected: false },
    settings: { enable_automobile_module: true },
};

const baseFormData = {
    date_str: "2026-01-01T10:00:00Z",
    code: "S-0001",
    vat_percent: 15,
    total: 100,
    net_total: 115,
    payments_input: [],
    customer_id: "cust-1",
    customer_name: "Test Customer",
};

const bodyProps = {
    formData: { ...baseFormData },
    setFormData: noop,
    errors: {},
    setErrors: noop,
    selectedProducts: [],
    setSelectedProducts: noop,
    selectedCustomers: [{ id: "cust-1", name: "Test Customer", code: "C-1", credit_balance: 50 }],
    setSelectedCustomers: noop,
    isZatcaReported: false,
    store: baseStore,
    openCustomerSearchResult: false,
    setOpenCustomerSearchResult: noop,
    openProductSearchResult: false,
    setOpenProductSearchResult: noop,
    customerOptions: [],
    setCustomerOptions: noop,
    productOptions: [],
    setProductOptions: noop,
    timerRef: noopRef,
    customerSearchRef: noopRef,
    productSearchRef: noopRef,
    inputRefs: { current: {} },
    handleCreate: noop,
    suggestCustomers: noop,
    suggestProducts: noop,
    getProductByBarCode: noop,
    addProduct: noop,
    removeProduct: noop,
    openCustomerCreateForm: noop,
    openCustomerUpdateForm: noop,
    openCustomerPending: jest.fn(),
    openCustomers: noop,
    openProducts: noop,
    openServices: noop,
    openProductCreateForm: noop,
    openServiceCreateForm: noop,
    addNewPayment: noop,
    removePayment: noop,
    validatePaymentAmounts: noop,
    CalCulateLineTotals: noop,
    reCalculate: noop,
    reCalculateRef: noopRef,
    checkErrors: noop,
    checkWarnings: noop,
    isProductAdded: () => false,
    sendWhatsAppMessage: noop,
    dateLocale: undefined,
    openUpdateProductForm: noop,
    openLinkedProducts: noop,
    openProductImages: noop,
    openProductHistory: noop,
    openSalesHistory: noop,
    openSalesReturnHistory: noop,
    openPurchaseHistory: noop,
    openPurchaseReturnHistory: noop,
    openDeliveryNoteHistory: noop,
    openQuotationHistory: noop,
    openQuotationSalesHistory: noop,
    openQuotationSalesReturnHistory: noop,
    openNonVATSalesHistory: noop,
    openNonVATSalesReturnHistory: noop,
    discount: 0,
    setDiscount: noop,
    discountWithVAT: 0,
    setDiscountWithVAT: noop,
    shipping: 0,
    setShipping: noop,
    roundingAmount: 0,
    setRoundingAmount: noop,
    renderNetTotalBeforeRoundingTooltip: () => null,
    totalPaymentAmount: 0,
    balanceAmount: 0,
    paymentStatus: "not_paid",
    isSubmitting: false,
    isUpdateForm: false,
    handleClose: noop,
    fetchAndSetCustomer: noop,
    openReferenceUpdateForm: noop,
    showToastMessage: noop,
};

test("REAL CustomerHistoryModal actually opens (visible modal + tab content) on dropdown item click", async () => {
    render(<SalesType5Body {...bodyProps} />);

    const toggle = screen.getByTitle("History");
    fireEvent.click(toggle);

    const repairItem = await screen.findByText("Repair History");
    fireEvent.click(repairItem);

    await waitFor(() => {
        expect(screen.getByText("Customer History")).toBeInTheDocument();
    });
});
