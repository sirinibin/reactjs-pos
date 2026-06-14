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

        // Cash discount maps
        const salesCDMap       = buildMap(orders,                   o => o.date, o => o.cash_discount || 0);
        const salesRetCDMap    = buildMap(returns,                   r => r.date, r => r.cash_discount || 0);
        const purCDMap         = buildMap(purchases,                p => p.date, p => p.cash_discount || 0);
        const purRetCDMap      = buildMap(purchaseReturns,          p => p.date, p => p.cash_discount || 0);
        const acctPurCDMap     = buildMap(accountedPurchases,       p => p.date, p => p.cash_discount || 0);
        const acctPurRetCDMap  = buildMap(accountedPurchaseReturns, p => p.date, p => p.cash_discount || 0);
        const qtnInvCDMap      = buildMap(quotationInvoices,        q => q.date, q => q.cash_discount || 0);
        const qtnRetCDMap      = buildMap(quotationSalesReturns,    q => q.date, q => q.cash_discount || 0);

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

            const salesCD       = salesCDMap[k]      || 0;
            const salesRetCD    = salesRetCDMap[k]   || 0;
            const purCD         = purCDMap[k]         || 0;
            const purRetCD      = purRetCDMap[k]      || 0;
            const acctPurCD     = acctPurCDMap[k]     || 0;
            const acctPurRetCD  = acctPurRetCDMap[k]  || 0;
            const qtnInvCD      = qtnInvCDMap[k]      || 0;
            const qtnRetCD      = qtnRetCDMap[k]      || 0;

            const revenue = (sales - ret) + (qtnInvoiceAccounting ? qtnInv - qtnRet : 0);

            const purCDAdj    = disablePurchasesOnAccounts ? acctPurCD    : purCD;
            const purRetCDAdj = disablePurchasesOnAccounts ? acctPurRetCD : purRetCD;
            const cashDiscountAdj = salesCD - salesRetCD + purRetCDAdj - purCDAdj
                + (qtnInvoiceAccounting ? qtnInvCD - qtnRetCD : 0);

            const expense = (disablePurchasesOnAccounts
                ? exp - depFund + acctPur - acctPurRet
                : exp + pur - purRet)
                + cashDiscountAdj;

            const profit           = revenue - expense;
            const profitVat        = profit * vatPercent / (100 + vatPercent);
            const profitWithoutVAT = profit - profitVat;
            const isProfitable     = profit >= 0;

            const revenueVat        = revenue * vatPercent / (100 + vatPercent);
            const revenueWithoutVAT = revenue - revenueVat;
            const expenseVat        = expense * vatPercent / (100 + vatPercent);
            const expenseWithoutVAT = expense - expenseVat;

            // ── Revenue tooltip ──────────────────────────────────────────────
            const revLines = [
                { label: "Net Revenue (with VAT)", value: `SAR ${fmtT(revenue)}`, bold: true, color: "#74c0fc" },
                { label: `VAT ${vatPercent}%`, value: `− ${fmtT(revenueVat)}` },
                { label: "Net Revenue (without VAT)", value: `SAR ${fmtT(revenueWithoutVAT)}`, bold: true, color: "#74c0fc" },
                { divider: true, label: "Gross Sales", value: `${fmtT(sales)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Sales", value: `+ ${fmtT(qtnInv)}` }] : []),
                { label: "Sales Returns", value: `− ${fmtT(ret)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Returns",       value: `− ${fmtT(qtnRet)}` }] : []),
            ];

            // ── Expense tooltip ──────────────────────────────────────────────
            const expLines = disablePurchasesOnAccounts ? [
                { label: "Total Expense (with VAT)", value: `SAR ${fmtT(expense)}`, bold: true, color: "#ffa8a8" },
                { label: `VAT ${vatPercent}%`, value: `− ${fmtT(expenseVat)}` },
                { label: "Total Expense (without VAT)", value: `SAR ${fmtT(expenseWithoutVAT)}`, bold: true, color: "#ffa8a8" },
                { divider: true, label: "Expenses", value: `${fmtT(exp)}` },
                { label: "Purchase Return Fund", value: `− ${fmtT(depFund)}` },
                { label: "Accounted Purchases", value: `+ ${fmtT(acctPur)}` },
                { label: "Accounted Pur. Returns", value: `− ${fmtT(acctPurRet)}` },
                { label: "Sales Cash Discount", value: `+ ${fmtT(salesCD)}` },
                { label: "Acct. Pur. Return C.D.", value: `+ ${fmtT(acctPurRetCD)}` },
                { label: "Sales Return Cash Discount", value: `− ${fmtT(salesRetCD)}` },
                { label: "Acct. Purchase C.D.", value: `− ${fmtT(acctPurCD)}` },
                ...(qtnInvoiceAccounting ? [
                    { label: "Qtn. Sales Cash Discount", value: `+ ${fmtT(qtnInvCD)}` },
                    { label: "Qtn. Sales Ret. C.D.", value: `− ${fmtT(qtnRetCD)}` },
                ] : []),
            ] : [
                { label: "Total Expense (with VAT)", value: `SAR ${fmtT(expense)}`, bold: true, color: "#ffa8a8" },
                { label: `VAT ${vatPercent}%`, value: `− ${fmtT(expenseVat)}` },
                { label: "Total Expense (without VAT)", value: `SAR ${fmtT(expenseWithoutVAT)}`, bold: true, color: "#ffa8a8" },
                { divider: true, label: "Expenses", value: `${fmtT(exp)}` },
                { label: "Purchases", value: `+ ${fmtT(pur)}` },
                { label: "Purchase Returns", value: `− ${fmtT(purRet)}` },
                { label: "Sales Cash Discount", value: `+ ${fmtT(salesCD)}` },
                { label: "Pur. Return Cash Discount", value: `+ ${fmtT(purRetCD)}` },
                { label: "Sales Return Cash Discount", value: `− ${fmtT(salesRetCD)}` },
                { label: "Purchase Cash Discount", value: `− ${fmtT(purCD)}` },
                ...(qtnInvoiceAccounting ? [
                    { label: "Qtn. Sales Cash Discount", value: `+ ${fmtT(qtnInvCD)}` },
                    { label: "Qtn. Sales Ret. C.D.", value: `− ${fmtT(qtnRetCD)}` },
                ] : []),
            ];

            // ── Profit/Loss tooltip ──────────────────────────────────────────
            const plColor  = isProfitable ? "#69db7c" : "#ffa8a8";
            const plTitle  = isProfitable ? "Net Profit" : "Net Loss";
            const plLines  = [
                { label: `${plTitle} (w/ VAT)`,   value: `SAR ${fmtT(Math.abs(profit))}`,           bold: true, color: plColor },
                { label: `${plTitle} (w/o VAT)`,  value: `SAR ${fmtT(Math.abs(profitWithoutVAT))}`, bold: true },
                { label: `VAT ${vatPercent}%`,     value: `${fmtT(Math.abs(profitVat))}` },
                { divider: true, label: "Net Revenue",   value: `${fmtT(revenue)}` },
                { label: "Total Expense",  value: `− ${fmtT(expense)}` },
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
        // Note: cash discount fields (cash_discount on each record) are derived from the same
        // arrays above, so no additional deps needed.

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
    const vatPercent           = store?.vat_percent || 15;

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

            const cumulativeVat        = cumulative * vatPercent / (100 + vatPercent);
            const cumulativeWithoutVAT = cumulative - cumulativeVat;
            const monthNetVat          = monthNet * vatPercent / (100 + vatPercent);
            const monthNetWithoutVAT   = monthNet - monthNetVat;
            const tip = tooltipHtml(`Cumulative — ${monthLabel(k)}`, "#74c0fc", [
                { label: "Cumulative (with VAT)",    value: `SAR ${fmtT(cumulative)}`, bold: true, color: "#74c0fc" },
                { label: `VAT ${vatPercent}%`,       value: `− ${fmtT(cumulativeVat)}` },
                { label: "Cumulative (without VAT)", value: `SAR ${fmtT(cumulativeWithoutVAT)}`, bold: true, color: "#74c0fc" },
                { divider: true, label: "Previous Cumulative", value: `${fmtT(prevCum)}` },
                { label: "Gross Sales",              value: `+ ${fmtT(sales)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Sales", value: `+ ${fmtT(qtnInv)}` }] : []),
                { label: "Sales Returns",            value: `− ${fmtT(ret)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Returns",       value: `− ${fmtT(qtnRet)}` }] : []),
                { label: "This Month Net (w/ VAT)",  value: `= SAR ${fmtT(monthNet)}`, bold: true, color: monthNet >= 0 ? "#69db7c" : "#ffa8a8" },
                { label: "This Month Net (w/o VAT)", value: `= SAR ${fmtT(monthNetWithoutVAT)}`, bold: true },
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
export function Last30DaysSalesChart({ orders, store }) {
    const vatPercent = store?.vat_percent || 15;
    const data = useMemo(() => {
        const map = {};
        orders.forEach(o => {
            const key = monthKey(o.date);
            if (key) map[key] = (map[key] || 0) + (o.net_total || 0);
        });
        const keys = Object.keys(map).sort().slice(-12);
        if (keys.length === 0) return null;
        const header = ["Month", "Gross Sales (SAR)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = keys.map(k => {
            const sales = map[k];
            const salesVat        = sales * vatPercent / (100 + vatPercent);
            const salesWithoutVAT = sales - salesVat;
            const tip = tooltipHtml(`${monthLabel(k)}`, "#36b9cc", [
                { label: "Gross Sales (with VAT)",    value: `SAR ${fmtT(sales)}`, bold: true, color: "#36b9cc" },
                { label: `VAT ${vatPercent}%`,        value: `− ${fmtT(salesVat)}` },
                { label: "Gross Sales (without VAT)", value: `SAR ${fmtT(salesWithoutVAT)}`, bold: true },
            ]);
            return [monthLabel(k), parseFloat(sales.toFixed(2)), tip];
        });
        return [header, ...rows];
    }, [orders, vatPercent]);

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
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="300px"
        />
    );
}

// ── Chart 4: Sales vs Returns by Month ───────────────────────────────────────
export function SalesVsReturnsChart({ orders, returns, store }) {
    const vatPercent = store?.vat_percent || 15;
    const data = useMemo(() => {
        const salesMap  = buildMap(orders,  o => o.date, o => o.net_total || 0);
        const returnMap = buildMap(returns, r => r.date, r => r.net_total || 0);

        const keys = Array.from(new Set([...Object.keys(salesMap), ...Object.keys(returnMap)])).sort();
        if (keys.length === 0) return null;

        const header = [
            "Month",
            "Gross Sales (SAR)", { role: "tooltip", type: "string", p: { html: true } },
            "Returns (SAR)",     { role: "tooltip", type: "string", p: { html: true } },
        ];
        const rows = keys.map(k => {
            const sales   = salesMap[k]  || 0;
            const ret     = returnMap[k] || 0;
            const salesVat        = sales * vatPercent / (100 + vatPercent);
            const salesWithoutVAT = sales - salesVat;
            const retVat          = ret   * vatPercent / (100 + vatPercent);
            const retWithoutVAT   = ret   - retVat;
            const salesTooltip = tooltipHtml(`Sales — ${monthLabel(k)}`, "#1cc88a", [
                { label: "Gross Sales (with VAT)",    value: `SAR ${fmtT(sales)}`, bold: true, color: "#1cc88a" },
                { label: `VAT ${vatPercent}%`,        value: `− ${fmtT(salesVat)}` },
                { label: "Gross Sales (without VAT)", value: `SAR ${fmtT(salesWithoutVAT)}`, bold: true },
            ]);
            const retTooltip = tooltipHtml(`Returns — ${monthLabel(k)}`, "#e74a3b", [
                { label: "Returns (with VAT)",    value: `SAR ${fmtT(ret)}`, bold: true, color: "#e74a3b" },
                { label: `VAT ${vatPercent}%`,    value: `− ${fmtT(retVat)}` },
                { label: "Returns (without VAT)", value: `SAR ${fmtT(retWithoutVAT)}`, bold: true },
            ]);
            return [monthLabel(k), parseFloat(sales.toFixed(2)), salesTooltip, parseFloat(ret.toFixed(2)), retTooltip];
        });
        return [header, ...rows];
    }, [orders, returns, vatPercent]);

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
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="320px"
        />
    );
}
