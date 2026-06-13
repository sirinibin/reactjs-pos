import React, { useMemo } from "react";
import { Chart } from "react-google-charts";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const METHOD_LABELS = {
    cash: "Cash",
    debit_card: "Debit Card",
    bank_card: "Bank Card",
    credit_card: "Credit Card",
    bank_transfer: "Bank Transfer",
    bank_cheque: "Bank Cheque",
    customer_account: "Customer Account",
};

function fmtT(n) {
    if (!n && n !== 0) return "0.00";
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tooltipHtml(title, titleColor, lines) {
    const headerStyle  = `font-size:0.8rem;font-weight:700;color:${titleColor};margin-bottom:6px;`;
    const rowStyle     = "font-size:0.75rem;line-height:1.7;white-space:nowrap;";
    const dividerStyle = "border-top:1px solid #495057;margin-top:6px;padding-top:6px;";
    const labelStyle   = "color:#adb5bd;margin-right:4px;";

    let html = `<div style="background:#212529;color:#f8f9fa;padding:10px 14px;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.35);">`;
    html += `<div style="${headerStyle}">${title}</div>`;
    lines.forEach(l => {
        const wrap = l.divider ? dividerStyle : "";
        const val  = l.bold
            ? `<strong style="color:${l.color || "#f8f9fa"}">${l.value}</strong>`
            : `<span style="color:${l.color || "#f8f9fa"}">${l.value}</span>`;
        html += `<div style="${rowStyle}${wrap}"><span style="${labelStyle}">${l.label}:</span>${val}</div>`;
    });
    html += `</div>`;
    return html;
}

// Distribution of payment methods from sales payments.
// When quotation_invoice_accounting is ON, also includes embedded payments from quotation invoices.
export function PaymentMethodPieChart({ payments, store, quotations }) {
    const qtnInvoiceAccounting = store?.settings?.quotation_invoice_accounting === true;

    const data = useMemo(() => {
        // salesMap: method → amount from regular sales payments
        const salesMap = {};
        payments.forEach(p => {
            const m = p.method || "other";
            salesMap[m] = (salesMap[m] || 0) + (p.amount || 0);
        });

        // qtnMap: method → amount from quotation invoice embedded payments (when flag ON)
        const qtnMap = {};
        if (qtnInvoiceAccounting) {
            (quotations || [])
                .filter(q => q.type === "invoice")
                .forEach(q => {
                    (q.payments || []).forEach(p => {
                        const m = p.method || "other";
                        qtnMap[m] = (qtnMap[m] || 0) + (p.amount || 0);
                    });
                });
        }

        const allMethods = new Set([...Object.keys(salesMap), ...Object.keys(qtnMap)]);
        const combined = Array.from(allMethods).map(m => ({
            method: m,
            sales: salesMap[m] || 0,
            qtn:   qtnMap[m]   || 0,
            total: (salesMap[m] || 0) + (qtnMap[m] || 0),
        })).filter(r => r.total > 0).sort((a, b) => b.total - a.total);

        if (combined.length === 0) return null;

        const grandTotal = combined.reduce((s, r) => s + r.total, 0);

        const header = ["Method", "Amount (SAR)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = combined.map(r => {
            const pct = grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : "0.0";
            const lines = [
                { label: "Amount",   value: `SAR ${fmtT(r.total)}`, bold: true, color: "#f8f9fa" },
                { label: "Share",    value: `${pct}% of total collected` },
                { divider: true, label: "Formula", value: `Payments where method = "${r.method}"` },
                { label: "Sales Payments",          value: `${fmtT(r.sales)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Payments", value: `${fmtT(r.qtn)}` }] : []),
            ];
            return [
                METHOD_LABELS[r.method] || r.method,
                parseFloat(r.total.toFixed(2)),
                tooltipHtml(METHOD_LABELS[r.method] || r.method, "#f6c23e", lines),
            ];
        });

        return [header, ...rows];
    }, [payments, quotations, qtnInvoiceAccounting]);

    if (!data) return <p className="text-muted small">No payment data</p>;
    return (
        <Chart
            chartType="PieChart"
            data={data}
            options={{
                title: "Payment Method Distribution",
                legend: { position: "right" },
                chartArea: { width: "70%", height: "75%" },
                pieSliceText: "percentage",
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="320px"
        />
    );
}

// Payment status distribution — groups order net_total by payment_status.
// When quotation_invoice_accounting is ON, also includes quotation invoices.
export function PaymentStatusPieChart({ orders, store, quotations }) {
    const qtnInvoiceAccounting = store?.settings?.quotation_invoice_accounting === true;

    const data = useMemo(() => {
        const salesMap = { paid: 0, not_paid: 0, paid_partially: 0 };
        orders.forEach(o => {
            const s = o.payment_status || "";
            if (s === "paid")           salesMap.paid           += o.net_total || 0;
            else if (s === "not_paid")  salesMap.not_paid       += o.net_total || 0;
            else if (s === "paid_partially") salesMap.paid_partially += o.net_total || 0;
        });

        const qtnMap = { paid: 0, not_paid: 0, paid_partially: 0 };
        if (qtnInvoiceAccounting) {
            (quotations || []).filter(q => q.type === "invoice").forEach(q => {
                const s = q.payment_status || "";
                if (s === "paid")           qtnMap.paid           += q.net_total || 0;
                else if (s === "not_paid")  qtnMap.not_paid       += q.net_total || 0;
                else if (s === "paid_partially") qtnMap.paid_partially += q.net_total || 0;
            });
        }

        const statuses = [
            { key: "paid",           label: "Paid",            color: "#1cc88a" },
            { key: "not_paid",       label: "Unpaid",          color: "#e74a3b" },
            { key: "paid_partially", label: "Partially Paid",  color: "#f6c23e" },
        ];

        const combined = statuses.map(s => ({
            ...s,
            sales: salesMap[s.key],
            qtn:   qtnMap[s.key],
            total: salesMap[s.key] + qtnMap[s.key],
        })).filter(r => r.total > 0);

        if (combined.length === 0) return null;

        const grandTotal = combined.reduce((s, r) => s + r.total, 0);

        const header = ["Status", "Amount (SAR)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = combined.map(r => {
            const pct = grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : "0.0";
            const lines = [
                { label: "Amount",  value: `SAR ${fmtT(r.total)}`, bold: true, color: r.color },
                { label: "Share",   value: `${pct}% of total orders` },
                { divider: true, label: "Formula", value: `net_total where payment_status = "${r.key}"` },
                { label: "Sales Orders",      value: `${fmtT(r.sales)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoices", value: `${fmtT(r.qtn)}` }] : []),
            ];
            return [r.label, parseFloat(r.total.toFixed(2)), tooltipHtml(r.label, r.color, lines)];
        });

        return [header, ...rows];
    }, [orders, quotations, qtnInvoiceAccounting]);

    if (!data) return <p className="text-muted small">No order data</p>;
    return (
        <Chart
            chartType="PieChart"
            data={data}
            options={{
                title: "Payment Status Overview",
                colors: ["#1cc88a", "#e74a3b", "#f6c23e"],
                legend: { position: "right" },
                chartArea: { width: "70%", height: "75%" },
                pieHole: 0.4,
                pieSliceText: "percentage",
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="320px"
        />
    );
}

// Cash = payments where method === "cash"
// Bank/Card = payments where method !== "cash" (debit_card, bank_card, credit_card, bank_transfer, bank_cheque, customer_account, …)
// When quotation_invoice_accounting is ON, also includes embedded payments from quotation invoices.
export function CashVsBankTrendChart({ payments, store, quotations }) {
    const qtnInvoiceAccounting = store?.settings?.quotation_invoice_accounting === true;

    const data = useMemo(() => {
        // Per-month buckets: cash/bank from sales payments + (optionally) qtn invoice payments
        const map = {};

        function ensure(key) {
            if (!map[key]) map[key] = {
                cashSales: 0, bankSales: 0,
                cashQtn: 0,   bankQtn: 0,
                bankMethodsSales: {}, bankMethodsQtn: {},
            };
        }

        function monthKey(dateVal) {
            const d = new Date(dateVal);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        }

        // Regular sales payments
        payments.forEach(p => {
            if (!p.date || !p.amount) return;
            const key = monthKey(p.date);
            ensure(key);
            if (p.method === "cash") {
                map[key].cashSales += p.amount;
            } else {
                map[key].bankSales += p.amount;
                const m = p.method || "other";
                map[key].bankMethodsSales[m] = (map[key].bankMethodsSales[m] || 0) + p.amount;
            }
        });

        // Quotation invoice embedded payments (when flag ON)
        if (qtnInvoiceAccounting) {
            (quotations || [])
                .filter(q => q.type === "invoice")
                .forEach(q => {
                    (q.payments || []).forEach(p => {
                        if (!p.amount) return;
                        const key = monthKey(q.date);
                        ensure(key);
                        if (p.method === "cash") {
                            map[key].cashQtn += p.amount;
                        } else {
                            map[key].bankQtn += p.amount;
                            const m = p.method || "other";
                            map[key].bankMethodsQtn[m] = (map[key].bankMethodsQtn[m] || 0) + p.amount;
                        }
                    });
                });
        }

        const keys = Object.keys(map).sort();
        if (keys.length === 0) return null;

        const header = [
            "Month",
            "Cash (SAR)",     { role: "tooltip", type: "string", p: { html: true } },
            "Bank/Card (SAR)", { role: "tooltip", type: "string", p: { html: true } },
        ];

        const rows = keys.map(k => {
            const [y, m] = k.split("-");
            const label = `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
            const b = map[k];

            const totalCash = b.cashSales + b.cashQtn;
            const totalBank = b.bankSales + b.bankQtn;

            // Cash tooltip
            const cashLines = [
                { label: "Cash Total", value: `SAR ${fmtT(totalCash)}`, bold: true, color: "#f6c23e" },
                { divider: true, label: "Formula", value: 'Payments where method = "cash"' },
                { label: "Sales Payments", value: `${fmtT(b.cashSales)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Payments", value: `${fmtT(b.cashQtn)}` }] : []),
            ];

            // Bank/Card tooltip — show method breakdown across all sources
            const combinedMethods = {};
            [b.bankMethodsSales, b.bankMethodsQtn].forEach(src => {
                Object.entries(src).forEach(([method, amt]) => {
                    combinedMethods[method] = (combinedMethods[method] || 0) + amt;
                });
            });
            const methodBreakdown = Object.entries(combinedMethods)
                .filter(([, v]) => v > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([method, amt]) => ({ label: METHOD_LABELS[method] || method, value: `${fmtT(amt)}` }));

            const bankLines = [
                { label: "Bank/Card Total", value: `SAR ${fmtT(totalBank)}`, bold: true, color: "#4e73df" },
                { divider: true, label: "Formula", value: "All non-cash payment methods" },
                { label: "Sales Payments", value: `${fmtT(b.bankSales)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Payments", value: `${fmtT(b.bankQtn)}` }] : []),
                ...(methodBreakdown.length ? [{ divider: true, label: "By Method", value: "" }] : []),
                ...methodBreakdown,
            ];

            return [
                label,
                parseFloat(totalCash.toFixed(2)),
                tooltipHtml(`Cash Collections — ${label}`, "#f6c23e", cashLines),
                parseFloat(totalBank.toFixed(2)),
                tooltipHtml(`Bank/Card Collections — ${label}`, "#4e73df", bankLines),
            ];
        });

        return [header, ...rows];
    }, [payments, quotations, qtnInvoiceAccounting]);

    if (!data) return <p className="text-muted small">No data</p>;
    return (
        <Chart
            chartType="ColumnChart"
            data={data}
            options={{
                title: "Cash vs Bank Collections by Month",
                colors: ["#f6c23e", "#4e73df"],
                legend: { position: "top" },
                vAxis: { title: "SAR" },
                chartArea: { width: "80%", height: "65%" },
                isStacked: true,
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="320px"
        />
    );
}
