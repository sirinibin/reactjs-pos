/**
 * Navigation model for the ERP shell.
 *
 * The menu items, their order/visibility (Menu Settings) and every
 * permission/feature-flag rule come from the classic sidebar
 * (sidebar_menu_config.js + Sidebar.js); this file only adds grouping.
 */
import {
    Gauge, LineChart, BarChart3, Receipt, ReceiptText, Undo2, ShoppingCart, FileText, ClipboardList, Inbox,
    Building2, Mail, MessageCircle, Image, Truck, ClipboardCheck, ClipboardMinus, Store, Boxes, ArrowLeftRight,
    Users, Package, Wrench, LayoutGrid, Grid3x3, Award, FolderOpen, Wallet, Banknote, CreditCard, Landmark,
    PiggyBank, BookOpen, Calculator, UserCog, ShieldCheck, BadgeCheck, Car, KanbanSquare, IdCard, Coins, ListOrdered,
} from 'lucide-react';

const DEFAULT_ORDER = ['overview', 'sales', 'purchasing', 'inventory', 'finance', 'workshop', 'people', 'admin'];
const WORKSHOP_FIRST_ORDER = ['workshop', 'overview', 'sales', 'purchasing', 'inventory', 'finance', 'people', 'admin'];

export const NAV_GROUPS = [
    { id: 'workshop', label: 'Workshop' },
    { id: 'overview', label: 'Overview' },
    { id: 'sales', label: 'Sales' },
    { id: 'purchasing', label: 'Purchasing' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'finance', label: 'Finance' },
    { id: 'people', label: 'People' },
    { id: 'admin', label: 'Administration' },
];

/** menu item id → [group id, icon] */
export const ITEM_META = {
    dashboard: ['overview', Gauge],
    analytics: ['overview', LineChart],
    stats: ['overview', BarChart3],

    sales: ['sales', Receipt],
    sales_return: ['sales', Undo2],
    quotations: ['sales', ClipboardCheck],
    qtn_sales_return: ['sales', ClipboardMinus],
    delivery_notes: ['sales', Truck],
    non_vat_sales: ['sales', ReceiptText],
    non_vat_sales_return: ['sales', ReceiptText],
    customers: ['sales', Users],
    receivables: ['sales', Banknote],

    purchases: ['purchasing', ShoppingCart],
    purchase_return: ['purchasing', Undo2],
    purchase_orders: ['purchasing', FileText],
    purchase_requests: ['purchasing', ClipboardList],
    rfq_received: ['purchasing', Inbox],
    rfq_suppliers: ['purchasing', Building2],
    procurement_emails: ['purchasing', Mail],
    procurement_whatsapp: ['purchasing', MessageCircle],
    purchase_bill_images: ['purchasing', Image],
    vendors: ['purchasing', Building2],
    payables: ['purchasing', CreditCard],

    products: ['inventory', Package],
    services: ['inventory', Wrench],
    product_category: ['inventory', LayoutGrid],
    service_category: ['inventory', Grid3x3],
    product_brand: ['inventory', Award],
    warehouses: ['inventory', Boxes],
    stock_transfers: ['inventory', ArrowLeftRight],

    expenses: ['finance', Wallet],
    expense_category: ['finance', FolderOpen],
    capitals: ['finance', Landmark],
    dividents: ['finance', PiggyBank],
    ledger: ['finance', BookOpen],
    accounts: ['finance', Calculator],

    automobile_dashboard: ['workshop', Gauge],
    repair_jobs_board: ['workshop', KanbanSquare],
    repair_jobs: ['workshop', Wrench],
    vehicles: ['workshop', Car],

    employees: ['people', IdCard],
    salaries: ['people', Coins],

    stores: ['admin', Store],
    users: ['admin', UserCog],
    user_roles: ['admin', ShieldCheck],
    customer_packages: ['admin', BadgeCheck],
};

export const MENU_SETTINGS_ITEM = { id: 'menu_settings', label: 'Menu Settings', path: '/dashboard/sidebar-settings', icon: ListOrdered };

/**
 * Same rules as the classic Sidebar.js, as a pure function.
 * ctx: { isAdmin, store, rbacPermissions }  (rbacPermissions: {resource: {read,...}} or null)
 */
