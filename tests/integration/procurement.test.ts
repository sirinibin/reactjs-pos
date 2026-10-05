import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiError } from '../../src/api/client';
import { papi, setProcurementBaseUrl } from '../../src/modules/procurement/api';
import { buildMatrix, latestQuotations, lowestSelections, normPhone } from '../../src/modules/procurement/logic';
import type { RFQ, RFQSupplier, SendPreview } from '../../src/modules/procurement/types';
import { API_URL, loadSeed, signIn, type Seed } from './helpers';

/**
 * Procurement endpoints that work without external services (LLM, WhatsApp/Meta, email, Google Maps).
 * Those services are not configured locally, so we assert their "not configured" errors instead.
 */
let seed: Seed;
let S: { store_id: string };
const tag = `IT-${Date.now().toString(36)}`;
const phoneBase = `9665${String(Date.now()).slice(-8)}`;
const createdRfqs: string[] = [];
const createdSuppliers: string[] = [];

const rejectsWith = async (p: Promise<unknown>, status: number, msg: RegExp) => {
  const e = await p.then(() => null, (x) => x);
  expect(e, 'expected the call to fail').toBeInstanceOf(ApiError);
  expect((e as ApiError).status).toBe(status);
  expect((e as ApiError).message).toMatch(msg);
};

beforeAll(async () => {
  seed = loadSeed();
  await signIn();
  setProcurementBaseUrl(API_URL);
  S = { store_id: seed.storeId };
});

afterAll(async () => {
  for (const id of createdRfqs) await papi.del(`/v1/rfq-received/${id}`, S).catch(() => undefined);
  for (const id of createdSuppliers) await papi.del(`/v1/rfq-suppliers/${id}`, S).catch(() => undefined);
});

async function createRfq(extra: Record<string, unknown> = {}) {
  const r = await papi.post<{ success: boolean; id: string; code: string }>('/v1/rfq-received', {
    customer_name: `${tag} Garage`, customer_phone: '966500000123', customer_email: `${tag.toLowerCase()}@example.com`, customer_rfq_id: 'PO-1',
    text_content: `${tag} need parts`, products: [{ name: 'Brake pad', part_no: 'BP-1', quantity: 2, unit: 'PCE', product_id: seed.products[0].id }, { name: `${tag} widget`, quantity: 5, unit: 'PCE' }],
    general_instructions: 'Deliver to Riyadh', ...extra,
  }, S);
  createdRfqs.push(r.id);
  return r;
}

