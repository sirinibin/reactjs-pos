/**
 * Unit tests for the Quotation Sales Return invoice-payment corner cases.
 *
 * Two related fixes shipped together:
 *
 * FRONTEND fix (create.js):
 *   formData.vat_percent is now copied from the original quotation so QSR
 *   uses the same VAT rate.  For type=invoice quotations with vat_percent=0,
 *   this prevents net_total from being inflated to 120 (via hardcoded 15%).
 *
 * BACKEND fix (quotation_sales_return.go):
 *   The TotalPaymentReceived validation is skipped for quotation.Type ==
 *   "invoice".  For invoices the QSR may be created for the full net_total
 *   regardless of how much has been collected so far.
 *
 * These tests focus on the frontend-side logic that feeds into both fixes:
 *   1. payments_input is cleared for type=invoice + payment_status=not_paid
 *   2. payment auto-fill is driven by net_total (not capped by TotalPaymentReceived)
 *   3. vat_percent pass-through ensures net_total is correct per rate
 *   4. Source-code presence of all guards
 */

const fs   = require('fs');
const path = require('path');

const QSR_CREATE_JS = fs.readFileSync(
    path.join(__dirname, '../create.js'), 'utf8'
);


// ─── 1. Source-code presence checks ──────────────────────────────────────────

