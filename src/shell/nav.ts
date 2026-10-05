import type { IconName } from '@/ui/Icon';
import type { StoreSettings } from '@/auth/types';

/** Feature gates — same rules as the legacy Sidebar.js (store settings keys). */
export type Gate = (s: StoreSettings) => boolean;
const on = (k: string): Gate => (s) => !!s?.[k];
export const gates = {
  warehouse: on('enable_warehouse_module'),
  purchaseOrders: on('enable_purchase_order_module'),
  purchaseRequests: on('enable_purchase_request_module'),
  automobile: on('enable_automobile_module'),
  automobileDashboard: (s: StoreSettings) => !!s?.enable_automobile_module && !!s?.enable_automobile_dashboard,
  employees: on('enable_employee_module'),
  nonVat: on('non_vat_sales'),
  commonDashboard: (s: StoreSettings) => s?.enable_common_dashboard !== false,
  salesInQuotation: on('enable_sales_in_quotation'),
  rfqBot: on('enable_ai_rfq_bot'),
  rfq: (s: StoreSettings) => !!s?.enable_ai_rfq_bot && !!s?.enable_rfq_module,
  purchaseBills: on('enable_purchase_bills_tracking'),
  rbac: on('enable_rbac_module'),
  services: on('enable_services'),
  products: (s: StoreSettings) => !(s?.enable_services && !s?.enable_products),
} satisfies Record<string, Gate>;

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: IconName;
  /** RBAC resource name (matches legacy sidebar_menu_config resource ids). */
  resource?: string;
  adminOnly?: boolean;
  gate?: Gate;
  /** Legacy v1 paths that should redirect here. */
  legacy?: string[];
}
export interface NavGroup { title: string; items: NavItem[] }
export interface NavModule { id: string; title: string; icon: IconName; groups: NavGroup[]; bottom?: boolean }

