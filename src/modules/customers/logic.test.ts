import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  agingBuckets, amountInWords, blankCustomerForm, blankMoneyForm, canSwitchType, creditUsage, customerFormToBody, customerToForm, flattenPostings, initials, intToWords,
  linkableInvoiceTypes, methodsFor, moneyFormToBody, moneyToForm, moneyTotals, payErrKey, referenceLink, stat, statementSummary, toArabicDigits, toggleTab, validateCustomer, validateMoney,
  type CustomerForm, type MoneyForm,
} from './logic';
import { customerSearchKey } from './searchKey';
import { moneySearchKey } from './MoneyList';
import { partyName, partyPath, zatcaEnabled, MONEY } from './money';
import { ar } from './ar';

const form = (patch: Partial<CustomerForm> = {}): CustomerForm => ({ ...blankCustomerForm(), name: 'Al Noor', ...patch });

describe('Arabic digits', () => {
  it('uses the exact legacy digit map', () => {
    expect(toArabicDigits('0554128890')).toBe('۰۵۵٤۱۲۸۸۹۰');
    expect(toArabicDigits('310122393500003')).toBe('۳۱۰۱۲۲۳۹۳۵۰۰۰۰۳');
    expect(toArabicDigits('BLD 46')).toBe('BLD ٤٦');
    expect(toArabicDigits(undefined)).toBe('');
  });
});

describe('validateCustomer', () => {
  it('requires a name', () => expect(validateCustomer(form({ name: '  ' }))).toEqual({ name: 'Name is required' }));
  it('checks email format', () => expect(validateCustomer(form({ email: 'nope@' })).email).toBeTruthy());
  it('validates Saudi VAT: 15 digits starting and ending with 3', () => {
    expect(validateCustomer(form({ vat_no: '31012239350000' })).vat_no).toBe('VAT No. should be 15 digits');
    expect(validateCustomer(form({ vat_no: '210122393500003' })).vat_no).toBe('VAT No. should start and end with 3');
    expect(validateCustomer(form({ vat_no: '310122393500003' })).vat_no).toBeUndefined();
  });
  it('skips VAT format checks for non-Saudi customers', () => {
    expect(validateCustomer(form({ vat_no: 'GB123', country_code: 'GB' })).vat_no).toBeUndefined();
  });
  it('requires alphanumeric C.R.', () => expect(validateCustomer(form({ registration_number: '10-10' })).registration_number).toBeTruthy());
  it('enforces 4-digit building and 5-digit zip only for VAT customers on ZATCA phase 2', () => {
    const f = form({ vat_no: '310122393500003', national_address: { ...blankCustomerForm().national_address, building_no: '12', zipcode: '1234' } });
    expect(validateCustomer(f, { zatcaPhase2: true })).toMatchObject({ national_address_building_no: 'Building number should be 4 digits', national_address_zipcode: 'Zip code should be 5 digits' });
    expect(validateCustomer(f, { zatcaPhase2: false })).toEqual({});
    expect(validateCustomer({ ...f, vat_no: '' }, { zatcaPhase2: true })).toEqual({});
  });
  it('requires an opening balance date when an amount is entered', () => {
    expect(validateCustomer(form({ opening_balance: '500' })).opening_balance_date).toBeTruthy();
    expect(validateCustomer(form({ opening_balance: '500', opening_balance_date: '2026-01-01T09:00' }))).toEqual({});
  });
  it('rejects a non-numeric credit limit', () => expect(validateCustomer(form({ credit_limit: 'abc' })).credit_limit).toBeTruthy());
});

