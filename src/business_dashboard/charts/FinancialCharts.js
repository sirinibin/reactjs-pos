import React, { useMemo } from "react";
import { Chart } from "react-google-charts";
import { tooltipHtml } from './chartTooltipSetup';

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


// vendorSummaries: array of { vendor_name, purchase_amount } from /v1/dashboard/vendors
export function VendorSpendPieChart({ vendorSummaries, store, filters }) {
    const vatPercent = store?.vat_percent || 15;
    const data = useMemo(() => {
        const entries = (vendorSummaries || []).filter(v => v.purchase_amount > 0);
        if (entries.length === 0) return null;

        const grandTotal = entries.reduce((s, v) => s + v.purchase_amount, 0);
        const header = ["Vendor", "Amount (SAR)", { role: "tooltip", type: "string", p: { html: true } }];
        const rows = entries.map(v => {
            const pct              = grandTotal > 0 ? ((v.purchase_amount / grandTotal) * 100).toFixed(1) : "0.0";
            const spendVat         = v.purchase_amount * vatPercent / (100 + vatPercent);
            const spendWithoutVAT  = v.purchase_amount - spendVat;
            const lines = [
                { label: "Share",   value: `${pct}% of total purchase spend` },
                { label: "Formula", value: "Σ net_total across all purchase orders" },
                { divider: true, label: "Spend (with VAT)",    value: `SAR ${fmtT(v.purchase_amount)}`, bold: true, color: "#36b9cc" },
                { label: `VAT ${vatPercent}%`,                  value: `− ${fmtT(spendVat)}` },
                { divider: true, label: "Spend (without VAT)", value: `SAR ${fmtT(spendWithoutVAT)}`, bold: true },
            ];
            return [v.vendor_name, parseFloat(v.purchase_amount.toFixed(2)), tooltipHtml(v.vendor_name, "#36b9cc", lines, store, filters)];
        });
        return [header, ...rows];
    }, [vendorSummaries, vatPercent]);

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
    store, filters, orders, returns, purchases, purchaseReturns, expenses,
    quotations, quotationSalesReturns,
    accountedPurchases, accountedPurchaseReturns, customerDeposits,
}) {
    const qtnInvoiceAccounting       = store?.settings?.quotation_invoice_accounting === true;
    const disablePurchasesOnAccounts = store?.settings?.disable_purchases_on_accounts === true;
    const vatPercent                 = store?.vat_percent || 15;

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

            const revenueVat        = revenue * vatPercent / (100 + vatPercent);
            const revenueWithoutVAT = revenue - revenueVat;
            const expenseVat        = expense * vatPercent / (100 + vatPercent);
            const expenseWithoutVAT = expense - expenseVat;

            const revLines = [
                { label: "Gross Sales",  value: `${fmtT(sales)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Invoice Sales", value: `+ ${fmtT(qtnInv)}` }] : []),
                { label: "Sales Returns", value: `− ${fmtT(ret)}` },
                ...(qtnInvoiceAccounting ? [{ label: "Qtn. Returns",       value: `− ${fmtT(qtnRet)}` }] : []),
                { divider: true, label: "Net Revenue (with VAT)",    value: `SAR ${fmtT(revenue)}`, bold: true, color: "#69db7c" },
                { label: `VAT ${vatPercent}%`,                        value: `− ${fmtT(revenueVat)}` },
                { divider: true, label: "Net Revenue (without VAT)", value: `SAR ${fmtT(revenueWithoutVAT)}`, bold: true },
            ];

            const expLines = disablePurchasesOnAccounts ? [
                { label: "Expenses",             value: `${fmtT(exp)}` },
                { label: "Purchase Return Fund", value: `− ${fmtT(depFund)}` },
                { label: "Accounted Purchases",  value: `+ ${fmtT(acctPur)}` },
                { label: "Accounted Pur. Returns", value: `− ${fmtT(acctPurRet)}` },
                { divider: true, label: "Total Expense (with VAT)",    value: `SAR ${fmtT(expense)}`, bold: true, color: "#ffa8a8" },
                { label: `VAT ${vatPercent}%`,                          value: `− ${fmtT(expenseVat)}` },
                { divider: true, label: "Total Expense (without VAT)", value: `SAR ${fmtT(expenseWithoutVAT)}`, bold: true },
            ] : [
                { label: "Expenses",         value: `${fmtT(exp)}` },
                { label: "Purchases",        value: `+ ${fmtT(pur)}` },
                { label: "Purchase Returns", value: `− ${fmtT(purRet)}` },
                { divider: true, label: "Total Expense (with VAT)",    value: `SAR ${fmtT(expense)}`, bold: true, color: "#ffa8a8" },
                { label: `VAT ${vatPercent}%`,                          value: `− ${fmtT(expenseVat)}` },
                { divider: true, label: "Total Expense (without VAT)", value: `SAR ${fmtT(expenseWithoutVAT)}`, bold: true },
            ];

            return [
                label,
                parseFloat(revenue.toFixed(2)),
                tooltipHtml(`Net Revenue — ${label}`, "#69db7c", revLines, store, filters),
                parseFloat(expense.toFixed(2)),
                tooltipHtml(`Total Expense — ${label}`, "#ffa8a8", expLines, store, filters),
            ];
        });

        return [header, ...rows];
    }, [orders, returns, purchases, purchaseReturns, expenses, quotations, quotationSalesReturns,
        accountedPurchases, accountedPurchaseReturns, customerDeposits,
        qtnInvoiceAccounting, disablePurchasesOnAccounts, vatPercent]);

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
