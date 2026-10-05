// Pure store-form logic: defaults, normalisation, client validation and the
// mapping of server error keys onto settings tabs. Mirrors legacy store/create.js.

export type Rec = Record<string, any>;

/** Serial-number rows in display order with the defaults used by legacy open(). */
export const SERIALS: { key: string; label: string; prefix: string; start: number; padding: number; lock?: string }[] = [
  { key: 'sales', label: 'Sales', prefix: 'S-INV', start: 1, padding: 3, lock: 'sales_locked' },
  { key: 'sales_return', label: 'Sales returns', prefix: 'SR-INV', start: 1, padding: 3, lock: 'sales_return_locked' },
  { key: 'purchase', label: 'Purchases', prefix: 'P-INV', start: 1, padding: 3 },
  { key: 'purchase_return', label: 'Purchase returns', prefix: 'PR-INV', start: 1, padding: 3 },
  { key: 'purchase_order', label: 'Purchase orders', prefix: 'PO', start: 1, padding: 4 },
  { key: 'purchase_request', label: 'Purchase requests', prefix: 'PR', start: 1, padding: 4 },
  { key: 'quotation', label: 'Quotations', prefix: 'QTN', start: 1, padding: 3 },
  { key: 'quotation_sales_return', label: 'Quotation sales returns', prefix: 'QTN-SR-INV', start: 1, padding: 3 },
  { key: 'non_vat_sales', label: 'Non-VAT sales', prefix: 'NVS', start: 1, padding: 3 },
  { key: 'non_vat_sales_return', label: 'Non-VAT sales returns', prefix: 'NVS-R', start: 1, padding: 3 },
  { key: 'delivery_note', label: 'Delivery notes', prefix: 'DEL-NOTE', start: 1, padding: 6 },
  { key: 'stock_transfer', label: 'Stock transfers', prefix: 'ST-TR', start: 1, padding: 3 },
  { key: 'customer', label: 'Customers', prefix: 'C', start: 1, padding: 4 },
  { key: 'vendor', label: 'Vendors', prefix: 'V', start: 1, padding: 4 },
  { key: 'expense', label: 'Expenses', prefix: 'EXP', start: 1, padding: 4 },
  { key: 'customer_deposit', label: 'Receivables', prefix: 'RCVBLE', start: 1, padding: 4, lock: 'customer_deposit_locked' },
  { key: 'customer_withdrawal', label: 'Payables', prefix: 'PYBLE', start: 1, padding: 4, lock: 'customer_withdrawal_locked' },
  { key: 'capital_deposit', label: 'Capital', prefix: 'CAP-DPST', start: 1, padding: 4 },
  { key: 'divident', label: 'Drawings', prefix: 'CAP-DRWNG', start: 1, padding: 4 },
  { key: 'rfq_received', label: 'RFQ', prefix: 'RFQ', start: 1, padding: 4 },
];

const T = (paid: string, credit: string, cash: string) => ({ paid, credit, cash });
const SALES_P1 = T('TAX INVOICE | الفاتورة الضريبية', 'CREDIT TAX INVOICE | فاتورة ضريبة الائتمان', 'CASH TAX INVOICE | فاتورة ضريبية نقدية');
const SALES_RET_P1 = T('SALES RETURN TAX INVOICE | فاتورة ضريبة المبيعات المرتجعة', 'SALES RETURN CREDIT TAX INVOICE | إقرار مبيعات فاتورة ضريبة الائتمان', 'SALES RETURN CASH TAX INVOICE | إقرار مبيعات فاتورة ضريبية نقدية');
const PURCHASE = T('PURCHASE TAX INVOICE | فاتورة ضريبة الشراء', 'CREDIT PURCHASE TAX INVOICE | فاتورة ضريبة الشراء بالائتمان', 'CASH PURCHASE TAX INVOICE | فاتورة ضريبة الشراء النقدي');
const PURCHASE_RET = T('PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع المشتريات', 'CREDIT PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء بالائتمان', 'CASH PURCHASE RETURN TAX INVOICE | فاتورة ضريبة إرجاع الشراء النقدي');