describe('customerFormToBody / customerToForm', () => {
  it('derives Arabic digit fields and numbers, trims text', () => {
    const b = customerFormToBody(form({
      name: '  Riyadh Auto ', phone: '0501234567', vat_no: '310122393500003', registration_number: '1010', credit_limit: '5,000.50',
      national_address: { ...blankCustomerForm().national_address, building_no: '8779', zipcode: '12241', additional_no: '1234', unit_no: '5' },
    }));
    expect(b).toMatchObject({ name: 'Riyadh Auto', phone_in_arabic: '۰۵۰۱۲۳٤۵٦۷', vat_no_in_arabic: '۳۱۰۱۲۲۳۹۳۵۰۰۰۰۳', registration_number_in_arabic: '۱۰۱۰', credit_limit: 5000.5, opening_balance: 0, opening_balance_type: '' });
    expect(b.national_address).toMatchObject({ building_no_arabic: '۸۷۷۹', zipcode_arabic: '۱۲۲٤۱', additional_no_arabic: '۱۲۳٤', unit_no_arabic: '۵' });
    expect(b).not.toHaveProperty('images');
    expect(b).not.toHaveProperty('opening_balance_date');
  });
  it('sends opening balance with RFC3339 date and direction', () => {
    const b = customerFormToBody(form({ opening_balance: '1200', opening_balance_type: 'payable', opening_balance_date: '2026-01-02T10:30' }));
    expect(b.opening_balance).toBe(1200);
    expect(b.opening_balance_type).toBe('payable');
    expect(b.opening_balance_date).toMatch(/^2026-01-02T10:30:00[+-]\d{2}:\d{2}$/);
  });
  it('round-trips an API customer', () => {
    const f = customerToForm({ id: 'c1', name: 'X', credit_limit: 100, national_address: { city_name: 'Riyadh' }, opening_balance: 50, opening_balance_type: 'payable', opening_balance_date: '2026-01-02T10:30:00Z' });
    expect(f.credit_limit).toBe('100');
    expect(f.national_address.city_name).toBe('Riyadh');
    expect(f.national_address.building_no).toBe('');
    expect(f.opening_balance_type).toBe('payable');
    expect(f.opening_balance_date).toMatch(/^2026-01-0\dT\d{2}:30$/);
  });
});

describe('customer derivations', () => {
  it('reads per-store stats', () => {
    const c = { stores: { s1: { sales_amount: 120.5, sales_count: '3' } } };
    expect(stat(c, 's1', 'sales_amount')).toBe(120.5);
    expect(stat(c, 's1', 'sales_count')).toBe(3);
    expect(stat(c, 's2', 'sales_amount')).toBe(0);
    expect(stat(null, 's1', 'x')).toBe(0);
  });
  it('builds initials', () => {
    expect(initials('AL NOOR TRADING EST.')).toBe('AN');
    expect(initials('Walk-in')).toBe('WI');
    expect(initials('Mohammed')).toBe('MO');
    expect(initials('')).toBe('?');
  });
  it('computes credit usage and over-limit', () => {
    expect(creditUsage(16652.21, 50000)).toMatchObject({ used: 16652.21, available: 33347.79, over: false });
    expect(creditUsage(16652.21, 50000).ratio).toBeCloseTo(0.333, 3);
    expect(creditUsage(600, 500).over).toBe(true);
    expect(creditUsage(-50, 0)).toMatchObject({ used: 0, limit: 0, ratio: 0, over: false });
  });
  it('buckets open invoices by age', () => {
    const now = new Date('2026-10-05T12:00:00Z');
    const d = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
    const b = agingBuckets([{ date: d(1), balance_amount: 100 }, { date: d(30), balance_amount: 50 }, { date: d(45), balance_amount: 20 }, { date: d(75), balance_amount: 5 }, { date: d(100), balance_amount: 7 }, { date: d(400), balance_amount: 9.99 }, { date: d(10), balance_amount: 0 }], now);
    expect(b.map((x) => x.value)).toEqual([150, 20, 5, 7, 9.99]);
    expect(b.map((x) => x.label)).toEqual(['0–30', '31–60', '61–90', '91–120', '120+']);
  });
  it('maps search text to code or query', () => {
    expect(customerSearchKey('C-000123')).toEqual({ code: 'C-000123' });
    expect(customerSearchKey('al noor')).toEqual({ query: 'al noor' });
    expect(customerSearchKey('0554128890')).toEqual({ query: '0554128890' });
    expect(moneySearchKey('RCV-0001')).toEqual({ code: 'RCV-0001' });
    expect(moneySearchKey('advance')).toEqual({ description: 'advance' });
  });
});

