import { STORE_ID, TEST_STORE } from '@/test/utils';
import type { RFQ } from './types';

/** Store with the procurement flags on (tests only). */
export const RFQ_STORE = {
  ...TEST_STORE,
  settings: { ...TEST_STORE.settings, enable_ai_rfq_bot: true, enable_rfq_module: true, purchase_markets: ['Riyadh', 'Jeddah'], rfq_forward_markets: ['Riyadh'], default_quotation_margin_percent: 20 },
};

export const RFQ1: RFQ = {
  id: 'r1', store_id: STORE_ID, code: 'RFQ-000001', received_at: '2026-10-01T10:00:00Z', source: 'email', from_phone: 'buyer@noor.sa', from_name: 'Noor', message_type: 'text',
  customer_id: 'c1', customer_name: 'AL NOOR TRADING EST.', customer_company: 'Noor Group', customer_phone: '966500000001', customer_email: 'buyer@noor.sa', customer_rfq_id: 'PO-77',
  status: 'ready_to_send', categories: ['Brakes', 'Filters', 'Oils', 'Tyres'], products: [{ name: 'Brake pad', part_no: 'BP-1', quantity: 2, unit: 'PCE', product_id: 'p1' }, { name: 'Oil filter', quantity: 1, unit: 'PCE' }],
  forwarded_to: [{ phone: '966511111111', supplier_name: 'Alpha Parts', status: 'sent', purchase_market: 'Riyadh', sent_at: '2026-10-01T11:00:00Z', sent_message: 'Dear Alpha, please quote RFQ-000001' }],
  supplier_replies: [
    { id: 'rep1', supplier_name: 'Alpha Parts', supplier_phone: '966511111111', received_at: '2026-10-02T10:00:00Z', is_quotation: true, extraction_status: 'done', prices: [{ product_index: 0, unit_price: 100 }, { product_index: 1, unit_price: 30 }] },
    { id: 'rep2', supplier_name: 'Beta Spares', supplier_phone: '966522222222', received_at: '2026-10-02T12:00:00Z', is_quotation: true, extraction_status: 'done', prices: [{ product_index: 0, unit_price: 90 }] },
  ],
  activity_logs: [{ id: 'l1', at: '2026-10-01T10:00:00Z', step: 'rfq_created', message: 'RFQ created with code RFQ-000001', details: { code: 'RFQ-000001' } }],
  procurement_message_id: 'm1', procurement_message_code: 'EM-000001', quotation_ids: ['q1'], quotation_codes: ['QTN-001'],
};
export const RFQ2: RFQ = { id: 'r2', code: 'RFQ-000002', received_at: '2026-10-03T10:00:00Z', source: 'whatsapp', customer_name: 'Walk-in', status: 'failed', products: [] };