/** settings.invoice defaults — exact strings from legacy store/create.js. */
export const INVOICE_TITLE_DEFAULTS: Rec = {
  quotation_sales_titles: SALES_P1,
  quotation_sales_return_titles: SALES_RET_P1,
  non_vat_sales_titles: T('TAX INVOICE | الفاتورة الضريبية', 'CREDIT INVOICE | فاتورة ائتمانية', 'CASH INVOICE | فاتورة نقدية'),
  non_vat_sales_return_titles: T('SALES RETURN INVOICE | فاتورة مبيعات مرتجعة', 'SALES RETURN CREDIT INVOICE | فاتورة ائتمان مبيعات مرتجعة', 'SALES RETURN CASH INVOICE | فاتورة نقدية مبيعات مرتجعة'),
  quotation_title: 'QUOTATION | اقتباس',
  delivery_note_title: 'DELIVERY NOTE | مذكرة التسليم',
  stock_transfer_title: 'STOCK TRANSFER | نقل الأسهم',
  payable_title: 'PAYMENT RECEIPT (PAYABLE / REFUND) | إيصال الدفع (مستحق الدفع / مسترد)',
  receivable_title: 'PAYMENT RECEIPT (RECEIVABLE) | إيصال الدفع (مستحق القبض)',
  phase1: { sales_titles: SALES_P1, sales_return_titles: SALES_RET_P1, purchase_titles: PURCHASE, purchase_return_titles: PURCHASE_RET },
  phase2: {
    sales_titles: T('SIMPLIFIED TAX INVOICE | فاتورة ضريبية مبسطة', 'SIMPLIFIED CREDIT TAX INVOICE | فاتورة ضريبة الائتمان المبسطة', 'SIMPLIFIED CASH TAX INVOICE | فاتورة ضريبية نقدية مبسطة'),
    sales_return_titles: T('SIMPLIFIED CREDIT NOTE TAX INVOICE | فاتورة ضريبية مبسطة لملاحظة الائتمان', 'SIMPLIFIED CREDIT NOTE CREDIT TAX INVOICE | مذكرة ائتمان مبسطة فاتورة ضريبة الائتمان', 'SIMPLIFIED CREDIT NOTE CASH TAX INVOICE | فاتورة ضريبية نقدية مبسطة'),
    purchase_titles: PURCHASE,
    purchase_return_titles: PURCHASE_RET,
  },
  phase2_b2b: {
    sales_titles: T('STANDARD TAX INVOICE | فاتورة ضريبية قياسية', 'STANDARD CREDIT TAX INVOICE | فاتورة ضريبة الائتمان القياسية', 'STANDARD CASH TAX INVOICE | فاتورة ضريبية نقدية قياسية'),
    sales_return_titles: T('STANDARD CREDIT NOTE TAX INVOICE | فاتورة ضريبية لسند ائتمان قياسي', 'STANDARD CREDIT NOTE CREDIT TAX INVOICE | فاتورة ضريبة الائتمان القياسية', 'STANDARD CREDIT NOTE CASH TAX INVOICE | فاتورة ضريبية نقدية بسند ائتمان قياسي'),
    purchase_titles: PURCHASE,
    purchase_return_titles: PURCHASE_RET,
  },
};

