// Smoke test — SalesVanStoreForm
// React 17, CRA, @testing-library/react v11, no TypeScript

// ── CSS / asset stubs ──────────────────────────────────────────────────────────
jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

// ── react-i18next ──────────────────────────────────────────────────────────────
jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (k) => k }),
}));

// ── react-bootstrap ────────────────────────────────────────────────────────────
jest.mock("react-bootstrap", () => {
    const React = require("react");
    const passthrough = ({ children }) => React.createElement(React.Fragment, null, children || null);
    const Dropdown = ({ children }) => React.createElement(React.Fragment, null, children || null);
    Dropdown.Toggle = ({ children }) => React.createElement("span", null, children || null);
    Dropdown.Menu = ({ children }) => React.createElement("div", null, children || null);
    Dropdown.ItemText = ({ children }) => React.createElement("span", null, children || null);
    Dropdown.Item = ({ children }) => React.createElement("div", null, children || null);
    return {
        Spinner: () => React.createElement("span", { role: "status" }, "loading"),
        Dropdown,
        Modal: passthrough,
        Button: ({ children, onClick }) => React.createElement("button", { type: "button", onClick }, children || null),
        Form: passthrough,
        Table: ({ children }) => React.createElement("table", null, children || null),
        Row: passthrough,
        Col: passthrough,
        Alert: passthrough,
    };
});

// ── react-bootstrap-typeahead ──────────────────────────────────────────────────
jest.mock("react-bootstrap-typeahead", () => {
    const React = require("react");
    const Typeahead = React.forwardRef((_props, _ref) => React.createElement("input", { "data-testid": "typeahead" }));
    Typeahead.displayName = "Typeahead";
    return {
        Typeahead,
        AsyncTypeahead: Typeahead,
        Menu: ({ children }) => React.createElement("div", null, children || null),
        MenuItem: ({ children }) => React.createElement("div", null, children || null),
    };
});

// ── react-number-format ────────────────────────────────────────────────────────
jest.mock("react-number-format", () => {
    const React = require("react");
    return {
        __esModule: true,
        default: ({ value, renderText }) =>
            React.createElement("span", null, renderText ? renderText(String(value ?? "")) : String(value ?? "")),
    };
});

// ── react-datepicker ───────────────────────────────────────────────────────────
jest.mock("react-datepicker", () => {
    const React = require("react");
    return { __esModule: true, default: () => React.createElement("input", { "data-testid": "datepicker" }) };
});

// ── react-debounce-input ───────────────────────────────────────────────────────
jest.mock("react-debounce-input", () => {
    const React = require("react");
    return {
        DebounceInput: React.forwardRef((props, ref) => React.createElement("input", { ref, "data-testid": "debounce-input", onChange: props.onChange })),
    };
});

// ── date-fns: keep real ────────────────────────────────────────────────────────

// ── utils ──────────────────────────────────────────────────────────────────────
jest.mock("../../utils/numberUtils", () => ({
    trimTo2Decimals: (v) => Number(v).toFixed(2),
}));

jest.mock("../../utils/search.js", () => ({
    highlightWords: (text) => text,
}));

// ── timers / fetch ─────────────────────────────────────────────────────────────
jest.useFakeTimers();

global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => "application/json" },
    json: () => Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
});

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
});

// ── Arrange shared props ───────────────────────────────────────────────────────

const noop = () => {};
const noopRef = { current: null };

const baseFormData = {
    date_str: "2026-01-01T10:00:00Z",
    code: "S-0001",
    enable_report_to_zatca: false,
    vat_percent: 15,
    total: 100,
    vat_price: 15,
    net_total: 115,
    payments_input: [],
    customer_id: "",
    customer_name: "",
    customerName: "",
    phone: "",
    remarks: "",
};

const baseStore = {
    zatca: { phase: "1", connected: false },
    settings: {
        enable_notification: false,
        enable_sales_page_selection: false,
        enable_automobile_module: false,
        block_sales_after_pending_count: 0,
    },
};

