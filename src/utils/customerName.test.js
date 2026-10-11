import { trimName, cleanTypedCustomerName } from "./customerName";

describe("trimName", () => {
    test.each([
        ["", ""],
        [" ", ""],
        ["    ", ""],
        ["\t\n\r", ""],
        ["\u00a0", ""],
        ["\u200b", ""],
        ["\ufeff", ""],
        [" \u200b\u200c\u200d\u2060\ufeff ", ""],
        ["Ali", "Ali"],
        ["  Ali  ", "Ali"],
        ["\u200bAli\u200b", "Ali"],
        ["Ali Hassan", "Ali Hassan"],
        ["  محمد  ", "محمد"],
        ["می\u200cخواهم", "می\u200cخواهم"],
    ])("trimName(%j) is %j", (input, want) => {
        expect(trimName(input)).toBe(want);
    });

    test.each([undefined, null, 42, {}])("a non-string (%p) is treated as no name", (input) => {
        expect(trimName(input)).toBe("");
    });
});

describe("cleanTypedCustomerName", () => {
    test("a name of only spaces is dropped so the API uses UNKNOWN", () => {
        const formData = { customer_id: "", customer_name: "   ", customerName: "   " };
        cleanTypedCustomerName(formData);
        expect(formData.customer_name).toBe("");
        expect(formData.customerName).toBe("");
    });

    test("a typed name is trimmed", () => {
        const formData = { customer_id: "", customer_name: "  Walk In Ali \u200b" };
        cleanTypedCustomerName(formData);
        expect(formData.customer_name).toBe("Walk In Ali");
        expect(formData.customerName).toBeUndefined();
    });

    test("a selected customer keeps its id and name", () => {
        const formData = { customer_id: "abc", customer_name: "Named Customer" };
        cleanTypedCustomerName(formData);
        expect(formData).toEqual({ customer_id: "abc", customer_name: "Named Customer" });
    });

    test("a missing name becomes empty and no formData is a no-op", () => {
        const formData = {};
        cleanTypedCustomerName(formData);
        expect(formData.customer_name).toBe("");
        expect(cleanTypedCustomerName(undefined)).toBeUndefined();
    });
});
