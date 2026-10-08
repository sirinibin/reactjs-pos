import {
    buildSwitchPayload, saveSwitchPayload, takeSwitchPayload, switchFields,
    SALES_TO_QUOTATION_KEY, QUOTATION_TO_SALES_KEY, SWITCH_FIELDS,
} from "../salesQuotationSwitch";

beforeEach(() => sessionStorage.clear());

describe("buildSwitchPayload", () => {
    const formData = {
        customer_id: "c-1", customer_name: "Walk-in Co", phone: "0500000000", vat_no: "300000000000003",
        address: "Riyadh", remarks: "Deliver by Sunday", date_str: "2026-10-01T09:00:00.000Z",
        discount: 5, discount_with_vat: 5.75, discount_percent: 2, discount_percent_with_vat: 2,
        shipping_handling_fees: 10, cash_discount: 1, commission: 3, rounding_amount: 0.25, auto_rounding_amount: false,
        vehicle_id: "v-1", vehicle_snapshot: { vehicle_number: "ABC 123" }, km_driven: 12000,
        // document-specific fields that must stay behind
        payments_input: [{ amount: 50 }], validity_days: 2, delivery_days: 7, status: "created", type: "invoice", id: "x", code: "S-1",
    };
    const products = [{ product_id: "p-1", quantity: 2 }, { product_id: "p-2", quantity: 1, deleted: true }];

    test("carries every shared field, the customer and the products", () => {
        const p = buildSwitchPayload({ formData, products, customers: [{ id: "c-1" }] });
        expect(p.customer_id).toBe("c-1");
        expect(p.customer_name).toBe("Walk-in Co");
        expect(p.customers).toEqual([{ id: "c-1" }]);
        expect(p.fields).toEqual({
            date_str: "2026-10-01T09:00:00.000Z", phone: "0500000000", vat_no: "300000000000003", address: "Riyadh",
            remarks: "Deliver by Sunday", vehicle_id: "v-1", vehicle_snapshot: { vehicle_number: "ABC 123" }, km_driven: 12000,
            discount: 5, discount_with_vat: 5.75, discount_percent: 2, discount_percent_with_vat: 2,
            shipping_handling_fees: 10, cash_discount: 1, commission: 3, rounding_amount: 0.25, auto_rounding_amount: false,
        });
    });

    test("leaves payments, ids, codes, status and quotation-only fields behind", () => {
        const p = buildSwitchPayload({ formData, products });
        ["payments_input", "validity_days", "delivery_days", "status", "type", "id", "code"].forEach((k) => {
            expect(p.fields).not.toHaveProperty(k);
            expect(p).not.toHaveProperty(k);
        });
    });

    test("drops deleted product lines and keeps line details as entered", () => {
        const lines = [{ product_id: "p-1", quantity: 3, unit_price: 9.5, unit_discount: 1, name: "Oil" }, { product_id: "p-2", deleted: true }];
        expect(buildSwitchPayload({ formData: {}, products: lines }).products).toEqual([lines[0]]);
    });

    test("live amount inputs win over stale formData values", () => {
        const p = buildSwitchPayload({ formData: { discount: 1, shipping_handling_fees: 0 }, amounts: { discount: 7, shipping_handling_fees: 4 } });
        expect(p.fields.discount).toBe(7);
        expect(p.fields.shipping_handling_fees).toBe(4);
    });

    test("an empty live input falls back to formData", () => {
        const p = buildSwitchPayload({ formData: { cash_discount: 2 }, amounts: { cash_discount: "", commission: null } });
        expect(p.fields.cash_discount).toBe(2);
        expect(p.fields).not.toHaveProperty("commission");
    });

    test("keeps zero amounts and false flags, skips empty values", () => {
        const p = buildSwitchPayload({ formData: { discount: 0, auto_rounding_amount: false, remarks: "", address: null } });
        expect(p.fields.discount).toBe(0);
        expect(p.fields.auto_rounding_amount).toBe(false);
        expect(p.fields).not.toHaveProperty("remarks");
        expect(p.fields).not.toHaveProperty("address");
    });

    test("uses the quotation form's customer_phone_number when phone is empty", () => {
        const p = buildSwitchPayload({ formData: { customer_phone_number: "0511111111" } });
        expect(p.fields.phone).toBe("0511111111");
        expect(p.customer_phone).toBe("0511111111");
    });

    test("serialises Date objects so the payload survives JSON", () => {
        const d = new Date("2026-10-05T12:00:00Z");
        expect(buildSwitchPayload({ formData: { date_str: d } }).fields.date_str).toBe(d.toISOString());
    });

    test("handles a blank form", () => {
        const p = buildSwitchPayload({ formData: {}, products: undefined, customers: undefined });
        expect(p).toEqual({ products: [], customers: [], customer_id: "", customer_name: "", customer_phone: "", remarks: "", fields: {} });
    });

    test("the shared field list has no duplicates", () => {
        expect(new Set(SWITCH_FIELDS).size).toBe(SWITCH_FIELDS.length);
    });
});

describe("saveSwitchPayload / takeSwitchPayload", () => {
    test("round-trips through sessionStorage and is read only once", () => {
        const payload = buildSwitchPayload({ formData: { remarks: "hi", discount: 3 }, products: [{ product_id: "p-1" }] });
        expect(saveSwitchPayload(SALES_TO_QUOTATION_KEY, payload)).toBe(true);
        expect(takeSwitchPayload(QUOTATION_TO_SALES_KEY)).toBeNull();
        expect(takeSwitchPayload(SALES_TO_QUOTATION_KEY)).toEqual(payload);
        expect(takeSwitchPayload(SALES_TO_QUOTATION_KEY)).toBeNull();
    });

    test("ignores and clears unreadable data", () => {
        sessionStorage.setItem(QUOTATION_TO_SALES_KEY, "{not json");
        expect(takeSwitchPayload(QUOTATION_TO_SALES_KEY)).toBeNull();
        expect(sessionStorage.getItem(QUOTATION_TO_SALES_KEY)).toBeNull();
        sessionStorage.setItem(QUOTATION_TO_SALES_KEY, "42");
        expect(takeSwitchPayload(QUOTATION_TO_SALES_KEY)).toBeNull();
    });

    test("does not throw when storage is unavailable", () => {
        const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
        expect(saveSwitchPayload(SALES_TO_QUOTATION_KEY, {})).toBe(false);
        spy.mockRestore();
        const spy2 = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
        expect(takeSwitchPayload(SALES_TO_QUOTATION_KEY)).toBeNull();
        spy2.mockRestore();
    });
});

describe("switchFields", () => {
    test("returns the carried fields", () => {
        expect(switchFields({ fields: { discount: 4, address: "Jeddah" } })).toEqual({ discount: 4, address: "Jeddah" });
    });

    test("reads phone and remarks from payloads written by older builds", () => {
        expect(switchFields({ customer_phone: "0500", remarks: "old" })).toEqual({ phone: "0500", remarks: "old" });
    });

    test("is empty for a missing payload", () => {
        expect(switchFields(null)).toEqual({});
        expect(switchFields(undefined)).toEqual({});
    });
});
