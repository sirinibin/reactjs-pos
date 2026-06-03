import React, { useState, useEffect } from "react";

import KPICards from "./charts/KPICards";
import {
    MonthlyRevenueTrendChart,
    CumulativeRevenueChart,
    Last30DaysSalesChart,
    SalesVsReturnsChart,
} from "./charts/RevenueCharts";
import {
    PaymentMethodPieChart,
    PaymentStatusPieChart,
    CashVsBankTrendChart,
} from "./charts/PaymentCharts";
import {
    TopProductsChart,
    CategoryRevenuePieChart,
    CategoryMarginChart,
    StockHealthChart,
} from "./charts/ProductCharts";
import {
    SalesByHourChart,
    SalesByDayOfWeekChart,
    SalesCalendarChart,
} from "./charts/TimingCharts";
import {
    TopCustomersChart,
    OutstandingReceivablesChart,
} from "./charts/CustomerCharts";
import {
    AccountBalancesChart,
    VendorSpendPieChart,
    PurchaseVsSalesChart,
} from "./charts/FinancialCharts";

const TABS = [
    { id: "overview", label: "Overview", icon: "bi-speedometer2" },
    { id: "revenue", label: "Revenue", icon: "bi-graph-up" },
    { id: "payments", label: "Payments", icon: "bi-credit-card" },
    { id: "products", label: "Products & Inventory", icon: "bi-box-seam" },
    { id: "timing", label: "Time Patterns", icon: "bi-clock" },
    { id: "customers", label: "Customers & Finance", icon: "bi-people" },
];

function SectionTitle({ children }) {
    return (
        <h6 className="text-uppercase text-muted fw-bold mb-3 mt-4"
            style={{ fontSize: "0.75rem", letterSpacing: "0.08em", borderBottom: "1px solid #e3e6f0", paddingBottom: "0.5rem" }}>
            {children}
        </h6>
    );
}

function ChartCard({ title, children }) {
    return (
        <div className="card mb-4 shadow-sm">
            <div className="card-body">
                {children}
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px" }}>
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <span className="ms-3 text-muted">Loading dashboard data…</span>
        </div>
    );
}

