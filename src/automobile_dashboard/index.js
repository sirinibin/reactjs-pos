import React, { useEffect, useMemo, useState } from "react";
import { Spinner } from "react-bootstrap";
import { useTranslation } from 'react-i18next';
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';

function fmtCurrency(val) {
    if (val === undefined || val === null || Number.isNaN(Number(val))) return "0.00";
    return Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function KPICard({ title, value, icon, color, subtitle, subValue, subColor, valueColor, note, noteColor }) {
    return (
        <div className="card shadow-sm border-0 h-100">
            <div className="card-body d-flex flex-column gap-2">
                <div className="d-flex align-items-center justify-content-between">
                    <span className="text-uppercase text-muted fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                        {title}
                    </span>
                    <div
                        className="d-inline-flex align-items-center justify-content-center rounded"
                        style={{ width: 38, height: 38, background: `${color}15`, color }}
                    >
                        <i className={`bi ${icon}`}></i>
                    </div>
                </div>
                <div className="fw-bold" style={{ fontSize: '1.55rem', color: valueColor || '#191c1e' }}>
                    {fmtCurrency(value)}
                </div>
                {note && (
                    <div className="small" style={{ color: noteColor || '#6c757d' }}>
                        {note}
                    </div>
                )}
                {subtitle && (
                    <div className="d-flex flex-wrap gap-3 small text-muted">
                        {subtitle.split('|').map((label, index) => (
                            <span key={label} style={{ color: subColor?.[index] || '#6c757d' }}>
                                {label.trim()}: <strong>{fmtCurrency(subValue?.[index] ?? 0)}</strong>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function DashboardSection({ title, cards }) {
    return (
        <div className="mb-4">
            <h5 className="fw-semibold mb-3">{title}</h5>
            <div className="row g-3">
                {cards.map(card => (
                    <div key={card.title} className="col-12 col-md-6 col-xl-4">
                        <KPICard {...card} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function AutoMobileDashboard() {
    const { t } = useTranslation('common');
    const [dashboard, setDashboard] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function loadDashboard() {
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: localStorage.getItem('access_token'),
            },
        };

        const searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }

        setIsLoading(true);
        fetch(`/v1/automobile/dashboard?${ObjectToSearchQueryParams(searchParams)}`, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson ? await response.json() : null;
                if (!response.ok || !data?.status) {
                    return Promise.reject(data?.errors || {});
                }
                setDashboard(data.result || {});
                setIsLoading(false);
            })
            .catch(error => {
                console.log(error);
                setDashboard({});
                setIsLoading(false);
            });
    }

    const sections = useMemo(() => ([
        {
            title: t('Profit Overview'),
            cards: [
                { title: t('Total Profit'), value: dashboard.total_profit, icon: 'bi-graph-up-arrow', color: '#004ac6' },
                { title: t('Monthly Profit'), value: dashboard.monthly_profit, icon: 'bi-calendar-check', color: '#1a7a3a' },
                { title: t('Labour Profit'), value: dashboard.labour_profit, icon: 'bi-person-gear', color: '#e65100' },
                { title: t('Spare Profit'), value: dashboard.spare_profit, icon: 'bi-box-seam', color: '#6a1b9a' },
                { title: t('Additional Profit'), value: dashboard.additional_profit, icon: 'bi-three-dots', color: '#1565c0' },
            ],
        },
        {
            title: t('Cash & Bank'),
            cards: [
                { title: t('Counter Cash'), value: dashboard.counter_cash, icon: 'bi-cash-stack', color: '#1a7a3a' },
                { title: t('Bank Cash'), value: dashboard.bank_cash, icon: 'bi-bank2', color: '#004ac6' },
            ],
        },
        {
            title: t('Assets & Liabilities'),
            cards: [
                {
                    title: t('Spare Parts Asset Value'),
                    value: dashboard.spare_parts_value?.retail_value || 0,
                    icon: 'bi-boxes',
                    color: '#6a1b9a',
                    subtitle: `${t('Purchase')} | ${t('Retail')}`,
                    subValue: [dashboard.spare_parts_value?.purchase_value || 0, dashboard.spare_parts_value?.retail_value || 0],
                    subColor: ['#6c757d', '#6a1b9a'],
                },
                { title: t('Total Credit'), value: dashboard.total_credit, icon: 'bi-people', color: '#e65100' },
                { title: t('Unpaid Bill'), value: dashboard.unpaid_bill, icon: 'bi-receipt-cutoff', color: '#c62828' },
                {
                    title: t('Salary Balance'),
                    value: dashboard.salary_balance,
                    icon: 'bi-person-badge',
                    color: '#ba1a1a',
                    // Negative = store owes employees; positive = employees owe the
                    // store (e.g. over-advances) — same sign convention as the
                    // employee balance sheet (see utils/employeeBalance.js).
                    valueColor: dashboard.salary_balance < 0 ? '#ba1a1a' : (dashboard.salary_balance > 0 ? '#0a58ca' : '#191c1e'),
                    note: dashboard.salary_balance < 0
                        ? t('Owed to Employees')
                        : (dashboard.salary_balance > 0 ? t('Employees Owe Us') : t('Settled')),
                    noteColor: dashboard.salary_balance < 0 ? '#ba1a1a' : (dashboard.salary_balance > 0 ? '#0a58ca' : '#6c757d'),
                },
                { title: t('Additional Expense'), value: dashboard.additional_expense, icon: 'bi-wallet2', color: '#54647a' },
            ],
        },
    ]), [dashboard, t]);

    if (isLoading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
                <p className="mt-3 text-muted">{t('Loading dashboard...')}</p>
            </div>
        );
    }

    return (
        <div className="container-fluid px-3 py-3">
            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                <div>
                    <h4 className="mb-1 fw-bold">
                        <i className="bi bi-speedometer2 me-2 text-primary"></i>
                        {t('Workshop Dashboard')}
                    </h4>
                    <p className="text-muted mb-0 small">
                        {t('Real-time overview of your automobile workshop operations')}
                    </p>
                </div>
                <button onClick={loadDashboard} className="btn btn-sm btn-outline-primary">
                    <i className="bi bi-arrow-clockwise me-1"></i>{t('Refresh')}
                </button>
            </div>

            {sections.map(section => (
                <DashboardSection key={section.title} title={section.title} cards={section.cards} />
            ))}
        </div>
    );
}

export default AutoMobileDashboard;
