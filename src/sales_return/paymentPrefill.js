/**
 * The most a new sales return may refund, as the API checks it
 * (pos-rest models/sales_return.go: totalPayment must not exceed
 * RoundTo2Decimals(order.total_payment_received - order.return_amount)).
 * Returns undefined when the sale does not say what was received.
 */
export function maxRefundableForReturn(order) {
    if (!order || typeof order.total_payment_received !== "number") return undefined;
    const left = order.total_payment_received - (order.return_amount || 0);
    const rounded = Math.round((left + Number.EPSILON) * 100) / 100;
    return rounded > 0 ? rounded : 0;
}

/** Caps a pre-filled refund at what the API will accept for this sale. */
export function capReturnPaymentPrefill(amount, order) {
    const max = maxRefundableForReturn(order);
    if (max === undefined) return amount;
    return amount > max ? max : amount;
}
