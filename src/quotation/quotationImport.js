// Helpers for "Import > From Quotations / From Purchases / From Sales" in the quotation forms.

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
// A product already in the list gets its quantity increased instead of a duplicate line
// (lines marked deleted are ignored when looking for it).
// opts.noTax: no-tax invoice, VAT-inclusive values equal the VAT-exclusive ones.
// opts.vatExcluded(line): same as noTax, decided per line (e.g. services on a non-VAT form).
// opts.prepend: new lines go to the top of the list instead of the bottom.
export function mergeImportedQuotationProducts(existing, picked, opts = {}) {
  const result = (existing || []).map((p) => ({ ...p }));
  const added = [];
  (picked || []).forEach((p) => {
    if (!p || !p.product_id) return;
    const match = (s) => !s.deleted && s.product_id === p.product_id;
    const prev = result.find(match) || added.find(match);
    if (prev) {
      prev.quantity = num(prev.quantity) + (num(p.quantity) || 1);
    } else {
      const noTax = !!opts.noTax || !!(opts.vatExcluded && opts.vatExcluded(p));
      added.push(mapQuotationProductForImport(p, { noTax }));
    }
  });
  return opts.prepend ? [...added, ...result] : [...result, ...added];
}

// --- Import from Purchases ---

// Looks up the current selling (retail) prices of products in this store.
// Returns { [productId]: { retail_unit_price, retail_unit_price_with_vat } }.
// Throws when a request fails so the caller can warn that prices are missing.
export async function fetchRetailPrices(productIds, storeId, fetchFn = fetch) {
  const ids = [...new Set((productIds || []).filter(Boolean))];
  const prices = {};
  if (ids.length === 0) return prices;
  const CHUNK = 100;
  const select = `id,product_stores.${storeId}.retail_unit_price,product_stores.${storeId}.retail_unit_price_with_vat`;
  const headers = { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") };
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    // The product list API reads its filters as search[...] params.
    const res = await fetchFn(`/v1/product?search[ids]=${chunk.join(",")}&search[store_id]=${storeId}&limit=${chunk.length}&select=${select}`, { method: "GET", headers });
    if (!res.ok) throw new Error("Failed to load product prices");
    const data = await res.json();
    (data?.result || []).forEach((prod) => {
      const ps = prod?.product_stores?.[storeId] || {};
      prices[prod.id] = {
        retail_unit_price: num(ps.retail_unit_price),
        retail_unit_price_with_vat: num(ps.retail_unit_price_with_vat),
      };
    });
  }
  return prices;
}

// Turns purchase lines into quotation lines. A purchase only records what was paid,
// so the selling price comes from the product's current retail price in this store
// (falling back to a retail price saved on the purchase line when the store has none, else 0).
// The purchase price is kept as the line's purchase (cost) price; no discount is carried over.
export function purchaseLinesToQuotationLines(products, retailById = {}) {
  return (products || []).filter((p) => p && p.product_id).map((p) => {
    const master = retailById[p.product_id];
    const retail = master && master.retail_unit_price > 0 ? master : { retail_unit_price: num(p.retail_unit_price), retail_unit_price_with_vat: num(p.retail_unit_price_with_vat) };
    return {
      product_id: p.product_id,
      item_code: p.item_code || "",
      prefix_part_number: p.prefix_part_number || "",
      part_number: p.part_number || "",
      name: p.name || "",
      name_in_arabic: p.name_in_arabic || "",
      quantity: num(p.quantity) > 0 ? num(p.quantity) : 1,
      unit: p.unit || "",
      unit_price: retail.retail_unit_price,
      unit_price_with_vat: retail.retail_unit_price_with_vat,
      purchase_unit_price: num(p.purchase_unit_price),
      purchase_unit_price_with_vat: num(p.purchase_unit_price_with_vat),
      unit_discount: 0,
      unit_discount_with_vat: 0,
      unit_discount_percent: 0,
      unit_discount_percent_with_vat: 0,
      is_service: p.is_service || false,
    };
  });
}
