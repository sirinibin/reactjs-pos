import { describe, expect, it } from 'vitest';
import {
  buildStoreBody, deepFillEmpty, errorCountByTab, firstErrorTab, getPath, INVOICE_TITLE_DEFAULTS, newStoreDefaults, resolveImageUrl, serialPreview, SERIALS, setPath, settingOn,
  storeForEdit, tabForError, toArabicDigits, trimStrings, validateStore, zatcaState,
} from './storeForm';

const valid = (): Record<string, any> => ({
  ...newStoreDefaults(),
  name: 'Acme Trading', name_in_arabic: 'أكمي', code: 'ACM', branch_name: 'Main', registration_number: 'CR12345', vat_no: '300000000000003', vat_percent: 15,
  email: 'info@acme.sa', phone: '0551234567', country_code: 'SA',
  national_address: { building_no: '1234', street_name: 'King Fahd', street_name_arabic: 'الملك فهد', district_name: 'Olaya', district_name_arabic: 'العليا', city_name: 'Riyadh', city_name_arabic: 'الرياض', zipcode: '12345' },
});

describe('toArabicDigits', () => {
  it('uses the legacy digit string verbatim (Persian forms, Arabic ٤ and ٦)', () => {
    expect(toArabicDigits('0123456789')).toBe('۰۱۲۳٤۵٦۷۸۹');
    expect(toArabicDigits('+966 55')).toBe('+۹٦٦ ۵۵');
    expect(toArabicDigits(undefined)).toBe('');
  });
});

describe('validateStore', () => {
  it('accepts a complete store', () => {
    expect(validateStore(valid())).toEqual({});
  });
  it('reports required fields with the server error keys', () => {
    const e = validateStore({ ...newStoreDefaults(), business_category: '', vat_percent: '' });
    for (const k of ['business_category', 'name', 'name_in_arabic', 'code', 'branch_name', 'phone', 'registration_number', 'vat_no', 'vat_percent', 'email',
      'national_address_building_no', 'national_address_street_name', 'national_address_street_name_arabic', 'national_address_district_name',
      'national_address_district_name_arabic', 'national_address_city_name', 'national_address_city_name_arabic', 'national_address_zipcode']) expect(e).toHaveProperty(k);
    expect(e.code).toBe('Branch code is required');
    expect(e.name_in_arabic).toBe('Name in arabic is required');
  });
  it.each([
    ['300000000000003', undefined],
    ['30000000000000', 'VAT No should be 15 digits'],
    ['3000000000000AB', 'VAT No should be 15 digits'],
    ['100000000000003', 'VAT No should start and end with 3'],
    ['300000000000001', 'VAT No should start and end with 3'],
  ])('VAT no. %s → %s', (vat, msg) => {
    expect(validateStore({ ...valid(), vat_no: vat }).vat_no).toBe(msg);
  });
  it('validates CRN, email, building number and zipcode formats', () => {
    const e = validateStore({ ...valid(), registration_number: 'CR-1', email: 'nope', national_address: { ...valid().national_address, building_no: '12', zipcode: '1234' } });
    expect(e.registration_number).toBe('CRN should be alpha numeric(a-zA-Z0-9)');
    expect(e.email).toBe('E-mail is not valid');
    expect(e.national_address_building_no).toBe('Building number should be 4 digits');
    expect(e.national_address_zipcode).toBe('Zipcode should be 5 digits');
  });
  it('requires an environment in phase 2 and valid serial rows', () => {
    const s = valid();
    s.zatca = { phase: '2', env: '' };
    s.sales_serial_number = { prefix: '', padding_count: 0, start_from_count: -1 };
    const e = validateStore(s);
    expect(e.zatca_env).toBeTruthy();
    expect(e.sales_serial_number_prefix).toBe('Prefix is required');
    expect(e.sales_serial_number_padding_count).toBeTruthy();
    expect(e.sales_serial_number_start_from_count).toBeTruthy();
  });
  it('validates opening balances and quotation days', () => {
    const s = valid();
    s.settings = { ...s.settings, cash_opening_balance: 100, bank_opening_balance: -5, default_quotation_validity_days: 0 };
    const e = validateStore(s);
    expect(e['settings.cash_opening_balance_date']).toBeTruthy();
    expect(e['settings.bank_opening_balance']).toBe('Opening balance cannot be negative');
    expect(e['settings.default_quotation_validity_days']).toBe('Must be greater than 0');
  });
});

describe('buildStoreBody', () => {
  it('fills Arabic digit mirrors, trims strings, coerces numbers and drops metadata', () => {
    const s = { ...valid(), name: 'Acme  ', vat_percent: '15', phone: '055', created_at: 'x', updated_by_name: 'y' } as any;
    s.settings = { invoice: {}, default_quotation_validity_days: '', default_quotation_delivery_days: '7', block_sales_after_pending_count: '3', cash_opening_balance: '10.5' };
    const b = buildStoreBody(s);
    expect(b.name).toBe('Acme');
    expect(b.vat_percent).toBe(15);
    expect(b.phone_in_arabic).toBe('۰۵۵');
    expect(b.vat_no_in_arabic).toBe(toArabicDigits('300000000000003'));
    expect(b.national_address.building_no_arabic).toBe('۱۲۳٤');
    expect(b.national_address.zipcode_arabic).toBe('۱۲۳٤۵');
    expect(b.settings.default_quotation_validity_days).toBeNull();
    expect(b.settings.default_quotation_delivery_days).toBe(7);
    expect(b.settings.block_sales_after_pending_count).toBe(3);
    expect(b.settings.cash_opening_balance).toBe(10.5);
    expect(b.settings.invoice.quotation_title).toBe(INVOICE_TITLE_DEFAULTS.quotation_title);
    expect(b.use_products_from_store_id).toEqual([]);
    expect(b).not.toHaveProperty('created_at');
    expect(b).not.toHaveProperty('updated_by_name');
    expect(s.name).toBe('Acme  '); // input untouched
  });
});