/** Groups of {paid, credit, cash} title triples shown in the Invoice titles tab. */
export const TITLE_GROUPS: { path: string; label: string }[] = [
  { path: 'phase1.sales_titles', label: 'Phase 1 · Sales' },
  { path: 'phase1.sales_return_titles', label: 'Phase 1 · Sales returns' },
  { path: 'phase1.purchase_titles', label: 'Phase 1 · Purchases' },
  { path: 'phase1.purchase_return_titles', label: 'Phase 1 · Purchase returns' },
  { path: 'phase2.sales_titles', label: 'Phase 2 · Simplified sales (B2C)' },
  { path: 'phase2.sales_return_titles', label: 'Phase 2 · Simplified credit notes' },
  { path: 'phase2.purchase_titles', label: 'Phase 2 · Purchases' },
  { path: 'phase2.purchase_return_titles', label: 'Phase 2 · Purchase returns' },
  { path: 'phase2_b2b.sales_titles', label: 'Phase 2 · Standard sales (B2B)' },
  { path: 'phase2_b2b.sales_return_titles', label: 'Phase 2 · Standard credit notes' },
  { path: 'phase2_b2b.purchase_titles', label: 'Phase 2 B2B · Purchases' },
  { path: 'phase2_b2b.purchase_return_titles', label: 'Phase 2 B2B · Purchase returns' },
  { path: 'quotation_sales_titles', label: 'Quotation sales' },
  { path: 'quotation_sales_return_titles', label: 'Quotation sales returns' },
  { path: 'non_vat_sales_titles', label: 'Non-VAT sales' },
  { path: 'non_vat_sales_return_titles', label: 'Non-VAT sales returns' },
];
export const SINGLE_TITLES: { key: string; label: string }[] = [
  { key: 'quotation_title', label: 'Quotation' },
  { key: 'delivery_note_title', label: 'Delivery note' },
  { key: 'stock_transfer_title', label: 'Stock transfer' },
  { key: 'receivable_title', label: 'Receivable receipt' },
  { key: 'payable_title', label: 'Payable receipt' },
];

export const BUSINESS_CATEGORIES = ['Supply Activities', 'Service Activities', 'Retail', 'Food and Beverages', 'Trading', 'Manufacturing', 'Healthcare', 'Real Estate', 'Construction', 'Transportation', 'Technology', 'Education', 'Financial Services'];
export const ZATCA_ENVS = [
  { value: 'NonProduction', label: 'NonProduction' },
  { value: 'Simulation', label: 'Simulation' },
  { value: 'Production', label: 'Production' },
];

export type SettingDef = { key: string; label: string; hint?: string; type?: 'bool' | 'int'; /** bool that is ON unless explicitly false */ defaultTrue?: boolean };
export interface SettingGroup { id: string; title: string; items: SettingDef[] }

