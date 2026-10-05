// Pure procurement logic (no React) — unit tested in logic.test.ts.
import type { IconName } from '@/ui/Icon';
import type { Tone } from '@/ui/Pill';
import { fmtDate } from '../../lib/format';
import type { ContactThread, RFQ, RFQForwardRecord, RFQProduct, SendPreview, SendPreviewSupplier, SupplierReply, SupplierReplyPrice, TemplateComponent } from './types';

/* ── Phones & emails ─────────────────────────────────────────────────────── */

/** Digits only, no leading "+" — every phone comparison goes through this (§10.7). */
export const normPhone = (p: string | null | undefined) => String(p || '').replace(/\D/g, '');
export const samePhone = (a?: string | null, b?: string | null) => !!normPhone(a) && normPhone(a) === normPhone(b);
/** Customer numbers are excluded from supplier recipients by last-9-digit match. */
export const last9 = (p?: string | null) => normPhone(p).slice(-9);

const ENTITY: Record<string, string> = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'" };
export const decodeEntities = (s: string) => s.replace(/&(lt|gt|amp|quot|#39);/g, (m) => ENTITY[m] || m);

/** Bare lowercase email from "Name <a@b>", "&lt;a@b&gt;" or "a@b" (email thread key, §10.9). */
export function extractEmail(s: string | null | undefined): string {
  const d = decodeEntities(String(s || '')).trim();
  const m = /<([^<>\s]+@[^<>\s]+)>/.exec(d) || /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/.exec(d);
  return (m ? m[1] : d).toLowerCase();
}
/** Display name part of "Name <a@b>" (falls back to the address). */
export function emailName(s: string | null | undefined): string {
  const d = decodeEntities(String(s || '')).trim();
  const m = /^\s*"?([^"<]+?)"?\s*<[^>]+>/.exec(d);
  return m ? m[1].trim() : extractEmail(d);
}
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

/* ── RFQ status / timeline metadata ──────────────────────────────────────── */

export const RFQ_STATUSES = ['received', 'processing', 'ready_to_send', 'forwarded', 'failed', 'ignored'] as const;
export const STATUS_META: Record<string, { label: string; tone: Tone; icon: IconName }> = {
  received: { label: 'Received', tone: 'neutral', icon: 'inbox' },
  processing: { label: 'Processing', tone: 'warn', icon: 'clock' },
  ready_to_send: { label: 'Ready to send', tone: 'info', icon: 'send' },
  forwarded: { label: 'Forwarded', tone: 'good', icon: 'checkc' },
  failed: { label: 'Failed', tone: 'crit', icon: 'alert' },
  ignored: { label: 'Ignored', tone: 'neutral', icon: 'xc' },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: 'xc' },
};
export const statusMeta = (s?: string) => STATUS_META[s || ''] || { label: s || '—', tone: 'neutral' as Tone, icon: 'info' as IconName };

export const STEP_META: Record<string, { label: string; tone: Tone; icon: IconName }> = {
  input_received: { label: 'Input received', tone: 'good', icon: 'inbox' },
  rfq_created: { label: 'RFQ created', tone: 'info', icon: 'file' },
  products_identified: { label: 'Products identified', tone: 'info', icon: 'box' },
  customer_identified: { label: 'Customer identified', tone: 'info', icon: 'user' },
  ai_categorizing: { label: 'AI categorizing', tone: 'neutral', icon: 'layers' },
  categories_identified: { label: 'Categories identified', tone: 'info', icon: 'tag' },
  categories_error: { label: 'Category error', tone: 'crit', icon: 'alert' },
  ai_skipped: { label: 'AI skipped', tone: 'neutral', icon: 'info' },
  suppliers_found: { label: 'Ready to send to suppliers', tone: 'good', icon: 'users' },
  no_suppliers_found: { label: 'No suppliers found', tone: 'warn', icon: 'alert' },
  suppliers_below_minimum: { label: 'Suppliers below minimum', tone: 'warn', icon: 'alert' },
  suppliers_matched: { label: 'Suppliers matched', tone: 'warn', icon: 'store' },
  waiting_approval: { label: 'Waiting approval', tone: 'warn', icon: 'clock' },
  rfq_sent_to_supplier: { label: 'Sent to supplier', tone: 'good', icon: 'send' },
  rfq_send_failed: { label: 'Send failed', tone: 'crit', icon: 'alert' },
  template_sent: { label: 'Sent via WhatsApp', tone: 'good', icon: 'wa' },
  waiting_replies: { label: 'Waiting replies', tone: 'neutral', icon: 'clock' },
  supplier_replied: { label: 'Supplier replied', tone: 'info', icon: 'mail' },
  prices_extracted: { label: 'Prices extracted', tone: 'info', icon: 'layers' },
  prices_updated: { label: 'Prices updated', tone: 'good', icon: 'cash' },
};
export const stepMeta = (step: string, details?: Record<string, any>) => {
  const m = STEP_META[step] || { label: step, tone: 'neutral' as Tone, icon: 'info' as IconName };
  return step === 'template_sent' && details?.status === 'failed' ? { ...m, tone: 'crit' as Tone } : m;
};