describe('RFQ received — live API', () => {
  it('requires a plain store_id and answers {error} as text/plain', async () => {
    await rejectsWith(papi.get('/v1/rfq-received'), 400, /store_id required/);
  });

  it('lists with the non-standard {items,total_count} envelope', async () => {
    const r = await papi.get<{ items: RFQ[] | null; total_count: number }>('/v1/rfq-received', { ...S, page: 1, limit: 5 });
    expect(r).toHaveProperty('total_count');
    expect(Array.isArray(r.items) || r.items === null).toBe(true);
    expect(r).not.toHaveProperty('result');
  });

  it('rejects an empty RFQ', async () => {
    await rejectsWith(papi.post('/v1/rfq-received', { customer_name: 'x', products: [], text_content: '' }, S), 400, /products, text_content, or attachment files required/);
  });

  it('creates a manual RFQ (ready_to_send, RFQ-nnnnnn) with activity logs, then finds it by search and status', async () => {
    const c = await createRfq();
    expect(c.success).toBe(true);
    expect(c.code).toMatch(/^RFQ-\d+$/);
    const d = await papi.get<RFQ>(`/v1/rfq-received/${c.id}`, S);
    expect(d).toMatchObject({ id: c.id, code: c.code, source: 'manual', status: 'ready_to_send', customer_rfq_id: 'PO-1', general_instructions: 'Deliver to Riyadh' });
    expect(d.products).toHaveLength(2);
    expect((d.activity_logs || []).map((l) => l.step)).toEqual(expect.arrayContaining(['input_received', 'products_identified', 'customer_identified', 'rfq_created']));
    const found = await papi.get<{ items: RFQ[]; total_count: number }>('/v1/rfq-received', { ...S, search: tag, limit: 20 });
    expect(found.items.map((x) => x.id)).toContain(c.id);
    // list projection omits heavy fields
    expect(found.items.find((x) => x.id === c.id)).not.toHaveProperty('activity_logs');
    const byStatus = await papi.get<{ items: RFQ[] }>('/v1/rfq-received', { ...S, status: 'ready_to_send', search: tag, limit: 20 });
    expect(byStatus.items.every((x) => x.status === 'ready_to_send')).toBe(true);
    const failed = await papi.get<{ items: RFQ[] | null }>('/v1/rfq-received', { ...S, status: 'forwarded', search: tag });
    expect((failed.items || []).map((x) => x.id)).not.toContain(c.id);
  });

  it('PUT replaces customer fields — omitted ones are cleared, so the UI always sends them all', async () => {
    const c = await createRfq();
    const upd = await papi.put<RFQ>(`/v1/rfq-received/${c.id}`, { customer_id: '', customer_name: `${tag} Renamed`, products: [{ name: 'Brake pad', quantity: 3 }] }, S);
    expect(upd.customer_name).toBe(`${tag} Renamed`);
    expect(upd.customer_phone || '').toBe('');
    expect(upd.products).toEqual([expect.objectContaining({ name: 'Brake pad', quantity: 3 })]);
    const full = await papi.put<RFQ>(`/v1/rfq-received/${c.id}`, { customer_id: '', customer_name: `${tag} Renamed`, customer_phone: '966500000123', customer_email: 'a@b.co', customer_company: 'Co', customer_city: 'Riyadh', customer_rfq_id: 'PO-2', text_content: 't', products: [{ name: 'Brake pad', quantity: 3 }], general_instructions: 'g' }, S);
    expect(full).toMatchObject({ customer_phone: '966500000123', customer_email: 'a@b.co', customer_company: 'Co', customer_city: 'Riyadh', customer_rfq_id: 'PO-2' });
  });

  it('supplier replies: manual prices become a quotation and the client comparison picks the lowest', async () => {
    const c = await createRfq();
    await papi.post(`/v1/rfq-received/${c.id}/supplier-replies`, { supplier_name: 'Alpha', supplier_phone: '966511100001', raw_text: '', prices: [{ product_index: 0, unit_price: 100, currency: 'SAR' }, { product_index: 1, unit_price: 9 }], run_llm_extraction: false }, S);
    await papi.post(`/v1/rfq-received/${c.id}/supplier-replies`, { supplier_name: 'Beta', supplier_phone: '+966511100002', raw_text: '', prices: [{ product_index: 0, unit_price: 95 }], run_llm_extraction: false }, S);
    const r = await papi.get<{ supplier_replies: RFQ['supplier_replies']; products: RFQ['products'] }>(`/v1/rfq-received/${c.id}/supplier-replies`, S);
    expect(r.supplier_replies).toHaveLength(2);
    expect(r.supplier_replies!.every((x) => x.is_quotation && x.extraction_status === 'done')).toBe(true);
    const m = buildMatrix(r.products, latestQuotations(r.supplier_replies));
    expect(lowestSelections(m)).toEqual([normPhone('966511100002'), '966511100001']);
    // detail includes replies
    const d = await papi.get<RFQ>(`/v1/rfq-received/${c.id}`, S);
    expect(d.supplier_replies).toHaveLength(2);
    // update-product-prices skips products without product_id
    const u = await papi.patch<{ status: boolean; updated: number; skipped: number }>(`/v1/rfq-received/${c.id}/update-product-prices`, { items: [{ product_index: 1, purchase_unit_price: 9, retail_unit_price: 12, vat_included: false }, { product_index: 99, purchase_unit_price: 1, retail_unit_price: 1, vat_included: false }] }, S);
    expect(u).toMatchObject({ status: true, updated: 0, skipped: 2 });
    // delete a reply
    await papi.del(`/v1/rfq-received/${c.id}/supplier-replies/${r.supplier_replies![0].id}`, S);
    const after = await papi.get<{ supplier_replies: unknown[] }>(`/v1/rfq-received/${c.id}/supplier-replies`, S);
    expect(after.supplier_replies).toHaveLength(1);
  });

  it('supplier-reply (LLM) requires a name or phone', async () => {
    const c = await createRfq();
    await expect(papi.post(`/v1/rfq-received/${c.id}/supplier-reply`, { supplier_name: '', supplier_phone: '', raw_text: 'x' }, S)).rejects.toBeInstanceOf(ApiError);
  });

  it('send-preview works without WhatsApp and reports the configuration warning; send fails with guidance', async () => {
    const c = await createRfq();
    const p = await papi.get<SendPreview>(`/v1/rfq-received/${c.id}/send-preview`, S);
    expect(p).toMatchObject({ rfq_id: c.id, rfq_code: c.code });
    expect(p.pre_filled_vars).toHaveProperty('body_rfq_code', c.code);
    expect(p.config_warning || '').toMatch(/not connected|template|WABA/i);
    await rejectsWith(papi.post(`/v1/rfq-received/${c.id}/send`, { prepared_by: 'IT', authorized_by: '', recipients: [{ name: 'x', phone: '966511100009' }], generate_pdf: false }, S), 400, /WhatsApp|template|supplier/i);
  });

  it('AI extraction without a configured key returns the "No API key" guidance', async () => {
    const fd = new FormData();
    fd.append('text_content', 'Need 4 brake pads');
    fd.append('llm_provider', 'openai');
    fd.append('llm_model', 'gpt-4o-mini');
    await rejectsWith(papi.post('/v1/rfq-received/extract', fd, S), 400, /API key|no readable/i);
    await rejectsWith(papi.post('/v1/rfq-received/extract', new FormData(), S), 400, /no files uploaded and no text_content/);
  });

  it('process re-queues the pipeline and returns immediately', async () => {
    const c = await createRfq();
    expect(await papi.post(`/v1/rfq-received/${c.id}/process`, {}, S)).toMatchObject({ success: true });
  });

  it('customer_email lookups use the `result` key (inconsistent envelope)', async () => {
    const r = await papi.get<{ result: RFQ[] | null; total_count: number }>('/v1/rfq-received', { ...S, customer_email: 'nobody-ever@example.invalid' });
    expect(r).toHaveProperty('result');
    expect(r).not.toHaveProperty('items');
    const sp = await papi.get<{ items: RFQ[] | null }>('/v1/rfq-received', { ...S, supplier_phone: '+966511100001' });
    expect(sp).toHaveProperty('items');
  });

  it('deletes an RFQ and then 404s with {error:"not found"}', async () => {
    const c = await createRfq();
    expect(await papi.del(`/v1/rfq-received/${c.id}`, S)).toMatchObject({ result: 'ok' });
    await rejectsWith(papi.get(`/v1/rfq-received/${c.id}`, S), 404, /not found/);
  });

  it('print-data for an unknown key is 404 (headless print contract)', async () => {
    await rejectsWith(papi.get('/v1/rfq/print-data/does-not-exist'), 404, /not found or expired/);
  });
});

