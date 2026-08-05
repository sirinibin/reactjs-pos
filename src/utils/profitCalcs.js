/**
 * Pure profit-calculation helpers shared by ProfitBreakdown and its tests.
 *
 * All functions operate on a single product object and return a float64-style
 * number (never a display string).  Keep trimTo2Decimals out of here so that
 * callers can accumulate raw floats before rounding.
 */

/**
 * Profit excluding VAT for one product line.
 *
 * Rule:
 *   - If there is a purchase cost  → selling price minus cost minus discount
 *   - Else if it is a service item  → full selling price minus discount (no cost)
 *   - Otherwise (spare part with unknown cost) → 0
 */
export function calcExVAT(p) {
    if (p.purchase_unit_price > 0)
        return (p.unit_price - (p.unit_discount || 0) - p.purchase_unit_price) * p.quantity;
    if (p.is_service)
        return (p.unit_price - (p.unit_discount || 0)) * p.quantity;
    return 0;
}

/**
 * Profit including VAT for one product line (uses the *_with_vat field variants).
 */
export function calcWithVAT(p) {
    if (p.purchase_unit_price_with_vat > 0)
        return (p.unit_price_with_vat - (p.unit_discount_with_vat || 0) - p.purchase_unit_price_with_vat) * p.quantity;
    if (p.is_service)
        return (p.unit_price_with_vat - (p.unit_discount_with_vat || 0)) * p.quantity;
    return 0;
}

/**
 * Sum a calc function over an array, counting only positive contributions.
 * Negative individual profits (loss-making lines) are excluded from the total.
 */
export function sumPos(arr, fn) {
    return arr.reduce((s, p) => { const v = fn(p); return s + (v > 0 ? v : 0); }, 0);
}