const headerProps = {
    formData: { ...baseFormData },
    setFormData: noop,
    isUpdateForm: false,
    store: baseStore,
    formType: "type4",
    setFormType: noop,
    disablePreviousButton: true,
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
};

const bodyProps = {
    formData: { ...baseFormData },
    setFormData: noop,
    errors: {},
    setErrors: noop,
    warnings: [],
    selectedProducts: [],
    setSelectedProducts: noop,
    selectedCustomers: [],
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
    handleCreate: noop,
    suggestCustomers: noop,
    suggestProducts: noop,
    getProductByBarCode: noop,
    addProduct: noop,
    removeProduct: noop,
    isProductAdded: () => false,
    openCustomerCreateForm: noop,
    openCustomerUpdateForm: noop,
    openCustomers: noop,
    addNewPayment: noop,
    removePayment: noop,
    validatePaymentAmounts: noop,
    discount: 0,
    setDiscount: noop,
    discountWithVAT: 0,
    setDiscountWithVAT: noop,
    shipping: 0,
    totalPaymentAmount: 0,
    balanceAmount: 0,
    paymentStatus: "not_paid",
    isSubmitting: false,
    isUpdateForm: false,
    handleClose: noop,
    timerRef: noopRef,
    customerSearchRef: noopRef,
    productSearchRef: noopRef,
    inputRefs: { current: {} },
    CalCulateLineTotals: noop,
    reCalculate: noop,
    checkErrors: noop,
    checkWarnings: noop,
    sendWhatsAppMessage: noop,
    dateLocale: undefined,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SalesVanStoreHeader, SalesVanStoreBody } from "../SalesVanStoreForm";

describe("SalesVanStoreHeader — smoke", () => {
    it("renders without crashing (create mode)", () => {
        render(
            <MemoryRouter>
                <SalesVanStoreHeader {...headerProps} />
            </MemoryRouter>
        );
    });

    it("renders without crashing (update mode)", () => {
        render(
            <MemoryRouter>
                <SalesVanStoreHeader
                    {...headerProps}
                    isUpdateForm
                    disablePreviousButton={false}
                    isSubmitting={false}
                />
            </MemoryRouter>
        );
    });

    it("renders with spinner when submitting", () => {
        render(
            <MemoryRouter>
                <SalesVanStoreHeader {...headerProps} isSubmitting />
            </MemoryRouter>
        );
    });

    it("renders DN bell when notification enabled and items exist", () => {
        const storeWithNotif = {
            ...baseStore,
            settings: { ...baseStore.settings, enable_notification: true },
        };
        render(
            <MemoryRouter>
                <SalesVanStoreHeader
                    {...headerProps}
                    store={storeWithNotif}
                    dnNotifications={[{ id: "dn1", code: "DN-001" }]}
                />
            </MemoryRouter>
        );
    });

    it("renders form-type selector when enabled", () => {
        const storeWithSelector = {
            ...baseStore,
            settings: { ...baseStore.settings, enable_sales_page_selection: true, enable_automobile_module: true },
        };
        render(
            <MemoryRouter>
                <SalesVanStoreHeader {...headerProps} store={storeWithSelector} />
            </MemoryRouter>
        );
    });

    it("renders ZATCA checkbox in update mode when phase 2 connected", () => {
        const zatcaStore = {
            ...baseStore,
            zatca: { phase: "2", connected: true },
        };
        render(
            <MemoryRouter>
                <SalesVanStoreHeader
                    {...headerProps}
                    store={zatcaStore}
                    isUpdateForm={false}
                    formData={{ ...baseFormData, enable_report_to_zatca: true }}
                />
            </MemoryRouter>
        );
    });
});