export const STAGE_LABELS: Record<string, string> = {
  classifying: 'AI is analysing the RFQ…',
  categories_identified: 'Categories identified — searching suppliers…',
  finding_suppliers: 'Searching for matching suppliers…',
  suppliers_found: 'Ready to send to suppliers!',
  ai_skipped: 'AI categorisation skipped (no LLM key configured).',
  failed: 'Processing failed.',
  done: 'Processing complete.',
  ignored: 'RFQ ignored.',
};
export const TERMINAL_STAGES = new Set(['done', 'ignored', 'suppliers_found', 'ai_skipped', 'failed']);

/** "2 quotes" when any reply is a quotation, else "N replies" (list column). */
export function repliesLabel(replies: SupplierReply[] | undefined): { n: number; quotes: boolean } {
  const r = replies || [];
  return { n: r.length, quotes: r.some((x) => x.is_quotation) };
}

/* ── Supplier replies & price comparison (§5.4) ─────────────────────────── */

export const supplierKey = (r: Pick<SupplierReply, 'supplier_phone' | 'supplier_name' | 'supplier_id' | 'supplier_email'>) =>
  normPhone(r.supplier_phone) || (r.supplier_name || '').trim().toLowerCase() || r.supplier_id || (r.supplier_email || '').toLowerCase() || '?';

const ts = (d?: string) => (d ? new Date(d).getTime() || 0 : 0);

/** Latest is_quotation reply per supplier → comparison columns. */
export function latestQuotations(replies: SupplierReply[] | undefined): SupplierReply[] {
  const m = new Map<string, SupplierReply>();
  (replies || []).filter((r) => r.is_quotation).forEach((r) => {
    const k = supplierKey(r);
    const cur = m.get(k);
    if (!cur || ts(r.received_at) >= ts(cur.received_at)) m.set(k, r);
  });
  return Array.from(m.values());
}

/** All replies deduped by phone/email/name, keeping the latest (reply cards). */
export function dedupeReplies(replies: SupplierReply[] | undefined): SupplierReply[] {
  const m = new Map<string, SupplierReply>();
  (replies || []).forEach((r) => {
    const k = normPhone(r.supplier_phone) || (r.supplier_email || '').toLowerCase() || (r.supplier_name || '').toLowerCase() || r.id;
    const cur = m.get(k);
    if (!cur || ts(r.received_at) >= ts(cur.received_at)) m.set(k, r);
  });
  return Array.from(m.values()).sort((a, b) => ts(b.received_at) - ts(a.received_at));
}

export interface PriceCell { key: string; unit_price: number; currency: string; vat_included: boolean }
/** matrix[productIndex][supplierKey] = price (first price per product per supplier wins). */
export function buildMatrix(products: RFQProduct[] | undefined, quotes: SupplierReply[]): Record<string, PriceCell>[] {
  const rows: Record<string, PriceCell>[] = (products || []).map(() => ({}));
  quotes.forEach((q) => {
    const k = supplierKey(q);
    (q.prices || []).forEach((p) => {
      if (p.product_index < 0 || p.product_index >= rows.length || !(p.unit_price > 0)) return;
      if (!rows[p.product_index][k]) rows[p.product_index][k] = { key: k, unit_price: Number(p.unit_price), currency: p.currency || 'SAR', vat_included: !!p.vat_included };
    });
  });
  return rows;
}

/** Supplier key with the lowest unit price for each product (default selection). */
export function lowestSelections(matrix: Record<string, PriceCell>[]): (string | null)[] {
  return matrix.map((row) => {
    const cells = Object.values(row);
    if (!cells.length) return null;
    return cells.reduce((a, b) => (b.unit_price < a.unit_price ? b : a)).key;
  });
}

