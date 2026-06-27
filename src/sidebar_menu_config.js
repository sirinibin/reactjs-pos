// Central definition of all sidebar menu items.
// adminOnly / warehouseOnly items are hidden by the sidebar at runtime
// based on user_role / store settings — they still appear in the settings page.
export const DEFAULT_MENU = [
    { id: "dashboard",        label: "Dashboard",                 path: "/dashboard/business-dashboard",      icon: "bi-speedometer2" },
    { id: "sales",            label: "Sales",                     path: "/dashboard/sales",                   icon: "bi-receipt" },
    { id: "sales_return",     label: "Sales Returns",             path: "/dashboard/salesreturn",             icon: "bi-receipt-cutoff" },
    { id: "purchases",        label: "Purchases",                 path: "/dashboard/purchases",               icon: "bi-cart4" },
    { id: "purchase_return",  label: "Purchase Returns",          path: "/dashboard/purchasereturn",          icon: "bi-cart-x" },
    { id: "delivery_notes",   label: "Delivery Notes",            path: "/dashboard/delivery-notes",          icon: "bi-truck" },
    { id: "quotations",       label: "Quotations",                path: "/dashboard/quotations",              icon: "bi-clipboard2-check" },
    { id: "qtn_sales_return", label: "Quotation Sales Returns",   path: "/dashboard/quotation_sales_returns", icon: "bi-clipboard2-minus" },
    { id: "stats",            label: "Statistics",                path: "/dashboard/stats",                   icon: "bi-bar-chart-line" },
    { id: "vendors",          label: "Vendors / Suppliers",       path: "/dashboard/vendors",                 icon: "bi-building" },
    { id: "stores",           label: "Stores",                    path: "/dashboard/stores",                  icon: "bi-shop" },
    { id: "warehouses",       label: "Warehouses",                path: "/dashboard/warehouses",              icon: "bi-boxes",         warehouseOnly: true },
    { id: "stock_transfers",  label: "Stock Transfers",           path: "/dashboard/stock-transfers",         icon: "bi-arrow-left-right", warehouseOnly: true },
    { id: "customers",        label: "Customers",                 path: "/dashboard/customers",               icon: "bi-people" },
    { id: "products",         label: "Products",                  path: "/dashboard/products",                icon: "bi-box-seam" },
    { id: "product_category", label: "Product Categories",        path: "/dashboard/product_category",        icon: "bi-grid" },
    { id: "product_brand",    label: "Product Brands",            path: "/dashboard/product_brand",           icon: "bi-award" },
    { id: "expense_category", label: "Expense Categories",        path: "/dashboard/expense_category",        icon: "bi-folder2-open" },
    { id: "expenses",         label: "Expenses",                  path: "/dashboard/expenses",                icon: "bi-wallet2" },
    { id: "analytics",        label: "Analytics",                 path: "/dashboard/analytics",               icon: "bi-graph-up-arrow", adminOnly: true },
    { id: "receivables",      label: "Receivables",               path: "/dashboard/receivables",             icon: "bi-cash-stack" },
    { id: "payables",         label: "Payables",                  path: "/dashboard/payables",                icon: "bi-credit-card" },
    { id: "capitals",         label: "Capitals",                  path: "/dashboard/capitals",                icon: "bi-bank" },
    { id: "dividents",        label: "Drawings",                  path: "/dashboard/dividents",               icon: "bi-piggy-bank" },
    { id: "ledger",           label: "Ledger",                    path: "/dashboard/ledger",                  icon: "bi-journal-text" },
    { id: "accounts",         label: "Accounts & Trial Balances", path: "/dashboard/accounts",                icon: "bi-calculator" },
    { id: "users",            label: "Users",                     path: "/dashboard/users",                   icon: "bi-person-gear",   adminOnly: true },
];

const STORAGE_KEY = "sidebar_config";

// Returns ordered array of { id, visible } merged with DEFAULT_MENU metadata.
// Falls back to all items visible when nothing is stored.
export function loadSidebarConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw); // [{ id, visible }]
            // Merge: respect saved order/visibility; append any new items not yet in saved
            const mapped = saved
                .map(s => DEFAULT_MENU.find(m => m.id === s.id) ? { ...DEFAULT_MENU.find(m => m.id === s.id), visible: s.visible } : null)
                .filter(Boolean);
            const savedIds = new Set(saved.map(s => s.id));
            DEFAULT_MENU.filter(m => !savedIds.has(m.id)).forEach(m => mapped.push({ ...m, visible: true }));
            return mapped;
        }
    } catch {}
    return DEFAULT_MENU.map(m => ({ ...m, visible: true }));
}

export function saveSidebarConfig(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(({ id, visible }) => ({ id, visible }))));
}

// Returns the path the app should navigate to after login —
// the first visible item in the user's config, respecting role/store context.
export function getLandingPath() {
    const config  = loadSidebarConfig();
    const isAdmin = localStorage.getItem("user_role") === "Admin";
    const first   = config.find(item => {
        if (!item.visible) return false;
        if (item.adminOnly && !isAdmin) return false;
        return true;
    });
    return first?.path || "/dashboard/business-dashboard";
}
