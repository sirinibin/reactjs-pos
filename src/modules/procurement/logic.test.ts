import { describe, expect, it } from 'vitest';
import {
  buildMatrix, buildPriceUpdates, buildQuotationPrefill, buildRecipients, buildTemplateComponents, clampMargin, dayLabel, dedupeReplies, defaultSelected, emailName,
  extractEmail, fillTemplate, fixEmailHtml, headerFormat, last9, latestQuotations, lowestSelections, matchPricesToProducts, mergeHistory, mergeParseResults, normPhone,
  placeholders, pricesForProducts, repliesLabel, retailPrice, rfqPhones, rfqUnread, samePhone, statusMeta, stepMeta, stripHtml, templateWantsDocument, titleCase, validateRfqForm,
} from './logic';
import type { RFQ, SupplierReply } from './types';
import { changedSettings } from './settings';
import { validateSupplier, supplierBody } from './components/SupplierForm';
import { applyExtraction, formFromRfq, rfqBody } from './rfq/editor';
import { paperDate } from './rfq/print';
import { AI_PROVIDERS, fileCapabilityLabel, firstConfiguredProvider, modelsForProvider, providerHasKey } from './providers';

describe('phones & emails', () => {
  it('normalises phones and compares ignoring + and formatting', () => {
    expect(normPhone('+966 50-123 4567')).toBe('966501234567');
    expect(samePhone('+966501234567', '966501234567')).toBe(true);
    expect(samePhone('', '')).toBe(false);
    expect(last9('+966501234567')).toBe('501234567');
  });
  it('extracts bare lowercase email from display and entity-encoded forms', () => {
    expect(extractEmail('Ali Traders <Sales@Ali.SA>')).toBe('sales@ali.sa');
    expect(extractEmail('Ali &lt;sales@ali.sa&gt;')).toBe('sales@ali.sa');
    expect(extractEmail('x@y.com')).toBe('x@y.com');
    expect(emailName('"Ali Traders" <sales@ali.sa>')).toBe('Ali Traders');
    expect(emailName('sales@ali.sa')).toBe('sales@ali.sa');
  });
});

describe('status metadata', () => {
  it('maps statuses and steps, tolerating unknown values', () => {
    expect(statusMeta('forwarded').tone).toBe('good');
    expect(statusMeta('failed').tone).toBe('crit');
    expect(statusMeta('weird').label).toBe('weird');
    expect(stepMeta('template_sent', { status: 'failed' }).tone).toBe('crit');
    expect(stepMeta('template_sent').tone).toBe('good');
    expect(stepMeta('mystery').label).toBe('mystery');
  });
  it('labels replies as quotes when any reply is a quotation', () => {
    expect(repliesLabel([{ id: '1', is_quotation: false }, { id: '2', is_quotation: true }])).toEqual({ n: 2, quotes: true });
    expect(repliesLabel(undefined)).toEqual({ n: 0, quotes: false });
  });
});

const PRODUCTS = [{ name: 'Brake pad', part_no: 'BP-1', quantity: 2, product_id: 'p1' }, { name: 'Oil filter OF-200', quantity: 1 }, { name: 'Wiper', quantity: 4, product_id: 'p3' }];
const REPLIES: SupplierReply[] = [
  { id: 'a1', supplier_name: 'Alpha', supplier_phone: '+966511111111', received_at: '2026-10-01T10:00:00Z', is_quotation: true, prices: [{ product_index: 0, unit_price: 60 }, { product_index: 2, unit_price: 9 }] },
  { id: 'a2', supplier_name: 'Alpha', supplier_phone: '966511111111', received_at: '2026-10-02T10:00:00Z', is_quotation: true, prices: [{ product_index: 0, unit_price: 55, vat_included: true }] },
  { id: 'b1', supplier_name: 'Beta', supplier_phone: '966522222222', received_at: '2026-10-01T12:00:00Z', is_quotation: true, prices: [{ product_index: 0, unit_price: 58, currency: 'USD' }, { product_index: 1, unit_price: 20 }, { product_index: -1, unit_price: 5 }, { product_index: 9, unit_price: 5 }] },
  { id: 'c1', supplier_name: 'Gamma', supplier_phone: '966533333333', received_at: '2026-10-03T12:00:00Z', is_quotation: false, raw_text: 'Will send tomorrow' },
];