describe('storeForEdit / deepFillEmpty', () => {
  it('fills blank serials and invoice titles from defaults but keeps saved values', () => {
    const s = storeForEdit({ id: 'x', sales_serial_number: { prefix: 'S', start_from_count: 0, padding_count: 6 }, purchase_serial_number: { prefix: '', start_from_count: 0, padding_count: 0 }, settings: { invoice: { quotation_title: '', delivery_note_title: 'DN | م' } } });
    expect(s.sales_serial_number).toEqual({ prefix: 'S', start_from_count: 0, padding_count: 6 });
    expect(s.purchase_serial_number).toEqual({ prefix: 'P-INV', start_from_count: 0, padding_count: 3 });
    expect(s.customer_serial_number.prefix).toBe('C');
    expect(s.settings.invoice.quotation_title).toBe('QUOTATION | اقتباس');
    expect(s.settings.invoice.delivery_note_title).toBe('DN | م');
    expect(s.settings.invoice.phase2_b2b.sales_titles.paid).toBe('STANDARD TAX INVOICE | فاتورة ضريبية قياسية');
    expect(s.zatca.phase).toBe('1');
  });
  it('deepFillEmpty replaces non-object targets with objects', () => {
    expect(deepFillEmpty({ a: 'x', b: '' } as any, { a: { c: 1 }, b: 2 })).toEqual({ a: { c: 1 }, b: 2 });
  });
  it('new store defaults follow legacy open()', () => {
    const d = newStoreDefaults();
    expect(d.customer_deposit_serial_number).toEqual({ prefix: 'RCVBLE', start_from_count: 1, padding_count: 4 });
    expect(d.delivery_note_serial_number.padding_count).toBe(6);
    expect(d.zatca).toEqual({ phase: '1', env: 'NonProduction' });
    expect(d.vat_percent).toBe(15);
    expect(SERIALS).toHaveLength(20);
  });
});

describe('helpers', () => {
  it('maps error keys to tabs and counts them', () => {
    expect(tabForError('national_address_zipcode')).toBe('address');
    expect(tabForError('email')).toBe('contact');
    expect(tabForError('sales_serial_number_prefix')).toBe('serials');
    expect(tabForError('settings.cash_opening_balance_date')).toBe('opening');
    expect(tabForError('settings.default_quotation_validity_days')).toBe('preferences');
    expect(tabForError('zatca_env')).toBe('zatca');
    expect(tabForError('vat_no')).toBe('general');
    expect(errorCountByTab({ name: 'x', vat_no: 'y', email: 'z', other: '' })).toEqual({ general: 2, contact: 1 });
    expect(firstErrorTab({ email: 'x', national_address_zipcode: 'y' })).toBe('address');
    expect(firstErrorTab({})).toBeUndefined();
  });
  it('get/set by dotted path immutably', () => {
    const o = { a: { b: { c: 1 } }, d: 1 };
    const n = setPath(o, 'a.b.c', 2);
    expect(getPath(n, 'a.b.c')).toBe(2);
    expect(o.a.b.c).toBe(1);
    expect(n.d).toBe(1);
    expect(getPath(o, 'x.y')).toBeUndefined();
  });
  it('serial preview pads the start number', () => {
    expect(serialPreview({ prefix: 'S-INV', start_from_count: 7, padding_count: 4 })).toBe('S-INV-0007');
  });
  it('default-true settings are on unless explicitly false', () => {
    const d = { key: 'disable_sales_edit_once_reported_to_zatca', label: '', defaultTrue: true };
    expect(settingOn({}, d)).toBe(true);
    expect(settingOn({ disable_sales_edit_once_reported_to_zatca: false }, d)).toBe(false);
    expect(settingOn({}, { key: 'x', label: '' })).toBe(false);
  });
  it('zatcaState', () => {
    expect(zatcaState({ phase: '1' })).toBe('phase1');
    expect(zatcaState({ phase: '' })).toBe('phase1');
    expect(zatcaState({ phase: '2', connected: true })).toBe('connected');
    expect(zatcaState({ phase: '2', connected: true, zatca_reconnect_required: true })).toBe('reconnect');
    expect(zatcaState({ phase: '2' })).toBe('not_connected');
  });
  it('resolveImageUrl', () => {
    expect(resolveImageUrl('logo.png', 's1', 'store')).toBe('/images/s1/store/logo.png');
    expect(resolveImageUrl('sig.png', 's1', 'signatures', 'e1')).toBe('/images/s1/signatures/e1/sig.png');
    expect(resolveImageUrl('/images/store/logo.png', 's1', 'store')).toBe('/images/s1/store/logo.png');
    expect(resolveImageUrl('/images/s1/store/a.png', 's1', 'store')).toBe('/images/s1/store/a.png');
    expect(resolveImageUrl('data:image/png;base64,AA', 's1', 'store')).toBe('data:image/png;base64,AA');
    expect(resolveImageUrl('', 's1', 'store')).toBe('');
  });
  it('trimStrings trims ends recursively', () => {
    expect(trimStrings({ a: ' x ', b: [' y '], c: { d: 'z  ' }, e: 1 })).toEqual({ a: ' x', b: [' y'], c: { d: 'z' }, e: 1 });
  });
});