export const clampMargin = (m: number) => (Number.isFinite(m) ? Math.min(1000, Math.max(0, m)) : 0);
/** Retail = cost × (1 + margin/100), rounded to 8 dp like the legacy table. */
export const retailPrice = (cost: number, margin: number) => Math.round(cost * (1 + clampMargin(margin) / 100) * 1e8) / 1e8;

export interface PriceUpdateItem { product_index: number; purchase_unit_price: number; retail_unit_price: number; vat_included: boolean }
export function buildPriceUpdates(products: RFQProduct[], matrix: Record<string, PriceCell>[], selections: (string | null)[], margins: number[]): PriceUpdateItem[] {
  const out: PriceUpdateItem[] = [];
  products.forEach((p, i) => {
    const sel = selections[i];
    const cell = sel ? matrix[i]?.[sel] : undefined;
    if (!p.product_id || !cell) return;
    out.push({ product_index: i, purchase_unit_price: cell.unit_price, retail_unit_price: retailPrice(cell.unit_price, margins[i] ?? 0), vat_included: cell.vat_included });
  });
  return out;
}

export interface QuotationPrefill {
  rfq_id: string; rfq_code: string; rfq_received_id: string; rfq_received_code: string; customer_id?: string; customer_name?: string; customer_phone?: string;
  procurement_message_id?: string; procurement_message_code?: string;
  items: { product_id?: string; product_name: string; part_no?: string; quantity: number; unit?: string; cost_price: number; unit_price: number; margin_percent: number; supplier_name?: string; supplier_phone?: string }[];
}
export const PREFILL_KEY = 'rfq_quotation_prefill_active';

/** sessionStorage payload consumed by the quotation editor (§5.1 "Create Quotation"). */
export function buildQuotationPrefill(rfq: RFQ, matrix: Record<string, PriceCell>[], selections: (string | null)[], margins: number[], quotes: SupplierReply[]): QuotationPrefill {
  const byKey = new Map(quotes.map((q) => [supplierKey(q), q]));
  return {
    rfq_id: rfq.id, rfq_code: rfq.code, rfq_received_id: rfq.id, rfq_received_code: rfq.code,
    customer_id: rfq.customer_id, customer_name: rfq.customer_name, customer_phone: rfq.customer_phone,
    procurement_message_id: rfq.procurement_message_id, procurement_message_code: rfq.procurement_message_code,
    items: (rfq.products || []).map((p, i) => {
      const sel = selections[i];
      const cell = sel ? matrix[i]?.[sel] : undefined;
      const q = sel ? byKey.get(sel) : undefined;
      const cost = cell?.unit_price || 0;
      return { product_id: p.product_id, product_name: p.name, part_no: p.part_no, quantity: Number(p.quantity) || 1, unit: p.unit, cost_price: cost, unit_price: retailPrice(cost, margins[i] ?? 0), margin_percent: margins[i] ?? 0, supplier_name: q?.supplier_name, supplier_phone: q?.supplier_phone };
    }),
  };
}

/* ── Matching extracted quotation prices to RFQ products (§5.4 wizard / §7.5) ── */

const normPart = (s?: string) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const digitTokens = (s?: string) => (String(s || '').match(/\d{3,}/g) || []);

/** For each RFQ product find the extracted price that belongs to it (or null). */
export function matchPricesToProducts(products: RFQProduct[], prices: SupplierReplyPrice[]): (SupplierReplyPrice | null)[] {
  const used = new Set<number>();
  const take = (i: number) => { used.add(i); return prices[i]; };
  const result: (SupplierReplyPrice | null)[] = products.map((prod) => {
    const pn = normPart(prod.part_no);
    const name = String(prod.name || '').toUpperCase();
    const nName = normPart(prod.name);
    const idx = prices.findIndex((p, i) => {
      if (used.has(i)) return false;
      const ppn = normPart(p.part_no);
      if (pn && ppn && pn === ppn) return true;
      if (pn && pn.length >= 3 && normPart(p.product_name).includes(pn)) return true;
      if (ppn && ppn.length >= 3 && (nName.includes(ppn) || name.includes(String(p.part_no || '').toUpperCase()))) return true;
      const toks = digitTokens(p.product_name);
      return toks.length > 0 && toks.some((t) => nName.includes(t) || pn.includes(t));
    });
    return idx >= 0 ? take(idx) : null;
  });
  // product_index from the extractor
  result.forEach((r, pi) => {
    if (r) return;
    const idx = prices.findIndex((p, i) => !used.has(i) && p.product_index === pi);
    if (idx >= 0) result[pi] = take(idx);
  });
  if (result.every((r) => !r)) {
    if (prices.length === products.length) return prices.slice();
    if (prices.length === 1 && products.length >= 1) return products.map((_, i) => (i === 0 ? prices[0] : null));
  }
  return result;
}