describe('account statement', () => {
  const postings = [
    { id: 'p1', date: '2026-08-21T09:15:00Z', reference_id: 'o1', reference_model: 'sales', reference_code: 'S-INV-000001', posts: [{ id: 'a', date: '2026-08-21T09:15:00Z', account_name: 'SALES', account_number: '1007', debit_or_credit: 'debit' as const, debit: 1276.5, credit: 0, balance: 1276.5 }] },
    { id: 'p2', date: '2026-08-21T11:15:00Z', reference_id: 'd1', reference_model: 'customer_deposit', reference_code: 'RCV-1', posts: [{ id: 'b', date: '2026-08-21T11:15:00Z', account_name: 'CASH', account_number: '1000', debit_or_credit: 'credit' as const, debit: 0, credit: 1276.5, balance: 0, reference_code: 'S-INV-000001' }] },
  ];
  it('flattens postings into statement lines with To/By particulars', () => {
    const rows = flattenPostings(postings);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ code: 'S-INV-000001', contra: 'To SALES A/c #1007 Dr.', debit: 1276.5, credit: 0, balance: 1276.5, model: 'sales', refId: 'o1' });
    expect(rows[1]).toMatchObject({ code: 'RCV-1 / S-INV-000001', contra: 'By CASH A/c #1000 Cr.', credit: 1276.5 });
  });
  it('summarises meta totals with DR/CR side', () => {
    expect(statementSummary({ debit_total: 1903.25, credit_total: 1612.3, debit_balance_bought_down: 0 })).toMatchObject({ debit: 1903.25, credit: 1612.3, closing: 290.95, side: 'DR' });
    expect(statementSummary({ debit_total: 10, credit_total: 25, credit_balance_bought_down: 5 })).toMatchObject({ closing: 15, side: 'CR', opening: -5 });
    expect(statementSummary(undefined)).toMatchObject({ debit: 0, credit: 0, closing: 0 });
  });
  it('links references to the right screens', () => {
    expect(referenceLink('sales', 'x')).toBe('/sales/invoices/x');
    expect(referenceLink('customer_deposit', 'x')).toBe('/sales/receivables/x');
    expect(referenceLink('customer_withdrawal', 'x')).toBe('/buying/payables/x');
    expect(referenceLink('customer_opening_balance', 'x')).toBeNull();
    expect(referenceLink('sales', undefined)).toBeNull();
  });
});

describe('receivables / payables', () => {
  const now = new Date(2026, 9, 5, 10, 0, 0);
  const filled = (): MoneyForm => {
    const f = blankMoneyForm(now);
    f.party = { id: 'c1', name: 'AL NOOR' };
    f.payments = [{ ...f.payments[0], amount: '100', discount: '5', method: 'cash' }];
    return f;
  };

  it('starts with one blank payment dated now', () => {
    const f = blankMoneyForm(now);
    expect(f.type).toBe('customer');
    expect(f.payments).toHaveLength(1);
    expect(f.payments[0].date).toBe('2026-10-05T10:00');
  });

  it('validates with the server error keys for each kind', () => {
    const f = blankMoneyForm(now);
    const e = validateMoney(f, 'receivable');
    expect(e).toMatchObject({ customer_id: 'Customer is required', customer_receivable_payment_amount_0: 'Payment amount is required', customer_receivable_payment_method_0: 'Payment method is required' });
    const v = validateMoney({ ...f, type: 'vendor' }, 'payable');
    expect(v).toMatchObject({ vendor_id: 'Vendor is required', customer_payable_payment_amount_0: 'Payment amount is required' });
    expect(payErrKey('payable', 'invoice', 2)).toBe('customer_payable_payment_invoice_2');
  });

  it('rejects discount above amount, early payment date and over-balance invoice payments', () => {
    const f = filled();
    f.payments[0] = { ...f.payments[0], amount: '10', discount: '20', date: '2026-10-04T10:00', invoice_id: 'o1', invoice_code: 'S-1', invoice_type: 'sales', invoice_balance: 5 };
    const e = validateMoney(f, 'receivable');
    expect(e.customer_receivable_payment_discount_0).toBeTruthy();
    expect(e.customer_receivable_payment_date_0).toMatch(/greater than or equal to Receivable/);
    f.payments[0] = { ...f.payments[0], discount: '0', date: '2026-10-05T10:00' };
    expect(validateMoney(f, 'receivable').customer_receivable_payment_amount_0).toMatch(/5\.00 \(Invoice Balance\)/);
    expect(validateMoney(filled(), 'receivable')).toEqual({});
  });

  it('totals payments: total, discount, net', () => {
    expect(moneyTotals([{ amount: '100', discount: '5' }, { amount: '50.25', discount: '' }])).toEqual({ total: 150.25, discount: 5, net: 145.25 });
  });

  it('builds the exact API body (only the selected party, RFC3339 dates, null invoice links)', () => {
    const f = filled();
    f.description = ' Advance ';
    const b = moneyFormToBody(f, { isNew: true });
    expect(b).toMatchObject({ type: 'customer', customer_id: 'c1', vendor_id: null, employee_id: null, description: 'Advance', enable_report_to_zatca: false });
    expect(b.date_str).toMatch(/^2026-10-05T10:00:00[+-]\d{2}:\d{2}$/);
    expect(b.payments).toEqual([expect.objectContaining({ amount: 100, discount: 5, method: 'cash', invoice_id: null, invoice_type: null, date_str: expect.stringMatching(/^2026-10-05T10:00:00/) })]);
    expect(b).not.toHaveProperty('images_content');
    const upd = moneyFormToBody({ ...f, images_content: ['abc'] }, { isNew: false });
    expect(upd).not.toHaveProperty('enable_report_to_zatca');
    expect(upd.images_content).toEqual(['abc']);
  });

  it('hydrates an API record for editing', () => {
    const f = moneyToForm({ type: 'vendor', vendor_id: 'v1', vendor_name: 'GULF PARTS', date: '2026-10-05T07:00:00Z', payments: [{ id: 'p1', date: '2026-10-05T07:00:00Z', amount: 20, discount: 0, method: 'cash', invoice_id: 'x', invoice_code: 'P-1', invoice_type: 'purchase' }], images: ['u'] });
    expect(f.type).toBe('vendor');
    expect(f.party).toEqual({ id: 'v1', name: 'GULF PARTS' });
    expect(f.payments[0]).toMatchObject({ id: 'p1', amount: '20', discount: '', invoice_type: 'purchase' });
    expect(f.images).toEqual(['u']);
  });

  it('knows which invoices each kind/party can settle', () => {
    expect(linkableInvoiceTypes('receivable', 'customer').map((x) => x.type)).toEqual(['sales']);
    expect(linkableInvoiceTypes('receivable', 'customer', { quotation_invoice_accounting: true }).map((x) => x.type)).toEqual(['sales', 'quotation_sales']);
    expect(linkableInvoiceTypes('receivable', 'vendor').map((x) => x.type)).toEqual(['purchase_return']);
    expect(linkableInvoiceTypes('payable', 'customer', { quotation_invoice_accounting: true }).map((x) => x.type)).toEqual(['sales_return', 'quotation_sales_return']);
    expect(linkableInvoiceTypes('payable', 'vendor').map((x) => x.type)).toEqual(['purchase']);
    expect(linkableInvoiceTypes('payable', 'employee')).toEqual([]);
  });

  it('offers purchase fund only on receivables', () => {
    expect(methodsFor('receivable').map((m) => m.value)).toContain('purchase_fund');
    expect(methodsFor('payable').map((m) => m.value)).not.toContain('purchase_fund');
  });

  it('blocks switching party type while invoices are linked', () => {
    const f = filled();
    expect(canSwitchType(f, 'vendor')).toBe(true);
    f.payments[0].invoice_id = 'o1';
    expect(canSwitchType(f, 'vendor')).toBe(false);
    expect(canSwitchType(f, 'customer')).toBe(true);
  });

  it('resolves party name/path and ZATCA gating', () => {
    expect(partyName({ type: 'vendor', vendor_name: 'V' })).toBe('V');
    expect(partyPath({ type: 'customer', customer_id: 'c1' })).toBe('/sales/customers/c1');
    expect(partyPath({ type: 'customer' })).toBeNull();
    const store = { zatca: { phase: '2', connected: true }, settings: { enable_zatca_reporting_for_receivables: true } };
    expect(zatcaEnabled(store, MONEY.receivable)).toBe(true);
    expect(zatcaEnabled(store, MONEY.payable)).toBe(false);
    expect(zatcaEnabled({ ...store, zatca: { phase: '1' } }, MONEY.receivable)).toBe(false);
  });
});

