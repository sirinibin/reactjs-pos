// Smoke test — SalesType1Form
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
    const Modal = ({ children }) => React.createElement(React.Fragment, null, children || null);
    Modal.Header = ({ children }) => React.createElement("div", null, children || null);
    Modal.Title = ({ children }) => React.createElement("h4", null, children || null);
    Modal.Body = ({ children }) => React.createElement("div", null, children || null);
    Modal.Footer = ({ children }) => React.createElement("div", null, children || null);
    const Dropdown = ({ children }) => React.createElement(React.Fragment, null, children || null);
    Dropdown.Toggle = ({ children }) => React.createElement("span", null, children || null);
    Dropdown.Menu = ({ children }) => React.createElement("div", null, children || null);
    Dropdown.ItemText = ({ children }) => React.createElement("span", null, children || null);
    Dropdown.Item = ({ children }) => React.createElement("div", null, children || null);
    return {
        Spinner: () => React.createElement("span", { role: "status" }, "loading"),
        Dropdown,
        Modal,
        Button: ({ children, onClick }) =>
            React.createElement("button", { type: "button", onClick }, children || null),
        Form: passthrough,
        Table: ({ children }) => React.createElement("table", null, children || null),
        Row: passthrough,
        Col: passthrough,
        Alert: passthrough,
        OverlayTrigger: ({ children }) =>
            React.createElement(React.Fragment, null, children || null),
        Tooltip: ({ children }) => React.createElement("span", null, children || null),
    };
});

// ── react-bootstrap-typeahead ──────────────────────────────────────────────────
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

// ── react-number-format ────────────────────────────────────────────────────────
jest.mock("react-number-format", () => {
    const React = require("react");
    return {
        __esModule: true,
        default: ({ value, renderText }) =>
            React.createElement(
                "span",
                null,
                renderText ? renderText(String(value ?? "")) : String(value ?? "")
            ),
    };
});

// ── react-datepicker ───────────────────────────────────────────────────────────
jest.mock("react-datepicker", () => {
    const React = require("react");
    return {
        __esModule: true,
        default: () => React.createElement("input", { "data-testid": "datepicker" }),
    };
});

// ── react-debounce-input ───────────────────────────────────────────────────────
jest.mock("react-debounce-input", () => {
    const React = require("react");
    return {
        DebounceInput: React.forwardRef((props, ref) =>
            React.createElement("input", {
                ref,
                "data-testid": "debounce-input",
                onChange: props.onChange,
            })
        ),
    };
});

// ── date-fns: keep real ────────────────────────────────────────────────────────

// ── utils ──────────────────────────────────────────────────────────────────────
jest.mock("../../utils/amount.js", () => {
    const React = require("react");
    return { __esModule: true, default: () => React.createElement("span", null, "0") };
});

jest.mock("../../utils/numberUtils", () => ({
    trimTo2Decimals: (v) => Number(v).toFixed(2),
    trimTo8Decimals: (v) => Number(v).toFixed(8),
}));

jest.mock("../../utils/search.js", () => ({
    highlightWords: (text) => text,
}));

jest.mock("../../utils/ResizableTableCell", () => {
    const React = require("react");
    return {
        __esModule: true,
        default: ({ children }) => React.createElement("td", null, children || null),
    };
});

jest.mock("../../utils/TableSettingsModal.js", () => {
    const React = require("react");
    return {
        __esModule: true,
        default: () => React.createElement("div", { "data-testid": "table-settings-modal" }),
    };
});

// ── timers / fetch ─────────────────────────────────────────────────────────────
jest.useFakeTimers();

