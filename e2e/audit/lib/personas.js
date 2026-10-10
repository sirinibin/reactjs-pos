// The people who use a StartPOS store. pos-rest has three base roles (models/user.go:
// Admin | Manager | SalesMan) and, when the store's "Enable RBAC Module" setting is on,
// per-store RBAC roles (models/userrole.go: one {resource, read, create, update, delete}
// row per sidebar resource of src/sidebar_menu_config.js). The owner (the platform
// Admin) builds one RBAC role per job below through the User Roles screen and hires one
// user per persona through the Users screen; the audit then compares what each persona
// can actually open and save with this matrix.

// Resource ids of src/sidebar_menu_config.js DEFAULT_MENU (kept in step by test/personas.test.js).
const RESOURCES = [
  'dashboard', 'sales', 'sales_return', 'purchases', 'purchase_orders', 'purchase_requests', 'rfq_received', 'rfq_suppliers',
  'procurement_emails', 'procurement_whatsapp', 'purchase_bill_images', 'purchase_return', 'delivery_notes', 'quotations',
  'qtn_sales_return', 'non_vat_sales', 'non_vat_sales_return', 'stats', 'vendors', 'stores', 'warehouses', 'stock_transfers',
  'customers', 'products', 'services', 'product_category', 'service_category', 'product_brand', 'expense_category', 'expenses',
  'analytics', 'receivables', 'payables', 'capitals', 'dividents', 'ledger', 'accounts', 'users', 'user_roles',
  'customer_packages', 'automobile_dashboard', 'employees', 'salaries', 'vehicles', 'repair_jobs',
];

const R = { read: true, create: false, update: false, delete: false };
const RC = { read: true, create: true, update: false, delete: false };
const RCU = { read: true, create: true, update: true, delete: false };
const ALL = { read: true, create: true, update: true, delete: true };

// RBAC roles the owner creates (name suffix -> permissions). Resources not listed get none.
const RBAC_ROLES = {
  salesman: {
    label: 'Sales desk',
    perms: { dashboard: R, sales: RCU, sales_return: RCU, quotations: RCU, delivery_notes: RCU, customers: RCU, products: R, stats: R },
  },
  cashier: {
    label: 'Cashier',
    perms: { dashboard: R, sales: RC, customers: RC, products: R },
  },
  accountant: {
    label: 'Accounts',
    perms: {
      dashboard: R, expenses: ALL, expense_category: ALL, ledger: R, accounts: R, receivables: RCU, payables: RCU, capitals: R,
      dividents: R, stats: R, sales: R, sales_return: R, purchases: R, purchase_return: R, customers: R, vendors: R, products: R,
    },
  },
  viewer: {
    label: 'Read only',
    perms: Object.fromEntries(RESOURCES.filter((r) => r !== 'users' && r !== 'user_roles').map((r) => [r, R])),
  },
};

const PERSONAS = [
  {
    id: 'owner', baseRole: 'Admin', rbac: null, label: 'Owner (Admin)', name: 'E2E Admin',
    goal: 'Runs the business: creates the audit store, its RBAC roles and staff, products and prices, sells, checks reports and settings.',
  },
  {
    id: 'manager', baseRole: 'Manager', rbac: null, label: 'Store manager', name: 'Audit Manager مدير',
    goal: 'Buys stock from vendors, keeps products and warehouses right, moves stock, watches reports; may not create RBAC roles.',
  },
  {
    id: 'salesman', baseRole: 'SalesMan', rbac: 'salesman', label: 'Salesman', name: 'Audit Salesman بائع',
    goal: 'Quotes and sells to customers and takes returns; must not reach purchases, vendors, expenses, users or roles.',
  },
  {
    id: 'cashier', baseRole: 'SalesMan', rbac: 'cashier', label: 'Cashier', name: 'Audit Cashier كاشير',
    goal: 'Rings up sales all day and adds walk-in customers; must not edit products, buy stock or record expenses.',
  },
  {
    id: 'accountant', baseRole: 'SalesMan', rbac: 'accountant', label: 'Accountant', name: 'Audit Accountant محاسب',
    goal: 'Records expenses, checks payments, ledger and statistics; may only look at sales, purchases and products.',
  },
  {
    id: 'viewer', baseRole: 'SalesMan', rbac: 'viewer', label: 'Viewer (read-only)', name: 'Audit Viewer مشاهد',
    goal: 'Looks things up; must not create, edit or delete anything.',
  },
];

