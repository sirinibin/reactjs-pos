import React, { useMemo } from "react";
import { Chart } from "react-google-charts";
import { tooltipHtml } from './chartTooltipSetup';

function fmtT(n) {
    if (!n && n !== 0) return "0.00";
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


// customerSummaries: array of { customer_name, sales_amount, qtn_amount, total_amount, outstanding }
// from GET /v1/dashboard/customers. Already sorted by total_amount descending.
export function TopCustomersChart({ customerSummaries, store, filters }) {
    const qtnInvoiceAccounting = store?.settings?.quotation_invoice_accounting === true;
    const vatPercent           = store?.vat_percent || 15;

    const data = useMemo(() => {
        const top = (customerSummaries || []).slice(0, 10);
        if (top.length === 0) return null;

        const header = ["Customer", "Revenue (SAR)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = top.map(r => {
            const total           = r.total_amount || 0;
            const revVat          = total * vatPercent / (100 + vatPercent);
            const revWithoutVAT   = total - revVat;
            const lines = [
                { label: "Formula",      value: "Sum of net_total across all orders" },
                { label: "Sales Orders", value: `${fmtT(r.sales_amount)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Orders", value: `${fmtT(r.qtn_amount || 0)}` }] : []),
                { divider: true, label: "Total Revenue (with VAT)",    value: `SAR ${fmtT(total)}`, bold: true, color: "#74c0fc" },
                { label: `VAT ${vatPercent}%`,                          value: `− ${fmtT(revVat)}` },
                { divider: true, label: "Total Revenue (without VAT)", value: `SAR ${fmtT(revWithoutVAT)}`, bold: true },
            ];
            return [r.customer_name, parseFloat(total.toFixed(2)), tooltipHtml(r.customer_name, "#74c0fc", lines, store, filters)];
        });
        return [header, ...rows];
    }, [customerSummaries, qtnInvoiceAccounting, vatPercent]);

    if (!data) return <p className="text-muted small">No customer data</p>;
    return (
        <Chart
            chartType="BarChart"
            data={data}
            options={{
                title: "Top 10 Customers by Revenue",
                colors: ["#4e73df"],
                legend: { position: "none" },
                hAxis: { title: "SAR" },
                chartArea: { width: "60%", height: "80%" },
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="340px"
        />
    );
}

// outstandingSummaries: array of { customer_name, outstanding } from /v1/dashboard/outstanding
export function OutstandingReceivablesChart({ outstandingSummaries, store, filters }) {
    const data = useMemo(() => {
        const entries = (outstandingSummaries || []).filter(c => (c.outstanding || 0) > 0).slice(0, 10);
        if (entries.length === 0) return null;

        const header = ["Customer", "Outstanding (SAR)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = entries.map(c => {
            const amount = parseFloat((c.outstanding || 0).toFixed(2));
            const lines = [
                { label: "Outstanding", value: `SAR ${fmtT(amount)}`, bold: true, color: "#ffa8a8" },
                { divider: true, label: "Formula", value: "Total invoiced − Total paid (server-aggregated)" },
                { label: "Source", value: "customer.credit_balance" },
            ];
            return [c.customer_name || "Unknown", amount, tooltipHtml(c.customer_name || "Unknown", "#e74a3b", lines, store, filters)];
        });

        return [header, ...rows];
    }, [outstandingSummaries]);

    if (!data) return <p className="text-muted small">No outstanding balances</p>;
    return (
        <Chart
            chartType="BarChart"
            data={data}
            options={{
                title: "Outstanding Receivables by Customer",
                colors: ["#e74a3b"],
                legend: { position: "none" },
                hAxis: { title: "SAR" },
                chartArea: { width: "60%", height: "80%" },
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="320px"
        />
    );
}
