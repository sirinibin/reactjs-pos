// Tests for the three vehicle-related fixes in SalesType5Form:
//  Issue 1 & 2 – vehicle fetch URL must filter by customer (not double-wrap params)
//  Issue 3     – vehicle list modal must not close when edit/create opens;
//                it must re-open when VehicleCreate closes.

jest.mock("react-datepicker/dist/react-datepicker.css", () => ({}));

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (k) => k }),
}));

jest.mock("react-bootstrap-typeahead", () => {
    const React = require("react");
    const Typeahead = React.forwardRef((_p, _r) =>
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

// ── Stub heavy grandchild dependencies ──────────────────────────────────────
const Stub = () => null;
jest.mock("../../repair_job/create.js",      () => ({ __esModule: true, default: Stub }));
jest.mock("../../repair_job/kanban.js",       () => ({ __esModule: true, default: Stub }));
jest.mock("../../repair_job/card_view.js",   () => ({ __esModule: true, default: Stub }));
jest.mock("../create.js",                    () => ({ __esModule: true, default: Stub }));
jest.mock("../../sales_return/create.js",    () => ({ __esModule: true, default: Stub }));
jest.mock("../../quotation/QuotationType3Form.js", () => ({ __esModule: true, default: Stub }));

jest.mock("../../customer/history_modal.js", () => {
    const React = require("react");
    const M = React.forwardRef((_p, ref) => {
        React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
        return null;
    });
    M.displayName = "CustomerHistoryModal";
    return { __esModule: true, default: M };
});

jest.mock("../../vehicle/view.js", () => {
    const React = require("react");
    const M = React.forwardRef((_p, ref) => {
        React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
        return null;
    });
    M.displayName = "VehicleView";
    return { __esModule: true, default: M };
});

// VehicleCreate — captures props via global so tests can inspect/trigger onClose.
// Resets happen in beforeEach.
jest.mock("../../vehicle/create.js", () => {
    const React = require("react");
    const M = React.forwardRef((props, ref) => {
        global.__vcProps = props;
        React.useImperativeHandle(ref, () => ({
            open: (...args) => { if (global.__vcOpen) global.__vcOpen(...args); },
        }));
        return null;
    });
    M.displayName = "VehicleCreate";
    return { __esModule: true, default: M };
});

// ── Test data ────────────────────────────────────────────────────────────────
const TEST_VEHICLES = [
    {
        id: "v-1",
        vehicle_number: "ABC-123",
        brand: "Toyota",
        model: "Camry",
        variant: "",
        year: 2020,
        chassis_number: "CH001",
        istimara_no: "IS001",
        current_km: 50000,
        customer_id: "cust-1",
        customer_name: "Test Customer",
    },
];

global.fetch = jest.fn();

beforeEach(() => {
    localStorage.setItem("access_token", "test-token");
    localStorage.setItem("store_id", "store-001");

    global.__vcProps = null;
    global.__vcOpen  = jest.fn();

    global.fetch.mockImplementation((url) => {
        const body = typeof url === "string" && url.includes("/v1/vehicle")
            ? { result: TEST_VEHICLES }
            : { result: [] };
        return Promise.resolve({
            ok: true,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve(body),
        });
    });
});

afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

// ── Imports (after jest.mock calls) ─────────────────────────────────────────
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { SalesType5Body } from "../SalesType5Form.js";

// ── Shared base data ─────────────────────────────────────────────────────────
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

const baseCustomer = { id: "cust-1", name: "Test Customer", code: "C-1", credit_balance: 50 };

// Factory — creates a fresh props object (and fresh formData copy) each call.
// Prevents tests from polluting each other via formData mutations (e.g. vehicle_id).
function makeProps(overrides = {}) {
    return {
        formData: { ...baseFormData },
        setFormData: noop,
        errors: {},
        setErrors: noop,
        selectedProducts: [],
        setSelectedProducts: noop,
        selectedCustomers: [baseCustomer],
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
        ...overrides,
    };
}

// ── Test helpers ─────────────────────────────────────────────────────────────

// Wait until the vehicle count badge is visible (fetch resolved, not loading).
async function renderAndWaitForVehicles(props = makeProps()) {
    render(<SalesType5Body {...props} />);
    await waitFor(() => expect(screen.getByText(/1 vehicle/)).toBeInTheDocument());
}

// "Create New Vehicle" is only rendered inside the vehicle list modal header.
// Using it as the modal-presence indicator avoids false positives from the
// selected-vehicle aside panel that also shows the vehicle number.
const modalMarker = () => screen.queryByText("Create New Vehicle");
const expectModalOpen   = () => expect(modalMarker()).toBeInTheDocument();
const expectModalClosed = () => expect(modalMarker()).not.toBeInTheDocument();

async function openVehicleListModal(props = makeProps()) {
    await renderAndWaitForVehicles(props);
    fireEvent.click(screen.getByText(/1 vehicle/));
    await waitFor(expectModalOpen);
}

// ── Issue 1 & 2: Vehicle fetch URL correctness ───────────────────────────────

describe("Vehicle fetch URL — Issues 1 & 2", () => {
    function vehicleFetchUrl() {
        const call = global.fetch.mock.calls.find(
            ([url]) => typeof url === "string" && url.includes("/v1/vehicle")
        );
        return call ? call[0] : null;
    }

    it("contains search[customer_id]= directly in the URL", async () => {
        render(<SalesType5Body {...makeProps()} />);
        await waitFor(() => expect(vehicleFetchUrl()).toBeTruthy());
        expect(vehicleFetchUrl()).toContain("search[customer_id]=cust-1");
    });

    it("does not double-wrap the customer_id param (no search[search pattern)", async () => {
        render(<SalesType5Body {...makeProps()} />);
        await waitFor(() => expect(vehicleFetchUrl()).toBeTruthy());
        // Old broken output: search[search%5Bcustomer_id%5D]=...
        expect(vehicleFetchUrl()).not.toMatch(/search\[search/);
        expect(vehicleFetchUrl()).not.toContain("search%5B");
    });

    it("includes limit=1000 without wrapping it in search[]", async () => {
        render(<SalesType5Body {...makeProps()} />);
        await waitFor(() => expect(vehicleFetchUrl()).toBeTruthy());
        const url = vehicleFetchUrl();
        expect(url).toContain("limit=1000");
        expect(url).not.toMatch(/search\[limit\]/);
    });

    it("includes search[store_id] when store_id is set in localStorage", async () => {
        render(<SalesType5Body {...makeProps()} />);
        await waitFor(() => expect(vehicleFetchUrl()).toBeTruthy());
        expect(vehicleFetchUrl()).toContain("search[store_id]=store-001");
    });

    it("omits search[store_id] when store_id is absent from localStorage", async () => {
        localStorage.removeItem("store_id");
        render(<SalesType5Body {...makeProps()} />);
        await waitFor(() => expect(vehicleFetchUrl()).toBeTruthy());
        expect(vehicleFetchUrl()).not.toContain("search[store_id]");
    });

    it("does NOT fetch vehicles when customer_id is empty", async () => {
        render(
            <SalesType5Body
                {...makeProps({
                    formData: { ...baseFormData, customer_id: "" },
                    selectedCustomers: [],
                })}
            />
        );
        await act(async () => { await Promise.resolve(); });
        expect(vehicleFetchUrl()).toBeNull();
    });

    it("uses the customer_id from formData in the URL (different customer)", async () => {
        render(
            <SalesType5Body
                {...makeProps({
                    formData: { ...baseFormData, customer_id: "cust-999" },
                    selectedCustomers: [{ ...baseCustomer, id: "cust-999" }],
                })}
            />
        );
        await waitFor(() => expect(vehicleFetchUrl()).toBeTruthy());
        expect(vehicleFetchUrl()).toContain("search[customer_id]=cust-999");
        expect(vehicleFetchUrl()).not.toContain("cust-1");
    });
});

// ── Issue 3: Vehicle list modal open/close behaviour ────────────────────────

describe("Vehicle list modal — Issue 3", () => {
    it("clicking the vehicle count badge opens the vehicle list modal", async () => {
        await renderAndWaitForVehicles();
        expectModalClosed();

        fireEvent.click(screen.getByText(/1 vehicle/));

        await waitFor(expectModalOpen);
    });

    it("Edit button closes the vehicle list modal", async () => {
        await openVehicleListModal();
        fireEvent.click(screen.getByTitle("Edit vehicle"));
        await waitFor(expectModalClosed);
    });

    it("Edit button calls VehicleCreate.open with the vehicle id and customer id", async () => {
        await openVehicleListModal();
        fireEvent.click(screen.getByTitle("Edit vehicle"));
        expect(global.__vcOpen).toHaveBeenCalledWith(
            "v-1",
            "cust-1",
            expect.objectContaining({ name: "Test Customer" })
        );
    });

    it("vehicle list modal re-opens when VehicleCreate.onClose fires after editing", async () => {
        await openVehicleListModal();
        fireEvent.click(screen.getByTitle("Edit vehicle"));
        await waitFor(expectModalClosed);

        act(() => { global.__vcProps?.onClose?.(); });

        await waitFor(expectModalOpen);
    });

    it("Create New Vehicle button closes the vehicle list modal", async () => {
        await openVehicleListModal();
        // The button text appears both in the aside-dropdown AND the modal header;
        // clicking the one inside the open modal.
        const btn = screen.getAllByText("Create New Vehicle").at(-1);
        fireEvent.click(btn);
        await waitFor(expectModalClosed);
    });

    it("Create New Vehicle button calls VehicleCreate.open with no vehicle id", async () => {
        await openVehicleListModal();
        const btn = screen.getAllByText("Create New Vehicle").at(-1);
        fireEvent.click(btn);
        expect(global.__vcOpen).toHaveBeenCalledWith(
            undefined,
            "cust-1",
            expect.objectContaining({ name: "Test Customer" })
        );
    });

    it("vehicle list modal re-opens when VehicleCreate.onClose fires after creating", async () => {
        await openVehicleListModal();
        const btn = screen.getAllByText("Create New Vehicle").at(-1);
        fireEvent.click(btn);
        await waitFor(expectModalClosed);

        act(() => { global.__vcProps?.onClose?.(); });

        await waitFor(expectModalOpen);
    });

    it("onClose does NOT re-open the modal a second time once the flag is cleared", async () => {
        await openVehicleListModal();
        fireEvent.click(screen.getByTitle("Edit vehicle"));
        await waitFor(expectModalClosed);

        // First close — flag was set by clicking Edit → modal re-opens
        act(() => { global.__vcProps?.onClose?.(); });
        await waitFor(expectModalOpen);

        // Close the modal manually (click the × in the Bootstrap modal header)
        fireEvent.click(screen.getByLabelText("Close"));
        await waitFor(expectModalClosed);

        // Second onClose — flag is cleared now → modal stays closed
        act(() => { global.__vcProps?.onClose?.(); });
        await act(async () => { await Promise.resolve(); });
        expectModalClosed();
    });

    it("opening VehicleCreate from the main Add Vehicle button does NOT re-open modal on close", async () => {
        await renderAndWaitForVehicles();

        // Main form's "+" Add Vehicle button (not inside the modal)
        fireEvent.click(screen.getByTitle("Add Vehicle"));

        // Simulate VehicleCreate closing — origin flag was never set
        act(() => { global.__vcProps?.onClose?.(); });
        await act(async () => { await Promise.resolve(); });

        expectModalClosed();
    });

    it("Select button closes the vehicle list modal", async () => {
        await openVehicleListModal();
        fireEvent.click(screen.getByText("Select"));
        await waitFor(expectModalClosed);
    });

    it("Select button does NOT set origin flag — onClose does not re-open modal", async () => {
        await openVehicleListModal();
        fireEvent.click(screen.getByText("Select"));
        await waitFor(expectModalClosed);

        act(() => { global.__vcProps?.onClose?.(); });
        await act(async () => { await Promise.resolve(); });

        expectModalClosed();
    });

    it("Vehicle History button closes the modal without setting origin flag", async () => {
        await openVehicleListModal();
        fireEvent.click(screen.getByTitle("Vehicle History"));
        await waitFor(expectModalClosed);

        // VehicleCreate.onClose must NOT re-open the modal
        act(() => { global.__vcProps?.onClose?.(); });
        await act(async () => { await Promise.resolve(); });

        expectModalClosed();
    });

    it("clicking a vehicle row selects it and closes the modal", async () => {
        await openVehicleListModal();

        // Find the vehicle number cell in the modal table and click its row
        const tds = screen.getAllByText("ABC-123");
        const td  = tds.find((el) => el.tagName === "TD");
        expect(td).toBeTruthy();
        fireEvent.click(td.closest("tr"));

        await waitFor(expectModalClosed);
    });
});