/** Re-index matched prices for POST supplier-replies (only unit_price > 0). */
export function pricesForProducts(products: RFQProduct[], matched: (SupplierReplyPrice | null)[]): SupplierReplyPrice[] {
  return matched.flatMap((p, i) => (p && Number(p.unit_price) > 0 ? [{ ...p, product_index: i, product_name: p.product_name || products[i]?.name, part_no: p.part_no || products[i]?.part_no, currency: p.currency || 'SAR', unit_price: Number(p.unit_price) }] : []));
}

export interface ParseFileResult { prices?: SupplierReplyPrice[]; supplier_name?: string; supplier_phone?: string; general_notes?: string; is_quotation?: boolean; extracted_text?: string; file_name?: string }
/** Merge parallel parse-file results: dedupe prices by product_index ≥ 0, first supplier, notes joined "; ". */
export function mergeParseResults(results: ParseFileResult[]) {
  const prices: SupplierReplyPrice[] = [];
  const seen = new Set<number>();
  let supplier_name = '';
  let supplier_phone = '';
  const notes: string[] = [];
  results.forEach((r) => {
    (r.prices || []).forEach((p) => {
      if (p.product_index >= 0) { if (seen.has(p.product_index)) return; seen.add(p.product_index); }
      prices.push(p);
    });
    if (!supplier_name && r.supplier_name) supplier_name = r.supplier_name;
    if (!supplier_phone && r.supplier_phone) supplier_phone = r.supplier_phone;
    if (r.general_notes) notes.push(r.general_notes);
  });
  return { prices, supplier_name, supplier_phone, general_notes: notes.join('; ') };
}

/* ── Send to suppliers (§5.3) ───────────────────────────────────────────── */

export interface Recipient { name: string; phone: string; market?: string; category?: string; sent: boolean; extra?: boolean; status?: 'sending' | 'sent' | 'failed'; error?: string }

export function buildRecipients(preview: Pick<SendPreview, 'suppliers'> | null, forwarded: RFQForwardRecord[] | undefined, extras: { name: string; phone: string; market?: string }[], customerPhone?: string): Recipient[] {
  const out: Recipient[] = [];
  const seen = new Set<string>();
  const cust = last9(customerPhone);
  const sentPhones = new Set((forwarded || []).filter((f) => f.status === 'sent').map((f) => normPhone(f.phone)));
  const add = (r: { name?: string; phone: string; market?: string; category?: string }, extra = false) => {
    const p = normPhone(r.phone);
    if (!p || seen.has(p)) return;
    if (cust && p.endsWith(cust)) return;
    seen.add(p);
    out.push({ name: r.name || p, phone: p, market: r.market, category: r.category, sent: sentPhones.has(p), extra });
  };
  (preview?.suppliers || []).forEach((s: SendPreviewSupplier) => add({ name: s.name, phone: s.phone, market: s.purchase_market, category: s.category }));
  (forwarded || []).forEach((f) => add({ name: f.supplier_name || f.phone, phone: f.phone, market: f.purchase_market, category: f.category }));
  extras.forEach((e) => add(e, true));
  return out;
}

/** Default-selected = not yet sent and (extra, or market in forward markets, or no market / no markets configured). */
export function defaultSelected(recipients: Recipient[], forwardMarkets: string[] | null | undefined): Set<string> {
  const fm = (forwardMarkets || []).map((m) => m.toLowerCase());
  return new Set(recipients.filter((r) => !r.sent && (r.extra || !r.market || !fm.length || fm.includes(r.market.toLowerCase()))).map((r) => r.phone));
}

export const headerFormat = (components: TemplateComponent[] | null | undefined) => (components || []).find((c) => c.type?.toUpperCase() === 'HEADER')?.format?.toUpperCase() || '';
export const templateWantsDocument = (components: TemplateComponent[] | null | undefined) => headerFormat(components) === 'DOCUMENT';

