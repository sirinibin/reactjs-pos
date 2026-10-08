// Helpers for "Import from Quotation" in the quotation form.

const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

// Maps a product line of a source quotation to a line of the quotation being edited.
// Prices and discounts are carried over from the source quotation.
// When noTax is true (no-tax invoice), VAT-inclusive values equal the VAT-exclusive ones.
export function mapQuotationProductForImport(p, { noTax = false } = {}) {
  const unitPrice = num(p.unit_price);
  const unitDiscount = num(p.unit_discount);
  return {
    product_id: p.product_id,
    code: p.item_code || "",
    prefix_part_number: p.prefix_part_number || "",
    part_number: p.part_number || "",
    name: p.name || "",
    name_in_arabic: p.name_in_arabic || "",
    quantity: num(p.quantity) || 1,
    unit: p.unit || "",
    unit_price: unitPrice,
    unit_price_with_vat: noTax ? unitPrice : num(p.unit_price_with_vat),
    purchase_unit_price: num(p.purchase_unit_price),
    purchase_unit_price_with_vat: num(p.purchase_unit_price_with_vat),
    unit_discount: unitDiscount,
    unit_discount_with_vat: noTax ? unitDiscount : num(p.unit_discount_with_vat),
    unit_discount_percent: num(p.unit_discount_percent),
    unit_discount_percent_with_vat: noTax ? num(p.unit_discount_percent) : num(p.unit_discount_percent_with_vat),
    stock: 0,
    product_stores: {},
    warehouse_stocks: {},
    is_service: p.is_service || false,
  };
}

// Returns a new product list with the picked quotation products merged in.
// A product already in the list gets its quantity increased instead of a duplicate line.
export function mergeImportedQuotationProducts(existing, picked, opts = {}) {
  const result = (existing || []).map((p) => ({ ...p }));
  (picked || []).forEach((p) => {
    if (!p || !p.product_id) return;
    const idx = result.findIndex((s) => s.product_id === p.product_id);
    if (idx >= 0) {
      result[idx].quantity = num(result[idx].quantity) + (num(p.quantity) || 1);
    } else {
      result.push(mapQuotationProductForImport(p, opts));
    }
  });
  return result;
}
