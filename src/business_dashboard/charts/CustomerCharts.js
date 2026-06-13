import React, { useMemo } from "react";
import { Chart } from "react-google-charts";

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

// customerSummaries: array of { customer_name, sales_amount, qtn_amount, total_amount, outstanding }
// from GET /v1/dashboard/customers. Already sorted by total_amount descending.
export function TopCustomersChart({ customerSummaries, store }) {
    const qtnInvoiceAccounting = store?.settings?.quotation_invoice_accounting === true;

    const data = useMemo(() => {
        const top = (customerSummaries || []).slice(0, 10);
        if (top.length === 0) return null;

        const header = ["Customer", "Revenue (SAR)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = top.map(r => {
            const lines = [
                { label: "Total Revenue",  value: `SAR ${fmtT(r.total_amount)}`, bold: true, color: "#74c0fc" },
                { divider: true, label: "Formula", value: "Sum of net_total across all orders" },
                { label: "Sales Orders",   value: `${fmtT(r.sales_amount)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Orders", value: `${fmtT(r.qtn_amount || 0)}` }] : []),
            ];
            return [r.customer_name, parseFloat((r.total_amount || 0).toFixed(2)), tooltipHtml(r.customer_name, "#74c0fc", lines)];
        });
        return [header, ...rows];
    }, [customerSummaries, qtnInvoiceAccounting]);

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
export function OutstandingReceivablesChart({ outstandingSummaries }) {
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
            return [c.customer_name || "Unknown", amount, tooltipHtml(c.customer_name || "Unknown", "#e74a3b", lines)];
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