export const NAV: NavModule[] = [
  {
    id: 'home', title: 'Home', icon: 'home', groups: [
      { title: 'Workspace', items: [
        { id: 'dashboard', label: 'Dashboard', path: '/home', icon: 'home', resource: 'dashboard', gate: gates.commonDashboard, legacy: ['/dashboard/business-dashboard', '/dashboard'] },
        { id: 'stats', label: 'Statistics', path: '/insights/stats', icon: 'chart', resource: 'stats', legacy: ['/dashboard/stats'] },
        { id: 'analytics', label: 'Analytics', path: '/insights/analytics', icon: 'pie', resource: 'analytics', adminOnly: true, legacy: ['/dashboard/analytics'] },
      ] },
    ],
  },
  {
    id: 'sales', title: 'Sales', icon: 'receipt', groups: [
      { title: 'Documents', items: [
        { id: 'quotations', label: 'Quotations', path: '/sales/quotations', icon: 'clip', resource: 'quotations', legacy: ['/dashboard/quotations'] },
        { id: 'delivery_notes', label: 'Delivery notes', path: '/sales/delivery-notes', icon: 'truck', resource: 'delivery_notes', legacy: ['/dashboard/delivery-notes'] },
        { id: 'sales', label: 'Sales invoices', path: '/sales/invoices', icon: 'receipt', resource: 'sales', legacy: ['/dashboard/sales'] },
        { id: 'sales_return', label: 'Sales returns', path: '/sales/returns', icon: 'undo', resource: 'sales_return', legacy: ['/dashboard/salesreturn'] },
        { id: 'qtn_sales_return', label: 'Quotation sales returns', path: '/sales/quotation-returns', icon: 'undo', resource: 'qtn_sales_return', gate: gates.salesInQuotation, legacy: ['/dashboard/quotation_sales_returns'] },
        { id: 'non_vat_sales', label: 'Non-VAT sales', path: '/sales/non-vat', icon: 'receipt', resource: 'non_vat_sales', gate: gates.nonVat, legacy: ['/dashboard/non-vat-sales'] },
        { id: 'non_vat_sales_return', label: 'Non-VAT sales returns', path: '/sales/non-vat-returns', icon: 'undo', resource: 'non_vat_sales_return', gate: gates.nonVat, legacy: ['/dashboard/non-vat-sales-returns'] },
      ] },
      { title: 'Money in', items: [
        { id: 'sales_payments', label: 'Sales payments', path: '/sales/payments', icon: 'cash', resource: 'sales', legacy: ['/dashboard/sales-payments'] },
        { id: 'sales_return_payments', label: 'Return refunds', path: '/sales/return-payments', icon: 'cash', resource: 'sales_return', legacy: ['/dashboard/sales-return-payments'] },
        { id: 'sales_cash_discounts', label: 'Cash discounts', path: '/sales/cash-discounts', icon: 'tag', resource: 'sales', legacy: ['/dashboard/sales-cash-discounts'] },
        { id: 'receivables', label: 'Receivables', path: '/sales/receivables', icon: 'cash', resource: 'receivables', legacy: ['/dashboard/receivables'] },
      ] },
      { title: 'Customers', items: [
        { id: 'customers', label: 'Customers', path: '/sales/customers', icon: 'users', resource: 'customers', legacy: ['/dashboard/customers'] },
        { id: 'customer_packages', label: 'Customer packages', path: '/sales/customer-packages', icon: 'box', resource: 'customer_packages', adminOnly: true, legacy: ['/dashboard/customer-packages'] },
      ] },
    ],
  },
  {
    id: 'buying', title: 'Buying', icon: 'cart', groups: [
      { title: 'Documents', items: [
        { id: 'purchase_requests', label: 'Purchase requests', path: '/buying/requests', icon: 'clip', resource: 'purchase_requests', gate: gates.purchaseRequests, legacy: ['/dashboard/purchase-requests'] },
        { id: 'purchase_orders', label: 'Purchase orders', path: '/buying/orders', icon: 'file', resource: 'purchase_orders', gate: gates.purchaseOrders, legacy: ['/dashboard/purchase-orders'] },
        { id: 'purchases', label: 'Purchase bills', path: '/buying/purchases', icon: 'cart', resource: 'purchases', gate: gates.products, legacy: ['/dashboard/purchases'] },
        { id: 'purchase_return', label: 'Purchase returns', path: '/buying/returns', icon: 'undo', resource: 'purchase_return', gate: gates.products, legacy: ['/dashboard/purchasereturn'] },
        { id: 'purchase_bill_images', label: 'Bill images & PDFs', path: '/buying/bill-images', icon: 'paper', resource: 'purchase_bill_images', gate: gates.purchaseBills, legacy: ['/dashboard/purchase-bill-images'] },
      ] },
      { title: 'Money out', items: [
        { id: 'purchase_payments', label: 'Purchase payments', path: '/buying/payments', icon: 'cash', resource: 'purchases', legacy: ['/dashboard/purchase-payments'] },
        { id: 'purchase_return_payments', label: 'Return refunds', path: '/buying/return-payments', icon: 'cash', resource: 'purchase_return', legacy: ['/dashboard/purchase-return-payments'] },
        { id: 'purchase_cash_discounts', label: 'Cash discounts', path: '/buying/cash-discounts', icon: 'tag', resource: 'purchases', legacy: ['/dashboard/purchase-cash-discounts'] },
        { id: 'payables', label: 'Payables', path: '/buying/payables', icon: 'card', resource: 'payables', legacy: ['/dashboard/payables'] },
      ] },
      { title: 'Suppliers', items: [
        { id: 'vendors', label: 'Vendors', path: '/buying/vendors', icon: 'building', resource: 'vendors', legacy: ['/dashboard/vendors'] },
      ] },
      { title: 'AI procurement', items: [
        { id: 'rfq_received', label: 'RFQ inbox', path: '/procurement/rfq', icon: 'inbox', resource: 'rfq_received', gate: gates.rfq, legacy: ['/dashboard/rfq-received'] },
        { id: 'rfq_suppliers', label: 'RFQ suppliers', path: '/procurement/suppliers', icon: 'building', resource: 'rfq_suppliers', gate: gates.rfq, legacy: ['/dashboard/rfq-suppliers'] },
        { id: 'procurement_emails', label: 'Emails', path: '/procurement/emails', icon: 'mail', resource: 'procurement_emails', gate: gates.rfqBot, legacy: ['/dashboard/procurement-emails'] },
        { id: 'procurement_whatsapp', label: 'WhatsApp', path: '/procurement/whatsapp', icon: 'wa', resource: 'procurement_whatsapp', gate: gates.rfqBot, legacy: ['/dashboard/procurement-whatsapp'] },
      ] },
    ],
  },
  {
    id: 'stock', title: 'Stock', icon: 'box', groups: [
      { title: 'Catalog', items: [
        { id: 'products', label: 'Products', path: '/stock/products', icon: 'box', resource: 'products', gate: gates.products, legacy: ['/dashboard/products'] },
        { id: 'services', label: 'Services', path: '/stock/services', icon: 'wrench', resource: 'services', gate: gates.services, legacy: ['/dashboard/services'] },
        { id: 'product_category', label: 'Product categories', path: '/stock/categories', icon: 'tag', resource: 'product_category', gate: gates.products, legacy: ['/dashboard/product_category'] },
        { id: 'service_category', label: 'Service categories', path: '/stock/service-categories', icon: 'tag', resource: 'service_category', gate: gates.services, legacy: ['/dashboard/service_category'] },
        { id: 'product_brand', label: 'Brands', path: '/stock/brands', icon: 'star', resource: 'product_brand', gate: gates.products, legacy: ['/dashboard/product_brand'] },
      ] },
      { title: 'Warehousing', items: [
        { id: 'warehouses', label: 'Warehouses', path: '/stock/warehouses', icon: 'wh', resource: 'warehouses', gate: gates.warehouse, legacy: ['/dashboard/warehouses'] },
        { id: 'stock_transfers', label: 'Stock transfers', path: '/stock/transfers', icon: 'swap', resource: 'stock_transfers', gate: gates.warehouse, legacy: ['/dashboard/stock-transfers'] },
      ] },
    ],
  },
  {
    id: 'finance', title: 'Finance', icon: 'coins', groups: [
      { title: 'Accounting', items: [
        { id: 'accounts', label: 'Accounts & trial balance', path: '/finance/accounts', icon: 'calc', resource: 'accounts', legacy: ['/dashboard/accounts'] },
        { id: 'ledger', label: 'Ledger', path: '/finance/ledger', icon: 'book', resource: 'ledger', legacy: ['/dashboard/ledger'] },
        { id: 'postings', label: 'Postings', path: '/finance/postings', icon: 'layers', resource: 'ledger', legacy: ['/dashboard/postings'] },
      ] },
      { title: 'Cash', items: [
        { id: 'expenses', label: 'Expenses', path: '/finance/expenses', icon: 'wallet', resource: 'expenses', legacy: ['/dashboard/expenses'] },
        { id: 'expense_category', label: 'Expense categories', path: '/finance/expense-categories', icon: 'tag', resource: 'expense_category', legacy: ['/dashboard/expense_category'] },
        { id: 'capitals', label: 'Capital', path: '/finance/capital', icon: 'bank', resource: 'capitals', legacy: ['/dashboard/capitals'] },
        { id: 'capital_withdrawals', label: 'Capital withdrawals', path: '/finance/capital-withdrawals', icon: 'bank', resource: 'capitals', legacy: ['/dashboard/capital_withdrawals'] },
        { id: 'dividents', label: 'Drawings', path: '/finance/drawings', icon: 'wallet', resource: 'dividents', legacy: ['/dashboard/dividents'] },
      ] },
    ],
  },
  {
    id: 'workshop', title: 'Workshop', icon: 'wrench', groups: [
      { title: 'Jobs', items: [
        { id: 'automobile_dashboard', label: 'Workshop dashboard', path: '/workshop/dashboard', icon: 'chart', resource: 'automobile_dashboard', gate: gates.automobileDashboard, legacy: ['/dashboard/automobile-dashboard'] },
        { id: 'repair_jobs_board', label: 'Repair jobs board', path: '/workshop/board', icon: 'kanban', resource: 'repair_jobs', gate: gates.automobile, legacy: ['/dashboard/repair-jobs-board'] },
        { id: 'repair_jobs', label: 'Repair jobs', path: '/workshop/jobs', icon: 'wrench', resource: 'repair_jobs', gate: gates.automobile, legacy: ['/dashboard/repair-jobs'] },
        { id: 'vehicles', label: 'Vehicles', path: '/workshop/vehicles', icon: 'car', resource: 'vehicles', gate: gates.automobile, legacy: ['/dashboard/vehicles'] },
      ] },
      { title: 'People', items: [
        { id: 'employees', label: 'Employees', path: '/workshop/employees', icon: 'badge', resource: 'employees', gate: gates.employees, legacy: ['/dashboard/employees'] },
        { id: 'salaries', label: 'Salaries', path: '/workshop/salaries', icon: 'cash', resource: 'salaries', gate: gates.employees, legacy: ['/dashboard/salaries'] },
      ] },
    ],
  },
  {
    id: 'admin', title: 'Admin', icon: 'gear', bottom: true, groups: [
      { title: 'Organisation', items: [
        { id: 'stores', label: 'Stores & ZATCA', path: '/admin/stores', icon: 'store', resource: 'stores', legacy: ['/dashboard/stores'] },
        { id: 'users', label: 'Users', path: '/admin/users', icon: 'users', resource: 'users', adminOnly: true, legacy: ['/dashboard/users'] },
        { id: 'user_roles', label: 'Roles & permissions', path: '/admin/roles', icon: 'shield', resource: 'user_roles', adminOnly: true, gate: gates.rbac, legacy: ['/dashboard/user-roles'] },
        { id: 'signatures', label: 'Signatures', path: '/admin/signatures', icon: 'edit', resource: 'signatures', legacy: ['/dashboard/signatures'] },
      ] },
      { title: 'Personalise', items: [
        { id: 'menu_settings', label: 'Menu settings', path: '/admin/menu', icon: 'sliders', legacy: ['/dashboard/sidebar-settings'] },
      ] },
    ],
  },
];

export const ALL_ITEMS: NavItem[] = NAV.flatMap((m) => m.groups.flatMap((g) => g.items));

export function moduleForPath(path: string): NavModule | undefined {
  const first = '/' + path.split('/').filter(Boolean)[0];
  if (first === '/procurement') return NAV.find((m) => m.id === 'buying');
  if (first === '/insights') return NAV.find((m) => m.id === 'home');
  return NAV.find((m) => m.groups.some((g) => g.items.some((i) => i.path.startsWith(first + '/') || i.path === first))) ;
}

export function itemForPath(path: string): NavItem | undefined {
  return ALL_ITEMS.filter((i) => path === i.path || path.startsWith(i.path + '/')).sort((a, b) => b.path.length - a.path.length)[0];
}
