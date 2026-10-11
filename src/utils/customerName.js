// Spaces and invisible characters (zero-width space, joiners, byte order
// mark) at either end of a name. The API trims names the same way
// (models.TrimName in pos-rest).
const EDGE_BLANKS = /^[\s​‌‍⁠﻿]+|[\s​‌‍⁠﻿]+$/g;

// trimName returns the name without leading/trailing blanks; a name of only
// blanks becomes "".
export function trimName(name) {
    if (typeof name !== "string") {
        return "";
    }
    return name.replace(EDGE_BLANKS, "");
}

// cleanTypedCustomerName tidies the customer typed into a sale, quotation or
// delivery note before it is saved: the typed name is trimmed, and a name of
// only blanks is dropped, so the API falls back to the UNKNOWN customer
// instead of creating a customer with a blank name.
export function cleanTypedCustomerName(formData) {
    if (!formData) {
        return formData;
    }
    const name = trimName(formData.customer_name);
    formData.customer_name = name;
    if (typeof formData.customerName === "string") {
        formData.customerName = name;
    }
    return formData;
}