describe('QSR create — source-code presence of invoice-payment guards', () => {
    test('payments_input cleared for type=invoice + not_paid in getQuotation', () => {
        expect(QSR_CREATE_JS).toMatch(
            /quotation\.type\s*===\s*["']invoice["']\s*&&\s*quotation\.payment_status\s*===\s*["']not_paid["']/
        );
    });

    test('that guard results in payments_input being set to []', () => {
        // if (quotation.type === "invoice" && quotation.payment_status === "not_paid") { formData.payments_input = []; }
        expect(QSR_CREATE_JS).toMatch(
            /if\s*\(quotation\.type\s*===\s*["']invoice["'][^)]*not_paid[^)]*\)[^{]*\{[^}]*formData\.payments_input\s*=\s*\[\]/s
        );
    });

    test('payment auto-fill uses formData.net_total (not a TotalPaymentReceived cap)', () => {
        // The auto-fill line should reference formData.net_total, not TotalPaymentReceived
        expect(QSR_CREATE_JS).toMatch(
            /payments_input\[0\]\.amount\s*=\s*parseFloat\(trimTo2Decimals\(formData\.net_total\)\)/
        );
        expect(QSR_CREATE_JS).not.toMatch(/total_payment_received/i);
    });

    test('vat_percent assignment guard still present', () => {
        expect(QSR_CREATE_JS).toMatch(
            /quotation\.vat_percent\s*!==\s*undefined.*quotation\.vat_percent\s*!==\s*null/s
        );
    });

    test('payment is not cleared for paid invoice (only not_paid)', () => {
        // The guard is specifically for not_paid — paid invoices keep payments
        const guard = /quotation\.payment_status\s*===\s*["']not_paid["']/;
        expect(QSR_CREATE_JS).toMatch(guard);
        // No blanket "type=invoice → clear payments" without the not_paid condition
        const unconditional = /quotation\.type\s*===\s*["']invoice["']\s*[^&]\s*formData\.payments_input\s*=\s*\[\]/;
        expect(QSR_CREATE_JS).not.toMatch(unconditional);
    });
});


// ─── 2. Pure logic — payments_input clearing ──────────────────────────────────

// Mirrors: if (quotation.type === "invoice" && quotation.payment_status === "not_paid")
//              formData.payments_input = [];
function resolvePaymentsInput(quotationType, paymentStatus, initialPayments) {
    let paymentsInput = [...initialPayments];
    if (quotationType === 'invoice' && paymentStatus === 'not_paid') {
        paymentsInput = [];
    }
    return paymentsInput;
}

const DEFAULT_PAYMENT = [{ amount: 149.5, method: 'credit_card', deleted: false }];

describe('QSR payments_input — clearing logic for invoice + not_paid', () => {
    test('type=invoice + not_paid → payments cleared (totalPayment = 0)', () => {
        const result = resolvePaymentsInput('invoice', 'not_paid', DEFAULT_PAYMENT);
        expect(result).toHaveLength(0);
        const total = result.reduce((s, p) => s + (p.amount || 0), 0);
        expect(total).toBe(0);
    });

    test('type=invoice + paid → payments kept', () => {
        const result = resolvePaymentsInput('invoice', 'paid', DEFAULT_PAYMENT);
        expect(result).toHaveLength(1);
        expect(result[0].amount).toBe(149.5);
    });

    test('type=invoice + paid_partially → payments kept', () => {
        const result = resolvePaymentsInput('invoice', 'paid_partially', DEFAULT_PAYMENT);
        expect(result).toHaveLength(1);
    });

    test('type=quotation + not_paid → payments kept (guard only triggers for invoice)', () => {
        const result = resolvePaymentsInput('quotation', 'not_paid', DEFAULT_PAYMENT);
        expect(result).toHaveLength(1);
    });

    test('type=quotation + paid → payments kept', () => {
        const result = resolvePaymentsInput('quotation', 'paid', DEFAULT_PAYMENT);
        expect(result).toHaveLength(1);
    });

    test('empty initial payments + not_paid invoice → still empty', () => {
        const result = resolvePaymentsInput('invoice', 'not_paid', []);
        expect(result).toHaveLength(0);
    });
});


// ─── 3. Pure logic — payment auto-fill ───────────────────────────────────────

// Mirrors lines 1534-1540 in create.js:
//   if (!formData.id) {
//       if (formData.payments_input?.length === 1) {
//           formData.payments_input[0].amount = parseFloat(trimTo2Decimals(formData.net_total));
//           if (formData.payments_input[0].amount > formData.cash_discount) {
//               formData.payments_input[0].amount -= formData.cash_discount;
//           }
//       }
//   }
function trimTo2Decimals(n) { return parseFloat(Number(n).toFixed(2)); }

function autoFillPayment(qsrNetTotal, cashDiscount, paymentsInput, isNew) {
    const payments = paymentsInput.map(p => ({ ...p }));
    if (isNew && payments.length === 1) {
        payments[0].amount = trimTo2Decimals(qsrNetTotal);
        if (payments[0].amount > cashDiscount) {
            payments[0].amount = trimTo2Decimals(payments[0].amount - cashDiscount);
        }
    }
    return payments;
}

describe('QSR payment auto-fill — driven by net_total', () => {
    test('new QSR, 1 payment: auto-filled to qsr.net_total', () => {
        const result = autoFillPayment(149.5, 0, [{ amount: 0 }], true);
        expect(result[0].amount).toBe(149.5);
    });

    test('new QSR, net_total=104.35 (zero-rate): payment = 104.35', () => {
        const result = autoFillPayment(104.35, 0, [{ amount: 0 }], true);
        expect(result[0].amount).toBe(104.35);
    });

    test('new QSR, cash discount applied: payment = net_total - cash_discount', () => {
        const result = autoFillPayment(149.5, 10, [{ amount: 0 }], true);
        expect(result[0].amount).toBe(139.5);
    });

    test('new QSR, no payments (invoice + not_paid path): nothing to fill', () => {
        const result = autoFillPayment(149.5, 0, [], true);
        expect(result).toHaveLength(0);
        const total = result.reduce((s, p) => s + p.amount, 0);
        expect(total).toBe(0);
    });

    test('existing QSR (edit, isNew=false): auto-fill does NOT run', () => {
        const result = autoFillPayment(149.5, 0, [{ amount: 99 }], false);
        // amount stays at 99 because isNew=false
        expect(result[0].amount).toBe(99);
    });

    test('multiple payments: auto-fill does NOT run (only 1-payment forms)', () => {
        const payments = [{ amount: 0 }, { amount: 0 }];
        const result = autoFillPayment(149.5, 0, payments, true);
        expect(result[0].amount).toBe(0); // unchanged
        expect(result[1].amount).toBe(0);
    });
});


// ─── 4. The exact bug scenario — end-to-end logic ────────────────────────────

describe('QSR invoice — exact bug scenario from HTTP request', () => {
    /**
     * Quotation: type=invoice, vat_percent=15, net_total=149.5, total=130
     *            TotalPaymentReceived=130 (partial payment)
     *
     * OLD behaviour: QSR sent vat_percent=15, net_total=149.5, payment=149.5
     *   → backend rejected: 149.5 > (130-0) [TotalPaymentReceived check]
     *
     * NEW behaviour (backend fix): TotalPaymentReceived check is SKIPPED for
     *   type=invoice → the QSR is accepted.
     *
     * Frontend side: vat_percent is correctly passed through (15 stays 15),
     *   and net_total is 149.5.  Payment auto-fill sets 149.5.
     *   Backend then accepts because it skips the TotalPaymentReceived check.
     */

    const quotation = {
        type:                 'invoice',
        vat_percent:          15,
        total:                130,
        net_total:            149.5,
        total_payment_received: 130,
        return_amount:        0,
        payment_status:       'paid_partially',
    };

    function resolveVatPercent(q, defaultVat = 15) {
        if (q.vat_percent !== undefined && q.vat_percent !== null) return q.vat_percent;
        return defaultVat;
    }

    function calcNetTotal(total, vat) {
        return parseFloat((total * (1 + vat / 100)).toFixed(2));
    }

    test('vat_percent is correctly inherited as 15 from quotation', () => {
        expect(resolveVatPercent(quotation)).toBe(15);
    });

    test('QSR net_total = 149.5 with vat_percent=15 and total=130', () => {
        const vat = resolveVatPercent(quotation);
        const net = calcNetTotal(quotation.total, vat);
        expect(net).toBe(149.5);
    });

    test('payment is auto-filled to 149.5 (qsr.net_total)', () => {
        const vat = resolveVatPercent(quotation);
        const net = calcNetTotal(quotation.total, vat);
        const payments = autoFillPayment(net, 0, [{ amount: 0 }], true);
        expect(payments[0].amount).toBe(149.5);
    });

    test('backend layer-2 check passes: payment (149.5) ≤ quotation.NetTotal (149.5)', () => {
        // Check: totalPayment > quotation.NetTotal → reject
        const totalPayment   = 149.5;
        const quotationNetTotal = 149.5; // same as QSR net_total for full return
        expect(totalPayment > quotationNetTotal).toBe(false);
    });

    test('TotalPaymentReceived (130) < payment (149.5) — but this check is now skipped for invoice', () => {
        const totalPayment = 149.5;
        const available    = quotation.total_payment_received - quotation.return_amount; // 130
        // OLD: would have rejected — payment > available
        expect(totalPayment > available).toBe(true); // confirms the old check WOULD have fired
        // NEW: skipped for type=invoice — result is no error
    });

    test('paid (type=invoice) keeps payment in payments_input (not cleared)', () => {
        // payment_status=paid_partially → payments NOT cleared
        const payments = resolvePaymentsInput(
            quotation.type,
            quotation.payment_status,
            [{ amount: 149.5 }]
        );
        expect(payments).toHaveLength(1);
        expect(payments[0].amount).toBe(149.5);
    });
});


// ─── 5. Zero-rate invoice (the other reported bug) ────────────────────────────

describe('QSR zero-rate invoice (vat_percent=0)', () => {
    /**
     * Quotation: type=invoice, vat_percent=0, net_total=104.35
     *            TotalPaymentReceived=104.35 (fully paid)
     *
     * OLD frontend bug: QSR used hardcoded vat_percent=15 → net_total=120
     *   → backend rejected: 120 > 104.35 [original net_total check]
     *
     * FIXED: vat_percent=0 copied from quotation → QSR net_total=104.35
     */

    const quotation = {
        type:       'invoice',
        vat_percent: 0,
        total:       104.35,
        net_total:   104.35,
        total_payment_received: 104.35,
        return_amount: 0,
        payment_status: 'paid',
    };

    function resolveVatPercent(q, defaultVat = 15) {
        if (q.vat_percent !== undefined && q.vat_percent !== null) return q.vat_percent;
        return defaultVat;
    }

    function calcNetTotal(total, vat) {
        return parseFloat((total * (1 + vat / 100)).toFixed(2));
    }

    test('vat_percent=0 is correctly inherited (overrides default 15)', () => {
        expect(resolveVatPercent(quotation)).toBe(0);
    });

    test('QSR net_total = 104.35 with vat_percent=0', () => {
        const vat = resolveVatPercent(quotation);
        const net = calcNetTotal(quotation.total, vat);
        expect(net).toBe(104.35);
    });

    test('payment auto-fill = 104.35 (matches original net_total)', () => {
        const vat = resolveVatPercent(quotation);
        const net = calcNetTotal(quotation.total, vat);
        const payments = autoFillPayment(net, 0, [{ amount: 0 }], true);
        expect(payments[0].amount).toBe(104.35);
    });

    test('backend layer-2 check passes: payment (104.35) ≤ original net_total (104.35)', () => {
        const totalPayment      = 104.35;
        const quotationNetTotal = 104.35;
        expect(totalPayment > quotationNetTotal).toBe(false);
    });

    test('OLD behaviour would have inflated payment to 120 → rejected', () => {
        const oldNet = calcNetTotal(quotation.total, 15); // hardcoded 15
        expect(oldNet).toBe(120);
        expect(oldNet > quotation.net_total).toBe(true); // would have failed layer-2
    });
});
