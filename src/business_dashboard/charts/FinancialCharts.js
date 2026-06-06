import React, { useMemo } from "react";
import { Chart } from "react-google-charts";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ACCOUNT_TYPE_LABELS = {
    asset: "Asset",
    liability: "Liability",
    capital: "Capital",
    expense: "Expense",
    drawing: "Drawing",
    "": "General",
};

// accountSummaries: array of { account_type, balance } from /v1/dashboard/accounts
export function AccountBalancesChart({ accountSummaries }) {
    const data = useMemo(() => {
        const rows = (accountSummaries || [])
            .filter(a => a.balance > 0)
            .map(a => [ACCOUNT_TYPE_LABELS[a.account_type || ""] || a.account_type || "General", parseFloat(a.balance.toFixed(2))]);
        if (rows.length === 0) return null;
        return [["Account Type", "Balance (SAR)"], ...rows];
    }, [accountSummaries]);

    if (!data) return <p className="text-muted small">No account data</p>;
    return (
        <Chart
            chartType="ColumnChart"
            data={data}
            options={{
                title: "Account Balances by Type",
                colors: ["#36b9cc"],
                legend: { position: "none" },
                vAxis: { title: "SAR" },
                chartArea: { width: "75%", height: "65%" },
            }}
            width="100%"
            height="300px"
        />
    );
}

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