describe('RFQ suppliers — live API', () => {
  it('create → duplicate 409 → missing phone 400 → list (result envelope) → partial PUT → delete', async () => {
    const phone = `${phoneBase}1`;
    const s = await papi.post<RFQSupplier>('/v1/rfq-suppliers', { name: `${tag} Supplier`, phone, categories: ['Brakes'], rating: 4.5, is_active: true, purchase_market: 'Riyadh', store_id: seed.storeId }, S);
    createdSuppliers.push(s.id!);
    expect(s).toMatchObject({ name: `${tag} Supplier`, phone, rating: 4.5, is_active: true, purchase_market: 'Riyadh' });
    await rejectsWith(papi.post('/v1/rfq-suppliers', { name: 'Dup', phone, store_id: seed.storeId }, S), 409, /already exists/);
    await rejectsWith(papi.post('/v1/rfq-suppliers', { name: 'NoPhone', store_id: seed.storeId }, S), 400, /phone/);
    const list = await papi.get<{ status: boolean; result: RFQSupplier[]; total_count: number }>('/v1/rfq-suppliers', { ...S, search: tag, limit: 10 });
    expect(list.status).toBe(true);
    expect(list.result.map((x) => x.id)).toContain(s.id);
    expect(list).not.toHaveProperty('items');
    const upd = await papi.put<RFQSupplier>(`/v1/rfq-suppliers/${s.id}`, { rating: 3 }, S);
    expect(upd).toMatchObject({ rating: 3, name: `${tag} Supplier`, categories: ['Brakes'], purchase_market: 'Riyadh' });
    expect(await papi.del(`/v1/rfq-suppliers/${s.id}`, S)).toMatchObject({ success: true });
    const gone = await papi.get<{ result: RFQSupplier[] | null }>('/v1/rfq-suppliers', { ...S, search: tag });
    expect((gone.result || []).map((x) => x.id)).not.toContain(s.id);
  });

  it('list without store_id is a standard validation error', async () => {
    await rejectsWith(papi.get('/v1/rfq-suppliers'), 400, /store/i);
  });

  it('Google Maps tools report the missing key; email backfill queues', async () => {
    const s = await papi.post<RFQSupplier>('/v1/rfq-suppliers', { name: `${tag} Maps`, phone: `${phoneBase}2`, store_id: seed.storeId }, S);
    createdSuppliers.push(s.id!);
    await rejectsWith(papi.post(`/v1/rfq-suppliers/${s.id}/refetch-maps`, {}, S), 400, /Google Maps API key/);
    await rejectsWith(papi.post('/v1/rfq-suppliers/backfill-markets', {}, S), 400, /Google Maps API key/);
    expect(await papi.post('/v1/rfq-suppliers/backfill-emails', {}, S)).toHaveProperty('queued');
  });
});