describe("SalesVanStoreBody — smoke", () => {
    it("renders without crashing (empty state)", () => {
        render(
            <MemoryRouter>
                <SalesVanStoreBody {...bodyProps} />
            </MemoryRouter>
        );
    });

    it("renders without crashing when submitting", () => {
        render(
            <MemoryRouter>
                <SalesVanStoreBody {...bodyProps} isSubmitting />
            </MemoryRouter>
        );
    });

    it("renders with a selected customer", () => {
        const customer = {
            id: "cust1",
            name: "Test Customer",
            name_in_arabic: "عميل تجريبي",
            phone: "+966500000000",
            credit_limit: 5000,
            stores: {
                "store123": { credit_balance: 1000 },
            },
        };
        render(
            <MemoryRouter>
                <SalesVanStoreBody
                    {...bodyProps}
                    selectedCustomers={[customer]}
                    formData={{ ...baseFormData, customer_id: "cust1" }}
                />
            </MemoryRouter>
        );
    });

    it("renders with a selected product", () => {
        const product = {
            id: "prod1",
            name: "Test Product",
            name_in_arabic: "منتج تجريبي",
            item_code: "SKU-001",
            quantity: 2,
            unit: "pcs",
            unit_price_with_vat: 115,
            unit_discount_with_vat: 0,
            deleted: false,
        };
        render(
            <MemoryRouter>
                <SalesVanStoreBody {...bodyProps} selectedProducts={[product]} />
            </MemoryRouter>
        );
    });

    it("renders product with discount", () => {
        const product = {
            id: "prod2",
            name: "Discounted Product",
            quantity: 1,
            unit_price_with_vat: 200,
            unit_discount_with_vat: 20,
            deleted: false,
        };
        render(
            <MemoryRouter>
                <SalesVanStoreBody {...bodyProps} selectedProducts={[product]} />
            </MemoryRouter>
        );
    });

    it("renders payment rows", () => {
        const formDataWithPayments = {
            ...baseFormData,
            payments_input: [
                { method: "cash", amount: 100, deleted: false },
                { method: "credit", amount: 15, deleted: false, reference_type: "customer_deposit" },
            ],
        };
        render(
            <MemoryRouter>
                <SalesVanStoreBody
                    {...bodyProps}
                    formData={formDataWithPayments}
                    balanceAmount={15}
                    paymentStatus="paid_partially"
                />
            </MemoryRouter>
        );
    });

    it("renders ZATCA-locked payment row", () => {
        const formDataWithLockedPayment = {
            ...baseFormData,
            payments_input: [
                { method: "cash", amount: 115, deleted: false, reference_type: "customer_deposit" },
            ],
        };
        render(
            <MemoryRouter>
                <SalesVanStoreBody
                    {...bodyProps}
                    formData={formDataWithLockedPayment}
                    isZatcaReported
                    paymentStatus="paid"
                    balanceAmount={0}
                />
            </MemoryRouter>
        );
    });

    it("renders blocked customer error", () => {
        render(
            <MemoryRouter>
                <SalesVanStoreBody
                    {...bodyProps}
                    errors={{ blocked: "3 unpaid sale(s) — new sales blocked." }}
                />
            </MemoryRouter>
        );
    });

    it("renders with order-level discount when products present", () => {
        const product = {
            id: "prod3",
            name: "Prod with Discount",
            quantity: 3,
            unit_price_with_vat: 50,
            unit_discount_with_vat: 0,
            deleted: false,
        };
        render(
            <MemoryRouter>
                <SalesVanStoreBody
                    {...bodyProps}
                    selectedProducts={[product]}
                    discount={10}
                    formData={{ ...baseFormData, total: 150, vat_price: 22.5, net_total: 162.5 }}
                />
            </MemoryRouter>
        );
    });

    it("renders update mode footer button", () => {
        render(
            <MemoryRouter>
                <SalesVanStoreBody {...bodyProps} isUpdateForm />
            </MemoryRouter>
        );
    });

    it("renders with paid payment status badge", () => {
        const formDataPaid = {
            ...baseFormData,
            payments_input: [{ method: "cash", amount: 115, deleted: false }],
        };
        render(
            <MemoryRouter>
                <SalesVanStoreBody
                    {...bodyProps}
                    formData={formDataPaid}
                    paymentStatus="paid"
                    balanceAmount={0}
                />
            </MemoryRouter>
        );
    });
});
