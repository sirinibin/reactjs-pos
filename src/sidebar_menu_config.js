// Central definition of all sidebar menu items.
// adminOnly / warehouseOnly / productsOnly items are hidden by the sidebar at runtime
// based on user_role / store settings — they still appear in the settings page.
export const DEFAULT_MENU = [
    { id: "dashboard", resource: "dashboard", label: "Dashboard", path: "/dashboard/business-dashboard", icon: "bi-speedometer2" },
    { id: "sales", resource: "sales", label: "Sales", path: "/dashboard/sales", icon: "bi-receipt" },
    { id: "sales_return", resource: "sales_return", label: "Sales Returns", path: "/dashboard/salesreturn", icon: "bi-receipt-cutoff" },
    { id: "purchases", resource: "purchases", label: "Purchases", path: "/dashboard/purchases", icon: "bi-cart4", productsOnly: true },
    { id: "purchase_orders", resource: "purchase_orders", label: "Purchase Orders", path: "/dashboard/purchase-orders", icon: "bi-file-earmark-text", requiresPurchaseOrderModule: true },
    { id: "purchase_requests", resource: "purchase_requests", label: "Purchase Requests", path: "/dashboard/purchase-requests", icon: "bi-clipboard2-pulse", purchaseRequestOnly: true },
    { id: "purchase_return", resource: "purchase_return", label: "Purchase Returns", path: "/dashboard/purchasereturn", icon: "bi-cart-x", productsOnly: true },
    { id: "delivery_notes", resource: "delivery_notes", label: "Delivery Notes", path: "/dashboard/delivery-notes", icon: "bi-truck" },
    { id: "quotations", resource: "quotations", label: "Quotations", path: "/dashboard/quotations", icon: "bi-clipboard2-check" },
    { id: "qtn_sales_return", resource: "qtn_sales_return", label: "Quotation Sales Returns", path: "/dashboard/quotation_sales_returns", icon: "bi-clipboard2-minus" },
    { id: "stats", resource: "stats", label: "Statistics", path: "/dashboard/stats", icon: "bi-bar-chart-line" },
    { id: "vendors", resource: "vendors", label: "Vendors / Suppliers", path: "/dashboard/vendors", icon: "bi-building" },
    { id: "stores", resource: "stores", label: "Stores", path: "/dashboard/stores", icon: "bi-shop" },
    { id: "warehouses", resource: "warehouses", label: "Warehouses", path: "/dashboard/warehouses", icon: "bi-boxes", warehouseOnly: true },
    { id: "stock_transfers", resource: "stock_transfers", label: "Stock Transfers", path: "/dashboard/stock-transfers", icon: "bi-arrow-left-right", warehouseOnly: true },
    { id: "customers", resource: "customers", label: "Customers", path: "/dashboard/customers", icon: "bi-people" },
    { id: "products", resource: "products", label: "Products", path: "/dashboard/products", icon: "bi-box-seam", productsOnly: true },
    { id: "services", resource: "services", label: "Services", path: "/dashboard/services", icon: "bi-clipboard-check", requiresServices: true },
    { id: "product_category", resource: "product_category", label: "Product Categories", path: "/dashboard/product_category", icon: "bi-grid", productsOnly: true },
    { id: "service_category", resource: "service_category", label: "Service Categories", path: "/dashboard/service_category", icon: "bi-grid-3x3-gap", requiresServices: true },
    { id: "product_brand", resource: "product_brand", label: "Product Brands", path: "/dashboard/product_brand", icon: "bi-award", productsOnly: true },
    { id: "expense_category", resource: "expense_category", label: "Expense Categories", path: "/dashboard/expense_category", icon: "bi-folder2-open" },
    { id: "expenses", resource: "expenses", label: "Expenses", path: "/dashboard/expenses", icon: "bi-wallet2" },
    { id: "analytics", resource: "analytics", label: "Analytics", path: "/dashboard/analytics", icon: "bi-graph-up-arrow", adminOnly: true },
    { id: "receivables", resource: "receivables", label: "Receivables", path: "/dashboard/receivables", icon: "bi-cash-stack" },
    { id: "payables", resource: "payables", label: "Payables", path: "/dashboard/payables", icon: "bi-credit-card" },
    { id: "capitals", resource: "capitals", label: "Capitals", path: "/dashboard/capitals", icon: "bi-bank" },
    { id: "dividents", resource: "dividents", label: "Drawings", path: "/dashboard/dividents", icon: "bi-piggy-bank" },
    { id: "ledger", resource: "ledger", label: "Ledger", path: "/dashboard/ledger", icon: "bi-journal-text" },
    { id: "accounts", resource: "accounts", label: "Accounts & Trial Balances", path: "/dashboard/accounts", icon: "bi-calculator" },
    { id: "users", resource: "users", label: "Users", path: "/dashboard/users", icon: "bi-person-gear", adminOnly: true },
    { id: "user_roles", resource: "user_roles", label: "User Roles (RBAC)", path: "/dashboard/user-roles", icon: "bi-shield-lock", adminOnly: true, requiresRBACModule: true },
    { id: "customer_packages", resource: "customer_packages", label: "Customer Packages", path: "/dashboard/customer-packages", icon: "bi-box-seam", adminOnly: true },
    // AutoMobile Workshop module
    { id: "automobile_dashboard", resource: "automobile_dashboard", label: "Workshop Dashboard", path: "/dashboard/automobile-dashboard", icon: "bi-speedometer2", requiresAutomobileModule: true },
    { id: "employees", resource: "employees", label: "Employees", path: "/dashboard/employees", icon: "bi-person-badge", requiresEmployeeModule: true },
    { id: "vehicles", resource: "vehicles", label: "Vehicles", path: "/dashboard/vehicles", icon: "bi-car-front", requiresAutomobileModule: true },
    { id: "repair_jobs", resource: "repair_jobs", label: "Repair Jobs", path: "/dashboard/repair-jobs", icon: "bi-tools", requiresAutomobileModule: true },
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
            // Insert new items at their DEFAULT_MENU position rather than appending at the end
            DEFAULT_MENU.filter(m => !savedIds.has(m.id)).forEach(newItem => {
                const defaultIdx = DEFAULT_MENU.findIndex(m => m.id === newItem.id);
                // Find the insertion point: after the rightmost already-mapped item that precedes this one in DEFAULT_MENU
                let insertAt = mapped.length;
                for (let i = mapped.length - 1; i >= 0; i--) {
                    const existingIdx = DEFAULT_MENU.findIndex(m => m.id === mapped[i].id);
                    if (existingIdx < defaultIdx) { insertAt = i + 1; break; }
                    if (i === 0) insertAt = 0;
                }
                mapped.splice(insertAt, 0, { ...newItem, visible: true });
            });
            return mapped;
        }
    } catch { }
    return DEFAULT_MENU.map(m => ({ ...m, visible: true }));
}