describe('Procurement inbox, counters and settings reads — live API', () => {
  it('message lists, threads and disk usage have their documented shapes', async () => {
    const em = await papi.get<{ messages: unknown[] | null; total: number; page: number; limit: number; total_pages: number }>('/v1/procurement-messages', { ...S, type: 'email', direction: 'in', page: 1, limit: 20 });
    expect(em).toMatchObject({ page: 1, limit: 20 });
    expect(typeof em.total).toBe('number');
    const capped = await papi.get<{ limit: number }>('/v1/procurement-messages', { ...S, type: 'whatsapp', limit: 500 });
    expect(capped.limit).toBeLessThanOrEqual(200);
    const th = await papi.get<{ threads: unknown[] | null; total: number; limit: number }>('/v1/procurement-message-threads', { ...S, type: 'whatsapp', limit: 1000 });
    expect(th.limit).toBe(50); // >100 falls back to 50
    expect(Array.isArray(th.threads)).toBe(true);
    const du = await papi.get<{ formatted: string; total_bytes: number }>('/v1/procurement-messages/disk-usage', S);
    expect(du.formatted).toMatch(/B$/);
  });

  it('unread counters', async () => {
    const wa = await papi.get<{ items: unknown[]; total_unread: number }>('/v1/rfq-whatsapp-unread', S);
    expect(Array.isArray(wa.items)).toBe(true);
    expect(typeof wa.total_unread).toBe('number');
    const em = await papi.get<{ items: unknown[]; total_unread: number }>('/v1/email-unread', S);
    expect(typeof em.total_unread).toBe('number');
  });

  it('settings reads: bot status, email accounts, templates error, rfq history', async () => {
    expect(await papi.get<{ connected: boolean }>('/v1/rfq-bot/status', S)).toHaveProperty('connected');
    expect(await papi.get<{ accounts: unknown[] }>('/v1/rfq-email/accounts', S)).toHaveProperty('accounts');
    const tpl = await papi.get('/v1/rfq-bot/waba-templates', S).then((r) => ({ ok: true, r }), (e) => ({ ok: false, e }));
    if (!tpl.ok) expect((tpl as any).e.message).toMatch(/Access Token|WABA|connect/i);
    const h = await papi.get<{ customer_rfqs: unknown[] | null; supplier_rfqs: unknown[] | null }>('/v1/procurement-rfq-history', { ...S, email: 'Someone <nobody@example.invalid>' });
    expect(h).toHaveProperty('customer_rfqs');
    expect(h).toHaveProperty('supplier_rfqs');
  });

  it('external-service actions fail with actionable messages', async () => {
    await rejectsWith(papi.post('/v1/rfq-bot/connect', { store_id: seed.storeId }), 400, /required/);
    await expect(papi.post('/v1/procurement-email-send', { store_id: seed.storeId, to: 'x@example.invalid', subject: 's', body: 'b' })).rejects.toBeInstanceOf(ApiError);
    await expect(papi.post('/v1/outgoing-email/test', { to: 'x@example.invalid' }, S)).rejects.toThrow(/outgoing email/i);
  });
});
