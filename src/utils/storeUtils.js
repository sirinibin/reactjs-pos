const STORE_SELECT = [
    "id", "name", "name_in_arabic", "code", "branch_name",
    "title", "title_in_arabic",
    "registration_number", "registration_number_in_arabic",
    "email", "phone", "phone_in_arabic",
    "address", "address_in_arabic", "zipcode", "zipcode_in_arabic",
    "vat_no", "vat_no_in_arabic", "vat_percent", "logo",
    "country_code", "settings", "zatca",
    "bank_account", "national_address",
    "business_category",
    "sales_serial_number", "sales_return_serial_number",
    "purchase_serial_number", "purchase_return_serial_number",
    "quotation_serial_number", "customer_serial_number", "vendor_serial_number",
    "created_by_name", "created_at", "updated_by_name", "updated_at",
    "marked_for_permanent_deletion", "permanent_deletion_after_days", "deleted",
].join(",");

export async function fetchStore(id, select = STORE_SELECT) {
    const requestOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('access_token'),
        },
    };
    const response = await fetch(`/v1/store/${id}?select=${select}`, requestOptions);
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson && await response.json();
    if (!response.ok) {
        return Promise.reject(data && data.errors);
    }
    return data.result;
}