// vendorSummaries: array of { vendor_name, purchase_amount } from /v1/dashboard/vendors
export function VendorSpendPieChart({ vendorSummaries }) {
    const data = useMemo(() => {
        const entries = (vendorSummaries || []).filter(v => v.purchase_amount > 0);
        if (entries.length === 0) return null;

        const grandTotal = entries.reduce((s, v) => s + v.purchase_amount, 0);
        const header = ["Vendor", "Amount (SAR)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = entries.map(v => {
            const pct = grandTotal > 0 ? ((v.purchase_amount / grandTotal) * 100).toFixed(1) : "0.0";
            const lines = [
                { label: "Spend",  value: `SAR ${fmtT(v.purchase_amount)}`, bold: true, color: "#36b9cc" },
                { label: "Share",  value: `${pct}% of total purchase spend` },
                { divider: true, label: "Formula", value: "Σ net_total across all purchase orders" },
            ];
            return [v.vendor_name, parseFloat(v.purchase_amount.toFixed(2)), tooltipHtml(v.vendor_name, "#36b9cc", lines)];
        });
        return [header, ...rows];
    }, [vendorSummaries]);

    if (!data) return <p className="text-muted small">No purchase data</p>;
    return (
        <Chart
            chartType="PieChart"
            data={data}
            options={{
                title: "Purchase Spend by Vendor",
                legend: { position: "right" },
                chartArea: { width: "65%", height: "75%" },
                pieSliceText: "percentage",
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="300px"
        />
    );
}

// Net Revenue = Sales − Sales Returns (+ Qtn Invoice Sales − Qtn Returns if flag ON)
// Total Expense = disablePurchasesOnAccounts
//   ? Expenses − DepositPurchaseFund + AccountedPurchases − AccountedPurchaseReturns
//   : Expenses + Purchases − Purchase Returns
export function PurchaseVsSalesChart({
    store, orders, returns, purchases, purchaseReturns, expenses,
    quotations, quotationSalesReturns,
    accountedPurchases, accountedPurchaseReturns, customerDeposits,
}) {
    const qtnInvoiceAccounting       = store?.settings?.quotation_invoice_accounting === true;
    const disablePurchasesOnAccounts = store?.settings?.disable_purchases_on_accounts === true;

    const data = useMemo(() => {
        function buildMap(arr, dateFn, valueFn) {
            const map = {};
            arr.forEach(item => {
                const d = new Date(dateFn(item));
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                map[key] = (map[key] || 0) + valueFn(item);
            });
            return map;
        }
        const salesMap      = buildMap(orders,                   o => o.date, o => o.net_total || 0);
        const returnMap     = buildMap(returns,                   r => r.date, r => r.net_total || 0);
        const purchaseMap   = buildMap(purchases,                p => p.date, p => p.net_total || 0);
        const purRetMap     = buildMap(purchaseReturns,          p => p.date, p => p.net_total || 0);
        const expenseMap    = buildMap(expenses,                 e => e.date, e => e.amount    || 0);
        const acctPurMap    = buildMap(accountedPurchases    || [], p => p.date, p => p.net_total || 0);
        const acctPurRetMap = buildMap(accountedPurchaseReturns || [], p => p.date, p => p.net_total || 0);

        const depositPurchaseFundMap = {};
        (customerDeposits || []).forEach(d => {
            const date = new Date(d.date);
            const key  = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            const pf   = (d.payments || [])
                .filter(p => p.method === "purchase_fund")
                .reduce((sum, p) => sum + (p.amount || 0), 0);
            depositPurchaseFundMap[key] = (depositPurchaseFundMap[key] || 0) + pf;
        });

        const quotationInvoices = (quotations || []).filter(q => q.type === "invoice");
        const qtnInvMap = qtnInvoiceAccounting ? buildMap(quotationInvoices,           q => q.date, q => q.net_total || 0) : {};
        const qtnRetMap = qtnInvoiceAccounting ? buildMap(quotationSalesReturns || [], q => q.date, q => q.net_total || 0) : {};

        const allKeys = Array.from(new Set([
            ...Object.keys(salesMap), ...Object.keys(returnMap),
            ...Object.keys(purchaseMap), ...Object.keys(purRetMap),
            ...Object.keys(expenseMap),
            ...(qtnInvoiceAccounting ? [...Object.keys(qtnInvMap), ...Object.keys(qtnRetMap)] : []),
            ...(disablePurchasesOnAccounts ? [...Object.keys(acctPurMap), ...Object.keys(acctPurRetMap), ...Object.keys(depositPurchaseFundMap)] : []),
        ])).sort();

        if (allKeys.length === 0) return null;

        const header = [
            "Month",
            "Net Revenue (SAR)", { role: "tooltip", type: "string", p: { html: true } },
            "Total Expense (SAR)", { role: "tooltip", type: "string", p: { html: true } },
        ];

        const rows = allKeys.map(k => {
            const [y, m] = k.split("-");
            const label      = `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;

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

            const revLines = [
                { label: "Net Revenue",      value: `SAR ${fmtT(revenue)}`, bold: true, color: "#69db7c" },
                { divider: true, label: "Gross Sales",   value: `SAR ${fmtT(sales)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Sales", value: `+ SAR ${fmtT(qtnInv)}` }] : []),
                { label: "Sales Returns",    value: `− SAR ${fmtT(ret)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Returns",       value: `− SAR ${fmtT(qtnRet)}` }] : []),
            ];

            const expLines = disablePurchasesOnAccounts ? [
                { label: "Total Expense",          value: `SAR ${fmtT(expense)}`, bold: true, color: "#ffa8a8" },
                { divider: true, label: "Expenses", value: `SAR ${fmtT(exp)}` },
                { label: "Purchase Return Fund",   value: `− SAR ${fmtT(depFund)}` },
                { label: "Accounted Purchases",    value: `+ SAR ${fmtT(acctPur)}` },
                { label: "Accounted Pur. Returns", value: `− SAR ${fmtT(acctPurRet)}` },
            ] : [
                { label: "Total Expense",    value: `SAR ${fmtT(expense)}`, bold: true, color: "#ffa8a8" },
                { divider: true, label: "Expenses",         value: `SAR ${fmtT(exp)}` },
                { label: "Purchases",        value: `+ SAR ${fmtT(pur)}` },
                { label: "Purchase Returns", value: `− SAR ${fmtT(purRet)}` },
            ];

            return [
                label,
                parseFloat(revenue.toFixed(2)),
                tooltipHtml(`Net Revenue — ${label}`, "#69db7c", revLines),
                parseFloat(expense.toFixed(2)),
                tooltipHtml(`Total Expense — ${label}`, "#ffa8a8", expLines),
            ];
        });

        return [header, ...rows];
    }, [orders, returns, purchases, purchaseReturns, expenses, quotations, quotationSalesReturns,
        accountedPurchases, accountedPurchaseReturns, customerDeposits,
        qtnInvoiceAccounting, disablePurchasesOnAccounts]);

    if (!data) return <p className="text-muted small">No data</p>;
    return (
        <Chart
            chartType="LineChart"
            data={data}
            options={{
                title: "Monthly Net Revenue vs Total Expense",
                colors: ["#1cc88a", "#e74a3b"],
                legend: { position: "top" },
                vAxis: { title: "SAR" },
                chartArea: { width: "80%", height: "65%" },
                pointSize: 4,
                tooltip: { isHtml: true },
            }}
            width="100%"
            height="320px"
        />
    );
}