/** settings.* toggles grouped like the legacy Settings tab (spec §10.5). */
export const SETTING_GROUPS: SettingGroup[] = [
  { id: 'invoice', title: 'Invoice & display', items: [
    { key: 'show_currency_symbol', label: 'Show the Saudi riyal symbol on invoices' },
    { key: 'show_seller_info_in_invoice', label: 'Show seller info first on invoice previews' },
    { key: 'show_address_in_invoice_footer', label: 'Show address in invoice footer' },
    { key: 'show_received_by_footer_in_invoice', label: 'Show “Received by” footer on invoices' },
    { key: 'show_created_by_in_invoice_preview', label: 'Show “Created by” next to remarks on previews' },
    { key: 'zatca_qr_on_left_bottom', label: 'Place the ZATCA QR code at the bottom left' },
    { key: 'enable_zatca_reporting_for_receivables', label: 'Report receivables to ZATCA as debit notes' },
    { key: 'enable_zatca_reporting_for_payables', label: 'Report payables to ZATCA as credit notes' },
    { key: 'disable_sales_edit_once_reported_to_zatca', label: 'Lock sales once reported to ZATCA', defaultTrue: true },
    { key: 'auto_suggest_advance_payment_linking_in_sales', label: 'Suggest linking advance payments on sales' },
    { key: 'display_vat_in_receivables_and_payables', label: 'Show VAT on receivables and payables' },
    { key: 'enable_invoice_print_type_selection', label: 'Let users choose the print type on previews' },
    { key: 'one_line_product_name_in_invoice', label: 'One-line product names on invoices' },
    { key: 'one_line_product_name_in_print_invoice', label: 'One-line product names on printed invoices' },
    { key: 'add_price_details_in_delivery_note', label: 'Show prices on delivery notes' },
  ] },
  { id: 'trade', title: 'Sales & purchasing', items: [
    { key: 'skip_product_selection_while_delivery_note_import', label: 'Skip product selection when importing a delivery note' },
    { key: 'disable_purchases_on_accounts', label: 'Exclude purchases from P&L and dashboards' },
    { key: 'block_sale_when_purchase_price_is_higher', label: 'Block sale when the selling price is below cost' },
    { key: 'enable_auto_sales_payment_close_on_purchase', label: 'Auto-close sales payments on purchase' },
    { key: 'enable_auto_purchase_payment_close_on_sales', label: 'Auto-close purchase payments on sales' },
    { key: 'enable_auto_payment_close_on_return', label: 'Auto-close payments on returns' },
    { key: 'allow_adjust_same_date_payments', label: 'Allow adjusting same-date payments' },
    { key: 'block_sales_after_pending_count', label: 'Block sales after this many unpaid invoices (0 = off)', type: 'int' },
  ] },
  { id: 'modules', title: 'Modules & features', items: [
    { key: 'enable_products', label: 'Products' },
    { key: 'enable_services', label: 'Services' },
    { key: 'enable_warehouse_module', label: 'Warehouses & stock transfers' },
    { key: 'enable_purchase_order_module', label: 'Purchase orders' },
    { key: 'enable_purchase_request_module', label: 'Purchase requests' },
    { key: 'non_vat_sales', label: 'Non-VAT sales' },
    { key: 'enable_automobile_module', label: 'Workshop (automobile) module' },
    { key: 'enable_employee_module', label: 'Employees & salaries' },
    { key: 'enable_rbac_module', label: 'Roles & permissions (RBAC)' },
    { key: 'enable_custom_sales_invoice_id', label: 'Allow manual sales invoice numbers' },
    { key: 'enable_sales_page_selection', label: 'Sales page selection' },
    { key: 'enable_notification', label: 'Notifications bell' },
    { key: 'enable_auto_translation_to_arabic', label: 'Auto-translate names to Arabic' },
    { key: 'use_rtl_for_arabic', label: 'Right-to-left layout for Arabic' },
    { key: 'enable_arabic_names_list', label: 'Arabic names list on the product form' },
    { key: 'allow_products_duplicates_by_default', label: 'Allow duplicate products by default' },
    { key: 'enable_customer_po_no', label: 'Customer PO number on sales' },
    { key: 'enable_purchase_unit_price_validation', label: 'Validate purchase unit price on quotations' },
    { key: 'enable_auto_update_prices_from_last_purchase', label: 'Update wholesale & retail prices from last purchase (using margin %)' },
    { key: 'enable_ai_rfq_bot', label: 'AI procurement bot (emails & WhatsApp inbox)' },
    { key: 'enable_rfq_module', label: 'RFQ inbox & RFQ suppliers (needs the AI procurement bot)' },
    { key: 'enable_purchase_bills_tracking', label: 'Purchase bill images & PDFs' },
    { key: 'enable_auto_refresh', label: 'Prompt users to reload when a new version is deployed' },
  ] },
  { id: 'accounting', title: 'Accounting & financials', items: [
    { key: 'show_minus_on_liability_balance_in_balance_sheet', label: 'Show minus sign on liability balances' },
    { key: 'hide_total_amount_row_in_balance_sheet', label: 'Hide the total row in the balance sheet' },
    { key: 'quotation_invoice_accounting', label: 'Post quotation invoices to the ledger' },
    { key: 'enable_sales_in_quotation', label: 'Sales from quotations (quotation sales returns)' },
  ] },
  { id: 'dashboards', title: 'Dashboards', items: [
    { key: 'enable_common_dashboard', label: 'Business dashboard', defaultTrue: true },
    { key: 'enable_automobile_dashboard', label: 'Workshop dashboard' },
    { key: 'stats_show_overall_summary', label: 'Statistics: overall summary' },
    { key: 'stats_show_profit_loss_statement', label: 'Statistics: profit & loss statement', defaultTrue: true },
    { key: 'enable_vat_box', label: 'VAT card on dashboards' },
  ] },
  { id: 'quotation', title: 'Quotations', items: [
    { key: 'update_product_stock_on_quotation_sales', label: 'Update stock on quotation sales' },
    { key: 'enable_monthly_serial_number', label: 'Reset document serials every month' },
    { key: 'no_tax_for_quotation_invoice', label: 'No tax for quotation invoices & quotation sales returns' },
    { key: 'default_quotation_validity_days', label: 'Default quotation validity (days)', type: 'int' },
    { key: 'default_quotation_delivery_days', label: 'Default delivery (days)', type: 'int' },
  ] },
  { id: 'system', title: 'System', items: [
    { key: 'enable_auto_refresh', label: 'Prompt users to refresh when a new version is deployed' },
    { key: 'save_sidebar_config_to_server', label: 'Sync menu settings to the server' },
    { key: 'save_print_settings_to_server', label: 'Sync print preview settings to the server' },
  ] },
];