/** Placeholders in a template body: "{{1}}" → "1", "{{supplier_name}}" → "supplier_name" (in order, unique). */
export function placeholders(text: string | undefined): string[] {
  const out: string[] = [];
  for (const m of String(text || '').matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** Fill "{{x}}" with values (missing → "-"). */
export const fillTemplate = (text: string | undefined, vars: Record<string, string>) => String(text || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => vars[k] ?? vars[`body_${k}`] ?? '-');

/** Meta "components" for a template test message (HEADER media + BODY params). */
export function buildTemplateComponents(components: TemplateComponent[] | null | undefined, vars: Record<string, string>, media?: { id: string; type: 'image' | 'document'; filename?: string }) {
  const out: any[] = [];
  if (media) out.push({ type: 'header', parameters: [{ type: media.type, [media.type]: { id: media.id, ...(media.type === 'document' && media.filename ? { filename: media.filename } : {}) } }] });
  const body = (components || []).find((c) => c.type?.toUpperCase() === 'BODY');
  const ph = placeholders(body?.text);
  if (ph.length) {
    out.push({
      type: 'body',
      parameters: ph.map((p) => {
        const v = vars[`body_${p}`] ?? vars[p];
        const text = v === undefined || v === '' ? '-' : String(v);
        return /^\d+$/.test(p) ? { type: 'text', text } : { type: 'text', parameter_name: p, text };
      }),
    });
  }
  return out;
}

/** Store purchase markets are shown title-cased; custom ones added the same way. */
export const titleCase = (s: string) => s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/* ── Messages & threads ─────────────────────────────────────────────────── */

/** Rewrite email HTML for safe display: proxy external images, absolutise Zoho paths, drop scripts/handlers (§10.18). */
export function fixEmailHtml(html: string, proxyBase = '/v1/proxy-image?url='): string {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(src|href)=(["'])\/mail\//gi, '$1=$2https://mail.zoho.com/mail/')
    .replace(/<img([^>]*?)\ssrc=(["'])(https?:\/\/[^"']+)\2/gi, (_m, pre, q, url) => `<img${pre} src=${q}${proxyBase}${encodeURIComponent(url)}${q}`);
}

export function stripHtml(html: string | undefined): string {
  return decodeEntities(String(html || '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li)>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/\n{3,}/g, '\n\n').trim();
}

/** Day separator label for message tables. */
export function dayLabel(d: string | undefined, now = new Date()): string {
  if (!d) return '—';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '—';
  const day = (y: Date) => new Date(y.getFullYear(), y.getMonth(), y.getDate()).getTime();
  const diff = Math.round((day(now) - day(x)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return fmtDate(x);
}

/** Unread WhatsApp count for an RFQ = sum over its supplier + customer phones (§5.1). */
export function rfqUnread(rfq: RFQ, threads: ContactThread[]): number {
  const phones = new Set([...(rfq.forwarded_to || []).map((f) => normPhone(f.phone)), normPhone(rfq.customer_phone)].filter(Boolean));
  return threads.filter((t) => phones.has(normPhone(t.contact_phone))).reduce((s, t) => s + (t.unread_count || 0), 0);
}
export const rfqPhones = (rows: RFQ[]) => Array.from(new Set(rows.flatMap((r) => [...(r.forwarded_to || []).map((f) => normPhone(f.phone)), normPhone(r.customer_phone)]).filter(Boolean)));

/** Validate the RFQ form (§5.5). */
export function validateRfqForm(v: { products: RFQProduct[]; text_content: string; productFiles: number }): string | null {
  const named = v.products.some((p) => (p.name || '').trim());
  return named || v.productFiles > 0 || v.text_content.trim() ? null : 'Add products, upload a file, or enter a description.';
}

/** Merge local notification history with fresh unread items (topbar dropdowns). */
export function mergeHistory<T extends Record<string, any>>(history: T[], fresh: T[], key: (x: T) => string, max = 100, zero: (x: T) => T = (x) => x): T[] {
  const freshMap = new Map(fresh.map((f) => [key(f), f]));
  const out: T[] = history.map((h) => freshMap.get(key(h)) || zero(h));
  fresh.forEach((f) => { if (!history.some((h) => key(h) === key(f))) out.unshift(f); });
  return out.slice(0, max);
}

export const fmtBytes = (n?: number) => (!n ? '' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** File → data: URI (product/additional files on RFQ create). */
export const fileToDataUri = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