describe('price comparison', () => {
  it('keeps the latest quotation per supplier and ignores non-quotations', () => {
    const q = latestQuotations(REPLIES);
    expect(q.map((r) => r.id).sort()).toEqual(['a2', 'b1']);
  });
  it('dedupes reply cards by phone keeping the newest first', () => {
    expect(dedupeReplies(REPLIES).map((r) => r.id)).toEqual(['c1', 'a2', 'b1']);
  });
  it('builds the matrix skipping unmatched (-1) and out-of-range indexes', () => {
    const m = buildMatrix(PRODUCTS, latestQuotations(REPLIES));
    expect(m[0]['966511111111']).toMatchObject({ unit_price: 55, vat_included: true, currency: 'SAR' });
    expect(m[0]['966522222222']).toMatchObject({ unit_price: 58, currency: 'USD' });
    expect(m[1]).toEqual({ '966522222222': expect.objectContaining({ unit_price: 20 }) });
    expect(m[2]).toEqual({});
  });
  it('selects the lowest price per product by default', () => {
    const m = buildMatrix(PRODUCTS, latestQuotations(REPLIES));
    expect(lowestSelections(m)).toEqual(['966511111111', '966522222222', null]);
  });
  it('computes retail = cost × (1 + margin) and clamps margins', () => {
    expect(retailPrice(100, 35)).toBe(135);
    expect(retailPrice(10, 33.3333)).toBeCloseTo(13.33333, 5);
    expect(clampMargin(-5)).toBe(0);
    expect(clampMargin(5000)).toBe(1000);
    expect(clampMargin(NaN)).toBe(0);
  });
  it('builds price updates only for catalog-linked products with a selection', () => {
    const m = buildMatrix(PRODUCTS, latestQuotations(REPLIES));
    expect(buildPriceUpdates(PRODUCTS, m, lowestSelections(m), [35, 35, 35])).toEqual([{ product_index: 0, purchase_unit_price: 55, retail_unit_price: 74.25, vat_included: true }]);
  });
  it('builds the quotation prefill with supplier, cost, margin and retail per item', () => {
    const rfq = { id: 'r1', code: 'RFQ-000001', customer_id: 'c1', customer_name: 'Noor', customer_phone: '9665', products: PRODUCTS } as RFQ;
    const quotes = latestQuotations(REPLIES);
    const m = buildMatrix(PRODUCTS, quotes);
    const pre = buildQuotationPrefill(rfq, m, lowestSelections(m), [10, 20, 30], quotes);
    expect(pre).toMatchObject({ rfq_id: 'r1', rfq_received_code: 'RFQ-000001', customer_id: 'c1' });
    expect(pre.items[0]).toMatchObject({ product_id: 'p1', cost_price: 55, unit_price: 60.5, margin_percent: 10, supplier_name: 'Alpha' });
    expect(pre.items[1]).toMatchObject({ cost_price: 20, unit_price: 24, supplier_name: 'Beta' });
    expect(pre.items[2]).toMatchObject({ cost_price: 0, quantity: 4 });
  });
});