export function filterMenuItems(items, { isAdmin, store, rbacPermissions }) {
    const s = (store && store.settings) || {};
    const packageTabIDs = store && store.customer_package_tab_ids;
    const hasPackage = Array.isArray(packageTabIDs) && packageTabIDs.length > 0;
    const rbacModuleEnabled = !!s.enable_rbac_module;

    return items.filter(item => {
        if (!item.visible) return false;
        if (item.requiresRBACModule && !rbacModuleEnabled) return false;
        const rbacGrantsRead = rbacModuleEnabled && rbacPermissions && item.resource && rbacPermissions[item.resource] && rbacPermissions[item.resource].read;
        if (item.adminOnly && !isAdmin && !rbacGrantsRead) return false;
        if (item.warehouseOnly && !s.enable_warehouse_module) return false;
        if (item.requiresPurchaseOrderModule && store && store.id && !s.enable_purchase_order_module) return false;
        if (item.purchaseRequestOnly && !s.enable_purchase_request_module) return false;
        if (item.requiresAutomobileModule && !s.enable_automobile_module) return false;
        if (item.requiresEmployeeModule && !s.enable_employee_module) return false;
        if (item.requiresNonVATSales && !s.non_vat_sales) return false;
        if (item.requiresCommonDashboard && s.enable_common_dashboard === false) return false;
        if (item.requiresAutomobileDashboard && !s.enable_automobile_dashboard) return false;
        if (item.requiresSalesInQuotation && !s.enable_sales_in_quotation) return false;
        if (item.requiresAIRFQBot && !s.enable_ai_rfq_bot) return false;
        if (item.requiresRFQModule && !s.enable_rfq_module) return false;
        if (item.requiresPurchaseBillsTracking && !s.enable_purchase_bills_tracking) return false;
        if (item.productsOnly && s.enable_services && !s.enable_products) return false;
        if (item.requiresServices && !s.enable_services) return false;
        if (!isAdmin && hasPackage && !packageTabIDs.includes(item.id)) return false;
        if (rbacModuleEnabled && !isAdmin && rbacPermissions && item.resource) {
            const perm = rbacPermissions[item.resource];
            if (!perm || !perm.read) return false;
        }
        return true;
    });
}

/**
 * Groups visible items. Within a group the user's Menu Settings order is kept;
 * children (parentId) follow their parent. Groups with no items are dropped.
 * The workshop group leads only when the automobile module is on.
 */
export function groupMenuItems(items, { automobileFirst } = {}) {
    const byGroup = {};
    items.forEach(item => {
        const meta = ITEM_META[item.id] || ['overview', null];
        const groupId = meta[0];
        if (!byGroup[groupId]) byGroup[groupId] = [];
        byGroup[groupId].push({ ...item, Icon: meta[1], isChild: !!item.parentId });
    });

    // keep children directly beneath their parent when both are in the same group
    Object.keys(byGroup).forEach(g => {
        const list = byGroup[g];
        const parents = list.filter(i => !i.parentId || !list.some(p => p.id === i.parentId));
        const ordered = [];
        parents.forEach(p => {
            ordered.push(p);
            list.filter(c => c.parentId === p.id).forEach(c => ordered.push(c));
        });
        byGroup[g] = ordered;
    });

    const order = automobileFirst ? WORKSHOP_FIRST_ORDER : DEFAULT_ORDER;
    const groups = order.map(id => NAV_GROUPS.find(g => g.id === id));
    return groups
        .map(g => ({ ...g, items: byGroup[g.id] || [] }))
        .filter(g => g.items.length > 0);
}

/** Finds the menu item whose path matches the current pathname (longest match wins). */
export function findActiveItem(items, pathname) {
    let best = null;
    items.forEach(item => {
        if (pathname === item.path || pathname.startsWith(item.path + '/')) {
            if (!best || item.path.length > best.path.length) best = item;
        }
    });
    return best;
}

/** Case-insensitive match on the translated label. */
export function matchesFilter(label, query) {
    if (!query) return true;
    return String(label).toLowerCase().includes(query.trim().toLowerCase());
}