const DESIGN_T = (n: number, extra: Record<string, string> = {}) =>
  Array.from({ length: n }, (_, i) => ({ value: `type${i + 1}`, label: extra[`type${i + 1}`] || `Type ${i + 1}` }));
export const DESIGNS: { key: string; label: string; options: { value: string; label: string }[]; automobileOnly?: string }[] = [
  { key: 'invoice_a4_preview_design', label: 'A4 invoice layout', options: DESIGN_T(3, { type1: 'Classic', type2: 'Classic professional', type3: 'Sales return — compact' }) },
  { key: 'invoice_header_design', label: 'Preview toolbar', options: DESIGN_T(2, { type1: 'Standard', type2: 'Modern dark toolbar' }) },
  { key: 'balance_sheet_design', label: 'Balance sheet', options: DESIGN_T(2, { type1: 'Classic ledger', type2: 'Modern professional' }) },
  { key: 'balance_sheet_a4_preview_design', label: 'Balance sheet A4 preview', options: DESIGN_T(2) },
  { key: 'balance_sheet_header_design', label: 'Balance sheet toolbar', options: DESIGN_T(2) },
  { key: 'sales_create_form_design', label: 'Sales form', options: DESIGN_T(5, { type4: 'VAN store', type5: 'Workshop' }), automobileOnly: 'type5' },
  { key: 'sales_return_create_form_design', label: 'Sales return form', options: DESIGN_T(3) },
  { key: 'purchase_create_form_design', label: 'Purchase form', options: DESIGN_T(3) },
  { key: 'purchase_return_create_form_design', label: 'Purchase return form', options: DESIGN_T(3) },
  { key: 'quotation_create_form_design', label: 'Quotation form', options: DESIGN_T(3) },
  { key: 'quotation_sales_return_create_form_design', label: 'Quotation sales return form', options: DESIGN_T(3) },
];

/** Legacy convertToArabicNumber digit string (Persian forms except ٤ and ٦) — copied verbatim. */
const AR_DIGITS = '۰۱۲۳٤۵٦۷۸۹';
export function toArabicDigits(v: unknown): string {
  return String(v ?? '').replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
}

/** Fill undefined/null/"" leaves of target from defaults (recursive, in place). */
export function deepFillEmpty(target: Rec, defaults: Rec): Rec {
  for (const [k, dv] of Object.entries(defaults)) {
    const tv = target[k];
    if (dv && typeof dv === 'object' && !Array.isArray(dv)) {
      if (!tv || typeof tv !== 'object' || Array.isArray(tv)) target[k] = {};
      deepFillEmpty(target[k], dv);
    } else if (tv === undefined || tv === null || tv === '') target[k] = dv;
  }
  return target;
}

/** trimEnd every string, recursively (legacy trimStringFields). */
export function trimStrings<T>(v: T): T {
  if (typeof v === 'string') return v.trimEnd() as unknown as T;
  if (Array.isArray(v)) return v.map(trimStrings) as unknown as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, trimStrings(x)])) as T;
  return v;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v ?? null));

