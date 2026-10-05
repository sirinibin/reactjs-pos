import { afterEach, describe, expect, it } from 'vitest';
import {
  clearWorkshopPrefill, copyLines, customerToDocState, deliveryNoteToDocState, missingPriceIds, partyOption, quotationToDocState, readWorkshopPrefill, stripPrivate, workshopToDocState, WORKSHOP_PREFILL_KEY,
} from './conversions';
import { linkedQuotations } from './invoices';

afterEach(() => sessionStorage.clear());

describe('workshop hand-over', () => {
  it('reads the prefill without removing it, then clears it explicitly', () => {
    sessionStorage.setItem(WORKSHOP_PREFILL_KEY, JSON.stringify({ customer_id: 'c1', products: [] }));
    expect(readWorkshopPrefill()).toEqual({ customer_id: 'c1', products: [] });
    expect(sessionStorage.getItem(WORKSHOP_PREFILL_KEY)).not.toBeNull();
    clearWorkshopPrefill();
    expect(readWorkshopPrefill()).toBeNull();
  });

  it('discards corrupt JSON', () => {
    sessionStorage.setItem(WORKSHOP_PREFILL_KEY, '{oops');
    expect(readWorkshopPrefill()).toBeNull();
    expect(sessionStorage.getItem(WORKSHOP_PREFILL_KEY)).toBeNull();
  });

  it('maps party, lines and vehicle / repair-job links', () => {
    const s = workshopToDocState({ customer_id: 'c1', customer_name: 'RIYADH AUTO CARE', vehicle_id: 'v1', km_driven: 120500, repair_job_ids: ['j1', 'j2'], products: [{ product_id: 'p1', name: 'Brake Pad Set', quantity: 2, unit_price: 100 }] }, 15);
    expect(s.party).toMatchObject({ id: 'c1', label: 'RIYADH AUTO CARE' });
    expect(s.lines).toHaveLength(1);
    expect(s.lines![0]).toMatchObject({ product_id: 'p1', quantity: 2, unit_price: 100, unit_price_with_vat: 115 });
    expect(s.extra).toMatchObject({ vehicle_id: 'v1', km_driven: 120500, repair_job_id: 'j1', repair_job_ids: ['j1', 'j2'] });
  });
});

describe('quotation / delivery note → invoice', () => {
  it('free-text customers become a "new:" option; zero ids are ignored', () => {
    expect(partyOption(null, 'AL SAFWA')).toEqual({ id: 'new:AL SAFWA', label: 'AL SAFWA', data: { id: '', name: 'AL SAFWA' } });
    expect(partyOption('000000000000000000000000', '')).toBeNull();
  });

  it('copied lines lose returned quantities and get VAT re-derived for the invoice', () => {
    const [l] = copyLines([{ product_id: 'p1', name: 'Brake Pad Set', quantity: 3, quantity_returned: 1, unit_price: 100, unit_price_with_vat: 100, selected: true }], 15);
    expect(l).not.toHaveProperty('quantity_returned');
    expect(l).not.toHaveProperty('selected');
    expect(l.unit_price_with_vat).toBe(115);
  });

  it('quotation prefill links quotation_id/code and carries header discount', () => {
    const s = quotationToDocState({ id: 'q1', code: 'QTN-000006', customer_id: 'c1', customer_name: 'AL NOOR', phone: '0554128890', remarks: 'Urgent', discount: 5, shipping_handling_fees: 10, order_code: 'S-INV-000001', products: [{ product_id: 'p1', name: 'Brake Pad Set', quantity: 1, unit_price: 100 }] }, 15);
    expect(s.extra).toMatchObject({ quotation_id: 'q1', quotation_code: 'QTN-000006', quotation_ids: ['q1'], quotation_codes: ['QTN-000006'] });
    expect(s.extra!._source).toMatchObject({ kind: 'quotation', invoicedAs: 'S-INV-000001' });
    expect(s.summary).toMatchObject({ discount: 5, shipping_handling_fees: 10, vat_percent: 15, cash_discount: 0 });
    expect(s).toMatchObject({ phone: '0554128890', remarks: 'Urgent' });
  });

  it('delivery note prefill uses DN prices, or current prices when the DN has none', () => {
    const dn = { id: 'd1', code: 'DN-000001', customer_id: 'c1', customer_name: 'AL NOOR', products: [{ product_id: 'p1', name: 'Brake Pad Set', quantity: 2, unit_price: 90 }, { product_id: 'p2', name: 'Engine Oil 4L', quantity: 1 }] };
    expect(missingPriceIds(dn)).toEqual(['p2']);
    const s = deliveryNoteToDocState(dn, 15, { p2: { unit_price: 96, unit_price_with_vat: 110.4, purchase_unit_price: 62, stock: 4 } });
    expect(s.lines!.map((l) => [l.unit_price, l.unit_price_with_vat])).toEqual([[90, 103.5], [96, 110.4]]);
    expect(s.lines![1].stock).toBe(4);
    expect(s.extra).toMatchObject({ delivery_note_id: 'd1' });
  });

  it('customer prefill carries contact details, remarks only when used in sales', () => {
    expect(customerToDocState({ id: 'c1', name: 'A', phone: '05', remarks: 'r', use_remarks_in_sales: false })).toEqual({ party: { id: 'c1', label: 'A', data: expect.objectContaining({ id: 'c1' }) }, phone: '05', vat_no: '', address: '' });
    expect(customerToDocState({ id: 'c1', name: 'A', remarks: 'r', use_remarks_in_sales: true }).remarks).toBe('r');
    expect(customerToDocState(null)).toEqual({});
  });

  it('strips UI-only keys before posting', () => {
    expect(stripPrivate({ a: 1, _source: {}, quotation_id: 'q' })).toEqual({ a: 1, quotation_id: 'q' });
  });

  it('lists every linked quotation once', () => {
    expect(linkedQuotations({ quotation_id: 'q1', quotation_code: 'QTN-1', quotation_ids: ['q1', 'q2'], quotation_codes: ['QTN-1', 'QTN-2'] })).toEqual([{ id: 'q1', code: 'QTN-1' }, { id: 'q2', code: 'QTN-2' }]);
    expect(linkedQuotations({})).toEqual([]);
  });
});