const personaById = (id) => PERSONAS.find((p) => p.id === id);

/** What a persona may do on a resource: Admin all, Manager (no RBAC role) all but user roles, RBAC roles per matrix. */
function can(personaOrId, resource, verb) {
  const p = typeof personaOrId === 'string' ? personaById(personaOrId) : personaOrId;
  if (!p) return false;
  if (p.baseRole === 'Admin') return true;
  if (!p.rbac) return resource !== 'user_roles'; // pos-rest only lets Admin or a user_roles grant manage roles
  return !!RBAC_ROLES[p.rbac].perms[resource]?.[verb];
}

// Screens a persona tries to open; `create` = the list has a Create / New button for that resource.
const GUARDED_SCREENS = [
  { path: '/dashboard/sales', resource: 'sales', label: 'Sales', create: true },
  { path: '/dashboard/quotations', resource: 'quotations', label: 'Quotations', create: true },
  { path: '/dashboard/salesreturn', resource: 'sales_return', label: 'Sales returns', create: false },
  { path: '/dashboard/purchases', resource: 'purchases', label: 'Purchases', create: true },
  { path: '/dashboard/products', resource: 'products', label: 'Products', create: true },
  { path: '/dashboard/customers', resource: 'customers', label: 'Customers', create: true },
  { path: '/dashboard/vendors', resource: 'vendors', label: 'Vendors', create: true },
  { path: '/dashboard/expenses', resource: 'expenses', label: 'Expenses', create: true },
  { path: '/dashboard/stock-transfers', resource: 'stock_transfers', label: 'Stock transfers', create: true },
  { path: '/dashboard/ledger', resource: 'ledger', label: 'Ledger', create: false },
  { path: '/dashboard/stats', resource: 'stats', label: 'Statistics', create: false },
  { path: '/dashboard/users', resource: 'users', label: 'Users', create: true, adminOnly: true },
  { path: '/dashboard/user-roles', resource: 'user_roles', label: 'User roles', create: true, adminOnly: true },
];

/** Whether a persona should be able to open a screen (read) and use its Create button. */
function screenExpectation(persona, screen) {
  const read = can(persona, screen.resource, 'read');
  return { read, create: screen.create && read && can(persona, screen.resource, 'create') };
}

// API writes that probe the server's own enforcement, all on the audit store and named
// for the run (the guard checks them like any request). `body(ctx)` gets {storeId, runId, data}.
const API_PROBES = [
  { id: 'product', resource: 'products', verb: 'create', method: 'POST', path: '/v1/product',
    body: ({ storeId, runId }) => ({ store_id: storeId, name: `ZZ probe product ${runId}`, part_number: `ZZP-${runId.slice(-4)}-${Math.floor(Math.random() * 1e6)}`, unit: 'PC' }) },
  { id: 'vendor', resource: 'vendors', verb: 'create', method: 'POST', path: '/v1/vendor',
    body: ({ storeId, runId }) => ({ store_id: storeId, name: `ZZ probe vendor ${runId}`, phone: '0551230000' }) },
  { id: 'customer', resource: 'customers', verb: 'create', method: 'POST', path: '/v1/customer',
    body: ({ storeId, runId }) => ({ store_id: storeId, name: `ZZ probe customer ${runId}`, phone: '0551230001' }) },
  { id: 'expense', resource: 'expenses', verb: 'create', method: 'POST', path: '/v1/expense',
    body: ({ storeId, data }) => ({ store_id: storeId, amount: 1, description: 'audit probe', payment_method: 'cash', date_str: new Date().toISOString(), category_id: data.expenseCategoryId ? [data.expenseCategoryId] : [] }) },
  { id: 'user role', resource: 'user_roles', verb: 'create', method: 'POST', path: '/v1/user-role',
    body: ({ storeId, runId }) => ({ store_id: storeId, name: `ZZ AUDIT ${runId} probe`, permissions: [{ resource: 'sales', read: true, create: true, update: true, delete: true }] }) },
];

module.exports = { RESOURCES, RBAC_ROLES, PERSONAS, personaById, can, GUARDED_SCREENS, screenExpectation, API_PROBES };
