// Carries what the user already entered when switching between the Sales Create
// form and the Quotation Create form. The sending form saves a payload in
// sessionStorage, closes, and the receiving form reads it once when it opens.

export const SALES_TO_QUOTATION_KEY = "sales_to_quotation_switch";
export const QUOTATION_TO_SALES_KEY = "quotation_to_sales_switch";

// Form fields that mean the same thing on both forms. Document-specific fields
// (payments, quotation validity/delivery days, status, invoice type) stay behind.
export const SWITCH_FIELDS = [
    "date_str",
    "phone",
    "vat_no",
    "address",
    "remarks",
    "vehicle_id",
    "vehicle_snapshot",
    "km_driven",
    "discount",
    "discount_with_vat",
    "discount_percent",
    "discount_percent_with_vat",
    "is_discount_percent",
    "shipping_handling_fees",
    "cash_discount",
    "commission",
    "rounding_amount",
    "auto_rounding_amount",
];

const isEmpty = (v) => v === undefined || v === null || v === "";

// amounts: the form's live amount inputs (discount, shipping, ...), which can be
// newer than formData until the next recalculation. They win over formData.
export function buildSwitchPayload({ formData = {}, products = [], customers = [], amounts = {} }) {
    const src = { ...formData };
    if (isEmpty(src.phone) && !isEmpty(formData.customer_phone_number)) src.phone = formData.customer_phone_number;
    Object.keys(amounts).forEach((k) => {
        if (!isEmpty(amounts[k])) src[k] = amounts[k];
    });
    const fields = {};
    SWITCH_FIELDS.forEach((k) => {
        if (isEmpty(src[k])) return;
        fields[k] = src[k] instanceof Date ? src[k].toISOString() : src[k];
    });
    return {
        products: (products || []).filter((p) => p && !p.deleted),
        customers: customers || [],
        customer_id: formData.customer_id || "",
        customer_name: formData.customer_name || "",
        // kept for payloads written by older builds
        customer_phone: fields.phone || "",
        remarks: fields.remarks || "",
        fields,
    };
}

export function saveSwitchPayload(key, payload) {
    try {
        sessionStorage.setItem(key, JSON.stringify(payload));
        return true;
    } catch (_) {
        return false;
    }
}

// Reads and removes the payload so it is applied once. Returns null when there
// is none or it cannot be parsed.
export function takeSwitchPayload(key) {
    let raw = null;
    try {
        raw = sessionStorage.getItem(key);
        if (raw === null) return null;
        sessionStorage.removeItem(key);
        const data = JSON.parse(raw);
        return data && typeof data === "object" ? data : null;
    } catch (_) {
        return null;
    }
}

// The carried form fields, also accepting payloads from older builds that only
// had customer_phone and remarks at the top level.
export function switchFields(payload) {
    if (!payload) return {};
    const fields = { ...(payload.fields || {}) };
    if (isEmpty(fields.phone) && !isEmpty(payload.customer_phone)) fields.phone = payload.customer_phone;
    if (isEmpty(fields.remarks) && !isEmpty(payload.remarks)) fields.remarks = payload.remarks;
    return fields;
}