describe('matching extracted prices to RFQ products', () => {
  it('matches by exact part number, part in name, and digit tokens', () => {
    const r = matchPricesToProducts(PRODUCTS, [
      { product_index: -1, product_name: 'Filter for oil 200 OF-200', unit_price: 7 },
      { product_index: -1, part_no: 'bp 1', unit_price: 50 },
    ]);
    expect(r[0]?.unit_price).toBe(50);
    expect(r[1]?.unit_price).toBe(7);
    expect(r[2]).toBeNull();
  });
  it('falls back to product_index, then position when counts match, then a single price', () => {
    expect(matchPricesToProducts(PRODUCTS, [{ product_index: 2, product_name: 'x', unit_price: 3 }])[2]?.unit_price).toBe(3);
    const pos = matchPricesToProducts(PRODUCTS, [{ product_index: -1, unit_price: 1 }, { product_index: -1, unit_price: 2 }, { product_index: -1, unit_price: 3 }]);
    expect(pos.map((p) => p?.unit_price)).toEqual([1, 2, 3]);
    expect(matchPricesToProducts(PRODUCTS, [{ product_index: -1, unit_price: 9 }]).map((p) => p?.unit_price ?? null)).toEqual([9, null, null]);
  });
  it('re-indexes prices for POST and drops zero prices', () => {
    const out = pricesForProducts(PRODUCTS, [{ product_index: -1, unit_price: 50 }, null, { product_index: 7, unit_price: 0 }]);
    expect(out).toEqual([{ product_index: 0, unit_price: 50, product_name: 'Brake pad', part_no: 'BP-1', currency: 'SAR' }]);
  });
  it('merges parallel parse-file results', () => {
    const m = mergeParseResults([
      { prices: [{ product_index: 0, unit_price: 1 }, { product_index: -1, unit_price: 2 }], general_notes: 'Valid 7 days' },
      { prices: [{ product_index: 0, unit_price: 9 }, { product_index: 1, unit_price: 3 }], supplier_name: 'Beta', supplier_phone: '9665', general_notes: 'Delivery 2d' },
    ]);
    expect(m.prices.map((p) => p.unit_price)).toEqual([1, 2, 3]);
    expect(m).toMatchObject({ supplier_name: 'Beta', supplier_phone: '9665', general_notes: 'Valid 7 days; Delivery 2d' });
  });
});

describe('send to suppliers', () => {
  const preview = { suppliers: [{ name: 'Alpha', phone: '+966511111111', purchase_market: 'Riyadh' }, { name: 'Beta', phone: '966522222222', purchase_market: 'Jeddah' }, { name: 'Self', phone: '00966500000001' }] };
  const forwarded = [{ phone: '966511111111', status: 'sent' }, { phone: '966544444444', supplier_name: 'Delta', status: 'failed' }];
  it('merges preview, forwarded and extras, dedupes, and excludes the customer by last 9 digits', () => {
    const r = buildRecipients(preview, forwarded, [{ name: 'Extra', phone: '966555555555' }, { name: 'Dup', phone: '966522222222' }], '+966 500000001');
    expect(r.map((x) => x.phone)).toEqual(['966511111111', '966522222222', '966544444444', '966555555555']);
    expect(r.find((x) => x.phone === '966511111111')!.sent).toBe(true);
    expect(r.find((x) => x.phone === '966555555555')!.extra).toBe(true);
  });
  it('pre-selects unsent suppliers in forward markets (or without a market) plus extras', () => {
    const r = buildRecipients(preview, forwarded, [{ name: 'Extra', phone: '966555555555', market: 'Dammam' }], '');
    expect(Array.from(defaultSelected(r, ['riyadh'])).sort()).toEqual(['00966500000001', '966544444444', '966555555555']);
    expect(defaultSelected(r, []).has('966522222222')).toBe(true);
  });
  it('detects document headers and builds Meta template components', () => {
    const comps = [{ type: 'HEADER', format: 'DOCUMENT' }, { type: 'BODY', text: 'Hi {{1}}, RFQ {{2}} from {{store_name}} {{1}}' }];
    expect(headerFormat(comps)).toBe('DOCUMENT');
    expect(templateWantsDocument(comps)).toBe(true);
    expect(templateWantsDocument([{ type: 'HEADER', format: 'IMAGE' }])).toBe(false);
    expect(placeholders(comps[1].text)).toEqual(['1', '2', 'store_name']);
    expect(buildTemplateComponents(comps, { body_1: 'Ali', body_store_name: 'GUO' }, { id: 'm1', type: 'document', filename: 'RFQ-1.pdf' })).toEqual([
      { type: 'header', parameters: [{ type: 'document', document: { id: 'm1', filename: 'RFQ-1.pdf' } }] },
      { type: 'body', parameters: [{ type: 'text', text: 'Ali' }, { type: 'text', text: '-' }, { type: 'text', parameter_name: 'store_name', text: 'GUO' }] },
    ]);
    expect(buildTemplateComponents([{ type: 'BODY', text: 'no params' }], {})).toEqual([]);
    expect(fillTemplate('Dear {{1}} / {{x}}', { body_1: 'Ali' })).toBe('Dear Ali / -');
  });
  it('title-cases markets', () => expect(titleCase('  jeddah  north ')).toBe('Jeddah  North'));
});