/** Defaults for a brand-new store (legacy open() without id). */
export function newStoreDefaults(): Rec {
  const s: Rec = {
    name: '', name_in_arabic: '', store_name: '', store_name_in_arabic: '', code: '', branch_name: '', title: '', title_in_arabic: '',
    registration_number: '', vat_no: '', vat_percent: 15, business_category: 'Supply Activities', email: '', phone: '',
    country_code: 'SA', country_name: 'Saudi Arabia',
    national_address: {}, bank_account: {},
    zatca: { phase: '1', env: 'NonProduction' },
    settings: { invoice: clone(INVOICE_TITLE_DEFAULTS), stats_show_overall_summary: false, stats_show_profit_loss_statement: true, enable_products: true, enable_services: false },
  };
  for (const r of SERIALS) s[`${r.key}_serial_number`] = { prefix: r.prefix, start_from_count: r.start, padding_count: r.padding };
  return s;
}

/** Normalise a store loaded from the API for editing (fill missing serials/titles from defaults). */
export function storeForEdit(store: Rec): Rec {
  const s = clone(store) as Rec;
  s.national_address = s.national_address || {};
  s.bank_account = s.bank_account || {};
  s.zatca = s.zatca || { phase: '1', env: 'NonProduction' };
  if (!s.zatca.phase) s.zatca.phase = '1';
  s.settings = s.settings || {};
  s.settings.invoice = deepFillEmpty(s.settings.invoice || {}, INVOICE_TITLE_DEFAULTS);
  for (const r of SERIALS) {
    const k = `${r.key}_serial_number`;
    const cur = s[k] || {};
    s[k] = { prefix: cur.prefix || r.prefix, start_from_count: cur.start_from_count ?? r.start, padding_count: cur.padding_count || r.padding };
  }
  return s;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const blank = (v: unknown) => v === undefined || v === null || String(v).trim() === '';

/** Client validation (legacy handleCreate messages). Error keys match server keys. */
export function validateStore(s: Rec): Record<string, string> {
  const e: Record<string, string> = {};
  const na = s.national_address || {};
  if (blank(s.business_category)) e.business_category = 'Business category is required';
  if (blank(s.name)) e.name = 'Name is required';
  if (blank(s.name_in_arabic)) e.name_in_arabic = 'Name in arabic is required';
  if (blank(s.code)) e.code = 'Branch code is required';
  if (blank(s.branch_name)) e.branch_name = 'Branch name is required';
  if (blank(s.phone)) e.phone = 'Phone is required';
  if (blank(s.registration_number)) e.registration_number = 'CRN is required';
  else if (!/^[a-zA-Z0-9]+$/.test(String(s.registration_number).trim())) e.registration_number = 'CRN should be alpha numeric(a-zA-Z0-9)';
  const vat = String(s.vat_no ?? '').trim();
  if (!vat) e.vat_no = 'VAT No is required';
  else if (!/^\d{15}$/.test(vat)) e.vat_no = 'VAT No should be 15 digits';
  else if (!(vat.startsWith('3') && vat.endsWith('3'))) e.vat_no = 'VAT No should start and end with 3';
  if (blank(s.vat_percent) || !(Number(s.vat_percent) > 0)) e.vat_percent = 'VAT % is required';
  if (blank(s.email)) e.email = 'E-mail is required';
  else if (!EMAIL_RE.test(String(s.email).trim())) e.email = 'E-mail is not valid';
  if (blank(s.country_code)) e.country_code = 'Country is required';
  if (blank(na.building_no)) e.national_address_building_no = 'Building number is required';
  else if (!/^\d{4}$/.test(String(na.building_no).trim())) e.national_address_building_no = 'Building number should be 4 digits';
  if (blank(na.street_name)) e.national_address_street_name = 'Street name is required';
  if (blank(na.street_name_arabic)) e.national_address_street_name_arabic = 'Street name in arabic is required';
  if (blank(na.district_name)) e.national_address_district_name = 'District name is required';
  if (blank(na.district_name_arabic)) e.national_address_district_name_arabic = 'District name in arabic is required';
  if (blank(na.city_name)) e.national_address_city_name = 'City name is required';
  if (blank(na.city_name_arabic)) e.national_address_city_name_arabic = 'City name in arabic is required';
  if (blank(na.zipcode)) e.national_address_zipcode = 'Zipcode is required';
  else if (!/^\d{5}$/.test(String(na.zipcode).trim())) e.national_address_zipcode = 'Zipcode should be 5 digits';
  if (s.zatca?.phase === '2' && blank(s.zatca?.env)) e.zatca_env = 'ZATCA environment is required for phase 2';
  for (const r of SERIALS) {
    const sn = s[`${r.key}_serial_number`];
    if (!sn) continue;
    if (blank(sn.prefix)) e[`${r.key}_serial_number_prefix`] = 'Prefix is required';
    if (!(Number(sn.padding_count) > 0)) e[`${r.key}_serial_number_padding_count`] = 'Padding must be greater than 0';
    if (Number(sn.start_from_count) < 0 || blank(sn.start_from_count)) e[`${r.key}_serial_number_start_from_count`] = 'Start must be 0 or more';
  }
  const st = s.settings || {};
  for (const k of ['default_quotation_validity_days', 'default_quotation_delivery_days']) {
    if (st[k] !== null && st[k] !== undefined && st[k] !== '' && !(Number(st[k]) > 0)) e[`settings.${k}`] = 'Must be greater than 0';
  }
  for (const k of ['cash_opening_balance', 'bank_opening_balance']) {
    const v = Number(st[k] || 0);
    if (v < 0) e[`settings.${k}`] = 'Opening balance cannot be negative';
    if (v > 0 && !st[`${k}_date`]) e[`settings.${k}_date`] = 'Date is required when an opening balance is entered';
  }
  return e;
}

/** Body for POST/PUT /v1/store — whole object, trimmed, Arabic digit mirrors filled. */
export function buildStoreBody(s: Rec): Rec {
  const b = clone(s) as Rec;
  b.use_products_from_store_id = [];
  const vp = parseFloat(b.vat_percent);
  b.vat_percent = Number.isFinite(vp) ? vp : null;
  b.phone_in_arabic = toArabicDigits(b.phone);
  b.vat_no_in_arabic = toArabicDigits(b.vat_no);
  b.registration_number_in_arabic = toArabicDigits(b.registration_number);
  const na = (b.national_address = b.national_address || {});
  for (const k of ['building_no', 'zipcode', 'additional_no', 'unit_no']) na[`${k}_arabic`] = toArabicDigits(na[k]);
  b.settings = b.settings || {};
  b.settings.invoice = deepFillEmpty(b.settings.invoice || {}, INVOICE_TITLE_DEFAULTS);
  for (const k of ['default_quotation_validity_days', 'default_quotation_delivery_days']) {
    const v = b.settings[k];
    b.settings[k] = v === '' || v === null || v === undefined ? null : parseInt(String(v), 10);
  }
  if (b.settings.block_sales_after_pending_count !== undefined) b.settings.block_sales_after_pending_count = parseInt(String(b.settings.block_sales_after_pending_count || 0), 10) || 0;
  for (const k of ['cash_opening_balance', 'bank_opening_balance']) if (b.settings[k] !== undefined) b.settings[k] = Number(b.settings[k]) || 0;
  for (const r of SERIALS) {
    const sn = b[`${r.key}_serial_number`];
    if (sn) { sn.start_from_count = Number(sn.start_from_count) || 0; sn.padding_count = Number(sn.padding_count) || 0; }
  }
  // Read-only/derived fields the API manages itself.
  for (const k of ['created_at', 'updated_at', 'created_by', 'updated_by', 'created_by_name', 'updated_by_name', 'deleted_at', 'deleted_by']) delete b[k];
  return trimStrings(b);
}

export type StoreTab = 'general' | 'address' | 'contact' | 'bank' | 'titles' | 'serials' | 'preferences' | 'designs' | 'images' | 'opening' | 'zatca' | 'whatsapp' | 'procurement' | 'maintenance';

/** Which tab a (client or server) error key belongs to — drives per-tab error badges. */
export function tabForError(key: string): StoreTab {
  if (key.startsWith('national_address') || key === 'country_code') return 'address';
  if (key === 'phone' || key === 'email' || key === 'phone_in_arabic') return 'contact';
  if (key.includes('_serial_number')) return 'serials';
  if (key.startsWith('settings.cash_opening') || key.startsWith('settings.bank_opening')) return 'opening';
  if (key.startsWith('settings.')) return 'preferences';
  if (key === 'logo_content' || key === 'invoice_background_content') return 'images';
  if (key.startsWith('zatca')) return 'zatca';
  return 'general';
}

/** Tab order of the settings editor (used to jump to the first tab with errors). */
export const TAB_ORDER: StoreTab[] = ['general', 'address', 'contact', 'bank', 'zatca', 'titles', 'serials', 'preferences', 'designs', 'images', 'opening', 'whatsapp', 'procurement', 'maintenance'];
export function firstErrorTab(errors: Record<string, string>): StoreTab | undefined {
  const c = errorCountByTab(errors);
  return TAB_ORDER.find((t) => c[t]);
}

export function errorCountByTab(errors: Record<string, string>): Partial<Record<StoreTab, number>> {
  const out: Partial<Record<StoreTab, number>> = {};
  for (const [k, m] of Object.entries(errors)) if (m) { const t = tabForError(k); out[t] = (out[t] || 0) + 1; }
  return out;
}

/** Get / set by dotted path (immutably for set). */
export function getPath(o: Rec, path: string): any {
  return path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
}
export function setPath<T extends Rec>(o: T, path: string, v: unknown): T {
  const [h, ...rest] = path.split('.');
  const copy: Rec = Array.isArray(o) ? [...(o as any)] : { ...o };
  copy[h] = rest.length ? setPath((o?.[h] as Rec) || {}, rest.join('.'), v) : v;
  return copy as T;
}

/** Example document code a serial produces: PREFIX-000001. */
export function serialPreview(sn: { prefix?: string; start_from_count?: number | string; padding_count?: number | string } | undefined): string {
  if (!sn) return '';
  const n = Math.max(0, Number(sn.start_from_count) || 0);
  const pad = Math.max(0, Number(sn.padding_count) || 0);
  return `${sn.prefix || ''}-${String(n).padStart(pad, '0')}`;
}

/** A setting value as a checkbox state (respects default-true keys). */
export function settingOn(settings: Rec | undefined, d: SettingDef): boolean {
  const v = settings?.[d.key];
  return d.defaultTrue ? v !== false : !!v;
}

/** Store ZATCA status for list/profile pills. */
export type ZatcaState = 'phase1' | 'connected' | 'reconnect' | 'not_connected';
export function zatcaState(z: Rec | undefined | null): ZatcaState {
  if (!z || z.phase !== '2') return 'phase1';
  if (z.zatca_reconnect_required) return 'reconnect';
  return z.connected ? 'connected' : 'not_connected';
}

/** Resolve an image filename stored by the API to a URL (legacy utils/imageUtils.resolveImageUrl). */
export function resolveImageUrl(filename: string | undefined | null, storeId: string, category: string, entityId?: string): string {
  if (!filename) return '';
  if (/^(https?:|data:|blob:)/.test(filename)) return filename;
  if (filename.startsWith('/')) {
    const m = /^\/images\/store\/(.+)$/.exec(filename);
    return m ? `/images/${storeId}/store/${m[1]}` : filename;
  }
  return `/images/${storeId}/${category}${entityId ? `/${entityId}` : ''}/${filename}`;
}

/** Common ISO-3166 countries for the address tab (names come from Intl.DisplayNames). */
export const COUNTRY_CODES = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'YE', 'IQ', 'JO', 'SY', 'LB', 'PS', 'EG', 'SD', 'LY', 'TN', 'DZ', 'MA', 'TR', 'IR', 'IN', 'PK', 'BD', 'LK', 'NP', 'MY', 'SG', 'ID', 'PH', 'TH', 'VN', 'CN', 'HK', 'JP', 'KR', 'GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'GR', 'RO', 'BG', 'RU', 'US', 'CA', 'MX', 'BR', 'AR', 'AU', 'NZ', 'ZA', 'NG', 'KE', 'ET', 'GH'];
export function countryName(code: string, lang = 'en'): string {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}