global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => "application/json" },
    json: () =>
        Promise.resolve({ result: {}, data: [], total_count: 0, store: {}, settings: {} }),
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
    phone: "",
    remarks: "",
    repair_job_id: null,
    repair_job_ids: [],
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
    formType: "type1",
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
    openJobCard: null,
    repairJobInfos: [],
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
    warehouseList: [],
    openCustomerSearchResult: false,
    setOpenCustomerSearchResult: noop,
    openProductSearchResult: false,
    setOpenProductSearchResult: noop,
    customerOptions: [],
    setCustomerOptions: noop,
    productOptions: [],
    setProductOptions: noop,
    showSelectedProductsSettings: false,
    setShowSelectedProductsSettings: noop,
    showProductSearchSettings: false,
    setShowProductSearchSettings: noop,
    showBillSummarySettings: false,
    setShowBillSummarySettings: noop,
    billSummaryOrder: [],
    setBillSummaryOrder: noop,
    billSummaryVisible: {},
    setBillSummaryVisible: noop,
    billSummaryDragRef: noopRef,
    _billSummaryFieldLabels: {},
    _defaultBillSummaryOrder: [],
    reorderBillSummaryT1: noop,
    updateBillSummaryVisible: noop,
    timerRef: noopRef,
    customerSearchRef: noopRef,
    productSearchRef: noopRef,
    inputRefs: { current: {} },
    latestRequestRef: noopRef,
    onChangeTriggeredRef: noopRef,
    discountRef: noopRef,
    discountWithVATRef: noopRef,
    cashDiscountRef: noopRef,
    commissionRef: noopRef,
    handleCreate: noop,
    suggestCustomers: noop,
    suggestProducts: noop,
    getProductByBarCode: noop,
    addProduct: noop,
    removeProduct: noop,
    openCustomerCreateForm: noop,
    openCustomerUpdateForm: noop,
    openCustomerPending: noop,
    openCustomers: noop,
    openProducts: noop,
    openServices: noop,
    openProductCreateForm: noop,
    openServiceCreateForm: noop,
    openUpdateProductForm: noop,
    openProductDetails: noop,
    openProductImages: noop,
    openLinkedProducts: noop,
    openSalesHistory: noop,
    openPurchaseHistory: noop,
    openSalesReturnHistory: noop,
    openPurchaseReturnHistory: noop,
    openQuotationHistory: noop,
    openDeliveryNoteHistory: noop,
    openProductHistory: noop,
    openQuotationSalesHistory: noop,
    openQuotationSalesReturnHistory: noop,
    openQuotations: noop,
    openDeliveryNotes: noop,
    openReferenceUpdateForm: noop,
    addNewPayment: noop,
    removePayment: noop,
    validatePaymentAmounts: noop,
    getColumnWidth: () => 100,
    getShortcut: () => "",
    RunKeyActions: noop,
    CalCulateLineTotals: noop,
    reCalculate: noop,
    reCalculateRef: noopRef,
    checkErrors: noop,
    checkWarnings: noop,
    checkWarning: () => false,
    isProductAdded: () => false,
    sendWhatsAppMessage: noop,
    dateLocale: undefined,
    columnStyle: () => ({}),
    searchProductsColumns: [],
    selectedProductsColumns: [],
    shipping: 0,
    setShipping: noop,
    discount: 0,
    setDiscount: noop,
    discountWithVAT: 0,
    setDiscountWithVAT: noop,
    discountPercent: 0,
    setDiscountPercent: noop,
    discountPercentWithVAT: 0,
    setDiscountPercentWithVAT: noop,
    roundingAmount: 0,
    setRoundingAmount: noop,
    cashDiscount: 0,
    setCashDiscount: noop,
    commission: 0,
    setCommission: noop,
    totalPaymentAmount: 0,
    balanceAmount: 0,
    paymentStatus: "not_paid",
    isSubmitting: false,
    isUpdateForm: false,
    handleClose: noop,
    renderTotalWithoutVATTooltip: () => null,
    renderTotalWithVATTooltip: () => null,
    renderShippingTooltip: () => null,
    renderDiscountWithoutVATTooltip: () => null,
    renderDiscountWithVATTooltip: () => null,
    renderTooltip: () => null,
    renderVATTooltip: () => null,
    renderNetTotalBeforeRoundingTooltip: () => null,
    renderNetTotalTooltip: () => null,
    fetchAndSetCustomer: noop,
    startPsColResize: noop,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SalesType1Header, SalesType1Body } from "../SalesType1Form";