describe('messages', () => {
  it('sanitises email html: drops scripts/handlers, proxies external images, absolutises Zoho paths', () => {
    const h = fixEmailHtml('<p onclick="x()">Hi</p><script>alert(1)</script><img src="https://cdn.x.com/a.png"><img src="/mail/img.png"><img src="data:image/png;base64,AA">');
    expect(h).not.toMatch(/script|onclick/);
    expect(h).toContain('src="/v1/proxy-image?url=https%3A%2F%2Fcdn.x.com%2Fa.png"');
    expect(h).toContain('/v1/proxy-image?url=https%3A%2F%2Fmail.zoho.com%2Fmail%2Fimg.png');
    expect(h).toContain('data:image/png;base64,AA');
  });
  it('strips html to readable text', () => expect(stripHtml('<style>p{}</style><p>Hello&amp;bye</p><br>x')).toBe('Hello&bye\n\nx'));
  it('labels days', () => {
    const now = new Date('2026-10-05T12:00:00');
    expect(dayLabel('2026-10-05T01:00:00', now)).toBe('Today');
    expect(dayLabel('2026-10-04T23:00:00', now)).toBe('Yesterday');
    expect(dayLabel('2026-09-01T10:00:00', now)).toMatch(/2026/);
    expect(dayLabel(undefined, now)).toBe('—');
  });
  it('sums unread WhatsApp counts across an RFQ’s supplier and customer phones', () => {
    const rfq = { id: 'r', code: 'R', customer_phone: '+966500000001', forwarded_to: [{ phone: '966511111111' }] } as RFQ;
    const threads = [{ contact_phone: '966511111111', unread_count: 2 }, { contact_phone: '966500000001', unread_count: 1 }, { contact_phone: '966599999999', unread_count: 7 }];
    expect(rfqUnread(rfq, threads)).toBe(3);
    expect(rfqPhones([rfq, rfq])).toEqual(['966511111111', '966500000001']);
  });
  it('merges notification history: fresh items replace, missing ones are zeroed, new ones go first', () => {
    const out = mergeHistory([{ k: 'a', n: 3 }, { k: 'b', n: 1 }], [{ k: 'b', n: 5 }, { k: 'c', n: 1 }], (x) => x.k, 100, (x) => ({ ...x, n: 0 }));
    expect(out).toEqual([{ k: 'c', n: 1 }, { k: 'a', n: 0 }, { k: 'b', n: 5 }]);
    expect(mergeHistory([], Array.from({ length: 5 }, (_, i) => ({ k: String(i) })), (x) => x.k, 3)).toHaveLength(3);
  });
});