export default function BusinessDashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);

    const [store, setStore] = useState({});
    const [orders, setOrders] = useState([]);
    const [orderStats, setOrderStats] = useState({});
    const [salesReturnStats, setSalesReturnStats] = useState({});
    const [purchaseStats, setPurchaseStats] = useState({});
    const [purchaseReturnStats, setPurchaseReturnStats] = useState({});
    const [expenseStats, setExpenseStats] = useState({});
    const [depositStats, setDepositStats] = useState({});
    const [quotationStats, setQuotationStats] = useState({});
    const [qtnSalesReturnStats, setQtnSalesReturnStats] = useState({});
    const [salesReturns, setSalesReturns] = useState([]);
    const [purchaseReturns, setPurchaseReturns] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [payments, setPayments] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [purchases, setPurchases] = useState([]);

    const storeId = localStorage.getItem("store_id") || "";

    function buildHeaders() {
        return {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("access_token"),
        };
    }

    function storeQuery() {
        return storeId ? `search[store_id]=${storeId}` : "";
    }

    async function fetchAllPages(path) {
        const headers = buildHeaders();
        let page = 1;
        const size = 1000;
        let results = [];
        while (true) {
            const sep = path.includes("?") ? "&" : "?";
            const url = `${path}${sep}page=${page}&limit=${size}`;
            const res = await fetch(url, { method: "GET", headers })
                .then(r => r.json())
                .catch(() => ({ status: false }));
            if (!res.status || !res.result || res.result.length === 0) break;
            results = results.concat(res.result);
            if (res.result.length < size) break;
            page++;
        }
        return results;
    }

    async function fetchStats(path) {
        const headers = buildHeaders();
        const res = await fetch(path, { method: "GET", headers })
            .then(r => r.json())
            .catch(() => ({ status: false }));
        return res?.status ? (res.meta || {}) : {};
    }

    async function fetchOne(path) {
        const headers = buildHeaders();
        const res = await fetch(path, { method: "GET", headers })
            .then(r => r.json())
            .catch(() => ({ status: false }));
        return res?.status ? (res.result || {}) : {};
    }

    useEffect(() => {
        if (!storeId) return;
        const sq = storeQuery();

        async function load() {
            setLoading(true);
            const [
                storeData,
                ordersData,
                orderStatsData,
                salesReturnStatsData,
                purchaseStatsData,
                purchaseReturnStatsData,
                expenseStatsData,
                depositStatsData,
                quotationStatsData,
                qtnSalesReturnStatsData,
                returnsData,
                purchaseReturnsData,
                expensesData,
                paymentsData,
                productsData,
                customersData,
                accountsData,
                purchasesData,
            ] = await Promise.all([
                fetchOne(`/v1/store/${storeId}?select=id,settings,vat_percent`),
                fetchAllPages(`/v1/order?select=date,net_total,net_profit,net_loss,payment_status,cash_sales,bank_account_sales,return_amount,return_count,products&${sq}`),
                fetchStats(`/v1/order?search[stats]=1&${sq}`),
                fetchStats(`/v1/sales-return?search[stats]=1&${sq}`),
                fetchStats(`/v1/purchase?search[stats]=1&${sq}`),
                fetchStats(`/v1/purchase-return?search[stats]=1&${sq}`),
                fetchStats(`/v1/expense?search[stats]=1&${sq}`),
                fetchStats(`/v1/customer-deposit?search[stats]=1&${sq}`),
                fetchStats(`/v1/quotation?search[stats]=1&${sq}`),
                fetchStats(`/v1/quotation-sales-return?search[stats]=1&${sq}`),
                fetchAllPages(`/v1/sales-return?select=date,net_total&${sq}`),
                fetchAllPages(`/v1/purchase-return?select=date,net_total&${sq}`),
                fetchAllPages(`/v1/expense?select=date,amount&${sq}`),
                fetchAllPages(`/v1/sales-payment?select=method,amount&${sq}`),
                fetchAllPages(`/v1/product?select=name,category_name,brand_name,product_stores&${sq}`),
                fetchAllPages(`/v1/customer?select=name,stores,credit_balance&${sq}`),
                fetchAllPages(`/v1/account?select=name,type,balance&${sq}`),
                fetchAllPages(`/v1/purchase?select=date,net_total,vendor_name&${sq}`),
            ]);

            setStore(storeData);
            setOrders(ordersData);
            setOrderStats(orderStatsData);
            setSalesReturnStats(salesReturnStatsData);
            setPurchaseStats(purchaseStatsData);
            setPurchaseReturnStats(purchaseReturnStatsData);
            setExpenseStats(expenseStatsData);
            setDepositStats(depositStatsData);
            setQuotationStats(quotationStatsData);
            setQtnSalesReturnStats(qtnSalesReturnStatsData);
            setSalesReturns(returnsData);
            setPurchaseReturns(purchaseReturnsData);
            setExpenses(expensesData);
            setPayments(paymentsData);
            setProducts(productsData);
            setCustomers(customersData);
            setAccounts(accountsData);
            setPurchases(purchasesData);
            setLoading(false);
        }

        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    return (
        <div className="container-fluid px-3 py-3">
            {/* Page header */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h4 className="mb-0 fw-bold">
                    <i className="bi bi-speedometer2 me-2 text-primary" />
                    Business Dashboard
                </h4>
                <span className="text-muted small">
                    {localStorage.getItem("store_name") || ""}
                </span>
            </div>

            {/* Tab navigation */}
            <ul className="nav nav-tabs mb-3">
                {TABS.map(tab => (
                    <li className="nav-item" key={tab.id}>
                        <button
                            className={`nav-link${activeTab === tab.id ? " active" : ""}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <i className={`bi ${tab.icon} me-1`} />
                            {tab.label}
                        </button>
                    </li>
                ))}
            </ul>

            {loading ? (
                <Spinner />
            ) : (
                <>
                    {/* ── Tab 1: Overview ── */}
                    {activeTab === "overview" && (
                        <div>
                            <SectionTitle>Key Performance Indicators</SectionTitle>
                            <KPICards
                                store={store}
                                orderStats={orderStats}
                                salesReturnStats={salesReturnStats}
                                purchaseStats={purchaseStats}
                                purchaseReturnStats={purchaseReturnStats}
                                expenseStats={expenseStats}
                                depositStats={depositStats}
                                quotationStats={quotationStats}
                                qtnSalesReturnStats={qtnSalesReturnStats}
                                orders={orders}
                            />

                            <div className="row mt-4">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <MonthlyRevenueTrendChart store={store} orders={orders} returns={salesReturns} purchases={purchases} purchaseReturns={purchaseReturns} expenses={expenses} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <PaymentStatusPieChart orders={orders} />
                                    </ChartCard>
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <CategoryRevenuePieChart products={products} storeId={storeId} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <StockHealthChart products={products} storeId={storeId} />
                                    </ChartCard>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab 2: Revenue ── */}
                    {activeTab === "revenue" && (
                        <div>
                            <SectionTitle>Revenue Trends</SectionTitle>
                            <div className="row">
                                <div className="col-12">
                                    <ChartCard>
                                        <MonthlyRevenueTrendChart store={store} orders={orders} returns={salesReturns} purchases={purchases} purchaseReturns={purchaseReturns} expenses={expenses} />
                                    </ChartCard>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <CumulativeRevenueChart orders={orders} returns={salesReturns} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <Last30DaysSalesChart orders={orders} />
                                    </ChartCard>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-12">
                                    <ChartCard>
                                        <SalesVsReturnsChart orders={orders} returns={salesReturns} />
                                    </ChartCard>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab 3: Payments ── */}
                    {activeTab === "payments" && (
                        <div>
                            <SectionTitle>Payment Analysis</SectionTitle>
                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <PaymentMethodPieChart payments={payments} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <PaymentStatusPieChart orders={orders} />
                                    </ChartCard>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-12">
                                    <ChartCard>
                                        <CashVsBankTrendChart orders={orders} />
                                    </ChartCard>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab 4: Products & Inventory ── */}
                    {activeTab === "products" && (
                        <div>
                            <SectionTitle>Product Performance</SectionTitle>
                            <div className="row">
                                <div className="col-12">
                                    <ChartCard>
                                        <TopProductsChart orders={orders} />
                                    </ChartCard>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <CategoryRevenuePieChart products={products} storeId={storeId} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <CategoryMarginChart products={products} storeId={storeId} />
                                    </ChartCard>
                                </div>
                            </div>
                            <SectionTitle>Inventory Health</SectionTitle>
                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <StockHealthChart products={products} storeId={storeId} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <div className="card mb-4 shadow-sm">
                                        <div className="card-body">
                                            <h6 className="text-muted mb-3">Stock Summary</h6>
                                            {(() => {
                                                let zero = 0, low = 0, ok = 0;
                                                products.forEach(p => {
                                                    const s = p.product_stores?.[storeId]?.stock ?? 0;
                                                    if (s <= 0) zero++;
                                                    else if (s < 5) low++;
                                                    else ok++;
                                                });
                                                return (
                                                    <div>
                                                        <div className="d-flex justify-content-between py-2 border-bottom">
                                                            <span><i className="bi bi-circle-fill text-danger me-2" />Out of Stock</span>
                                                            <strong>{zero.toLocaleString()} products</strong>
                                                        </div>
                                                        <div className="d-flex justify-content-between py-2 border-bottom">
                                                            <span><i className="bi bi-circle-fill text-warning me-2" />Low Stock (&lt; 5 units)</span>
                                                            <strong>{low.toLocaleString()} products</strong>
                                                        </div>
                                                        <div className="d-flex justify-content-between py-2">
                                                            <span><i className="bi bi-circle-fill text-success me-2" />Healthy Stock</span>
                                                            <strong>{ok.toLocaleString()} products</strong>
                                                        </div>
                                                        <div className="d-flex justify-content-between py-2 border-top mt-2">
                                                            <span className="fw-bold">Total Products</span>
                                                            <strong>{products.length.toLocaleString()}</strong>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab 5: Time Patterns ── */}
                    {activeTab === "timing" && (
                        <div>
                            <SectionTitle>Peak Sales Hours</SectionTitle>
                            <div className="row">
                                <div className="col-12">
                                    <ChartCard>
                                        <SalesByHourChart orders={orders} />
                                    </ChartCard>
                                </div>
                            </div>
                            <SectionTitle>Weekly Patterns</SectionTitle>
                            <div className="row">
                                <div className="col-12">
                                    <ChartCard>
                                        <SalesByDayOfWeekChart orders={orders} />
                                    </ChartCard>
                                </div>
                            </div>
                            <SectionTitle>Activity Calendar</SectionTitle>
                            <div className="row">
                                <div className="col-12">
                                    <ChartCard>
                                        <SalesCalendarChart orders={orders} />
                                    </ChartCard>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab 6: Customers & Finance ── */}
                    {activeTab === "customers" && (
                        <div>
                            <SectionTitle>Customer Intelligence</SectionTitle>
                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <TopCustomersChart customers={customers} storeId={storeId} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <OutstandingReceivablesChart customers={customers} />
                                    </ChartCard>
                                </div>
                            </div>
                            <SectionTitle>Financial Overview</SectionTitle>
                            <div className="row">
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <AccountBalancesChart accounts={accounts} />
                                    </ChartCard>
                                </div>
                                <div className="col-lg-6">
                                    <ChartCard>
                                        <VendorSpendPieChart purchases={purchases} />
                                    </ChartCard>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-12">
                                    <ChartCard>
                                        <PurchaseVsSalesChart store={store} orders={orders} returns={salesReturns} purchases={purchases} purchaseReturns={purchaseReturns} expenses={expenses} />
                                    </ChartCard>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
