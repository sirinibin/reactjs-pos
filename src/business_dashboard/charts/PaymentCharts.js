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

export function PaymentMethodPieChart({ payments }) {
    const data = useMemo(() => {
        const map = {};
        payments.forEach(p => {
            const m = p.method || "other";
            map[m] = (map[m] || 0) + (p.amount || 0);
        });
        const rows = Object.entries(map)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => [METHOD_LABELS[k] || k, parseFloat(v.toFixed(2))]);
        if (rows.length === 0) return null;
        return [["Method", "Amount (SAR)"], ...rows];
    }, [payments]);

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
            }}
            width="100%"
            height="320px"
        />
    );
}

export function PaymentStatusPieChart({ orders }) {
    const data = useMemo(() => {
        const map = { paid: 0, not_paid: 0, paid_partially: 0 };
        orders.forEach(o => {
            const s = o.payment_status || "";
            if (s === "paid") map.paid += o.net_total || 0;
            else if (s === "not_paid") map.not_paid += o.net_total || 0;
            else if (s === "paid_partially") map.paid_partially += o.net_total || 0;
        });
        const rows = [
            ["Paid", parseFloat(map.paid.toFixed(2))],
            ["Unpaid", parseFloat(map.not_paid.toFixed(2))],
            ["Partially Paid", parseFloat(map.paid_partially.toFixed(2))],
        ].filter(([, v]) => v > 0);
        if (rows.length === 0) return null;
        return [["Status", "Amount (SAR)"], ...rows];
    }, [orders]);

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
            }}
            width="100%"
            height="320px"
        />
    );
}

export function CashVsBankTrendChart({ orders }) {
    const data = useMemo(() => {
        const map = {};
        orders.forEach(o => {
            const d = new Date(o.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            if (!map[key]) map[key] = { cash: 0, bank: 0 };
            map[key].cash += o.cash_sales || 0;
            map[key].bank += o.bank_account_sales || 0;
        });
        const keys = Object.keys(map).sort();
        if (keys.length === 0) return null;
        const rows = keys.map(k => {
            const [y, m] = k.split("-");
            const label = `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
            return [label, parseFloat(map[k].cash.toFixed(2)), parseFloat(map[k].bank.toFixed(2))];
        });
        return [["Month", "Cash (SAR)", "Bank/Card (SAR)"], ...rows];
    }, [orders]);

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
            }}
            width="100%"
            height="320px"
        />
    );
}
