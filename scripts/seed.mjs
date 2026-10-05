#!/usr/bin/env node
/**
 * Seed a realistic demo/test store through the public API (no direct DB access).
 * Used by integration + E2E tests and for local review.
 *
 *   API_URL=http://127.0.0.1:2000 SEED_EMAIL=… SEED_PASSWORD=… node scripts/seed.mjs
 *
 * Idempotent: reuses the store with code SEED_STORE_CODE (default "GUO") if it exists.
 * Writes the resulting ids to tests/.seed.json.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = (process.env.API_URL || 'http://127.0.0.1:2000').replace(/\/$/, '');
const EMAIL = process.env.SEED_EMAIL || 'sirinibin2006@gmail.com';
const PASSWORD = process.env.SEED_PASSWORD || '123456';
const CODE = process.env.SEED_STORE_CODE || 'GUO';
const here = dirname(fileURLToPath(import.meta.url));

let token = '';
async function call(method, path, body, query = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  const url = `${API}${path}${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  const hasErrors = data.errors && Object.keys(data.errors).length > 0;
  if (!res.ok || (data.status === false && (hasErrors || data.result == null))) {
    const err = new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data.errors || data).slice(0, 400)}`);
    err.data = data;
    throw err;
  }
  return data;
}
const tryCall = async (...a) => { try { return await call(...a); } catch (e) { console.warn('  ! ' + e.message); return null; } };

const iso = (d) => {
  const p = (n) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
};
const daysAgo = (n, h = 10) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, (n * 7) % 60, 0, 0); return d; };
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const r8 = (n) => Math.round((n + Number.EPSILON) * 1e8) / 1e8;
let seed = 42;
const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
const pick = (a) => a[Math.floor(rnd() * a.length)];

const serial = (prefix) => ({ prefix, start_from_count: 1, padding_count: 6 });

async function login() {
  const a = await call('POST', '/v1/authorize', { email: EMAIL, password: PASSWORD });
  const r = await fetch(`${API}/v1/accesstoken`, { method: 'POST', headers: { Authorization: a.result.code } });
  token = (await r.json()).result.access_token;
}

async function ensureStore() {
  const list = await call('GET', '/v1/store', null, { 'search[code]': CODE, limit: 5, select: 'id,code,name' });
  const found = (list.result || []).find((s) => s.code === CODE);
  if (found) { console.log(`• store ${CODE} exists (${found.id})`); return { id: found.id, created: false }; }
  const body = {
    name: 'Gulf Union Ozone Co.', name_in_arabic: 'شركة اتحاد الخليج للأوزون', code: CODE, branch_name: 'Riyadh HQ', business_category: 'Auto parts trading',
    title: 'Gulf Union Ozone Co.', title_in_arabic: 'شركة اتحاد الخليج للأوزون',
    registration_number: '1010233344', registration_number_in_arabic: '١٠١٠٢٣٣٣٤٤', email: 'info@guo.example.sa', phone: '0114567890', phone_in_arabic: '٠١١٤٥٦٧٨٩٠',
    vat_no: '300455120900003', vat_no_in_arabic: '٣٠٠٤٥٥١٢٠٩٠٠٠٠٣', vat_percent: 15, country_code: 'SA',
    national_address: { building_no: '7788', building_no_arabic: '٧٧٨٨', street_name: 'Al Imam Saud Rd', street_name_arabic: 'طريق الإمام سعود', district_name: 'Al Nakheel', district_name_arabic: 'النخيل', city_name: 'Riyadh', city_name_arabic: 'الرياض', zipcode: '13244', zipcode_arabic: '١٣٢٤٤', additional_no: '1234', additional_no_arabic: '١٢٣٤' },
    sales_serial_number: serial('S-INV'), sales_return_serial_number: serial('S-RET'), purchase_serial_number: serial('P-INV'), purchase_return_serial_number: serial('P-RET'),
    purchase_order_serial_number: serial('PO'), purchase_request_serial_number: serial('PR'), quotation_serial_number: serial('QTN'), quotation_sales_return_serial_number: serial('QSR'),
    customer_serial_number: serial('C'), vendor_serial_number: serial('V'), expense_serial_number: serial('EXP'), delivery_note_serial_number: serial('DN'),
    customer_deposit_serial_number: serial('RCV'), customer_withdrawal_serial_number: serial('PAY'), capital_deposit_serial_number: serial('CAP'), divident_serial_number: serial('DRW'),
    stock_transfer_serial_number: serial('ST'), non_vat_sales_serial_number: serial('NV'), non_vat_sales_return_serial_number: serial('NVR'), rfq_received_serial_number: serial('RFQ'),
  };
  const r = await call('POST', '/v1/store', body);
  console.log(`• created store ${CODE} (${r.result.id})`);
  return { id: r.result.id, created: true };
}

async function enableModules(storeId) {
  const cur = (await call('GET', `/v1/store/${storeId}`, null, { 'search[store_id]': storeId })).result;
  const settings = {
    ...(cur.settings || {}),
    enable_warehouse_module: true, enable_purchase_order_module: true, enable_purchase_request_module: true,
    enable_automobile_module: true, enable_automobile_dashboard: true, enable_employee_module: true,
    non_vat_sales: true, enable_sales_in_quotation: true, enable_services: true, enable_products: true, enable_common_dashboard: true,
  };
  await tryCall('PUT', `/v1/store/${storeId}`, { ...cur, settings }, { 'search[store_id]': storeId });
}

const PRODUCTS = [
  ['Brake Pad Set – Toyota Camry 2018+', 'BP-TY-CAM18', 120, 185, 'Set', 'Brakes', 'Bosch'],
  ['Engine Oil 5W-30 Fully Synthetic 4L', 'OIL-5W30-4L', 62, 96, 'Can', 'Lubricants', 'Mobil'],
  ['Air Filter – Hyundai Elantra 2019+', 'AF-HY-ELN', 22.1, 38.5, 'Pc', 'Filters', 'Bosch'],
  ['Spark Plug Iridium', 'SP-NGK-IR', 24, 42, 'Pc', 'Ignition', 'NGK'],
  ['Car Battery 70Ah AGM', 'BAT-70-AGM', 380, 520, 'Pc', 'Electrical', 'Varta'],
  ['Wiper Blade 22" Aero', 'WB-22-AERO', 18, 34, 'Pc', 'Accessories', 'Bosch'],
  ['Oil Filter – Nissan Patrol Y62', 'OF-NS-PAT', 15, 29, 'Pc', 'Filters', 'Mann'],
  ['Coolant Concentrate 4L Green', 'CL-GRN-4L', 31, 58, 'Can', 'Lubricants', 'Prestone'],
  ['Brake Disc Front – Ford F-150', 'BD-FD-F150', 210, 340, 'Pc', 'Brakes', 'Brembo'],
  ['Cabin Filter – Kia Sportage', 'CF-KIA-SPT', 19, 35, 'Pc', 'Filters', 'Mann'],
  ['Transmission Fluid ATF 1L', 'ATF-DX6-1L', 21, 39, 'Can', 'Lubricants', 'Mobil'],
  ['Headlight Bulb H7 LED', 'HL-H7-LED', 45, 89, 'Pair', 'Electrical', 'Philips'],
];

async function main() {
  console.log(`Seeding ${API} as ${EMAIL}`);
  await login();
  const { id: storeId, created } = await ensureStore();
  const S = { 'search[store_id]': storeId };
  await enableModules(storeId);
  const out = { storeId, storeCode: CODE, products: [], customers: [], vendors: [], orders: [], purchases: [], quotations: [] };

  if (!created) {
    const pr = await call('GET', '/v1/product', null, { ...S, limit: 50, select: 'id,name' });
    const cu = await call('GET', '/v1/customer', null, { ...S, limit: 50, select: 'id,name' });
    const ve = await call('GET', '/v1/vendor', null, { ...S, limit: 50, select: 'id,name' });
    const or = await call('GET', '/v1/order', null, { ...S, limit: 50, select: 'id,code' });
    Object.assign(out, { products: pr.result || [], customers: cu.result || [], vendors: ve.result || [], orders: or.result || [] });
    if (out.products.length >= PRODUCTS.length && out.orders.length > 0) { save(out); console.log('✓ store already seeded'); return; }
  }

  const wh = await tryCall('POST', '/v1/warehouse', { store_id: storeId, name: 'Dammam Warehouse', name_in_arabic: 'مستودع الدمام', code: 'WH2', phone: '0501234567', national_address: { city_name: 'Dammam' } }, S);
  out.warehouseId = wh?.result?.id;

  const cats = {}, brands = {};
  for (const c of [...new Set(PRODUCTS.map((p) => p[5]))]) {
    const r = await tryCall('POST', '/v1/product-category', { store_id: storeId, name: c }, S);
    if (r) cats[c] = r.result.id;
  }
  for (const b of [...new Set(PRODUCTS.map((p) => p[6]))]) {
    const r = await tryCall('POST', '/v1/product-brand', { store_id: storeId, name: b, code: b.toUpperCase().slice(0, 4) }, S);
    if (r) brands[b] = r.result.id;
  }

  for (const [name, part, cost, price, unit, cat, brand] of PRODUCTS) {
    const r = await tryCall('POST', '/v1/product', {
      store_id: storeId, name, part_number: part, unit, country_name: 'Germany', category_id: cats[cat] ? [cats[cat]] : [], brand_id: brands[brand] || null,
      product_stores: { [storeId]: {
        store_id: storeId, purchase_unit_price: cost, purchase_unit_price_with_vat: r8(cost * 1.15), retail_unit_price: price, retail_unit_price_with_vat: r8(price * 1.15),
        wholesale_unit_price: r2(price * 0.9), wholesale_unit_price_with_vat: r8(price * 0.9 * 1.15), warehouse_racks: { main_store: `A-${Math.ceil(rnd() * 9)}` },
        stock_adjustments: [{ date_str: iso(daysAgo(70)), type: 'adding', quantity: part === 'AF-HY-ELN' ? 7 : 40 + Math.floor(rnd() * 120), reason: 'Opening stock', warehouse_id: null, warehouse_code: null }],
      } },
    }, S);
    if (r) out.products.push({ id: r.result.id, name, cost, price, part });
  }
  out.products.push(...[]);
  await tryCall('POST', '/v1/product', { store_id: storeId, name: 'Wheel Alignment Service', is_service: true, unit: 'Job', product_stores: { [storeId]: { store_id: storeId, retail_unit_price: 120, retail_unit_price_with_vat: 138 } } }, S);

  const CUST = [
    ['Al Noor Trading Est.', '310122393500003', '0554128890', 50000],
    ['Riyadh Auto Care', '311987650400003', '0551112233', 30000],
    ['Al Safwa Contracting', '302214578600003', '0562223344', 80000],
    ['Desert Line Logistics', '310776512300003', '0503334455', 60000],
    ['Najd Fleet Services', '300998712200003', '0534445566', 100000],
    ['Red Sea Motors', '311452098700003', '0545556677', 40000],
    ['Mohammed Al-Harbi', '', '0566667788', 0],
  ];
  for (const [name, vat, phone, limit] of CUST) {
    const body = { store_id: storeId, name, phone, credit_limit: limit, country_code: 'SA', vat_no: vat };
    if (vat) Object.assign(body, { registration_number: String(1010000000 + Math.floor(rnd() * 9e8)), national_address: { building_no: String(1000 + Math.floor(rnd() * 8999)), street_name: 'King Fahd Rd', district_name: 'Al Olaya', city_name: 'Riyadh', zipcode: '12241', additional_no: '1234' } });
    const r = await tryCall('POST', '/v1/customer', body, S);
    if (r) out.customers.push({ id: r.result.id, name: r.result.name });
  }
  for (const [name, vat] of [['Al Jazira Auto Parts', '300112233400003'], ['Gulf Lubricants Co.', '300556677800003'], ['Bosch Saudi Distribution', '300998877600003']]) {
    const r = await tryCall('POST', '/v1/vendor', { store_id: storeId, name, vat_no: vat, phone: '0112223344', country_code: 'SA', national_address: { building_no: '1234', street_name: 'Industrial Rd', district_name: 'Al Sulay', city_name: 'Riyadh', zipcode: '14322', additional_no: '5678' } }, S);
    if (r) out.vendors.push({ id: r.result.id, name });
  }

  const line = (p, q, disc = 0) => ({ product_id: p.id, part_number: p.part, name: p.name, quantity: q, unit: 'Pc', unit_price: p.price, unit_price_with_vat: r8(p.price * 1.15), unit_discount: disc, unit_discount_with_vat: r8(disc * 1.15), unit_discount_percent: r2((disc / p.price) * 100), unit_discount_percent_with_vat: r2((disc / p.price) * 100), purchase_unit_price: p.cost, purchase_unit_price_with_vat: r8(p.cost * 1.15) });
  const total = (ls) => { let t = 0; ls.forEach((l) => { t = r2(t + l.quantity * (l.unit_price - l.unit_discount)); }); return r2(t + r2(t * 0.15)); };

  if (out.products.length && out.vendors.length) {
    for (let i = 0; i < 6; i++) {
      const v = out.vendors[i % out.vendors.length];
      const ls = [0, 1, 2].map((k) => { const p = out.products[(i * 3 + k) % out.products.length]; return { ...line(p, 20 + k * 5), unit_price: p.cost, unit_price_with_vat: r8(p.cost * 1.15), purchasereturn_unit_price: p.cost }; });
      const net = total(ls);
      const r = await tryCall('POST', '/v1/purchase', { store_id: storeId, date_str: iso(daysAgo(60 - i * 8)), vendor_id: v.id, vat_percent: 15, products: ls, auto_rounding_amount: true, discount: 0, shipping_handling_fees: 0, payments_input: i % 2 ? [{ date_str: iso(daysAgo(60 - i * 8)), amount: net, method: 'bank_transfer', deleted: false }] : [] }, S);
      if (r) out.purchases.push({ id: r.result.id, code: r.result.code });
    }
  }

  if (out.products.length && out.customers.length) {
    for (let i = 0; i < 24; i++) {
      const c = out.customers[i % out.customers.length];
      const n = 1 + Math.floor(rnd() * 3);
      const ls = Array.from({ length: n }, (_, k) => line(out.products[(i + k * 4) % out.products.length], 1 + Math.floor(rnd() * 6), k === 1 ? 2 : 0));
      const net = total(ls);
      const mode = i % 4; // 0 paid cash, 1 partial, 2 credit, 3 card
      const payments = mode === 2 ? [] : [{ date_str: iso(daysAgo(45 - i * 2, 11)), amount: mode === 1 ? r2(net / 2) : net, method: mode === 3 ? 'debit_card' : 'cash', deleted: false }];
      const r = await tryCall('POST', '/v1/order', { store_id: storeId, date_str: iso(daysAgo(45 - Math.floor(i * 1.8), 9 + (i % 8))), customer_id: c.id, customer_name: c.name, vat_percent: 15, products: ls, auto_rounding_amount: true, discount: 0, discount_with_vat: 0, shipping_handling_fees: 0, cash_discount: 0, payments_input: payments }, S);
      if (r) out.orders.push({ id: r.result.id, code: r.result.code, net_total: r.result.net_total });
    }
    for (let i = 0; i < 5; i++) {
      const c = out.customers[(i + 2) % out.customers.length];
      const ls = [line(out.products[i], 2), line(out.products[i + 3], 1)];
      const r = await tryCall('POST', '/v1/quotation', { store_id: storeId, date_str: iso(daysAgo(20 - i * 3)), customer_id: c.id, customer_name: c.name, vat_percent: 15, products: ls, auto_rounding_amount: true, validity_days: 7, delivery_days: 3, type: 'quotation' }, S);
      if (r) out.quotations.push({ id: r.result.id, code: r.result.code });
    }
  }

  const ec = await tryCall('POST', '/v1/expense-category', { store_id: storeId, name: 'Utilities' }, S);
  for (const [desc, amt] of [['Electricity bill', 1840], ['Shop rent – October', 9500], ['Internet & phone', 420]]) {
    await tryCall('POST', '/v1/expense', { store_id: storeId, date_str: iso(daysAgo(Math.floor(rnd() * 30))), amount: amt, description: desc, category_id: ec ? [ec.result.id] : [], payment_method: 'bank_transfer', vat_percent: 15 }, S);
  }
  await tryCall('POST', `/v1/store/${storeId}/populate-test-data`, {}, S);
  save(out);
  console.log(`✓ seeded: ${out.products.length} products, ${out.customers.length} customers, ${out.vendors.length} vendors, ${out.orders.length} sales, ${out.purchases.length} purchases, ${out.quotations.length} quotations`);
}

function save(out) {
  const p = resolve(here, '../tests/.seed.json');
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