describe("SalesType1Header — smoke", () => {
    it("renders without crashing (create mode)", () => {
        render(
            <MemoryRouter>
                <SalesType1Header {...headerProps} />
            </MemoryRouter>
        );
    });

    it("renders without crashing (update mode)", () => {
        render(
            <MemoryRouter>
                <SalesType1Header
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
                <SalesType1Header {...headerProps} isSubmitting />
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
                <SalesType1Header
                    {...headerProps}
                    store={storeWithNotif}
                    dnNotifications={[{ id: "dn1", code: "DN-001", arrived_at: "2026-01-01T08:00:00Z" }]}
                />
            </MemoryRouter>
        );
    });

    it("renders form-type selector when enabled", () => {
        const storeWithSelector = {
            ...baseStore,
            settings: {
                ...baseStore.settings,
                enable_sales_page_selection: true,
                enable_automobile_module: true,
            },
        };
        render(
            <MemoryRouter>
                <SalesType1Header {...headerProps} store={storeWithSelector} />
            </MemoryRouter>
        );
    });

    it("renders ZATCA checkbox when phase 2 connected", () => {
        const zatcaStore = {
            ...baseStore,
            zatca: { phase: "2", connected: true },
        };
        render(
            <MemoryRouter>
                <SalesType1Header
                    {...headerProps}
                    store={zatcaStore}
                    isUpdateForm={false}
                    formData={{ ...baseFormData, enable_report_to_zatca: true }}
                />
            </MemoryRouter>
        );
    });

    it("renders job card dropdown when repair_job_ids present", () => {
        const openJobCard = jest.fn();
        render(
            <MemoryRouter>
                <SalesType1Header
                    {...headerProps}
                    isUpdateForm
                    openJobCard={openJobCard}
                    repairJobInfos={[{ id: "job1", job_number: "JC-001", customer_name: "Test" }]}
                    formData={{ ...baseFormData, repair_job_ids: ["job1"] }}
                />
            </MemoryRouter>
        );
    });

    it("renders single job card button when repair_job_id present", () => {
        const openJobCard = jest.fn();
        render(
            <MemoryRouter>
                <SalesType1Header
                    {...headerProps}
                    isUpdateForm
                    openJobCard={openJobCard}
                    repairJobInfos={[]}
                    formData={{ ...baseFormData, repair_job_ids: [], repair_job_id: "job1" }}
                />
            </MemoryRouter>
        );
    });
});

describe("SalesType1Body — smoke", () => {
    it("renders without crashing (empty state)", () => {
        render(
            <MemoryRouter>
                <SalesType1Body {...bodyProps} />
            </MemoryRouter>
        );
    });

    it("renders without crashing when submitting", () => {
        render(
            <MemoryRouter>
                <SalesType1Body {...bodyProps} isSubmitting />
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
            stores: { store123: { credit_balance: 1000 } },
        };
        render(
            <MemoryRouter>
                <SalesType1Body
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
                <SalesType1Body {...bodyProps} selectedProducts={[product]} />
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
                <SalesType1Body {...bodyProps} selectedProducts={[product]} />
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
                <SalesType1Body
                    {...bodyProps}
                    formData={formDataWithPayments}
                    balanceAmount={15}
                    paymentStatus="paid_partially"
                />
            </MemoryRouter>
        );
    });

    it("renders with ZATCA-reported payments", () => {
        const formDataLocked = {
            ...baseFormData,
            payments_input: [
                { method: "cash", amount: 115, deleted: false, reference_type: "customer_deposit" },
            ],
        };
        render(
            <MemoryRouter>
                <SalesType1Body
                    {...bodyProps}
                    formData={formDataLocked}
                    isZatcaReported
                    paymentStatus="paid"
                    balanceAmount={0}
                />
            </MemoryRouter>
        );
    });

    it("renders with blocked customer error", () => {
        render(
            <MemoryRouter>
                <SalesType1Body
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
                <SalesType1Body
                    {...bodyProps}
                    selectedProducts={[product]}
                    discount={10}
                    formData={{ ...baseFormData, total: 150, vat_price: 22.5, net_total: 162.5 }}
                />
            </MemoryRouter>
        );
    });

    it("renders update mode", () => {
        render(
            <MemoryRouter>
                <SalesType1Body {...bodyProps} isUpdateForm />
            </MemoryRouter>
        );
    });

    it("renders with paid payment status", () => {
        const formDataPaid = {
            ...baseFormData,
            payments_input: [{ method: "cash", amount: 115, deleted: false }],
        };
        render(
            <MemoryRouter>
                <SalesType1Body
                    {...bodyProps}
                    formData={formDataPaid}
                    paymentStatus="paid"
                    balanceAmount={0}
                />
            </MemoryRouter>
        );
    });
});