describe('RFQ form', () => {
  it('requires a named product, a product file or text', () => {
    expect(validateRfqForm({ products: [{ name: ' ' }], text_content: '', productFiles: 0 })).toMatch(/Add products/);
    expect(validateRfqForm({ products: [{ name: 'x' }], text_content: '', productFiles: 0 })).toBeNull();
    expect(validateRfqForm({ products: [], text_content: 'need pads', productFiles: 0 })).toBeNull();
    expect(validateRfqForm({ products: [], text_content: '', productFiles: 1 })).toBeNull();
  });
  it('applies extraction: company/name, contact, products, categories, model', () => {
    const f = applyExtraction(formFromRfq({ id: '', code: '', products: [] } as RFQ), { customer_company: 'ACME', customer_name: 'Ali', customer_phone: '9665', products: [{ name: 'Pad', quantity: '3' as any }, { name: '' }], product_categories: ['Brakes'], llm_model: 'm1' });
    expect(f).toMatchObject({ customer_name: 'ACME', customer_phone: '9665', categories: ['Brakes'], extraction_model: 'm1' });
    expect(f.products).toEqual([{ name: 'Pad', part_no: '', quantity: 3, unit: 'PCE', notes: '' }]);
  });
  it('builds create and update bodies (update always sends all customer fields; files replace products)', () => {
    const f = { ...formFromRfq({ id: 'r', code: 'R', customer_id: 'c1', customer_name: 'Noor', products: [{ name: 'Pad ', quantity: 2 }, { name: '' }] } as RFQ), categories: ['A'], extraction_model: 'm' };
    const create = rfqBody(f, { editing: false, msgId: 'm1', msgCode: 'EM-000001' });
    expect(create).toMatchObject({ customer_id: 'c1', customer_name: 'Noor', products: [{ name: 'Pad', quantity: 2 }], product_categories: ['A'], extraction_model: 'm', procurement_message_id: 'm1', procurement_message_code: 'EM-000001' });
    const upd = rfqBody({ ...f, customer: null, customer_name: '' }, { editing: true, additionalUris: ['/cdn/a.png'], additionalNames: ['a.png'] });
    expect(upd).toMatchObject({ customer_id: '', customer_name: 'UNKNOWN', customer_phone: '', customer_email: '', additional_attachment_data_uris: ['/cdn/a.png'] });
    expect(upd).not.toHaveProperty('product_categories');
    expect(rfqBody(f, { editing: false, productFileUris: ['data:x'] })).toMatchObject({ products: [], attachment_data_uris: ['data:x'] });
  });
});

describe('suppliers, settings, providers, print', () => {
  const v = { name: 'A', phone: '+966 50 123 4567', phone2: '', address: '', website: '', email: '', purchase_market: '', rating: '4.5', is_active: true, categories: ['x'] };
  it('validates suppliers', () => {
    expect(validateSupplier(v, false)).toEqual({});
    expect(validateSupplier(v, true)).toHaveProperty('purchase_market');
    expect(validateSupplier({ ...v, name: '', phone: '12', rating: '9', email: 'bad' }, false)).toEqual(expect.objectContaining({ name: expect.any(String), phone: expect.any(String), rating: expect.any(String), email: expect.any(String) }));
    expect(supplierBody(v, 'S')).toMatchObject({ phone: '966501234567', rating: 4.5, store_id: 'S' });
  });
  it('sends only changed settings', () => {
    expect(changedSettings({ a: 1, b: ['x'], c: false }, { a: 1, b: ['x', 'y'], c: false, d: '' })).toEqual({ b: ['x', 'y'] });
    expect(changedSettings({ a: 'x' }, { a: 'y' })).toEqual({ a: 'y' });
  });
  it('provider helpers', () => {
    expect(AI_PROVIDERS.length).toBeGreaterThan(10);
    const m = modelsForProvider('openai');
    expect(m[0].costPer1M).toBeLessThanOrEqual(m[m.length - 1].costPer1M);
    expect(providerHasKey('openai', { extraction_openai_api_key: 'sk' })).toBe(true);
    expect(firstConfiguredProvider({ extraction_gemini_api_key: 'k' }).value).toBe('gemini');
    expect(firstConfiguredProvider({}).value).toBe(AI_PROVIDERS[0].value);
    expect(fileCapabilityLabel({ value: 'x', label: 'x', costPer1M: 0, costLabel: '', pdf: true })).toMatch(/Scanned PDF/);
    expect(fileCapabilityLabel({ value: 'x', label: 'x', costPer1M: 0, costLabel: '' })).toMatch(/Excel/);
  });
  it('formats paper dates like the legacy document', () => {
    expect(paperDate('2026-10-05T14:07:00')).toBe('05 Oct 2026 2:07 PM');
    expect(paperDate('')).toBe('');
  });
});
