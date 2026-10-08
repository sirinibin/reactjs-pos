const STORE_SELECT = [
    "id", "name", "name_in_arabic", "store_name", "store_name_in_arabic", "code", "branch_name",
    "title", "title_in_arabic",
    "registration_number", "registration_number_in_arabic",
    "email", "phone", "phone_in_arabic",

    "vat_no", "vat_no_in_arabic", "vat_percent", "logo", "invoice_background",
    "country_code", "settings", "zatca",
    "bank_account", "national_address",
    "business_category",
    "sales_serial_number", "sales_return_serial_number",
    "purchase_serial_number", "purchase_return_serial_number",
    "quotation_serial_number", "customer_serial_number", "vendor_serial_number",
    "created_by_name", "created_at", "updated_by_name", "updated_at",
    "marked_for_permanent_deletion", "permanent_deletion_after_days", "deleted",
].join(",");

// In-memory cache: storeId → full store object.
// Callers read whatever fields they need from the cached object locally.
// Call invalidateStoreCache(id) after saving store settings so the next
// fetchStore call hits the API and picks up the latest data.
const _storeCache = new Map();

export function invalidateStoreCache(id) {
    if (id) _storeCache.delete(id);
}

export function _clearAllStoreCaches() {
    _storeCache.clear();
}

export async function fetchStore(id, select = STORE_SELECT) {
    if (!id) return null;

    // Always fetch the full object so any field is available from cache.
    // If a caller passes a custom select we skip caching to avoid partial entries.
    const usingFullSelect = select === STORE_SELECT;

    if (usingFullSelect && _storeCache.has(id)) {
        return _storeCache.get(id);
    }

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

    if (usingFullSelect) {
        _storeCache.set(id, data.result);
    }
    return data.result;
}
