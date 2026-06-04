import React, { useMemo } from "react";
import { Chart } from "react-google-charts";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key) {
    const [y, m] = key.split("-");
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

// Build a map of { key: value } from any array using a date field and value getter
function buildMap(arr, dateFn, valueFn) {
    const map = {};
    arr.forEach(item => {
        const key = monthKey(dateFn(item));
        map[key] = (map[key] || 0) + valueFn(item);
    });
    return map;
}

// ── Chart 1: Monthly P&L Trend ───────────────────────────────────────────────
// Mirrors the exact P&L formula used in KPICards / stats/index.js:
//   Revenue = Sales − Sales Returns
//           + (qtnInvoiceAccounting ? QtnInvoiceSales − QtnInvoiceReturns : 0)
//   Expense = disablePurchasesOnAccounts
//             ? Expenses − DepositPurchaseFund + AccountedPurchases − AccountedPurchaseReturns
//             : Expenses + Purchases − PurchaseReturns
//   Profit  = Revenue − Expense
function fmtT(n) {
    if (!n && n !== 0) return "0.00";
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tooltipHtml(title, titleColor, lines) {
    const headerStyle = `font-size:0.8rem;font-weight:700;color:${titleColor};margin-bottom:6px;`;
    const rowStyle    = "font-size:0.75rem;line-height:1.7;white-space:nowrap;";
    const dividerStyle = "border-top:1px solid #495057;margin-top:6px;padding-top:6px;";
    const labelStyle  = "color:#adb5bd;margin-right:4px;";

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

export function MonthlyRevenueTrendChart({
    store, orders, returns, purchases, purchaseReturns, expenses,
    quotations, quotationSalesReturns,
    accountedPurchases, accountedPurchaseReturns, customerDeposits,
}) {
    const qtnInvoiceAccounting       = store?.settings?.quotation_invoice_accounting === true;
    const disablePurchasesOnAccounts = store?.settings?.disable_purchases_on_accounts === true;
    const vatPercent                 = store?.vat_percent || 15;

    const data = useMemo(() => {
        const salesMap        = buildMap(orders,                   o => o.date, o => o.net_total || 0);
        const returnMap       = buildMap(returns,                   r => r.date, r => r.net_total || 0);
        const purchaseMap     = buildMap(purchases,                p => p.date, p => p.net_total || 0);
        const purRetMap       = buildMap(purchaseReturns,          p => p.date, p => p.net_total || 0);
        const expenseMap      = buildMap(expenses,                 e => e.date, e => e.amount    || 0);
        // Filter for type="invoice" client-side — mirrors GetQuotationInvoiceStats logic exactly
        const quotationInvoices = (quotations || []).filter(q => q.type === "invoice");
        const qtnInvMap       = buildMap(quotationInvoices,        q => q.date, q => q.net_total || 0);
        const qtnRetMap       = buildMap(quotationSalesReturns,    q => q.date, q => q.net_total || 0);
        const acctPurMap      = buildMap(accountedPurchases,       p => p.date, p => p.net_total || 0);
        const acctPurRetMap   = buildMap(accountedPurchaseReturns, p => p.date, p => p.net_total || 0);

        // Compute per-month deposit purchase_fund from payments array
        const depositPurchaseFundMap = {};
        (customerDeposits || []).forEach(d => {
            const key = monthKey(d.date);
            const pf = (d.payments || [])
                .filter(p => p.method === "purchase_fund")
                .reduce((sum, p) => sum + (p.amount || 0), 0);
            depositPurchaseFundMap[key] = (depositPurchaseFundMap[key] || 0) + pf;
        });

        const allKeys = Array.from(new Set([
            ...Object.keys(salesMap),
            ...Object.keys(returnMap),
            ...Object.keys(purchaseMap),
            ...Object.keys(purRetMap),
            ...Object.keys(expenseMap),
            ...(qtnInvoiceAccounting ? [...Object.keys(qtnInvMap), ...Object.keys(qtnRetMap)] : []),
            ...(disablePurchasesOnAccounts ? [...Object.keys(acctPurMap), ...Object.keys(acctPurRetMap), ...Object.keys(depositPurchaseFundMap)] : []),
        ])).sort();

        if (allKeys.length === 0) return null;

        // Header: data columns interleaved with tooltip role columns
        const header = [
            "Month",
            "Net Revenue (SAR)", { role: "tooltip", type: "string", p: { html: true } },
            "Expense (SAR)",     { role: "tooltip", type: "string", p: { html: true } },
            "Profit/Loss (SAR)", { role: "tooltip", type: "string", p: { html: true } },
        ];

        const rows = allKeys.map(k => {
            const sales      = salesMap[k]    || 0;
            const ret        = returnMap[k]   || 0;
            const qtnInv     = qtnInvMap[k]   || 0;
            const qtnRet     = qtnRetMap[k]   || 0;
            const exp        = expenseMap[k]  || 0;
            const pur        = purchaseMap[k] || 0;
            const purRet     = purRetMap[k]   || 0;
            const depFund    = depositPurchaseFundMap[k] || 0;
            const acctPur    = acctPurMap[k]    || 0;
            const acctPurRet = acctPurRetMap[k] || 0;

            const revenue = (sales - ret) + (qtnInvoiceAccounting ? qtnInv - qtnRet : 0);

            const expense = disablePurchasesOnAccounts
                ? exp - depFund + acctPur - acctPurRet
                : exp + pur - purRet;

            const profit           = revenue - expense;
            const profitVat        = profit * vatPercent / (100 + vatPercent);
            const profitWithoutVAT = profit - profitVat;
            const isProfitable     = profit >= 0;

            // ── Revenue tooltip ──────────────────────────────────────────────
            // When flag is ON, always show qtn lines even if zero so the user
            // can verify the value (requirement: "show them even if it is empty")
            const revLines = [
                { label: "Net Revenue", value: `SAR ${fmtT(revenue)}`, bold: true, color: "#74c0fc" },
                { divider: true, label: "Gross Sales", value: `SAR ${fmtT(sales)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Sales", value: `+ SAR ${fmtT(qtnInv)}` }] : []),
                { label: "Sales Returns", value: `− SAR ${fmtT(ret)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Returns",       value: `− SAR ${fmtT(qtnRet)}` }] : []),
            ];

            // ── Expense tooltip ──────────────────────────────────────────────
            const expLines = disablePurchasesOnAccounts ? [
                { label: "Total Expense", value: `SAR ${fmtT(expense)}`, bold: true, color: "#ffa8a8" },
                { divider: true, label: "Expenses", value: `SAR ${fmtT(exp)}` },
                { label: "Purchase Return Fund", value: `− SAR ${fmtT(depFund)}` },
                { label: "Accounted Purchases", value: `+ SAR ${fmtT(acctPur)}` },
                { label: "Accounted Pur. Returns", value: `− SAR ${fmtT(acctPurRet)}` },
            ] : [
                { label: "Total Expense", value: `SAR ${fmtT(expense)}`, bold: true, color: "#ffa8a8" },
                { divider: true, label: "Expenses", value: `SAR ${fmtT(exp)}` },
                { label: "Purchases", value: `+ SAR ${fmtT(pur)}` },
                { label: "Purchase Returns", value: `− SAR ${fmtT(purRet)}` },
            ];

            // ── Profit/Loss tooltip ──────────────────────────────────────────
            const plColor  = isProfitable ? "#69db7c" : "#ffa8a8";
            const plTitle  = isProfitable ? "Net Profit" : "Net Loss";
            const plLines  = [
                { label: `${plTitle} (w/ VAT)`,   value: `SAR ${fmtT(Math.abs(profit))}`,           bold: true, color: plColor },
                { label: `${plTitle} (w/o VAT)`,  value: `SAR ${fmtT(Math.abs(profitWithoutVAT))}`, bold: true },
                { label: `VAT ${vatPercent}%`,     value: `SAR ${fmtT(Math.abs(profitVat))}` },
                { divider: true, label: "Net Revenue",   value: `SAR ${fmtT(revenue)}` },
                { label: "Total Expense",  value: `− SAR ${fmtT(expense)}` },
            ];

            return [
                monthLabel(k),
                parseFloat(revenue.toFixed(2)),
                tooltipHtml(`Net Revenue — ${monthLabel(k)}`, "#74c0fc", revLines),
                parseFloat(expense.toFixed(2)),
                tooltipHtml(`Expense — ${monthLabel(k)}`, "#ffa8a8", expLines),
                parseFloat(profit.toFixed(2)),
                tooltipHtml(`${plTitle} — ${monthLabel(k)}`, plColor, plLines),
            ];
        });

        return [header, ...rows];
    }, [orders, returns, purchases, purchaseReturns, expenses,
        quotations, quotationSalesReturns, accountedPurchases, accountedPurchaseReturns,
        customerDeposits, qtnInvoiceAccounting, disablePurchasesOnAccounts, vatPercent]);

    if (!data) return <p className="text-muted small">No data</p>;
    return (
        <Chart
            chartType="ComboChart"
            data={data}
            options={{
                title: "Monthly P&L Trend",
                seriesType: "bars",
                series: {
                    0: { type: "bars", color: "#4e73df" },
                    1: { type: "bars", color: "#e74a3b" },
                    2: { type: "line", color: "#1cc88a", pointSize: 5, lineWidth: 2 },
                },
                legend: { position: "top" },
                vAxis: { title: "SAR" },
                chartArea: { width: "78%", height: "62%" },
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="340px"
        />
    );
}

// ── Chart 2: Cumulative Net Revenue (P&L Revenue) ────────────────────────────
export function CumulativeRevenueChart({ store, orders, returns, quotations, quotationSalesReturns }) {
    const qtnInvoiceAccounting = store?.settings?.quotation_invoice_accounting === true;

    const data = useMemo(() => {
        const salesMap  = buildMap(orders,   o => o.date, o => o.net_total || 0);
        const returnMap = buildMap(returns,  r => r.date, r => r.net_total || 0);

        const quotationInvoices = (quotations || []).filter(q => q.type === "invoice");
        const qtnInvMap = qtnInvoiceAccounting ? buildMap(quotationInvoices,     q => q.date, q => q.net_total || 0) : {};
        const qtnRetMap = qtnInvoiceAccounting ? buildMap(quotationSalesReturns || [], q => q.date, q => q.net_total || 0) : {};

        const keys = Array.from(new Set([
            ...Object.keys(salesMap),
            ...Object.keys(returnMap),
            ...(qtnInvoiceAccounting ? [...Object.keys(qtnInvMap), ...Object.keys(qtnRetMap)] : []),
        ])).sort();
        if (keys.length === 0) return null;

        const header = [
            "Month",
            "Cumulative Net Revenue (SAR)",
            { role: "tooltip", type: "string", p: { html: true } },
        ];

        let cumulative = 0;
        const rows = keys.map(k => {
            const sales   = salesMap[k]  || 0;
            const ret     = returnMap[k] || 0;
            const qtnInv  = qtnInvMap[k] || 0;
            const qtnRet  = qtnRetMap[k] || 0;
            const monthNet = (sales - ret) + (qtnInvoiceAccounting ? qtnInv - qtnRet : 0);
            const prevCum  = cumulative;
            cumulative    += monthNet;

            const tip = tooltipHtml(`Cumulative — ${monthLabel(k)}`, "#74c0fc", [
                { label: "Cumulative Total",      value: `SAR ${fmtT(cumulative)}`, bold: true, color: "#74c0fc" },
                { divider: true, label: "Previous Cumulative", value: `SAR ${fmtT(prevCum)}` },
                { label: "Gross Sales",           value: `+ SAR ${fmtT(sales)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Sales", value: `+ SAR ${fmtT(qtnInv)}` }] : []),
                { label: "Sales Returns",         value: `− SAR ${fmtT(ret)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Returns",       value: `− SAR ${fmtT(qtnRet)}` }] : []),
                { label: "This Month Net",        value: `= SAR ${fmtT(monthNet)}`, bold: true,
                  color: monthNet >= 0 ? "#69db7c" : "#ffa8a8" },
            ]);

            return [monthLabel(k), parseFloat(cumulative.toFixed(2)), tip];
        });

        return [header, ...rows];
    }, [orders, returns, quotations, quotationSalesReturns, qtnInvoiceAccounting]);

    if (!data) return <p className="text-muted small">No data</p>;
    return (
        <Chart
            chartType="AreaChart"
            data={data}
            options={{
                title: "Cumulative Net Revenue Growth",
                colors: ["#4e73df"],
                legend: { position: "none" },
                vAxis: { title: "SAR" },
                chartArea: { width: "80%", height: "65%" },
                areaOpacity: 0.3,
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="300px"
        />
    );
}

// ── Chart 3: Last 12 Months — Monthly Gross Sales ────────────────────────────
export function Last30DaysSalesChart({ orders }) {
    const data = useMemo(() => {
        const map = {};
        orders.forEach(o => {
            const key = monthKey(o.date);
            if (key) map[key] = (map[key] || 0) + (o.net_total || 0);
        });
        // Show at most the last 12 months
        const keys = Object.keys(map).sort().slice(-12);
        if (keys.length === 0) return null;
        return [
            ["Month", "Gross Sales (SAR)"],
            ...keys.map(k => [monthLabel(k), parseFloat(map[k].toFixed(2))]),
        ];
    }, [orders]);

    if (!data) return <p className="text-muted small">No sales data</p>;
    return (
        <Chart
            chartType="ColumnChart"
            data={data}
            options={{
                title: "Last 12 Months — Monthly Sales",
                colors: ["#36b9cc"],
                legend: { position: "none" },
                vAxis: { title: "SAR" },
                chartArea: { width: "80%", height: "65%" },
            }}
            width="100%"
            height="300px"
        />
    );
}

// ── Chart 4: Sales vs Returns by Month ───────────────────────────────────────
export function SalesVsReturnsChart({ orders, returns }) {
    const data = useMemo(() => {
        const salesMap  = buildMap(orders,  o => o.date, o => o.net_total || 0);
        const returnMap = buildMap(returns, r => r.date, r => r.net_total || 0);

        const keys = Array.from(new Set([...Object.keys(salesMap), ...Object.keys(returnMap)])).sort();
        if (keys.length === 0) return null;

        const rows = keys.map(k => [
            monthLabel(k),
            parseFloat((salesMap[k] || 0).toFixed(2)),
            parseFloat((returnMap[k] || 0).toFixed(2)),
        ]);
        return [["Month", "Gross Sales (SAR)", "Returns (SAR)"], ...rows];
    }, [orders, returns]);

    if (!data) return <p className="text-muted small">No data</p>;
    return (
        <Chart
            chartType="ColumnChart"
            data={data}
            options={{
                title: "Sales vs Returns by Month",
                colors: ["#1cc88a", "#e74a3b"],
                legend: { position: "top" },
                vAxis: { title: "SAR" },
                chartArea: { width: "80%", height: "65%" },
            }}
            width="100%"
            height="320px"
        />
    );
}