describe('amount in words', () => {
  it('spells integers', () => {
    expect(intToWords(0)).toBe('Zero');
    expect(intToWords(15)).toBe('Fifteen');
    expect(intToWords(1234)).toBe('One Thousand Two Hundred Thirty-Four');
    expect(intToWords(2000010)).toBe('Two Million Ten');
  });
  it('spells riyals and halalas', () => {
    expect(amountInWords(1)).toBe('One Riyal only');
    expect(amountInWords(290.95)).toBe('Two Hundred Ninety Riyals and 95 Halalas only');
  });
});

describe('customer packages', () => {
  it('toggles tab ids', () => {
    expect(toggleTab(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleTab(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('Arabic coverage', () => {
  it('has an Arabic translation for every t()/label string used in the module', () => {
    const dir = resolve(__dirname);
    const missing: string[] = [];
    for (const f of readdirSync(dir)) {
      if (!/\.tsx?$/.test(f) || /\.test\./.test(f) || f === 'ar.ts') continue;
      const src = readFileSync(resolve(dir, f), 'utf8');
      const re = /\b(?:t|tt)\(\s*'((?:[^'\\]|\\.)*)'|\b(?:label|title|subtitle|singular|newLabel|createLabel|searchPlaceholder|zatcaCheckbox|receivedLabel|emptyTitle)\s*:\s*'((?:[^'\\]|\\.)*)'/g;
      for (const m of src.matchAll(re)) {
        const k = m[1] ?? m[2];
        if (k && /[A-Za-z]/.test(k) && !(k in ar) && !/^[A-Z0-9 .–+]+$/.test(k)) missing.push(`${f}: ${k}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