export function saveSidebarConfig(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(({ id, visible }) => ({ id, visible }))));
}

// Returns the path the app should navigate to after login —
// the first visible item in the user's config, respecting role/store context.
export function getLandingPath() {
    const config = loadSidebarConfig();
    const isAdmin = localStorage.getItem("user_role") === "Admin";
    if (isAdmin) {
        const first = config.find(item => item.visible);
        return first?.path || "/dashboard/business-dashboard";
    }

    const rbacEnabled = (() => {
        try { return JSON.parse(localStorage.getItem("_store_settings_cache") || "null")?.enable_rbac_module; }
        catch (_) { return false; }
    })();

    const permMap = (() => {
        try {
            const arr = JSON.parse(localStorage.getItem("user_permissions") || "[]");
            const map = {};
            arr.forEach(p => { map[p.resource] = p; });
            return map;
        } catch (_) { return {}; }
    })();

    const first = config.find(item => {
        if (!item.visible) return false;
        if (item.requiresRBACModule && !rbacEnabled) return false;
        const rbacGrantsRead = rbacEnabled && item.resource && permMap[item.resource]?.read;
        if (item.adminOnly && !rbacGrantsRead) return false;
        if (rbacEnabled && item.resource && permMap[item.resource] && !permMap[item.resource].read) return false;
        return true;
    });
    return first?.path || "/dashboard/business-dashboard";
}
