import React, { useEffect, useLayoutEffect, useMemo, useState, useRef, useCallback } from "react";
import { Spinner } from "react-bootstrap";
import { useTranslation } from 'react-i18next';
import { Chart } from "react-google-charts";
import { tooltipHtml, onChartSelect } from '../business_dashboard/charts/chartTooltipSetup';
import { generateInfoPdf, safeName } from '../utils/pdfGenerator';
import { uploadPdfForShare } from '../utils/pdfShare';
import PostingIndex from '../posting/index.js';
import VendorPending from '../utils/vendor_pending.js';
import CustomerPending from '../utils/customer_pending.js';
import ExpenseCreate from '../expense/create.js';
import OrderCreate from '../order/create.js';
import PurchaseCreate from '../purchase/create.js';
import PurchaseReturnedCreate from '../purchase_return/create.js';
import SalesReturnCreate from '../sales_return/create.js';
import VendorCreate from '../vendor/create.js';
import CustomerCreate from '../customer/create.js';

function fmt(n) {
    if (n === undefined || n === null || isNaN(Number(n))) return "0.00";
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCompact(n) {
    if (n === undefined || n === null || isNaN(Number(n))) return "0.00";
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
    if (abs >= 1_000_000)     return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (abs >= 1_000)         return `${sign}${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `${sign}${abs.toFixed(2)}`;
}

function fmtMonth(key) {
    if (!key) return '';
    const [y, m] = key.split('-');
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

function calcVat(val, vatPct) {
    const v = val || 0;
    const vat = v * vatPct / (100 + vatPct);
    return { withVAT: v, vat, withoutVAT: v - vat };
}

// ── SVG → PNG ──────────────────────────────────────────────────────────────────
async function svgToPng(container) {
    const svg = container?.querySelector("svg");
    if (!svg) return null;
    const { width, height } = svg.getBoundingClientRect();
    if (!width || !height) return null;
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", width);
    clone.setAttribute("height", height);
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", "white");
    clone.insertBefore(bg, clone.firstChild);
    const url = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" })
    );
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const scale = window.devicePixelRatio || 2;
            const canvas = document.createElement("canvas");
            canvas.width  = width  * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext("2d");
            ctx.scale(scale, scale);
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
}

function dataUrlToBlob(dataUrl) {
    const [header, b64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

async function uploadChartAndGetShareUrl(blob, filename) {
    const res = await fetch(`/v1/chart-image-share?filename=${encodeURIComponent(filename)}`, {
        method: "POST",
        headers: { "Content-Type": "image/png", Authorization: localStorage.getItem("access_token") },
        body: blob,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.status) throw new Error(json.errors?.upload || "Upload failed");
    return json.result.url;
}

function WhatsAppFallbackModal({ dataUrl, title, onClose }) {
    const filename = (title || "chart").replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".png";
    function handleDownload() {
        const a = document.createElement("a");
        a.href = dataUrl; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{ position:"fixed", inset:0, zIndex:1059, background:"rgba(0,0,0,0.65)",
                display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
            <div style={{ background:"#fff", borderRadius:"12px", padding:"20px",
                maxWidth:"480px", width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.3)" }}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="fw-bold" style={{ fontSize:"0.95rem" }}>
                        <i className="bi bi-whatsapp text-success me-2" />Share via WhatsApp
                    </span>
                    <button className="btn-close" onClick={onClose} />
                </div>
                <div className="alert alert-warning small py-2 mb-3">
                    <i className="bi bi-exclamation-triangle-fill me-2" />
                    Could not upload. Download the image and share manually.
                </div>
                <img src={dataUrl} alt={title}
                    style={{ width:"100%", borderRadius:"8px", border:"1px solid #dee2e6", marginBottom:"16px" }} />
                <button className="btn btn-outline-secondary w-100" onClick={handleDownload}>
                    <i className="bi bi-download me-2" />Download image
                </button>
            </div>
        </div>
    );
}

// ── Expense Category Modal ────────────────────────────────────────────────────
function ExpenseCategoryModal({ category, appliedFrom, appliedTo, storeId, vatPercent, onClose }) {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const expenseCreateRef = useRef();

    const fetchExpenses = useCallback(() => {
        if (!category?.id) return;
        setLoading(true); setError(''); setExpenses([]);
        const token = localStorage.getItem('access_token');
        const params = new URLSearchParams();
        params.set('search[store_id]', storeId || '');
        params.set('search[category_id]', category.id);
        params.set('limit', '500');
        if (appliedFrom) {
            params.set('search[from_date]', appliedFrom.length === 10 ? appliedFrom : `${appliedFrom}-01`);
        }
        if (appliedTo) {
            if (appliedTo.length === 10) {
                params.set('search[to_date]', appliedTo);
            } else {
                const [y, m] = appliedTo.split('-').map(Number);
                params.set('search[to_date]', `${appliedTo}-${String(new Date(y, m, 0).getDate()).padStart(2,'0')}`);
            }
        }
        fetch(`/v1/expense?${params.toString()}`, { headers: { Authorization: token } })
            .then(r => r.json())
            .then(d => { setExpenses(d.result || []); setLoading(false); })
            .catch(() => { setError('Failed to load expenses'); setLoading(false); });
    }, [category?.id, appliedFrom, appliedTo, storeId]);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    const total = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); } catch { return ''; } };

    const dateLabel = appliedFrom || appliedTo
        ? `${appliedFrom || ''}${appliedFrom && appliedTo && appliedFrom !== appliedTo ? ' – ' + appliedTo : ''}`
        : 'All time';

    return (
        <>
        <style>{`.modal{z-index:1080!important}.modal-backdrop{z-index:1075!important}`}</style>
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{ position:'fixed', inset:0, zIndex:1070, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 16px', overflowY:'auto' }}>
            <div onClick={e => e.stopPropagation()}
                style={{ width:'100%', maxWidth:900, borderRadius:16, overflow:'hidden', boxShadow:'0 8px 48px rgba(15,23,42,0.18), 0 1px 3px rgba(15,23,42,0.08)', background:'#fff', display:'flex', flexDirection:'column', border:'1px solid #e8edf3' }}>

                {/* Header */}
                <div style={{ padding:'20px 28px 18px', borderBottom:'1px solid #f0f4f8', display:'flex', alignItems:'center', gap:14, background:'#fff' }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:'#fff7ed', border:'1px solid #fed7aa', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <i className="bi bi-wallet2" style={{ color:'#ea580c', fontSize:20 }}></i>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ color:'#0f172a', fontWeight:700, fontSize:'1.05rem', lineHeight:1.2 }}>{category?.name}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5, flexWrap:'wrap' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:600, color:'#64748b', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:6, padding:'2px 8px' }}>
                                <i className="bi bi-calendar3" style={{ fontSize:'0.65rem' }}></i>{dateLabel}
                            </span>
                            {!loading && (
                                <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:600, color:'#64748b', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:6, padding:'2px 8px' }}>
                                    <i className="bi bi-receipt" style={{ fontSize:'0.65rem' }}></i>{expenses.length} record{expenses.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                    {!loading && !error && expenses.length > 0 && (
                        <div style={{ textAlign:'right', flexShrink:0, marginRight:12 }}>
                            <div style={{ color:'#dc2626', fontWeight:800, fontSize:'1.4rem', lineHeight:1, letterSpacing:'-0.02em' }}>{fmt(total)}</div>
                            <div style={{ color:'#94a3b8', fontSize:'0.7rem', marginTop:2, fontWeight:500 }}>SAR incl. VAT</div>
                        </div>
                    )}
                    <button onClick={onClose} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', color:'#64748b', borderRadius:8, width:34, height:34, cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.background='#f1f5f9'} onMouseOut={e => e.currentTarget.style.background='#f8fafc'}>
                        <i className="bi bi-x"></i>
                    </button>
                </div>


                {/* Body */}
                <div style={{ maxHeight:'60vh', overflowY:'auto' }}>
                    {loading ? (
                        <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:'70px 0', gap:12 }}>
                            <Spinner animation="border" style={{ color:'#ea580c', width:'2rem', height:'2rem' }} />
                            <span style={{ color:'#94a3b8', fontSize:'0.85rem' }}>Loading expenses…</span>
                        </div>
                    ) : error ? (
                        <div style={{ padding:48, textAlign:'center' }}>
                            <div style={{ width:52, height:52, borderRadius:'50%', background:'#fef2f2', border:'1px solid #fecaca', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                                <i className="bi bi-exclamation-triangle" style={{ color:'#dc2626', fontSize:22 }}></i>
                            </div>
                            <div style={{ color:'#dc2626', fontWeight:600, fontSize:'0.9rem' }}>{error}</div>
                        </div>
                    ) : expenses.length === 0 ? (
                        <div style={{ padding:'64px 0', textAlign:'center' }}>
                            <div style={{ width:60, height:60, borderRadius:'50%', background:'#f8fafc', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                                <i className="bi bi-inbox" style={{ color:'#94a3b8', fontSize:26 }}></i>
                            </div>
                            <div style={{ color:'#334155', fontWeight:600, fontSize:'0.95rem' }}>No expenses found</div>
                            <div style={{ color:'#94a3b8', fontSize:'0.82rem', marginTop:4 }}>No records for this category in the selected period</div>
                        </div>
                    ) : (
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                            <thead>
                                <tr style={{ background:'#f8fafc', position:'sticky', top:0, zIndex:1 }}>
                                    {[
                                        { h:'#', right:false }, { h:'Date', right:false }, { h:'Code', right:false },
                                        { h:'Amount', right:true }, { h:'', right:false },
                                    ].map(({ h, right }) => (
                                        <th key={h} style={{ padding:'10px 14px', fontWeight:700, color:'#475569', fontSize:'0.69rem', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:right?'right':'left', whiteSpace:'nowrap', borderBottom:'2px solid #e2e8f0' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((e, i) => {
                                    const amt = parseFloat(e.amount) || 0;
                                    return (
                                        <tr key={e.id || i} style={{ borderBottom:'1px solid #f1f5f9', background:'#fff', transition:'background 0.1s' }}
                                            onMouseOver={ev => ev.currentTarget.style.background='#f8faff'}
                                            onMouseOut={ev => ev.currentTarget.style.background='#fff'}>
                                            <td style={{ padding:'10px 14px', color:'#cbd5e1', fontWeight:600, fontSize:'0.75rem' }}>{i+1}</td>
                                            <td style={{ padding:'10px 14px', color:'#475569', whiteSpace:'nowrap', fontWeight:500 }}>{fmtDate(e.date)}</td>
                                            <td style={{ padding:'10px 14px' }}>
                                                <span style={{ fontFamily:'monospace', background:'#f1f5f9', borderRadius:5, padding:'2px 7px', color:'#334155', fontSize:'0.73rem', fontWeight:600, border:'1px solid #e2e8f0' }}>{e.code || '—'}</span>
                                            </td>
                                            <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color:'#dc2626', fontVariantNumeric:'tabular-nums' }}>{fmt(amt)}</td>
                                            <td style={{ padding:'10px 10px', textAlign:'center' }}>
                                                <button title="Edit" onClick={() => expenseCreateRef.current?.open(e.id)}
                                                    style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', borderRadius:6, width:28, height:28, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}
                                                    onMouseOver={ev => ev.currentTarget.style.background='#dbeafe'} onMouseOut={ev => ev.currentTarget.style.background='#eff6ff'}>
                                                    <i className="bi bi-pencil" style={{ fontSize:'0.72rem' }}></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background:'#f8fafc', borderTop:'2px solid #e2e8f0' }}>
                                    <td colSpan={3} style={{ padding:'11px 14px', color:'#64748b', fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                                        Total &mdash; {expenses.length} record{expenses.length!==1?'s':''}
                                    </td>
                                    <td style={{ padding:'11px 14px', textAlign:'right', fontWeight:800, color:'#dc2626', fontSize:'0.92rem', fontVariantNumeric:'tabular-nums' }}>{fmt(total)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>
            <ExpenseCreate ref={expenseCreateRef} refreshList={fetchExpenses} />
        </div>
        </>
    );
}

// ── Customer Credit Modal ─────────────────────────────────────────────────────
function CustomerCreditModal({ customer, storeId, appliedFrom, appliedTo, onClose }) {
    const [orders, setOrders] = useState([]);
    const [salesReturns, setSalesReturns] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [purchaseReturns, setPurchaseReturns] = useState([]);
    const [entityData, setEntityData] = useState(null);
    const [freshAccount, setFreshAccount] = useState(null);
    const [linkedVendor, setLinkedVendor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const orderCreateRef = useRef();
    const salesReturnCreateRef = useRef();
    const purchaseCreateRef = useRef();
    const purchaseReturnCreateRef = useRef();
    const linkedVendorCreateRef = useRef();
    const [showBalanceSheet, setShowBalanceSheet] = useState(false);
    const postingRef = useRef();
    const bsTimer = useRef(null);

    const fetchAll = useCallback(async () => {
        setLoading(true); setError('');
        setFreshAccount(null);
        const headers = { Authorization: localStorage.getItem('access_token') };
        const fromDateStr = appliedFrom ? (appliedFrom.length === 10 ? appliedFrom : `${appliedFrom}-01`) : '';
        const toDateStr = appliedTo ? (appliedTo.length === 10 ? appliedTo : (() => { const [y,m] = appliedTo.split('-').map(Number); return `${appliedTo}-${String(new Date(y, m, 0).getDate()).padStart(2,'0')}`; })()) : '';
        const dateFilter = {};
        if (fromDateStr) dateFilter['search[from_date]'] = fromDateStr;
        if (toDateStr) dateFilter['search[to_date]'] = toDateStr;
        const opBase = { 'search[store_id]': storeId || '', 'search[payment_status]': 'not_paid,paid_partially', ...dateFilter, 'select': 'id,code,date,net_total,total_payment_received,balance_amount,payment_status,payment_methods', limit: '500' };
        const srpBase = { 'search[store_id]': storeId || '', 'search[payment_status]': 'not_paid,paid_partially', ...dateFilter, 'select': 'id,code,date,net_total,total_payment_paid,balance_amount,payment_status,payment_methods', limit: '500' };
        if (customer?.id) { opBase['search[customer_id]'] = customer.id; srpBase['search[customer_id]'] = customer.id; }
        const op = new URLSearchParams(opBase);
        const srp = new URLSearchParams(srpBase);
        try {
            let cust = null;
            let fetchPromises = [
                fetch(`/v1/order?${op}`, { headers }).then(r => r.json()),
                fetch(`/v1/sales-return?${srp}`, { headers }).then(r => r.json()),
            ];
            if (customer?.id) {
                fetchPromises.unshift(fetch(`/v1/customer/${customer.id}?search[store_id]=${encodeURIComponent(storeId||'')}`, { headers }).then(r => r.json()));
            }
            const results = await Promise.all(fetchPromises);
            if (customer?.id) {
                cust = results[0].result || null;
                setEntityData(cust);
                setOrders(results[1].result || []);
                setSalesReturns(results[2].result || []);
            } else {
                setEntityData(null);
                setOrders(results[0].result || []);
                setSalesReturns(results[1].result || []);
            }
            let vend = null;
            const [vData, aData] = await Promise.all([
                (cust?.vat_no && cust?.name)
                    ? fetch(`/v1/vendor/vat_no/name?vat_no=${encodeURIComponent(cust.vat_no)}&name=${encodeURIComponent(cust.name)}&search[store_id]=${encodeURIComponent(storeId || '')}`, { headers }).then(r => r.json()).catch(() => null)
                    : Promise.resolve(null),
                cust?.account?.id
                    ? fetch(`/v1/account/${cust.account.id}?search[store_id]=${encodeURIComponent(storeId||'')}`, { headers }).then(r => r.json()).catch(() => null)
                    : Promise.resolve(null),
            ]);
            if (vData?.result?.id) vend = vData.result;
            if (aData?.result) setFreshAccount(aData.result);
            setLinkedVendor(vend);
            if (vend?.id) {
                const pp = new URLSearchParams({ 'search[vendor_id]': vend.id, 'search[store_id]': storeId || '', 'search[payment_status]': 'not_paid,paid_partially', ...dateFilter, 'select': 'id,code,date,net_total,total_payment_paid,balance_amount,payment_status,payment_methods', limit: '500' });
                const prp = new URLSearchParams({ 'search[vendor_id]': vend.id, 'search[store_id]': storeId || '', 'search[payment_status]': 'not_paid,paid_partially', ...dateFilter, 'select': 'id,code,date,net_total,total_payment_paid,balance_amount,payment_status,payment_methods', limit: '500' });
                const [pData, prData] = await Promise.all([
                    fetch(`/v1/purchase?${pp}`, { headers }).then(r => r.json()),
                    fetch(`/v1/purchase-return?${prp}`, { headers }).then(r => r.json()),
                ]);
                setPurchases(pData.result || []);
                setPurchaseReturns(prData.result || []);
            } else {
                setPurchases([]); setPurchaseReturns([]);
            }
            setLoading(false);
        } catch { setError('Failed to load data'); setLoading(false); }
    }, [customer?.id, storeId, appliedFrom, appliedTo]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const ordersBalance              = orders.reduce((s, o) => s + (parseFloat(o.balance_amount) || 0), 0);
    const salesReturnsBalance        = salesReturns.reduce((s, r) => s + (parseFloat(r.balance_amount) || 0), 0);
    const purchasesBalance           = purchases.reduce((s, p) => s + (parseFloat(p.balance_amount) || 0), 0);
    const purchaseReturnsBalance     = purchaseReturns.reduce((s, r) => s + (parseFloat(r.balance_amount) || 0), 0);
    const netBalance = ordersBalance - salesReturnsBalance + purchasesBalance - purchaseReturnsBalance;
    const totalRecords = orders.length + salesReturns.length + purchases.length + purchaseReturns.length;
    const hasRecords = totalRecords > 0;

    const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); } catch { return ''; } };
    const psBadge = (ps) => {
        const map = { not_paid: { bg:'#fef2f2', color:'#dc2626', label:'Unpaid' }, paid_partially: { bg:'#fff7ed', color:'#ea580c', label:'Partial' } };
        const s = map[ps] || { bg:'#f3f4f6', color:'#374151', label: ps };
        return <span style={{ fontSize:'0.68rem', fontWeight:700, padding:'2px 7px', borderRadius:20, background:s.bg, color:s.color, whiteSpace:'nowrap' }}>{s.label}</span>;
    };
    const pmColors = { cash:{bg:'#f0fdf4',color:'#15803d',border:'#bbf7d0'}, bank_transfer:{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'}, bank_card:{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'}, debit_card:{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'}, credit_card:{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'}, bank_cheque:{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'}, purchase:{bg:'#fffbeb',color:'#92400e',border:'#fde68a'}, sales:{bg:'#fffbeb',color:'#92400e',border:'#fde68a'}, sales_return:{bg:'#f5f3ff',color:'#6d28d9',border:'#ddd6fe'}, purchase_return:{bg:'#f5f3ff',color:'#6d28d9',border:'#ddd6fe'}, customer_account:{bg:'#fdf4ff',color:'#7e22ce',border:'#e9d5ff'}, vendor_account:{bg:'#fdf4ff',color:'#7e22ce',border:'#e9d5ff'} };
    const pmLabels = { cash:'Cash', bank_transfer:'Bank', bank_card:'Card', debit_card:'Debit', credit_card:'Credit', bank_cheque:'Cheque', purchase:'Purchase', sales:'Sales', sales_return:'Sls.Rtn', purchase_return:'Pur.Rtn', customer_account:'Cust.Acc', vendor_account:'Vend.Acc' };
    const pmBadges = (methods) => {
        if (!methods?.length) return <span style={{ color:'#e2e8f0' }}>—</span>;
        return <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>{methods.map(m => { const c = pmColors[m]||{bg:'#f3f4f6',color:'#374151',border:'#e5e7eb'}; return <span key={m} style={{ fontSize:'0.62rem', fontWeight:700, padding:'1px 5px', borderRadius:4, background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:'nowrap' }}>{pmLabels[m]||m}</span>; })}</div>;
    };
    function openBalanceSheet() {
        if (!entityData?.account) return;
        setShowBalanceSheet(true);
        if (bsTimer.current) clearTimeout(bsTimer.current);
        bsTimer.current = setTimeout(() => postingRef.current?.open(entityData.account), 100);
    }

    const COL_HEADS = [{ h:'#' }, { h:'Date' }, { h:'Code' }, { h:'Payment Status' }, { h:'Methods' }, { h:'Total', right:true }, { h:'Paid', right:true }, { h:'Balance', right:true }, { h:'' }];

    return (
        <>
        <style>{`.modal{z-index:1080!important}.modal-backdrop{z-index:1075!important}`}</style>
        {showBalanceSheet && <PostingIndex ref={postingRef} />}
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{ position:'fixed', inset:0, zIndex:1070, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 16px', overflowY:'auto' }}>
            <div onClick={e => e.stopPropagation()}
                style={{ width:'100%', maxWidth:980, borderRadius:16, overflow:'hidden', boxShadow:'0 8px 48px rgba(15,23,42,0.18)', background:'#fff', display:'flex', flexDirection:'column', border:'1px solid #e8edf3' }}>

                <div style={{ padding:'20px 28px 18px', borderBottom:'1px solid #f0f4f8', display:'flex', alignItems:'center', gap:14, background:'#fff', flexWrap:'wrap' }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:'#fff7ed', border:'1px solid #fed7aa', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <i className="bi bi-person-lines-fill" style={{ color:'#ea580c', fontSize:20 }}></i>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ color:'#0f172a', fontWeight:700, fontSize:'1.05rem', lineHeight:1.2 }}>{customer?.name || 'All Customers'}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5, flexWrap:'wrap' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:600, color:'#64748b', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:6, padding:'2px 8px' }}>
                                <i className="bi bi-receipt" style={{ fontSize:'0.65rem' }}></i>Pending Transactions
                            </span>
                            {!loading && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:600, color:'#64748b', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:6, padding:'2px 8px' }}>
                                {totalRecords} record{totalRecords !== 1 ? 's' : ''}
                            </span>}
                            {(appliedFrom || appliedTo) && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:600, color:'#0369a1', background:'#e0f2fe', border:'1px solid #bae6fd', borderRadius:6, padding:'2px 8px' }}>
                                <i className="bi bi-calendar3" style={{ fontSize:'0.65rem' }}></i>
                                {appliedFrom === appliedTo ? appliedFrom : `${appliedFrom||'…'} → ${appliedTo||'…'}`}
                            </span>}
                            {!loading && linkedVendor && <span onClick={() => linkedVendorCreateRef.current?.open(linkedVendor.id)} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:600, color:'#7c3aed', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:6, padding:'2px 8px', cursor:'pointer' }}>
                                <i className="bi bi-link-45deg" style={{ fontSize:'0.65rem' }}></i>Linked Vendor
                            </span>}
                        </div>
                    </div>
                    {!loading && !error && hasRecords && (
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ color: netBalance >= 0 ? '#dc2626' : '#16a34a', fontWeight:800, fontSize:'1.3rem', lineHeight:1, letterSpacing:'-0.02em' }}>{netBalance < 0 ? '-' : '+'} SAR {fmt(Math.abs(netBalance))}</div>
                            <div style={{ color:'#94a3b8', fontSize:'0.68rem', marginTop:2, fontWeight:500 }}>net outstanding</div>
                        </div>
                    )}
                    {customer?.id && entityData && (
                        <button onClick={openBalanceSheet} disabled={!entityData.account}
                            style={{ flexShrink:0, display:'flex', flexDirection:'row', alignItems:'center', gap:8, background: entityData.account ? '#eff6ff' : '#f8fafc', border:`1px solid ${entityData.account ? '#bfdbfe' : '#e2e8f0'}`, color: entityData.account ? '#2563eb' : '#94a3b8', borderRadius:8, padding:'8px 14px', cursor: entityData.account ? 'pointer' : 'default', lineHeight:1.3, opacity: entityData.account ? 1 : 0.7 }}
                            onMouseOver={e => { if (entityData.account) e.currentTarget.style.background='#dbeafe'; }} onMouseOut={e => { if (entityData.account) e.currentTarget.style.background='#eff6ff'; }}>
                            <i className="bi bi-journal-bookmark-fill" style={{ fontSize:16, flexShrink:0 }}></i>
                            <div style={{ textAlign:'left' }}>
                                <div style={{ fontSize:'0.72rem', fontWeight:600 }}>Balance Sheet</div>
                                {(() => { const bsAcc = freshAccount || entityData.account; const bsBal = parseFloat(bsAcc?.balance || 0); const bsDorC = bsAcc?.debit_or_credit_balance; const bsSign = bsDorC === 'credit_balance' ? '-' : '+'; const bsColor = bsDorC === 'debit_balance' ? '#dc2626' : '#16a34a'; return (
                                <div style={{ fontSize:'0.8rem', fontWeight:800, color: entityData.account ? bsColor : '#94a3b8' }}>
                                    {entityData.account ? `${bsSign}SAR ${fmt(bsBal)}` : 'No account'}
                                </div>); })()}
                            </div>
                        </button>
                    )}
                    <button onClick={onClose} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', color:'#64748b', borderRadius:8, width:34, height:34, cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                        onMouseOver={e => e.currentTarget.style.background='#f1f5f9'} onMouseOut={e => e.currentTarget.style.background='#f8fafc'}>
                        <i className="bi bi-x"></i>
                    </button>
                </div>

                <div style={{ maxHeight:'60vh', overflowY:'auto' }}>
                    {loading ? (
                        <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:'70px 0', gap:12 }}>
                            <Spinner animation="border" style={{ color:'#ea580c', width:'2rem', height:'2rem' }} />
                            <span style={{ color:'#94a3b8', fontSize:'0.85rem' }}>Loading…</span>
                        </div>
                    ) : error ? (
                        <div style={{ padding:48, textAlign:'center' }}>
                            <div style={{ width:52, height:52, borderRadius:'50%', background:'#fef2f2', border:'1px solid #fecaca', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                                <i className="bi bi-exclamation-triangle" style={{ color:'#dc2626', fontSize:22 }}></i>
                            </div>
                            <div style={{ color:'#dc2626', fontWeight:600, fontSize:'0.9rem' }}>{error}</div>
                        </div>
                    ) : !hasRecords ? (
                        <div style={{ padding:'64px 0', textAlign:'center' }}>
                            <div style={{ width:60, height:60, borderRadius:'50%', background:'#f8fafc', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                                <i className="bi bi-inbox" style={{ color:'#94a3b8', fontSize:26 }}></i>
                            </div>
                            <div style={{ color:'#334155', fontWeight:600, fontSize:'0.95rem' }}>No pending transactions</div>
                            <div style={{ color:'#94a3b8', fontSize:'0.82rem', marginTop:4 }}>All transactions are settled</div>
                        </div>
                    ) : (
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                            <thead>
                                <tr style={{ background:'#f8fafc', position:'sticky', top:0, zIndex:1 }}>
                                    {COL_HEADS.map(({ h, right }) => (
                                        <th key={h} style={{ padding:'10px 14px', fontWeight:700, color:'#475569', fontSize:'0.69rem', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:right?'right':'left', whiteSpace:'nowrap', borderBottom:'2px solid #e2e8f0' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length > 0 && <>
                                    <tr style={{ background:'#fff7ed' }}>
                                        <td colSpan={9} style={{ padding:'6px 14px', fontSize:'0.7rem', fontWeight:700, color:'#c2410c', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #fed7aa' }}>
                                            <i className="bi bi-receipt" style={{ marginRight:5 }}></i>Sales
                                            <span style={{ float:'right', fontWeight:500 }}>{orders.length} record{orders.length!==1?'s':''} &bull; Balance: SAR {fmt(ordersBalance)}</span>
                                        </td>
                                    </tr>
                                    {orders.map((o, i) => {
                                        const rowTotal = parseFloat(o.net_total) || 0;
                                        const paid = parseFloat(o.total_payment_received) || 0;
                                        const balance = parseFloat(o.balance_amount) || 0;
                                        return (
                                            <tr key={o.id || i} style={{ borderBottom:'1px solid #f1f5f9', background:'#fff', transition:'background 0.1s' }}
                                                onMouseOver={ev => ev.currentTarget.style.background='#f8faff'} onMouseOut={ev => ev.currentTarget.style.background='#fff'}>
                                                <td style={{ padding:'10px 14px', color:'#cbd5e1', fontWeight:600, fontSize:'0.75rem' }}>{i+1}</td>
                                                <td style={{ padding:'10px 14px', color:'#475569', whiteSpace:'nowrap', fontWeight:500 }}>{fmtDate(o.date)}</td>
                                                <td style={{ padding:'10px 14px' }}><span style={{ fontFamily:'monospace', background:'#f1f5f9', borderRadius:5, padding:'2px 7px', color:'#334155', fontSize:'0.73rem', fontWeight:600, border:'1px solid #e2e8f0' }}>{o.code || '—'}</span></td>
                                                <td style={{ padding:'10px 14px' }}>{psBadge(o.payment_status)}</td>
                                                <td style={{ padding:'6px 14px' }}>{pmBadges(o.payment_methods)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{fmt(rowTotal)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#16a34a', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{paid > 0 ? fmt(paid) : <span style={{ color:'#e2e8f0' }}>—</span>}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color:'#dc2626', fontVariantNumeric:'tabular-nums' }}>{fmt(balance)}</td>
                                                <td style={{ padding:'10px 10px', textAlign:'center' }}>
                                                    <button title="Edit" onClick={() => orderCreateRef.current?.open(o.id)}
                                                        style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', borderRadius:6, width:28, height:28, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                                                        onMouseOver={ev => ev.currentTarget.style.background='#dbeafe'} onMouseOut={ev => ev.currentTarget.style.background='#eff6ff'}>
                                                        <i className="bi bi-pencil" style={{ fontSize:'0.72rem' }}></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </>}
                                {salesReturns.length > 0 && <>
                                    <tr style={{ background:'#f0fdf4' }}>
                                        <td colSpan={9} style={{ padding:'6px 14px', fontSize:'0.7rem', fontWeight:700, color:'#15803d', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #bbf7d0', borderTop: orders.length > 0 ? '2px solid #e2e8f0' : 'none' }}>
                                            <i className="bi bi-arrow-return-left" style={{ marginRight:5 }}></i>Sales Returns
                                            <span style={{ float:'right', fontWeight:500 }}>{salesReturns.length} record{salesReturns.length!==1?'s':''} &bull; Balance: SAR {fmt(salesReturnsBalance)}</span>
                                        </td>
                                    </tr>
                                    {salesReturns.map((r, i) => {
                                        const rowTotal = parseFloat(r.net_total) || 0;
                                        const paid = parseFloat(r.total_payment_paid) || 0;
                                        const balance = parseFloat(r.balance_amount) || 0;
                                        return (
                                            <tr key={r.id || i} style={{ borderBottom:'1px solid #f1f5f9', background:'#fff', transition:'background 0.1s' }}
                                                onMouseOver={ev => ev.currentTarget.style.background='#f0fff4'} onMouseOut={ev => ev.currentTarget.style.background='#fff'}>
                                                <td style={{ padding:'10px 14px', color:'#cbd5e1', fontWeight:600, fontSize:'0.75rem' }}>{i+1}</td>
                                                <td style={{ padding:'10px 14px', color:'#475569', whiteSpace:'nowrap', fontWeight:500 }}>{fmtDate(r.date)}</td>
                                                <td style={{ padding:'10px 14px' }}><span style={{ fontFamily:'monospace', background:'#f0fdf4', borderRadius:5, padding:'2px 7px', color:'#166534', fontSize:'0.73rem', fontWeight:600, border:'1px solid #bbf7d0' }}>{r.code || '—'}</span></td>
                                                <td style={{ padding:'10px 14px' }}>{psBadge(r.payment_status)}</td>
                                                <td style={{ padding:'6px 14px' }}>{pmBadges(r.payment_methods)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{fmt(rowTotal)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#16a34a', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{paid > 0 ? fmt(paid) : <span style={{ color:'#e2e8f0' }}>—</span>}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color:'#16a34a', fontVariantNumeric:'tabular-nums' }}>{fmt(balance)}</td>
                                                <td style={{ padding:'10px 10px', textAlign:'center' }}>
                                                    <button title="Edit" onClick={() => salesReturnCreateRef.current?.open(r.id)}
                                                        style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', borderRadius:6, width:28, height:28, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                                                        onMouseOver={ev => ev.currentTarget.style.background='#dbeafe'} onMouseOut={ev => ev.currentTarget.style.background='#eff6ff'}>
                                                        <i className="bi bi-pencil" style={{ fontSize:'0.72rem' }}></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </>}
                                {purchases.length > 0 && <>
                                    <tr style={{ background:'#fef2f2' }}>
                                        <td colSpan={9} style={{ padding:'6px 14px', fontSize:'0.7rem', fontWeight:700, color:'#b91c1c', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #fecaca', borderTop:'2px solid #e2e8f0' }}>
                                            <i className="bi bi-receipt-cutoff" style={{ marginRight:5 }}></i>Purchases
                                            <span style={{ float:'right', fontWeight:500 }}>{purchases.length} record{purchases.length!==1?'s':''} &bull; Balance: SAR {fmt(purchasesBalance)}</span>
                                        </td>
                                    </tr>
                                    {purchases.map((p, i) => {
                                        const rowTotal = parseFloat(p.net_total) || 0;
                                        const paid = parseFloat(p.total_payment_paid) || 0;
                                        const balance = parseFloat(p.balance_amount) || 0;
                                        return (
                                            <tr key={p.id || i} style={{ borderBottom:'1px solid #f1f5f9', background:'#fff', transition:'background 0.1s' }}
                                                onMouseOver={ev => ev.currentTarget.style.background='#fff5f5'} onMouseOut={ev => ev.currentTarget.style.background='#fff'}>
                                                <td style={{ padding:'10px 14px', color:'#cbd5e1', fontWeight:600, fontSize:'0.75rem' }}>{i+1}</td>
                                                <td style={{ padding:'10px 14px', color:'#475569', whiteSpace:'nowrap', fontWeight:500 }}>{fmtDate(p.date)}</td>
                                                <td style={{ padding:'10px 14px' }}><span style={{ fontFamily:'monospace', background:'#f1f5f9', borderRadius:5, padding:'2px 7px', color:'#334155', fontSize:'0.73rem', fontWeight:600, border:'1px solid #e2e8f0' }}>{p.code || '—'}</span></td>
                                                <td style={{ padding:'10px 14px' }}>{psBadge(p.payment_status)}</td>
                                                <td style={{ padding:'6px 14px' }}>{pmBadges(p.payment_methods)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{fmt(rowTotal)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#16a34a', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{paid > 0 ? fmt(paid) : <span style={{ color:'#e2e8f0' }}>—</span>}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color:'#dc2626', fontVariantNumeric:'tabular-nums' }}>{fmt(balance)}</td>
                                                <td style={{ padding:'10px 10px', textAlign:'center' }}>
                                                    <button title="Edit" onClick={() => purchaseCreateRef.current?.open(p.id)}
                                                        style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', borderRadius:6, width:28, height:28, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                                                        onMouseOver={ev => ev.currentTarget.style.background='#dbeafe'} onMouseOut={ev => ev.currentTarget.style.background='#eff6ff'}>
                                                        <i className="bi bi-pencil" style={{ fontSize:'0.72rem' }}></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </>}
                                {purchaseReturns.length > 0 && <>
                                    <tr style={{ background:'#f0fdf4' }}>
                                        <td colSpan={9} style={{ padding:'6px 14px', fontSize:'0.7rem', fontWeight:700, color:'#15803d', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #bbf7d0', borderTop:'2px solid #e2e8f0' }}>
                                            <i className="bi bi-arrow-return-left" style={{ marginRight:5 }}></i>Purchase Returns
                                            <span style={{ float:'right', fontWeight:500 }}>{purchaseReturns.length} record{purchaseReturns.length!==1?'s':''} &bull; Balance: SAR {fmt(purchaseReturnsBalance)}</span>
                                        </td>
                                    </tr>
                                    {purchaseReturns.map((r, i) => {
                                        const rowTotal = parseFloat(r.net_total) || 0;
                                        const paid = parseFloat(r.total_payment_paid) || 0;
                                        const balance = parseFloat(r.balance_amount) || 0;
                                        return (
                                            <tr key={r.id || i} style={{ borderBottom:'1px solid #f1f5f9', background:'#fff', transition:'background 0.1s' }}
                                                onMouseOver={ev => ev.currentTarget.style.background='#f0fff4'} onMouseOut={ev => ev.currentTarget.style.background='#fff'}>
                                                <td style={{ padding:'10px 14px', color:'#cbd5e1', fontWeight:600, fontSize:'0.75rem' }}>{i+1}</td>
                                                <td style={{ padding:'10px 14px', color:'#475569', whiteSpace:'nowrap', fontWeight:500 }}>{fmtDate(r.date)}</td>
                                                <td style={{ padding:'10px 14px' }}><span style={{ fontFamily:'monospace', background:'#f0fdf4', borderRadius:5, padding:'2px 7px', color:'#166534', fontSize:'0.73rem', fontWeight:600, border:'1px solid #bbf7d0' }}>{r.code || '—'}</span></td>
                                                <td style={{ padding:'10px 14px' }}>{psBadge(r.payment_status)}</td>
                                                <td style={{ padding:'6px 14px' }}>{pmBadges(r.payment_methods)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{fmt(rowTotal)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#16a34a', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{paid > 0 ? fmt(paid) : <span style={{ color:'#e2e8f0' }}>—</span>}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color:'#16a34a', fontVariantNumeric:'tabular-nums' }}>{fmt(balance)}</td>
                                                <td style={{ padding:'10px 10px', textAlign:'center' }}>
                                                    <button title="Edit" onClick={() => purchaseReturnCreateRef.current?.open(r.id)}
                                                        style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', borderRadius:6, width:28, height:28, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                                                        onMouseOver={ev => ev.currentTarget.style.background='#dbeafe'} onMouseOut={ev => ev.currentTarget.style.background='#eff6ff'}>
                                                        <i className="bi bi-pencil" style={{ fontSize:'0.72rem' }}></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </>}
                            </tbody>
                        </table>
                    )}
                </div>
                {!loading && !error && hasRecords && (
                    <div style={{ borderTop:'2px solid #e2e8f0', background:'#f8fafc', padding:'10px 20px', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                        {orders.length > 0 && (
                            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8 }}>
                                <i className="bi bi-receipt" style={{ color:'#c2410c', fontSize:13 }}></i>
                                <div>
                                    <div style={{ fontSize:'0.66rem', color:'#9a3412', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>Sales ({orders.length})</div>
                                    <div style={{ fontSize:'0.88rem', fontWeight:800, color:'#dc2626', fontVariantNumeric:'tabular-nums' }}>SAR {fmt(ordersBalance)}</div>
                                </div>
                            </div>
                        )}
                        {salesReturns.length > 0 && (
                            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8 }}>
                                <i className="bi bi-arrow-return-left" style={{ color:'#15803d', fontSize:13 }}></i>
                                <div>
                                    <div style={{ fontSize:'0.66rem', color:'#15803d', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>Sales Returns ({salesReturns.length})</div>
                                    <div style={{ fontSize:'0.88rem', fontWeight:800, color:'#16a34a', fontVariantNumeric:'tabular-nums' }}>SAR {fmt(salesReturnsBalance)}</div>
                                </div>
                            </div>
                        )}
                        {purchases.length > 0 && (
                            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8 }}>
                                <i className="bi bi-receipt-cutoff" style={{ color:'#b91c1c', fontSize:13 }}></i>
                                <div>
                                    <div style={{ fontSize:'0.66rem', color:'#991b1b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>Purchases ({purchases.length})</div>
                                    <div style={{ fontSize:'0.88rem', fontWeight:800, color:'#dc2626', fontVariantNumeric:'tabular-nums' }}>SAR {fmt(purchasesBalance)}</div>
                                </div>
                            </div>
                        )}
                        {purchaseReturns.length > 0 && (
                            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8 }}>
                                <i className="bi bi-arrow-return-left" style={{ color:'#15803d', fontSize:13 }}></i>
                                <div>
                                    <div style={{ fontSize:'0.66rem', color:'#15803d', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>Pur. Returns ({purchaseReturns.length})</div>
                                    <div style={{ fontSize:'0.88rem', fontWeight:800, color:'#16a34a', fontVariantNumeric:'tabular-nums' }}>SAR {fmt(purchaseReturnsBalance)}</div>
                                </div>
                            </div>
                        )}
                        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, padding:'7px 16px', background: netBalance >= 0 ? '#fef2f2' : '#f0fdf4', border:`1px solid ${netBalance >= 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius:8 }}>
                            <i className="bi bi-calculator" style={{ color: netBalance >= 0 ? '#dc2626' : '#16a34a', fontSize:14 }}></i>
                            <div>
                                <div style={{ fontSize:'0.66rem', color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>Net Outstanding</div>
                                <div style={{ fontSize:'0.95rem', fontWeight:800, color: netBalance >= 0 ? '#dc2626' : '#16a34a', fontVariantNumeric:'tabular-nums' }}>{netBalance < 0 ? '-' : '+'} SAR {fmt(Math.abs(netBalance))}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <OrderCreate ref={orderCreateRef} refreshList={fetchAll} />
            <SalesReturnCreate ref={salesReturnCreateRef} refreshList={fetchAll} />
            <PurchaseCreate ref={purchaseCreateRef} refreshList={fetchAll} />
            <PurchaseReturnedCreate ref={purchaseReturnCreateRef} refreshList={fetchAll} />
            <VendorCreate ref={linkedVendorCreateRef} refreshList={fetchAll} />
        </div>
        </>
    );
}

// ── Vendor Payables Modal ─────────────────────────────────────────────────────
function VendorPayablesModal({ vendor, storeId, appliedFrom, appliedTo, onClose }) {
    const [purchases, setPurchases] = useState([]);
    const [purchaseReturns, setPurchaseReturns] = useState([]);
    const [orders, setOrders] = useState([]);
    const [salesReturns, setSalesReturns] = useState([]);
    const [entityData, setEntityData] = useState(null);
    const [freshAccount, setFreshAccount] = useState(null);
    const [linkedCustomer, setLinkedCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const purchaseCreateRef = useRef();
    const purchaseReturnCreateRef = useRef();
    const orderCreateRef = useRef();
    const salesReturnCreateRef = useRef();
    const linkedCustomerCreateRef = useRef();
    const [showBalanceSheet, setShowBalanceSheet] = useState(false);
    const postingRef = useRef();
    const bsTimer = useRef(null);

    const fetchAll = useCallback(async () => {
        setLoading(true); setError('');
        setFreshAccount(null);
        const headers = { Authorization: localStorage.getItem('access_token') };
        const fromDateStr = appliedFrom ? (appliedFrom.length === 10 ? appliedFrom : `${appliedFrom}-01`) : '';
        const toDateStr = appliedTo ? (appliedTo.length === 10 ? appliedTo : (() => { const [y,m] = appliedTo.split('-').map(Number); return `${appliedTo}-${String(new Date(y, m, 0).getDate()).padStart(2,'0')}`; })()) : '';
        const dateFilter = {};
        if (fromDateStr) dateFilter['search[from_date]'] = fromDateStr;
        if (toDateStr) dateFilter['search[to_date]'] = toDateStr;
        const ppBase = { 'search[store_id]': storeId || '', 'search[payment_status]': 'not_paid,paid_partially', ...dateFilter, 'select': 'id,code,date,net_total,total_payment_paid,balance_amount,payment_status,payment_methods', limit: '500' };
        const prpBase = { 'search[store_id]': storeId || '', 'search[payment_status]': 'not_paid,paid_partially', ...dateFilter, 'select': 'id,code,date,net_total,total_payment_paid,balance_amount,payment_status,payment_methods', limit: '500' };
        if (vendor?.id) { ppBase['search[vendor_id]'] = vendor.id; prpBase['search[vendor_id]'] = vendor.id; }
        const pp = new URLSearchParams(ppBase);
        const prp = new URLSearchParams(prpBase);
        try {
            let vend = null;
            let fetchPromises = [
                fetch(`/v1/purchase?${pp}`, { headers }).then(r => r.json()),
                fetch(`/v1/purchase-return?${prp}`, { headers }).then(r => r.json()),
            ];
            if (vendor?.id) {
                fetchPromises.unshift(fetch(`/v1/vendor/${vendor.id}?search[store_id]=${encodeURIComponent(storeId||'')}`, { headers }).then(r => r.json()));
            }
            const results = await Promise.all(fetchPromises);
            if (vendor?.id) {
                vend = results[0].result || null;
                setEntityData(vend);
                setPurchases(results[1].result || []);
                setPurchaseReturns(results[2].result || []);
            } else {
                setEntityData(null);
                setPurchases(results[0].result || []);
                setPurchaseReturns(results[1].result || []);
            }
            let cust = null;
            const [cData2, aData2] = await Promise.all([
                (vend?.vat_no && vend?.name)
                    ? fetch(`/v1/customer/vat_no/name?vat_no=${encodeURIComponent(vend.vat_no)}&name=${encodeURIComponent(vend.name)}&search[store_id]=${encodeURIComponent(storeId || '')}`, { headers }).then(r => r.json()).catch(() => null)
                    : Promise.resolve(null),
                vend?.account?.id
                    ? fetch(`/v1/account/${vend.account.id}?search[store_id]=${encodeURIComponent(storeId||'')}`, { headers }).then(r => r.json()).catch(() => null)
                    : Promise.resolve(null),
            ]);
            if (cData2?.result?.id) cust = cData2.result;
            if (aData2?.result) setFreshAccount(aData2.result);
            setLinkedCustomer(cust);
            if (cust?.id) {
                const op = new URLSearchParams({ 'search[customer_id]': cust.id, 'search[store_id]': storeId || '', 'search[payment_status]': 'not_paid,paid_partially', ...dateFilter, 'select': 'id,code,date,net_total,total_payment_received,balance_amount,payment_status,payment_methods', limit: '500' });
                const srp = new URLSearchParams({ 'search[customer_id]': cust.id, 'search[store_id]': storeId || '', 'search[payment_status]': 'not_paid,paid_partially', ...dateFilter, 'select': 'id,code,date,net_total,total_payment_paid,balance_amount,payment_status,payment_methods', limit: '500' });
                const [oData, srData] = await Promise.all([
                    fetch(`/v1/order?${op}`, { headers }).then(r => r.json()),
                    fetch(`/v1/sales-return?${srp}`, { headers }).then(r => r.json()),
                ]);
                setOrders(oData.result || []);
                setSalesReturns(srData.result || []);
            } else {
                setOrders([]); setSalesReturns([]);
            }
            setLoading(false);
        } catch { setError('Failed to load data'); setLoading(false); }
    }, [vendor?.id, storeId, appliedFrom, appliedTo]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const purchasesBalance       = purchases.reduce((s, p) => s + (parseFloat(p.balance_amount) || 0), 0);
    const purchaseReturnsBalance = purchaseReturns.reduce((s, r) => s + (parseFloat(r.balance_amount) || 0), 0);
    const ordersBalance          = orders.reduce((s, o) => s + (parseFloat(o.balance_amount) || 0), 0);
    const salesReturnsBalance    = salesReturns.reduce((s, r) => s + (parseFloat(r.balance_amount) || 0), 0);
    const netBalance = purchasesBalance - purchaseReturnsBalance + ordersBalance - salesReturnsBalance;
    const totalRecords = purchases.length + purchaseReturns.length + orders.length + salesReturns.length;
    const hasRecords = totalRecords > 0;

    const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); } catch { return ''; } };
    const psBadge = (ps) => {
        const map = { not_paid: { bg:'#fef2f2', color:'#dc2626', label:'Unpaid' }, paid_partially: { bg:'#fff7ed', color:'#ea580c', label:'Partial' } };
        const s = map[ps] || { bg:'#f3f4f6', color:'#374151', label: ps };
        return <span style={{ fontSize:'0.68rem', fontWeight:700, padding:'2px 7px', borderRadius:20, background:s.bg, color:s.color, whiteSpace:'nowrap' }}>{s.label}</span>;
    };
    const pmColors = { cash:{bg:'#f0fdf4',color:'#15803d',border:'#bbf7d0'}, bank_transfer:{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'}, bank_card:{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'}, debit_card:{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'}, credit_card:{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'}, bank_cheque:{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'}, purchase:{bg:'#fffbeb',color:'#92400e',border:'#fde68a'}, sales:{bg:'#fffbeb',color:'#92400e',border:'#fde68a'}, sales_return:{bg:'#f5f3ff',color:'#6d28d9',border:'#ddd6fe'}, purchase_return:{bg:'#f5f3ff',color:'#6d28d9',border:'#ddd6fe'}, customer_account:{bg:'#fdf4ff',color:'#7e22ce',border:'#e9d5ff'}, vendor_account:{bg:'#fdf4ff',color:'#7e22ce',border:'#e9d5ff'} };
    const pmLabels = { cash:'Cash', bank_transfer:'Bank', bank_card:'Card', debit_card:'Debit', credit_card:'Credit', bank_cheque:'Cheque', purchase:'Purchase', sales:'Sales', sales_return:'Sls.Rtn', purchase_return:'Pur.Rtn', customer_account:'Cust.Acc', vendor_account:'Vend.Acc' };
    const pmBadges = (methods) => {
        if (!methods?.length) return <span style={{ color:'#e2e8f0' }}>—</span>;
        return <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>{methods.map(m => { const c = pmColors[m]||{bg:'#f3f4f6',color:'#374151',border:'#e5e7eb'}; return <span key={m} style={{ fontSize:'0.62rem', fontWeight:700, padding:'1px 5px', borderRadius:4, background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:'nowrap' }}>{pmLabels[m]||m}</span>; })}</div>;
    };
    function openBalanceSheet() {
        if (!entityData?.account) return;
        setShowBalanceSheet(true);
        if (bsTimer.current) clearTimeout(bsTimer.current);
        bsTimer.current = setTimeout(() => postingRef.current?.open(entityData.account), 100);
    }
    const COL_HEADS = [{ h:'#' }, { h:'Date' }, { h:'Code' }, { h:'Payment Status' }, { h:'Methods' }, { h:'Total', right:true }, { h:'Paid', right:true }, { h:'Balance', right:true }, { h:'' }];

    return (
        <>
        <style>{`.modal{z-index:1080!important}.modal-backdrop{z-index:1075!important}`}</style>
        {showBalanceSheet && <PostingIndex ref={postingRef} />}
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{ position:'fixed', inset:0, zIndex:1070, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 16px', overflowY:'auto' }}>
            <div onClick={e => e.stopPropagation()}
                style={{ width:'100%', maxWidth:980, borderRadius:16, overflow:'hidden', boxShadow:'0 8px 48px rgba(15,23,42,0.18)', background:'#fff', display:'flex', flexDirection:'column', border:'1px solid #e8edf3' }}>

                <div style={{ padding:'20px 28px 18px', borderBottom:'1px solid #f0f4f8', display:'flex', alignItems:'center', gap:14, background:'#fff', flexWrap:'wrap' }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:'#fef2f2', border:'1px solid #fecaca', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <i className="bi bi-building" style={{ color:'#dc2626', fontSize:20 }}></i>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ color:'#0f172a', fontWeight:700, fontSize:'1.05rem', lineHeight:1.2 }}>{vendor?.name || 'All Vendors'}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5, flexWrap:'wrap' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:600, color:'#64748b', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:6, padding:'2px 8px' }}>
                                <i className="bi bi-receipt-cutoff" style={{ fontSize:'0.65rem' }}></i>Pending Transactions
                            </span>
                            {!loading && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:600, color:'#64748b', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:6, padding:'2px 8px' }}>
                                {totalRecords} record{totalRecords !== 1 ? 's' : ''}
                            </span>}
                            {(appliedFrom || appliedTo) && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:600, color:'#0369a1', background:'#e0f2fe', border:'1px solid #bae6fd', borderRadius:6, padding:'2px 8px' }}>
                                <i className="bi bi-calendar3" style={{ fontSize:'0.65rem' }}></i>
                                {appliedFrom === appliedTo ? appliedFrom : `${appliedFrom||'…'} → ${appliedTo||'…'}`}
                            </span>}
                            {!loading && linkedCustomer && <span onClick={() => linkedCustomerCreateRef.current?.open(linkedCustomer.id)} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem', fontWeight:600, color:'#7c3aed', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:6, padding:'2px 8px', cursor:'pointer' }}>
                                <i className="bi bi-link-45deg" style={{ fontSize:'0.65rem' }}></i>Linked Customer
                            </span>}
                        </div>
                    </div>
                    {!loading && !error && hasRecords && (
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ color: netBalance >= 0 ? '#dc2626' : '#16a34a', fontWeight:800, fontSize:'1.3rem', lineHeight:1, letterSpacing:'-0.02em' }}>{netBalance < 0 ? '-' : '+'} SAR {fmt(Math.abs(netBalance))}</div>
                            <div style={{ color:'#94a3b8', fontSize:'0.68rem', marginTop:2, fontWeight:500 }}>net outstanding</div>
                        </div>
                    )}
                    {vendor?.id && entityData && (
                        <button onClick={openBalanceSheet} disabled={!entityData.account}
                            style={{ flexShrink:0, display:'flex', flexDirection:'row', alignItems:'center', gap:8, background: entityData.account ? '#eff6ff' : '#f8fafc', border:`1px solid ${entityData.account ? '#bfdbfe' : '#e2e8f0'}`, color: entityData.account ? '#2563eb' : '#94a3b8', borderRadius:8, padding:'8px 14px', cursor: entityData.account ? 'pointer' : 'default', lineHeight:1.3, opacity: entityData.account ? 1 : 0.7 }}
                            onMouseOver={e => { if (entityData.account) e.currentTarget.style.background='#dbeafe'; }} onMouseOut={e => { if (entityData.account) e.currentTarget.style.background='#eff6ff'; }}>
                            <i className="bi bi-journal-bookmark-fill" style={{ fontSize:16, flexShrink:0 }}></i>
                            <div style={{ textAlign:'left' }}>
                                <div style={{ fontSize:'0.72rem', fontWeight:600 }}>Balance Sheet</div>
                                {(() => { const bsAcc = freshAccount || entityData.account; const bsBal = parseFloat(bsAcc?.balance || 0); const bsDorC = bsAcc?.debit_or_credit_balance; const bsSign = bsDorC === 'credit_balance' ? '-' : '+'; const bsColor = bsDorC === 'credit_balance' ? '#dc2626' : '#16a34a'; return (
                                <div style={{ fontSize:'0.8rem', fontWeight:800, color: entityData.account ? bsColor : '#94a3b8' }}>
                                    {entityData.account ? `${bsSign}SAR ${fmt(bsBal)}` : 'No account'}
                                </div>); })()}
                            </div>
                        </button>
                    )}
                    <button onClick={onClose} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', color:'#64748b', borderRadius:8, width:34, height:34, cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                        onMouseOver={e => e.currentTarget.style.background='#f1f5f9'} onMouseOut={e => e.currentTarget.style.background='#f8fafc'}>
                        <i className="bi bi-x"></i>
                    </button>
                </div>

                <div style={{ maxHeight:'60vh', overflowY:'auto' }}>
                    {loading ? (
                        <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:'70px 0', gap:12 }}>
                            <Spinner animation="border" style={{ color:'#dc2626', width:'2rem', height:'2rem' }} />
                            <span style={{ color:'#94a3b8', fontSize:'0.85rem' }}>Loading…</span>
                        </div>
                    ) : error ? (
                        <div style={{ padding:48, textAlign:'center' }}>
                            <div style={{ width:52, height:52, borderRadius:'50%', background:'#fef2f2', border:'1px solid #fecaca', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                                <i className="bi bi-exclamation-triangle" style={{ color:'#dc2626', fontSize:22 }}></i>
                            </div>
                            <div style={{ color:'#dc2626', fontWeight:600, fontSize:'0.9rem' }}>{error}</div>
                        </div>
                    ) : !hasRecords ? (
                        <div style={{ padding:'64px 0', textAlign:'center' }}>
                            <div style={{ width:60, height:60, borderRadius:'50%', background:'#f8fafc', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                                <i className="bi bi-inbox" style={{ color:'#94a3b8', fontSize:26 }}></i>
                            </div>
                            <div style={{ color:'#334155', fontWeight:600, fontSize:'0.95rem' }}>No pending transactions</div>
                            <div style={{ color:'#94a3b8', fontSize:'0.82rem', marginTop:4 }}>All transactions are settled</div>
                        </div>
                    ) : (
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                            <thead>
                                <tr style={{ background:'#f8fafc', position:'sticky', top:0, zIndex:1 }}>
                                    {COL_HEADS.map(({ h, right }) => (
                                        <th key={h} style={{ padding:'10px 14px', fontWeight:700, color:'#475569', fontSize:'0.69rem', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:right?'right':'left', whiteSpace:'nowrap', borderBottom:'2px solid #e2e8f0' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.length > 0 && <>
                                    <tr style={{ background:'#fef2f2' }}>
                                        <td colSpan={9} style={{ padding:'6px 14px', fontSize:'0.7rem', fontWeight:700, color:'#b91c1c', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #fecaca' }}>
                                            <i className="bi bi-receipt-cutoff" style={{ marginRight:5 }}></i>Purchases
                                            <span style={{ float:'right', fontWeight:500 }}>{purchases.length} record{purchases.length!==1?'s':''} &bull; Balance: SAR {fmt(purchasesBalance)}</span>
                                        </td>
                                    </tr>
                                    {purchases.map((p, i) => {
                                        const rowTotal = parseFloat(p.net_total) || 0;
                                        const paid = parseFloat(p.total_payment_paid) || 0;
                                        const balance = parseFloat(p.balance_amount) || 0;
                                        return (
                                            <tr key={p.id || i} style={{ borderBottom:'1px solid #f1f5f9', background:'#fff', transition:'background 0.1s' }}
                                                onMouseOver={ev => ev.currentTarget.style.background='#fff5f5'} onMouseOut={ev => ev.currentTarget.style.background='#fff'}>
                                                <td style={{ padding:'10px 14px', color:'#cbd5e1', fontWeight:600, fontSize:'0.75rem' }}>{i+1}</td>
                                                <td style={{ padding:'10px 14px', color:'#475569', whiteSpace:'nowrap', fontWeight:500 }}>{fmtDate(p.date)}</td>
                                                <td style={{ padding:'10px 14px' }}><span style={{ fontFamily:'monospace', background:'#f1f5f9', borderRadius:5, padding:'2px 7px', color:'#334155', fontSize:'0.73rem', fontWeight:600, border:'1px solid #e2e8f0' }}>{p.code || '—'}</span></td>
                                                <td style={{ padding:'10px 14px' }}>{psBadge(p.payment_status)}</td>
                                                <td style={{ padding:'6px 14px' }}>{pmBadges(p.payment_methods)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{fmt(rowTotal)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#16a34a', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{paid > 0 ? fmt(paid) : <span style={{ color:'#e2e8f0' }}>—</span>}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color:'#dc2626', fontVariantNumeric:'tabular-nums' }}>{fmt(balance)}</td>
                                                <td style={{ padding:'10px 10px', textAlign:'center' }}>
                                                    <button title="Edit" onClick={() => purchaseCreateRef.current?.open(p.id)}
                                                        style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', borderRadius:6, width:28, height:28, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                                                        onMouseOver={ev => ev.currentTarget.style.background='#dbeafe'} onMouseOut={ev => ev.currentTarget.style.background='#eff6ff'}>
                                                        <i className="bi bi-pencil" style={{ fontSize:'0.72rem' }}></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </>}
                                {purchaseReturns.length > 0 && <>
                                    <tr style={{ background:'#f0fdf4' }}>
                                        <td colSpan={9} style={{ padding:'6px 14px', fontSize:'0.7rem', fontWeight:700, color:'#15803d', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #bbf7d0', borderTop: purchases.length > 0 ? '2px solid #e2e8f0' : 'none' }}>
                                            <i className="bi bi-arrow-return-left" style={{ marginRight:5 }}></i>Purchase Returns
                                            <span style={{ float:'right', fontWeight:500 }}>{purchaseReturns.length} record{purchaseReturns.length!==1?'s':''} &bull; Balance: SAR {fmt(purchaseReturnsBalance)}</span>
                                        </td>
                                    </tr>
                                    {purchaseReturns.map((r, i) => {
                                        const rowTotal = parseFloat(r.net_total) || 0;
                                        const paid = parseFloat(r.total_payment_paid) || 0;
                                        const balance = parseFloat(r.balance_amount) || 0;
                                        return (
                                            <tr key={r.id || i} style={{ borderBottom:'1px solid #f1f5f9', background:'#fff', transition:'background 0.1s' }}
                                                onMouseOver={ev => ev.currentTarget.style.background='#f0fff4'} onMouseOut={ev => ev.currentTarget.style.background='#fff'}>
                                                <td style={{ padding:'10px 14px', color:'#cbd5e1', fontWeight:600, fontSize:'0.75rem' }}>{i+1}</td>
                                                <td style={{ padding:'10px 14px', color:'#475569', whiteSpace:'nowrap', fontWeight:500 }}>{fmtDate(r.date)}</td>
                                                <td style={{ padding:'10px 14px' }}><span style={{ fontFamily:'monospace', background:'#f0fdf4', borderRadius:5, padding:'2px 7px', color:'#166534', fontSize:'0.73rem', fontWeight:600, border:'1px solid #bbf7d0' }}>{r.code || '—'}</span></td>
                                                <td style={{ padding:'10px 14px' }}>{psBadge(r.payment_status)}</td>
                                                <td style={{ padding:'6px 14px' }}>{pmBadges(r.payment_methods)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{fmt(rowTotal)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#16a34a', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{paid > 0 ? fmt(paid) : <span style={{ color:'#e2e8f0' }}>—</span>}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color:'#16a34a', fontVariantNumeric:'tabular-nums' }}>{fmt(balance)}</td>
                                                <td style={{ padding:'10px 10px', textAlign:'center' }}>
                                                    <button title="Edit" onClick={() => purchaseReturnCreateRef.current?.open(r.id)}
                                                        style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', borderRadius:6, width:28, height:28, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                                                        onMouseOver={ev => ev.currentTarget.style.background='#dbeafe'} onMouseOut={ev => ev.currentTarget.style.background='#eff6ff'}>
                                                        <i className="bi bi-pencil" style={{ fontSize:'0.72rem' }}></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </>}
                                {orders.length > 0 && <>
                                    <tr style={{ background:'#fff7ed' }}>
                                        <td colSpan={9} style={{ padding:'6px 14px', fontSize:'0.7rem', fontWeight:700, color:'#c2410c', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #fed7aa', borderTop:'2px solid #e2e8f0' }}>
                                            <i className="bi bi-receipt" style={{ marginRight:5 }}></i>Sales
                                            <span style={{ float:'right', fontWeight:500 }}>{orders.length} record{orders.length!==1?'s':''} &bull; Balance: SAR {fmt(ordersBalance)}</span>
                                        </td>
                                    </tr>
                                    {orders.map((o, i) => {
                                        const rowTotal = parseFloat(o.net_total) || 0;
                                        const paid = parseFloat(o.total_payment_received) || 0;
                                        const balance = parseFloat(o.balance_amount) || 0;
                                        return (
                                            <tr key={o.id || i} style={{ borderBottom:'1px solid #f1f5f9', background:'#fff', transition:'background 0.1s' }}
                                                onMouseOver={ev => ev.currentTarget.style.background='#f8faff'} onMouseOut={ev => ev.currentTarget.style.background='#fff'}>
                                                <td style={{ padding:'10px 14px', color:'#cbd5e1', fontWeight:600, fontSize:'0.75rem' }}>{i+1}</td>
                                                <td style={{ padding:'10px 14px', color:'#475569', whiteSpace:'nowrap', fontWeight:500 }}>{fmtDate(o.date)}</td>
                                                <td style={{ padding:'10px 14px' }}><span style={{ fontFamily:'monospace', background:'#f1f5f9', borderRadius:5, padding:'2px 7px', color:'#334155', fontSize:'0.73rem', fontWeight:600, border:'1px solid #e2e8f0' }}>{o.code || '—'}</span></td>
                                                <td style={{ padding:'10px 14px' }}>{psBadge(o.payment_status)}</td>
                                                <td style={{ padding:'6px 14px' }}>{pmBadges(o.payment_methods)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{fmt(rowTotal)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#16a34a', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{paid > 0 ? fmt(paid) : <span style={{ color:'#e2e8f0' }}>—</span>}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color:'#dc2626', fontVariantNumeric:'tabular-nums' }}>{fmt(balance)}</td>
                                                <td style={{ padding:'10px 10px', textAlign:'center' }}>
                                                    <button title="Edit" onClick={() => orderCreateRef.current?.open(o.id)}
                                                        style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', borderRadius:6, width:28, height:28, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                                                        onMouseOver={ev => ev.currentTarget.style.background='#dbeafe'} onMouseOut={ev => ev.currentTarget.style.background='#eff6ff'}>
                                                        <i className="bi bi-pencil" style={{ fontSize:'0.72rem' }}></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </>}
                                {salesReturns.length > 0 && <>
                                    <tr style={{ background:'#f0fdf4' }}>
                                        <td colSpan={9} style={{ padding:'6px 14px', fontSize:'0.7rem', fontWeight:700, color:'#15803d', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #bbf7d0', borderTop:'2px solid #e2e8f0' }}>
                                            <i className="bi bi-arrow-return-left" style={{ marginRight:5 }}></i>Sales Returns
                                            <span style={{ float:'right', fontWeight:500 }}>{salesReturns.length} record{salesReturns.length!==1?'s':''} &bull; Balance: SAR {fmt(salesReturnsBalance)}</span>
                                        </td>
                                    </tr>
                                    {salesReturns.map((r, i) => {
                                        const rowTotal = parseFloat(r.net_total) || 0;
                                        const paid = parseFloat(r.total_payment_paid) || 0;
                                        const balance = parseFloat(r.balance_amount) || 0;
                                        return (
                                            <tr key={r.id || i} style={{ borderBottom:'1px solid #f1f5f9', background:'#fff', transition:'background 0.1s' }}
                                                onMouseOver={ev => ev.currentTarget.style.background='#f0fff4'} onMouseOut={ev => ev.currentTarget.style.background='#fff'}>
                                                <td style={{ padding:'10px 14px', color:'#cbd5e1', fontWeight:600, fontSize:'0.75rem' }}>{i+1}</td>
                                                <td style={{ padding:'10px 14px', color:'#475569', whiteSpace:'nowrap', fontWeight:500 }}>{fmtDate(r.date)}</td>
                                                <td style={{ padding:'10px 14px' }}><span style={{ fontFamily:'monospace', background:'#f0fdf4', borderRadius:5, padding:'2px 7px', color:'#166534', fontSize:'0.73rem', fontWeight:600, border:'1px solid #bbf7d0' }}>{r.code || '—'}</span></td>
                                                <td style={{ padding:'10px 14px' }}>{psBadge(r.payment_status)}</td>
                                                <td style={{ padding:'6px 14px' }}>{pmBadges(r.payment_methods)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{fmt(rowTotal)}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', color:'#16a34a', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{paid > 0 ? fmt(paid) : <span style={{ color:'#e2e8f0' }}>—</span>}</td>
                                                <td style={{ padding:'10px 14px', textAlign:'right', fontWeight:700, color:'#16a34a', fontVariantNumeric:'tabular-nums' }}>{fmt(balance)}</td>
                                                <td style={{ padding:'10px 10px', textAlign:'center' }}>
                                                    <button title="Edit" onClick={() => salesReturnCreateRef.current?.open(r.id)}
                                                        style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', borderRadius:6, width:28, height:28, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                                                        onMouseOver={ev => ev.currentTarget.style.background='#dbeafe'} onMouseOut={ev => ev.currentTarget.style.background='#eff6ff'}>
                                                        <i className="bi bi-pencil" style={{ fontSize:'0.72rem' }}></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </>}
                            </tbody>
                        </table>
                    )}
                </div>
                {!loading && !error && hasRecords && (
                    <div style={{ borderTop:'2px solid #e2e8f0', background:'#f8fafc', padding:'10px 20px', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                        {purchases.length > 0 && (
                            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8 }}>
                                <i className="bi bi-receipt-cutoff" style={{ color:'#b91c1c', fontSize:13 }}></i>
                                <div>
                                    <div style={{ fontSize:'0.66rem', color:'#991b1b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>Purchases ({purchases.length})</div>
                                    <div style={{ fontSize:'0.88rem', fontWeight:800, color:'#dc2626', fontVariantNumeric:'tabular-nums' }}>SAR {fmt(purchasesBalance)}</div>
                                </div>
                            </div>
                        )}
                        {purchaseReturns.length > 0 && (
                            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8 }}>
                                <i className="bi bi-arrow-return-left" style={{ color:'#15803d', fontSize:13 }}></i>
                                <div>
                                    <div style={{ fontSize:'0.66rem', color:'#15803d', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>Pur. Returns ({purchaseReturns.length})</div>
                                    <div style={{ fontSize:'0.88rem', fontWeight:800, color:'#16a34a', fontVariantNumeric:'tabular-nums' }}>SAR {fmt(purchaseReturnsBalance)}</div>
                                </div>
                            </div>
                        )}
                        {orders.length > 0 && (
                            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8 }}>
                                <i className="bi bi-receipt" style={{ color:'#c2410c', fontSize:13 }}></i>
                                <div>
                                    <div style={{ fontSize:'0.66rem', color:'#9a3412', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>Sales ({orders.length})</div>
                                    <div style={{ fontSize:'0.88rem', fontWeight:800, color:'#dc2626', fontVariantNumeric:'tabular-nums' }}>SAR {fmt(ordersBalance)}</div>
                                </div>
                            </div>
                        )}
                        {salesReturns.length > 0 && (
                            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8 }}>
                                <i className="bi bi-arrow-return-left" style={{ color:'#15803d', fontSize:13 }}></i>
                                <div>
                                    <div style={{ fontSize:'0.66rem', color:'#15803d', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>Sales Returns ({salesReturns.length})</div>
                                    <div style={{ fontSize:'0.88rem', fontWeight:800, color:'#16a34a', fontVariantNumeric:'tabular-nums' }}>SAR {fmt(salesReturnsBalance)}</div>
                                </div>
                            </div>
                        )}
                        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, padding:'7px 16px', background: netBalance >= 0 ? '#fef2f2' : '#f0fdf4', border:`1px solid ${netBalance >= 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius:8 }}>
                            <i className="bi bi-calculator" style={{ color: netBalance >= 0 ? '#dc2626' : '#16a34a', fontSize:14 }}></i>
                            <div>
                                <div style={{ fontSize:'0.66rem', color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>Net Outstanding</div>
                                <div style={{ fontSize:'0.95rem', fontWeight:800, color: netBalance >= 0 ? '#dc2626' : '#16a34a', fontVariantNumeric:'tabular-nums' }}>{netBalance < 0 ? '-' : '+'} SAR {fmt(Math.abs(netBalance))}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <PurchaseCreate ref={purchaseCreateRef} refreshList={fetchAll} />
            <PurchaseReturnedCreate ref={purchaseReturnCreateRef} refreshList={fetchAll} />
            <OrderCreate ref={orderCreateRef} refreshList={fetchAll} />
            <SalesReturnCreate ref={salesReturnCreateRef} refreshList={fetchAll} />
            <CustomerCreate ref={linkedCustomerCreateRef} refreshList={fetchAll} />
        </div>
        </>
    );
}

const BG = '#212529';
const BORDER = '#495057';

// ── KPI Info Tooltip (ⓘ icon popup with Print/PDF/Share) ──────────────────────
function InfoTooltip({ lines, cardTitle, store, filters, children }) {
    const [show, setShow] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState("");
    const [offsetX, setOffsetX] = useState(0);
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);
    const timerRef = useRef(null);

    useLayoutEffect(() => {
        if (!show || !tooltipRef.current) { setOffsetX(0); return; }
        const rect = tooltipRef.current.getBoundingClientRect();
        const sidebarRight = (document.getElementById('sidebar')?.getBoundingClientRect().right ?? 0) + 8;
        if (rect.left < sidebarRight) setOffsetX(sidebarRight - rect.left);
        else if (rect.right > window.innerWidth - 8) setOffsetX(window.innerWidth - 8 - rect.right);
        else setOffsetX(0);
    }, [show]);

    const clearTimer = useCallback(() => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } }, []);
    const startTimer = useCallback(() => { clearTimer(); timerRef.current = setTimeout(() => setShow(false), 5000); }, [clearTimer]);

    useEffect(() => { if (show) startTimer(); else clearTimer(); return clearTimer; }, [show, startTimer, clearTimer]);

    useEffect(() => {
        if (!show) return;
        const handle = (e) => {
            if (triggerRef.current?.contains(e.target)) return;
            if (tooltipRef.current?.contains(e.target)) return;
            if (e.target.closest('.modal, .modal-backdrop, .modal-dialog')) return;
            setShow(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [show]);

    async function handlePrint(e) {
        e.stopPropagation();
        try {
            const doc = generateInfoPdf('', cardTitle || 'KPI', null, lines, filters || {}, store || {});
            doc.autoPrint(); doc.output('dataurlnewwindow');
        } catch(err) { setError(err?.message || 'Print failed'); }
    }

    async function handlePDF(e) {
        e.stopPropagation(); setIsBusy(true); setError("");
        try {
            const doc = generateInfoPdf('', cardTitle || 'KPI', null, lines, filters || {}, store || {});
            doc.save(`${safeName(cardTitle || 'KPI')}.pdf`);
        } catch(err) { setError(err?.message || 'PDF failed'); }
        finally { setIsBusy(false); }
    }

    async function handleShare(e) {
        e.stopPropagation(); setIsBusy(true); setError("");
        try {
            const doc = generateInfoPdf('', cardTitle || 'KPI', null, lines, filters || {}, store || {});
            const url = await uploadPdfForShare(doc.output('blob'), `${safeName(cardTitle || 'KPI')}.pdf`);
            window.open(`https://wa.me?text=${encodeURIComponent(`${cardTitle}\n${url}`)}`, '_blank');
        } catch(err) { setError(err?.message || 'Share failed'); }
        finally { setIsBusy(false); }
    }

    const BTN = { background:'none', border:'1px solid rgba(255,255,255,0.25)', color:'#adb5bd', borderRadius:'4px', cursor:'pointer', fontSize:'0.7rem', padding:'2px 9px' };
    const BTN_GRN = { ...BTN, border:'1px solid #28a745', color:'#28a745' };

    return (
        <span style={{ position:"relative", display:"inline-flex", alignItems:"center", ...(children ? {} : { marginLeft:"5px", verticalAlign:"middle" }) }}>
            {children
                ? <span ref={triggerRef} onClick={e => { e.stopPropagation(); setShow(p => !p); }}
                    style={{ cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4 }}>
                    {children}
                    <i className="bi bi-caret-down-fill" style={{ fontSize:'0.45rem', color:'#94a3b8', marginTop:2, opacity: show ? 0 : 0.8 }} />
                  </span>
                : <i ref={triggerRef} className="bi bi-info-circle-fill"
                    style={{ fontSize:"0.75rem", color:"#adb5bd", cursor:"pointer" }}
                    onClick={e => { e.stopPropagation(); setShow(p => !p); }} />
            }
            {show && (
                <div ref={tooltipRef}
                    style={{ position:"absolute", top:"130%", left:"50%", transform:`translateX(calc(-50% + ${offsetX}px))`,
                        backgroundColor:BG, color:"#f8f9fa", borderRadius:"6px",
                        border:`1px solid ${BORDER}`, fontSize:"0.73rem", zIndex:1059,
                        minWidth:"260px", maxWidth:"min(560px, 92vw)",
                        boxShadow:"0 4px 14px rgba(0,0,0,.45)", lineHeight:"1.7" }}
                    onMouseEnter={clearTimer} onMouseLeave={startTimer}
                    onClick={e => e.stopPropagation()}>
                    <div style={{ position:"absolute", bottom:"100%", left:"50%", transform:"translateX(-50%)",
                        width:0, height:0, borderLeft:"6px solid transparent",
                        borderRight:"6px solid transparent", borderBottom:`6px solid ${BORDER}` }} />
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                        padding:'7px 10px 7px 14px', borderBottom:`1px solid ${BORDER}`,
                        fontWeight:700, fontSize:'0.8rem' }}>
                        <span>{cardTitle || ''}</span>
                        <button type="button" onClick={e => { e.stopPropagation(); setShow(false); }}
                            style={{ background:'none', border:'none', color:'#adb5bd', cursor:'pointer',
                                fontSize:'1.1rem', lineHeight:1, padding:'0 0 0 10px' }}>×</button>
                    </div>
                    {Object.entries(filters || {}).filter(([,v]) => v).length > 0 && (
                        <div style={{ padding:'5px 14px', borderBottom:`1px solid ${BORDER}`,
                            fontSize:'0.72rem', color:'#adb5bd' }}>
                            {Object.entries(filters || {}).filter(([,v]) => v).map(([k,v]) => (
                                <span key={k} style={{ marginRight:'12px' }}>
                                    {k}: <span style={{ color:'#f8f9fa', fontWeight:500 }}>{v}</span>
                                </span>
                            ))}
                        </div>
                    )}
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.75rem' }}>
                        <tbody>
                            {lines.map((line, i) => (
                                <tr key={i}
                                    onClick={line.onClick ? (e) => { e.stopPropagation(); line.onClick(); } : undefined}
                                    style={{ lineHeight:1.7, borderTop: line.divider ? `1px solid ${BORDER}` : 'none',
                                        cursor: line.onClick ? 'pointer' : 'default' }}>
                                    <td style={{ padding: line.divider ? '6px 8px 2px 14px' : '1px 8px 1px 14px',
                                        color:'#adb5bd', whiteSpace:'nowrap', verticalAlign:'top', width:'1%' }}>
                                        {line.label || ''}
                                        {line.link && (
                                            <a href={line.link} target="_blank" rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                style={{ marginLeft:4, color:'#6c97d4', fontSize:'0.68rem' }}>
                                                <i className="bi bi-box-arrow-up-right" />
                                            </a>
                                        )}
                                    </td>
                                    <td style={{ padding: line.divider ? '6px 14px 2px 4px' : '1px 14px 1px 4px',
                                        textAlign:'right', fontWeight: line.bold ? 700 : 400,
                                        color: line.color || '#f8f9fa', whiteSpace:'nowrap' }}>
                                        {line.onClick
                                            ? <span onClick={() => { setShow(false); line.onClick(); }} style={{ cursor:'pointer', textDecoration:'underline dotted' }}>{line.value} <i className="bi bi-box-arrow-up-right" style={{ fontSize:'0.65rem' }} /></span>
                                            : line.value}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {error && <div style={{ padding:'4px 14px', color:'#f8a5a5', fontSize:'0.72rem' }}>{error}</div>}
                    <div style={{ display:'flex', gap:'6px', padding:'7px 14px',
                        borderTop:`1px solid ${BORDER}`, justifyContent:'flex-end' }}>
                        <button onClick={handlePrint} style={BTN} disabled={isBusy}>
                            <i className="bi bi-printer me-1" />Print
                        </button>
                        <button onClick={handlePDF} style={BTN} disabled={isBusy}>
                            {isBusy ? <span className="spinner-border spinner-border-sm" style={{ width:'0.65rem', height:'0.65rem' }} />
                                : <><i className="bi bi-file-earmark-arrow-down me-1" />PDF</>}
                        </button>
                        <button onClick={handleShare} style={BTN_GRN} disabled={isBusy}>
                            <i className="bi bi-whatsapp me-1" />Share
                        </button>
                    </div>
                </div>
            )}
        </span>
    );
}

// ── Value hover tooltip (shows exact full number) ─────────────────────────────
function ValueTooltip({ exact, children }) {
    const [show, setShow] = useState(false);
    return (
        <span style={{ position:"relative", cursor:"help" }}
            onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            {children}
            {show && (
                <div style={{ position:"absolute", top:"110%", left:0, backgroundColor:"#212529",
                    color:"#f8f9fa", padding:"5px 10px", borderRadius:"5px",
                    fontSize:"0.75rem", fontWeight:400, zIndex:1059,
                    whiteSpace:"nowrap", boxShadow:"0 3px 10px rgba(0,0,0,0.3)",
                    pointerEvents:"none" }}>
                    <div style={{ position:"absolute", bottom:"100%", left:"12px", width:0, height:0,
                        borderLeft:"5px solid transparent", borderRight:"5px solid transparent",
                        borderBottom:"5px solid #212529" }} />
                    {exact}
                </div>
            )}
        </span>
    );
}

const CHART_OPTS_BASE = {
    backgroundColor: 'transparent',
    chartArea: { width: '80%', height: '72%' },
    fontName: 'Inter, Hanken Grotesk, sans-serif',
    fontSize: 11,
    legend: { position: 'bottom', textStyle: { fontSize: 11 } },
    animation: { startup: true, duration: 600, easing: 'out' },
    tooltip: { isHtml: true, trigger: 'selection' },
};

// ── ChartCard with Download + WhatsApp ────────────────────────────────────────
function ChartCard({ title, children, height }) {
    const chartRef = useRef(null);
    const [busyLabel, setBusyLabel] = useState(null);
    const [shareError, setShareError] = useState(null);

    async function handleDownload() {
        setBusyLabel("…");
        try {
            const dataUrl = await svgToPng(chartRef.current);
            if (!dataUrl) return;
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = (title || "chart").replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".png";
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } finally { setBusyLabel(null); }
    }

    async function handleWhatsApp() {
        setBusyLabel("Sharing…");
        try {
            const dataUrl = await svgToPng(chartRef.current);
            if (!dataUrl) return;
            const filename = (title || "chart").replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".png";
            const blob = dataUrlToBlob(dataUrl);
            let shareUrl;
            try { shareUrl = await uploadChartAndGetShareUrl(blob, filename); }
            catch { setShareError({ dataUrl, title }); return; }
            window.open(`https://wa.me/?text=${encodeURIComponent((title || "chart") + "\n" + shareUrl)}`, "_blank");
        } finally { setBusyLabel(null); }
    }

    return (
        <div className="card shadow-sm border-0 mb-3">
            <div className="card-header bg-white border-bottom py-2 px-3 d-flex align-items-center justify-content-between">
                <span className="fw-semibold text-dark" style={{ fontSize:'0.85rem' }}>{title}</span>
                <div className="d-flex gap-1">
                    <button className="btn btn-sm btn-outline-secondary" onClick={handleDownload}
                        disabled={!!busyLabel} title="Download as PNG"
                        style={{ fontSize:"0.72rem", padding:"2px 8px" }}>
                        <i className="bi bi-download me-1" />Download
                    </button>
                    <button className="btn btn-sm btn-outline-success" onClick={handleWhatsApp}
                        disabled={!!busyLabel} title="Share via WhatsApp"
                        style={{ fontSize:"0.72rem", padding:"2px 8px" }}>
                        <i className="bi bi-whatsapp me-1" />{busyLabel || "WhatsApp"}
                    </button>
                </div>
            </div>
            <div className="card-body p-2" style={{ height: height || 280 }} ref={chartRef}>
                {children}
            </div>
            {shareError && (
                <WhatsAppFallbackModal dataUrl={shareError.dataUrl} title={shareError.title}
                    onClose={() => setShareError(null)} />
            )}
        </div>
    );
}

// ── KPI Card (with VAT breakdown + InfoTooltip) ───────────────────────────────
function KPICard({ title, value, withoutVAT, icon, color, valueColor, note, noteColor, tooltip, store, filters, link }) {
    return (
        <div className="card shadow-sm border-0 h-100" style={{ borderLeft:`4px solid ${color}` }}>
            <div className="card-body d-flex flex-column gap-2">
                <div className="d-flex align-items-center justify-content-between">
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <span className="text-uppercase text-muted fw-semibold" style={{ fontSize:'0.72rem', letterSpacing:'0.04em' }}>
                            {title}
                        </span>
                        {link && (
                            <a href={link} target="_blank" rel="noopener noreferrer"
                                title="View Balance Sheet"
                                style={{ fontSize:'0.72rem', color:'#6c757d', textDecoration:'none', lineHeight:1 }}
                                onClick={e => e.stopPropagation()}>
                                <i className="bi bi-box-arrow-up-right" style={{ fontSize:10 }}></i>
                            </a>
                        )}
                    </div>
                    <div className="d-inline-flex align-items-center justify-content-center rounded"
                        style={{ width:38, height:38, background:`${color}15`, color }}>
                        <i className={`bi ${icon}`}></i>
                    </div>
                </div>
                <div className="fw-bold" style={{ fontSize:'1.45rem', color: valueColor || '#191c1e' }}>
                    {tooltip
                        ? <InfoTooltip lines={tooltip} cardTitle={title} store={store} filters={filters}>
                            {fmtCompact(value)}
                          </InfoTooltip>
                        : (withoutVAT !== undefined
                            ? <ValueTooltip exact={`${fmt(value)} (w/ VAT) · ${fmt(withoutVAT)} (w/o VAT)`}>
                                {fmtCompact(value)}
                              </ValueTooltip>
                            : fmtCompact(value))
                    }
                </div>
                {withoutVAT !== undefined && (
                    <div className="small text-muted">w/o VAT: {fmtCompact(withoutVAT)}</div>
                )}
                {note && <div className="small" style={{ color: noteColor || '#6c757d' }}>{note}</div>}
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
function AutoMobileDashboard() {
    const { t } = useTranslation('common');
    const [dashboard, setDashboard] = useState({});
    const [store, setStore] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const postingRef = useRef();

    // ── Filter state ──────────────────────────────────────────────────────────
    const [filterMode, setFilterMode]         = useState("range");
    const [singleMonth, setSingleMonth]       = useState("");
    const [fromMonth, setFromMonth]           = useState("");
    const [toMonth, setToMonth]               = useState("");
    const [selectedYear, setSelectedYear]     = useState("");
    const [singleDate, setSingleDate]         = useState("");
    const [rangeFromDate, setRangeFromDate]   = useState("");
    const [rangeToDate, setRangeToDate]       = useState("");
    const [yearFrom, setYearFrom]             = useState("");
    const [yearTo, setYearTo]                 = useState("");
    const [appliedFrom, setAppliedFrom]       = useState("");
    const [appliedTo, setAppliedTo]           = useState("");
    const [fullYears, setFullYears]           = useState([]);

    const vatPercent    = store?.vat_percent || 15;
    const storeId       = localStorage.getItem("store_id") || "";
    const PostingRef        = useRef();
    const VendorPendingRef  = useRef();
    const CustomerPendingRef = useRef();
    const [expenseCategoryFilter,  setExpenseCategoryFilter]  = useState(null);
    const [customerCreditFilter,   setCustomerCreditFilter]   = useState(null);
    const [vendorPayablesFilter,   setVendorPayablesFilter]   = useState(null);

    function authHeaders() {
        return { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') };
    }

    useEffect(() => {
        if (!storeId) return;
        fetch(`/v1/store/${storeId}?select=id,name,vat_percent,settings`, { headers: authHeaders() })
            .then(r => r.json()).then(d => { if (d.status) setStore(d.result || {}); })
            .catch(() => {});
    }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!storeId) return;
        loadDashboard();
    }, [storeId, appliedFrom, appliedTo]); // eslint-disable-line react-hooks/exhaustive-deps

    function loadDashboard() {
        const params = new URLSearchParams();
        params.set('search[store_id]', storeId);
        if (appliedFrom) {
            if (appliedFrom.length === 10) params.set('from_date', appliedFrom);
            else params.set('from_month', appliedFrom);
        }
        if (appliedTo) {
            if (appliedTo.length === 10) params.set('to_date', appliedTo);
            else params.set('to_month', appliedTo);
        }
        setIsLoading(true);
        fetch(`/v1/automobile/dashboard?${params.toString()}`, { headers: authHeaders() })
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson ? await response.json() : null;
                if (!response.ok || !data?.status) return Promise.reject(data?.errors || {});
                const result = data.result || {};
                setDashboard(result);
                if (!appliedFrom && !appliedTo && result.monthly_breakdown?.length) {
                    const years = [...new Set(
                        result.monthly_breakdown
                            .filter(m => m.total_profit || m.revenue)
                            .map(m => m.month.slice(0, 4))
                    )].sort((a, b) => b - a);
                    if (years.length) setFullYears(years);
                }
                setIsLoading(false);
            })
            .catch(err => { console.log(err); setDashboard({}); setIsLoading(false); });
    }

    // ── Chart data ────────────────────────────────────────────────────────────
    const monthly = useMemo(() => dashboard.monthly_breakdown || [], [dashboard.monthly_breakdown]);

    const dataMinMonth = useMemo(() => {
        const active = monthly.filter(m => m.total_profit || m.revenue);
        return active.length ? active[0].month : "";
    }, [monthly]);

    const dataMaxMonth = useMemo(() => {
        const active = monthly.filter(m => m.total_profit || m.revenue);
        return active.length ? active[active.length - 1].month : "";
    }, [monthly]);

    const chartFilters = useMemo(() => {
        if (!appliedFrom && !appliedTo) return {};
        if (appliedFrom && appliedTo && appliedFrom === appliedTo) return { Date: appliedFrom };
        return {
            ...(appliedFrom ? { From: appliedFrom } : {}),
            ...(appliedTo   ? { To:   appliedTo   } : {}),
        };
    }, [appliedFrom, appliedTo]);

    const monthlyPLData = useMemo(() => {
        const header = [
            'Month',
            { label: t('Revenue'), type: 'number' },       { role: 'tooltip', type: 'string', p: { html: true } },
            { label: t('Expense'), type: 'number' },        { role: 'tooltip', type: 'string', p: { html: true } },
            { label: t('Profit/Loss'), type: 'number' },    { role: 'tooltip', type: 'string', p: { html: true } },
        ];
        const rows = monthly.map(m => {
            const expense      = m.revenue - m.total_profit;
            const profit       = m.total_profit;
            const isProfitable = profit >= 0;
            const plColor      = isProfitable ? '#69db7c' : '#ffa8a8';
            const plTitle      = isProfitable ? t('Net Profit') : t('Net Loss');
            const rev          = calcVat(m.revenue, vatPercent);
            const exp          = calcVat(expense, vatPercent);
            const pl           = calcVat(Math.abs(profit), vatPercent);
            return [
                fmtMonth(m.month),
                parseFloat(m.revenue.toFixed(2)),
                tooltipHtml(`${t('Revenue')} — ${fmtMonth(m.month)}`, '#74c0fc', [
                    { label: t('Revenue (with VAT)'),    value: `SAR ${fmt(rev.withVAT)}`,    color:'#74c0fc', bold:true },
                    { label: `VAT ${vatPercent}%`,        value: `− ${fmt(rev.vat)}` },
                    { label: t('Revenue (without VAT)'), value: `SAR ${fmt(rev.withoutVAT)}`, color:'#74c0fc', bold:true, divider:true },
                ], store, chartFilters),
                parseFloat(expense.toFixed(2)),
                tooltipHtml(`${t('Expense')} — ${fmtMonth(m.month)}`, '#ffa8a8', [
                    { label: t('Revenue'),      value: fmt(m.revenue) },
                    { label: t('Total Profit'), value: `− ${fmt(m.total_profit)}` },
                    { label: t('Expense (with VAT)'),    value: `SAR ${fmt(exp.withVAT)}`,    color:'#ffa8a8', bold:true, divider:true },
                    { label: `VAT ${vatPercent}%`,        value: `− ${fmt(exp.vat)}` },
                    { label: t('Expense (without VAT)'), value: `SAR ${fmt(exp.withoutVAT)}`, color:'#ffa8a8', bold:true, divider:true },
                ], store, chartFilters),
                parseFloat(profit.toFixed(2)),
                tooltipHtml(`${plTitle} — ${fmtMonth(m.month)}`, plColor, [
                    { label: t('Revenue'),      value: fmt(m.revenue),   color:'#74c0fc' },
                    { label: t('Expense'),       value: `− ${fmt(expense)}`, color:'#ffa8a8' },
                    { label: `${plTitle} (with VAT)`,    value: `SAR ${fmt(pl.withVAT)}`,    bold:true, color:plColor, divider:true },
                    { label: `VAT ${vatPercent}%`,        value: `− ${fmt(pl.vat)}` },
                    { label: `${plTitle} (without VAT)`, value: `SAR ${fmt(pl.withoutVAT)}`, bold:true, color:plColor, divider:true },
                ], store, chartFilters),
            ];
        });
        return [header, ...rows];
    }, [monthly, vatPercent, store, chartFilters, t]);



    const profitPieData = useMemo(() => {
        const lbd = dashboard.labour_breakdown     || {};
        const sbd = dashboard.spare_breakdown      || {};
        const abd = dashboard.additional_breakdown || {};
        return [
            ['Type', 'Amount', { role:'tooltip', type:'string', p:{ html:true } }],
            [t('Labour Profit'), dashboard.labour_profit || 0,
                tooltipHtml(t('Labour Profit'), '#4fc3f7', [
                    { label: t('— Sales —'), value: '', bold:true, color:'#4fc3f7' },
                    { label: t('Sales Profit (Labour Charge)'),      value: `SAR ${fmt(lbd.sales_profit||0)}`,         color:'#4fc3f7' },
                    { label: t('Return Profit (Labour Charge)'),     value: `− ${fmt(lbd.return_profit||0)}`,          color:'#ffa8a8' },
                    { label: t('— Non-VAT Sales —'), value: '', bold:true, color:'#a5d6a7' },
                    { label: t('Non-VAT Sales Profit (Labour)'),     value: `SAR ${fmt(lbd.non_vat_sales_profit||0)}`, color:'#a5d6a7' },
                    { label: t('Non-VAT Return Profit (Labour)'),    value: `− ${fmt(lbd.non_vat_return_profit||0)}`,  color:'#ffa8a8' },
                    { label: t('Net (with VAT)'),    value: `SAR ${fmt(dashboard.labour_profit||0)}`, color:'#4fc3f7', bold:true, divider:true },
                    { label: `VAT ${vatPercent}%`, value: `− ${fmt((dashboard.labour_profit||0)*vatPercent/(100+vatPercent))}` },
                    { label: t('Net (without VAT)'), value: `SAR ${fmt((dashboard.labour_profit||0)*100/(100+vatPercent))}`, bold:true, divider:true },
                ], store, chartFilters)],
            [t('Spare Profit'), dashboard.spare_profit || 0,
                tooltipHtml(t('Spare Profit'), '#81c784', [
                    { label: t('Sales Profit'),  value: `SAR ${fmt(sbd.sales_profit||0)}`,  color:'#81c784' },
                    { label: t('Return Profit'), value: `− ${fmt(sbd.return_profit||0)}`,   color:'#ffa8a8' },
                    { label: t('Net (with VAT)'),    value: `SAR ${fmt(dashboard.spare_profit||0)}`, color:'#81c784', bold:true, divider:true },
                    { label: `VAT ${vatPercent}%`, value: `− ${fmt((dashboard.spare_profit||0)*vatPercent/(100+vatPercent))}` },
                    { label: t('Net (without VAT)'), value: `SAR ${fmt((dashboard.spare_profit||0)*100/(100+vatPercent))}`, bold:true, divider:true },
                ], store, chartFilters)],
            [t('Additional Profit'), dashboard.additional_profit || 0,
                tooltipHtml(t('Additional Profit'), '#ffb74d', [
                    { label: t('Sales Profit'),  value: `SAR ${fmt(abd.sales_profit||0)}`,  color:'#ffb74d' },
                    { label: t('Return Profit'), value: `− ${fmt(abd.return_profit||0)}`,   color:'#ffa8a8' },
                    { label: t('Net (with VAT)'),    value: `SAR ${fmt(dashboard.additional_profit||0)}`, color:'#ffb74d', bold:true, divider:true },
                    { label: `VAT ${vatPercent}%`, value: `− ${fmt((dashboard.additional_profit||0)*vatPercent/(100+vatPercent))}` },
                    { label: t('Net (without VAT)'), value: `SAR ${fmt((dashboard.additional_profit||0)*100/(100+vatPercent))}`, bold:true, divider:true },
                ], store, chartFilters)],
        ];
    }, [dashboard, vatPercent, store, chartFilters, t]);

    const cashPieData = useMemo(() => [
        ['Type', 'Amount', { role:'tooltip', type:'string', p:{ html:true } }],
        [t('Counter Cash'), dashboard.counter_cash || 0,
            tooltipHtml(t('Counter Cash'), '#1a7a3a', [{ label:'SAR', value: fmt(dashboard.counter_cash||0), color:'#1a7a3a', bold:true }], store, chartFilters)],
        [t('Bank Cash'), dashboard.bank_cash || 0,
            tooltipHtml(t('Bank Cash'), '#004ac6', [{ label:'SAR', value: fmt(dashboard.bank_cash||0), color:'#004ac6', bold:true }], store, chartFilters)],
    ], [dashboard, store, chartFilters, t]);

    const assetBarData = useMemo(() => [
        ['Category', t('Value'), { role:'style' }, { role:'tooltip', type:'string', p:{ html:true } }],
        [t('Spare Parts (Purchase)'), dashboard.spare_parts_value?.purchase_value || 0, '#7986cb',
            tooltipHtml(t('Spare Parts Purchase Value'), '#7986cb', [{ label:'SAR', value: fmt(dashboard.spare_parts_value?.purchase_value||0), color:'#7986cb', bold:true }], store, chartFilters)],
        [t('Spare Parts (Retail)'), dashboard.spare_parts_value?.retail_value || 0, '#4db6ac',
            tooltipHtml(t('Spare Parts Retail Value'), '#4db6ac', [{ label:'SAR', value: fmt(dashboard.spare_parts_value?.retail_value||0), color:'#4db6ac', bold:true }], store, chartFilters)],
        [t('Total Credit'), dashboard.total_credit || 0, '#ff8a65',
            tooltipHtml(t('Total Customer Credit'), '#ff8a65', [{ label:'SAR', value: fmt(dashboard.total_credit||0), color:'#ff8a65', bold:true }], store, chartFilters)],
        [t('Unpaid Purchase Bill'), dashboard.unpaid_bill || 0, '#ef5350',
            tooltipHtml(t('Unpaid Purchase Bills'), '#ef5350', [{ label:'SAR', value: fmt(dashboard.unpaid_bill||0), color:'#ef5350', bold:true }], store, chartFilters)],
        [t('Additional Expense'), dashboard.additional_expense || 0, '#8d6e63',
            tooltipHtml(t('Additional Expenses'), '#8d6e63', [{ label:'SAR', value: fmt(dashboard.additional_expense||0), color:'#8d6e63', bold:true }], store, chartFilters)],
    ], [dashboard, store, chartFilters, t]);

    // ── KPI sections ──────────────────────────────────────────────────────────
    const kpiSections = useMemo(() => {
        const tp    = calcVat(dashboard.total_profit, vatPercent);
        const mp    = calcVat(dashboard.monthly_profit, vatPercent);
        const lp    = calcVat(dashboard.labour_profit, vatPercent);
        const sp    = calcVat(dashboard.spare_profit, vatPercent);
        const ap    = calcVat(dashboard.additional_profit, vatPercent);

        const tbd  = dashboard.total_profit_breakdown   || {};
        const mbd  = dashboard.monthly_profit_breakdown || {};
        const enableNonVatSales = store?.settings?.non_vat_sales === true;
        const enableVATBox      = store?.settings?.enable_vat_box === true;
        const enableSalesInQuotation = store?.settings?.enable_sales_in_quotation === true;
        const vatb  = dashboard.vat_box         || {};
        const vatbM = dashboard.vat_box_monthly || {};
        const lbd  = dashboard.labour_breakdown         || {};
        const sbd  = dashboard.spare_breakdown          || {};
        const abd  = dashboard.additional_breakdown     || {};

        const monthName = dashboard.month_name || '';

        return [
            {
                title: t('Profit Overview'),
                cards: [
                    {
                        title: t('Total Profit'), value: tp.withVAT, withoutVAT: tp.withoutVAT,
                        icon:'bi-graph-up-arrow', color:'#004ac6',
                        tooltip: [
                            { label: t('— Revenue —'), value: '', bold:true, color:'#90caf9' },
                            { label: t('Sales'),              value: `SAR ${fmt(tbd.sales_revenue||0)}`,       color:'#90caf9' },
                            { label: t('Sales Returns'),      value: `− ${fmt(tbd.sales_return_revenue||0)}`,  color:'#ffa8a8' },
                            ...(enableSalesInQuotation && tbd.qtn_revenue ? [
                                { label: t('Quotation Sales'),   value: `SAR ${fmt(tbd.qtn_revenue||0)}`,      color:'#90caf9' },
                                { label: t('Quotation Returns'), value: `− ${fmt(tbd.qtn_return_revenue||0)}`, color:'#ffa8a8' },
                            ] : []),
                            ...(enableNonVatSales ? [
                                { label: t('Net Revenue (with VAT)'), value: `SAR ${fmt(tbd.total_revenue||0)}`, bold:true, color:'#69db7c', divider:true },
                                { label: t('Non-VAT Sales'),          value: `SAR ${fmt(tbd.non_vat_sales_revenue||0)}`,      color:'#a5d6a7' },
                                { label: t('Non-VAT Returns'),        value: `− ${fmt(tbd.non_vat_sales_return_revenue||0)}`, color:'#ffa8a8' },
                                { label: t('Non-VAT Net Revenue'),    value: `SAR ${fmt(tbd.non_vat_net_revenue||0)}`,        bold:true, color:'#a5d6a7', divider:true },
                                { label: t('Total Revenue'),          value: `SAR ${fmt((tbd.total_revenue||0) + (tbd.non_vat_net_revenue||0))}`, bold:true, color:'#69db7c', divider:true },
                            ] : [
                                { label: t('Total Revenue'), value: `SAR ${fmt(tbd.total_revenue||0)}`, bold:true, color:'#69db7c', divider:true },
                            ]),
                            { label: t('— Expenses —'), value: '', bold:true, color:'#ffa8a8' },
                            { label: t('Expenses'),      value: `SAR ${fmt(tbd.expense_total||0)}`,  color:'#ffa8a8' },
                            { label: t('Purchases'),     value: `SAR ${fmt(tbd.purchase_total||0)}`, color:'#ffa8a8' },
                            { label: t('Salary Paid'),   value: `SAR ${fmt(tbd.salary_paid||0)}`,    color:'#ffa8a8' },
                            { label: t('Total Expenses'), value: `SAR ${fmt(tbd.total_expenses||0)}`, bold:true, color:'#ffa8a8', divider:true },
                            { label: t('Total Profit (with VAT)'),    value: `SAR ${fmt(tp.withVAT)}`,    bold:true, color:'#90caf9', divider:true },
                            { label: `VAT ${vatPercent}%`,             value: `− ${fmt(tp.vat)}` },
                            { label: t('Total Profit (without VAT)'), value: `SAR ${fmt(tp.withoutVAT)}`, bold:true, color:'#90caf9', divider:true },
                        ],
                    },
                    {
                        title: `${t('Monthly Profit')} (${monthName})`, value: mp.withVAT, withoutVAT: mp.withoutVAT,
                        icon:'bi-calendar-check', color:'#1a7a3a',
                        tooltip: [
                            { label: monthName, value: '', bold:true, color:'#69db7c' },
                            { label: t('— Revenue —'), value: '', bold:true, color:'#90caf9' },
                            { label: t('Sales'),         value: `SAR ${fmt(mbd.sales_revenue||0)}`,       color:'#90caf9' },
                            { label: t('Sales Returns'), value: `− ${fmt(mbd.sales_return_revenue||0)}`,  color:'#ffa8a8' },
                            ...(enableSalesInQuotation && mbd.qtn_revenue ? [
                                { label: t('Quotation Sales'),   value: `SAR ${fmt(mbd.qtn_revenue||0)}`,      color:'#90caf9' },
                                { label: t('Quotation Returns'), value: `− ${fmt(mbd.qtn_return_revenue||0)}`, color:'#ffa8a8' },
                            ] : []),
                            ...(enableNonVatSales ? [
                                { label: t('Net Revenue (with VAT)'), value: `SAR ${fmt(mbd.total_revenue||0)}`, bold:true, color:'#69db7c', divider:true },
                                { label: t('Non-VAT Sales'),          value: `SAR ${fmt(mbd.non_vat_sales_revenue||0)}`,      color:'#a5d6a7' },
                                { label: t('Non-VAT Returns'),        value: `− ${fmt(mbd.non_vat_sales_return_revenue||0)}`, color:'#ffa8a8' },
                                { label: t('Non-VAT Net Revenue'),    value: `SAR ${fmt(mbd.non_vat_net_revenue||0)}`,        bold:true, color:'#a5d6a7', divider:true },
                                { label: t('Total Revenue'),          value: `SAR ${fmt((mbd.total_revenue||0) + (mbd.non_vat_net_revenue||0))}`, bold:true, color:'#69db7c', divider:true },
                            ] : [
                                { label: t('Total Revenue'), value: `SAR ${fmt(mbd.total_revenue||0)}`, bold:true, color:'#69db7c', divider:true },
                            ]),
                            { label: t('— Expenses —'), value: '', bold:true, color:'#ffa8a8' },
                            { label: t('Expenses'),     value: `SAR ${fmt(mbd.expense_total||0)}`,  color:'#ffa8a8' },
                            { label: t('Purchases'),    value: `SAR ${fmt(mbd.purchase_total||0)}`, color:'#ffa8a8' },
                            { label: t('Salary Paid'),  value: `SAR ${fmt(mbd.salary_paid||0)}`,    color:'#ffa8a8' },
                            { label: t('Total Expenses'), value: `SAR ${fmt(mbd.total_expenses||0)}`, bold:true, color:'#ffa8a8', divider:true },
                            { label: t('Monthly Profit (with VAT)'),    value: `SAR ${fmt(mp.withVAT)}`,    bold:true, color:'#69db7c', divider:true },
                            { label: `VAT ${vatPercent}%`,               value: `− ${fmt(mp.vat)}` },
                            { label: t('Monthly Profit (without VAT)'), value: `SAR ${fmt(mp.withoutVAT)}`, bold:true, color:'#69db7c', divider:true },
                        ],
                    },
                    {
                        title: t('Labour Profit'), value: lp.withVAT, withoutVAT: lp.withoutVAT,
                        icon:'bi-person-gear', color:'#e65100',
                        tooltip: [
                            { label: t('— Sales —'), value: '', bold:true, color:'#4fc3f7' },
                            { label: t('Sales Profit (Labour Charge)'),      value: `SAR ${fmt(lbd.sales_profit||0)}`,         color:'#4fc3f7' },
                            { label: t('Return Profit (Labour Charge)'),     value: `− ${fmt(lbd.return_profit||0)}`,          color:'#ffa8a8' },
                            { label: t('— Non-VAT Sales —'), value: '', bold:true, color:'#a5d6a7' },
                            { label: t('Non-VAT Sales Profit (Labour)'),     value: `SAR ${fmt(lbd.non_vat_sales_profit||0)}`, color:'#a5d6a7' },
                            { label: t('Non-VAT Return Profit (Labour)'),    value: `− ${fmt(lbd.non_vat_return_profit||0)}`,  color:'#ffa8a8' },
                            { label: t('Labour Profit (with VAT)'),          value: `SAR ${fmt(lp.withVAT)}`,                  bold:true, color:'#4fc3f7', divider:true },
                            { label: `VAT ${vatPercent}%`,                    value: `− ${fmt(lp.vat)}` },
                            { label: t('Labour Profit (without VAT)'),       value: `SAR ${fmt(lp.withoutVAT)}`,               bold:true, color:'#4fc3f7', divider:true },
                        ],
                    },
                    {
                        title: t('Spare Profit'), value: sp.withVAT, withoutVAT: sp.withoutVAT,
                        icon:'bi-box-seam', color:'#6a1b9a',
                        tooltip: [
                            { label: t('Sales Profit (Products)'),   value: `SAR ${fmt(sbd.sales_profit||0)}`,  color:'#81c784' },
                            { label: t('Return Profit (Products)'),  value: `− ${fmt(sbd.return_profit||0)}`,   color:'#ffa8a8' },
                            { label: t('Spare Profit (with VAT)'),   value: `SAR ${fmt(sp.withVAT)}`,           bold:true, color:'#81c784', divider:true },
                            { label: `VAT ${vatPercent}%`,            value: `− ${fmt(sp.vat)}` },
                            { label: t('Spare Profit (without VAT)'),value: `SAR ${fmt(sp.withoutVAT)}`,        bold:true, color:'#81c784', divider:true },
                        ],
                    },
                    {
                        title: t('Additional Profit'), value: ap.withVAT, withoutVAT: ap.withoutVAT,
                        icon:'bi-three-dots', color:'#1565c0',
                        tooltip: [
                            { label: t('Sales Profit (Other Services)'),  value: `SAR ${fmt(abd.sales_profit||0)}`,  color:'#ffb74d' },
                            { label: t('Return Profit (Other Services)'), value: `− ${fmt(abd.return_profit||0)}`,   color:'#ffa8a8' },
                            { label: t('Additional Profit (with VAT)'),   value: `SAR ${fmt(ap.withVAT)}`,           bold:true, color:'#ffb74d', divider:true },
                            { label: `VAT ${vatPercent}%`,                 value: `− ${fmt(ap.vat)}` },
                            { label: t('Additional Profit (without VAT)'),value: `SAR ${fmt(ap.withoutVAT)}`,        bold:true, color:'#ffb74d', divider:true },
                        ],
                    },
                ],
            },
            {
                title: t('Cash & Bank'),
                cards: [
                    { title: t('Counter Cash'), value: dashboard.counter_cash, icon:'bi-cash-stack', color:'#1a7a3a',
                      tooltip: [{ label:'Cash A/c Balance', value: `SAR ${fmt(dashboard.counter_cash||0)}`, bold:true, color:'#69db7c',
                          onClick: () => PostingRef.current?.open({ id: dashboard.cash_account_id, name: t('Cash A/c') }) }] },
                    { title: t('Bank Cash'), value: dashboard.bank_cash, icon:'bi-bank2', color:'#004ac6',
                      tooltip: [{ label:'Bank A/c Balance', value: `SAR ${fmt(dashboard.bank_cash||0)}`, bold:true, color:'#74c0fc',
                          onClick: () => PostingRef.current?.open({ id: dashboard.bank_account_id, name: t('Bank A/c') }) }] },
                ],
            },
            {
                title: t('Assets & Liabilities'),
                cards: [
                    {
                        title: t('Spare Parts Asset Value'),
                        value: dashboard.spare_parts_value?.retail_value || 0,
                        icon:'bi-boxes', color:'#6a1b9a',
                        tooltip: [
                            { label: t('Purchase Value'), value: `SAR ${fmt(dashboard.spare_parts_value?.purchase_value||0)}`, color:'#adb5bd' },
                            { label: t('Retail Value'),   value: `SAR ${fmt(dashboard.spare_parts_value?.retail_value||0)}`,   color:'#ce9ffc', bold:true, divider:true },
                        ],
                        note: `${t('Purchase')}: ${fmtCompact(dashboard.spare_parts_value?.purchase_value||0)}`,
                    },
                    { title: t('Total Credit'), value: dashboard.total_credit, icon:'bi-people', color:'#e65100',
                      tooltip: [
                        { label:'SAR', value: fmt(dashboard.total_credit||0), bold:true, color:'#ffa94d',
                          onClick: () => setCustomerCreditFilter({ name: 'All Customers', balance: dashboard.total_credit }) },
                        ...(dashboard.customer_credit_breakdown?.length ? [
                            { divider:true, label: t('By Customer'), bold:true },
                            ...dashboard.customer_credit_breakdown.map(c => ({ label: c.name, value: fmt(c.credit_balance), color:'#ffa94d',
                                onClick: () => setCustomerCreditFilter({ id: c.customer_id, name: c.name, balance: c.credit_balance }) }))
                        ] : [])
                      ] },
                    { title: t('Unpaid Purchase Bill'), value: dashboard.unpaid_bill, icon:'bi-receipt-cutoff', color:'#c62828',
                      tooltip: [
                        { label:'SAR', value: fmt(dashboard.unpaid_bill||0), bold:true, color:'#ffa8a8',
                          onClick: () => setVendorPayablesFilter({ name: 'All Vendors', balance: dashboard.unpaid_bill }) },
                        ...(dashboard.vendor_payables_breakdown?.length ? [
                            { divider:true, label: t('By Vendor'), bold:true },
                            ...dashboard.vendor_payables_breakdown.map(v => ({ label: v.name, value: fmt(v.purchase_balance), color:'#ffa8a8',
                                onClick: () => setVendorPayablesFilter({ id: v.vendor_id, name: v.name, balance: v.purchase_balance }) }))
                        ] : [])
                      ] },
                    {
                        title: t('Salary Balance'), value: dashboard.salary_balance, icon:'bi-person-badge', color:'#ba1a1a',
                        valueColor: dashboard.salary_balance < 0 ? '#ba1a1a' : (dashboard.salary_balance > 0 ? '#0a58ca' : '#191c1e'),
                        note: dashboard.salary_balance < 0 ? t('Owed to Employees') : (dashboard.salary_balance > 0 ? t('Employees Owe Us') : t('Settled')),
                        noteColor: dashboard.salary_balance < 0 ? '#ba1a1a' : (dashboard.salary_balance > 0 ? '#0a58ca' : '#6c757d'),
                        tooltip: [
                            { label:'SAR', value: fmt(Math.abs(dashboard.salary_balance||0)), bold:true },
                            ...(dashboard.employee_breakdown?.length ? [
                                { divider:true, label: t('By Employee'), bold:true },
                                { label: t('(−) Store owes employee  ·  (+) Employee owes store'), value: '' },
                                ...dashboard.employee_breakdown.map(e => ({
                                    label: e.name,
                                    value: (e.direction === 'owed_to_employee' ? '−' : '+') + 'SAR ' + fmt(e.balance),
                                    color: e.direction === 'owed_to_employee' ? '#ffa8a8' : '#74c0fc',
                                    onClick: e.account_id ? () => PostingRef.current?.open({ id: e.account_id, name: e.name }) : undefined,
                                }))
                            ] : [])
                        ],
                    },
                    { title: t('Additional Expense'), value: dashboard.additional_expense, icon:'bi-wallet2', color:'#54647a',
                      tooltip: [
                        { label:'SAR', value: fmt(dashboard.additional_expense||0), bold:true, color:'#adb5bd' },
                        ...(dashboard.expense_category_breakdown?.length ? [
                            { divider:true, label: t('By Category'), bold:true },
                            ...dashboard.expense_category_breakdown.map(c => ({ label: c.name, value: fmt(c.total), color:'#adb5bd',
                                onClick: c.category_id ? () => setExpenseCategoryFilter({ id: c.category_id, name: c.name }) : undefined }))
                        ] : [])
                      ] },
                ],
            },
            ...(enableVATBox ? [{
                title: t('VAT'),
                cards: [
                    {
                        title: t('Total Period VAT'), value: vatb.net_vat || 0, icon:'bi-cash-stack', color:'#6610f2',
                        valueColor: (vatb.net_vat||0) >= 0 ? '#ba1a1a' : '#1a7a3a',
                        note: (vatb.net_vat||0) >= 0 ? t('Payable to Authority') : t('Refundable'),
                        noteColor: (vatb.net_vat||0) >= 0 ? '#ba1a1a' : '#1a7a3a',
                        tooltip: [
                            { label: t('Sales VAT'),           value: `SAR ${fmt(vatb.sales_vat||0)}`,           color:'#a5d6a7' },
                            { label: t('Sales Return VAT'),    value: `− ${fmt(vatb.sales_return_vat||0)}`,      color:'#ffa8a8' },
                            { label: t('Purchase VAT'),        value: `− ${fmt(vatb.purchase_vat||0)}`,          color:'#ffa8a8' },
                            { label: t('Purchase Return VAT'), value: `+ ${fmt(vatb.purchase_return_vat||0)}`,   color:'#a5d6a7' },
                            { label: t('Expense VAT (w/ Vendor Inv.)'), value: `+ ${fmt(vatb.expense_vat||0)}`, color:'#a5d6a7' },
                            { divider:true, label: t('Net VAT Payable'), value: `SAR ${fmt(vatb.net_vat||0)}`, bold:true, color:(vatb.net_vat||0)>=0?'#ffa8a8':'#a5d6a7' },
                        ],
                    },
                    {
                        title: `${t('Monthly VAT')} (${monthName})`, value: vatbM.net_vat || 0, icon:'bi-cash-stack', color:'#6610f2',
                        valueColor: (vatbM.net_vat||0) >= 0 ? '#ba1a1a' : '#1a7a3a',
                        note: (vatbM.net_vat||0) >= 0 ? t('Payable to Authority') : t('Refundable'),
                        noteColor: (vatbM.net_vat||0) >= 0 ? '#ba1a1a' : '#1a7a3a',
                        tooltip: [
                            { label: t('Sales VAT'),           value: `SAR ${fmt(vatbM.sales_vat||0)}`,           color:'#a5d6a7' },
                            { label: t('Sales Return VAT'),    value: `− ${fmt(vatbM.sales_return_vat||0)}`,      color:'#ffa8a8' },
                            { label: t('Purchase VAT'),        value: `− ${fmt(vatbM.purchase_vat||0)}`,          color:'#ffa8a8' },
                            { label: t('Purchase Return VAT'), value: `+ ${fmt(vatbM.purchase_return_vat||0)}`,   color:'#a5d6a7' },
                            { label: t('Expense VAT (w/ Vendor Inv.)'), value: `+ ${fmt(vatbM.expense_vat||0)}`, color:'#a5d6a7' },
                            { divider:true, label: t('Net VAT Payable'), value: `SAR ${fmt(vatbM.net_vat||0)}`, bold:true, color:(vatbM.net_vat||0)>=0?'#ffa8a8':'#a5d6a7' },
                        ],
                    },
                ],
            }] : []),
        ];
    }, [dashboard, vatPercent, store, t]);

    const hasMonthly = monthly.length > 0;
    const hasProfit  = (dashboard.labour_profit||0)+(dashboard.spare_profit||0)+(dashboard.additional_profit||0) > 0;
    const hasCash    = (dashboard.counter_cash||0)+(dashboard.bank_cash||0) > 0;
    const chartPeriod = appliedFrom || appliedTo
        ? (appliedFrom === appliedTo ? appliedFrom : `${appliedFrom || '…'} → ${appliedTo || '…'}`)
        : t('Last 12 Months');

    if (isLoading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" style={{ width:'3rem', height:'3rem' }} />
                <p className="mt-3 text-muted">{t('Loading dashboard...')}</p>
            </div>
        );
    }

    return (
        <>
        <div className="container-fluid px-3 py-3">
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .7s linear infinite;display:inline-block;}`}</style>

            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <div>
                    <h4 className="mb-1 fw-bold">
                        <i className="bi bi-speedometer2 me-2 text-primary"></i>{t('Workshop Dashboard')}
                    </h4>
                    <p className="text-muted mb-0 small">{t('Real-time overview of your automobile workshop operations')}</p>
                </div>
                <button onClick={loadDashboard} className="btn btn-sm btn-outline-primary">
                    <i className="bi bi-arrow-clockwise me-1"></i>{t('Refresh')}
                </button>
            </div>

            {/* Filter bar */}
            <div className="d-flex flex-column gap-2 mb-4">
                {/* Row 1: filter type buttons */}
                <div className="btn-group btn-group-sm" role="group">
                    <button type="button"
                        className={`btn ${filterMode==="single" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => { setFilterMode("single"); setFromMonth(""); setToMonth(""); setSelectedYear(""); setSingleDate(""); setRangeFromDate(""); setRangeToDate(""); setYearFrom(""); setYearTo(""); setAppliedFrom(""); setAppliedTo(""); }}>
                        <i className="bi bi-calendar-date me-1" />Single Month
                    </button>
                    <button type="button"
                        className={`btn ${filterMode==="range" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => { setFilterMode("range"); setSingleMonth(""); setSelectedYear(""); setSingleDate(""); setRangeFromDate(""); setRangeToDate(""); setYearFrom(""); setYearTo(""); setAppliedFrom(""); setAppliedTo(""); }}>
                        <i className="bi bi-calendar-range me-1" />Month Range
                    </button>
                    <button type="button"
                        className={`btn ${filterMode==="year" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => { setFilterMode("year"); setSingleMonth(""); setFromMonth(""); setToMonth(""); setSingleDate(""); setRangeFromDate(""); setRangeToDate(""); setYearFrom(""); setYearTo(""); setAppliedFrom(""); setAppliedTo(""); }}>
                        <i className="bi bi-calendar3 me-1" />Year
                    </button>
                    <button type="button"
                        className={`btn ${filterMode==="single_date" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => { setFilterMode("single_date"); setSingleMonth(""); setFromMonth(""); setToMonth(""); setSelectedYear(""); setRangeFromDate(""); setRangeToDate(""); setYearFrom(""); setYearTo(""); setAppliedFrom(""); setAppliedTo(""); }}>
                        <i className="bi bi-calendar-event me-1" />Single Date
                    </button>
                    <button type="button"
                        className={`btn ${filterMode==="date_range" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => { setFilterMode("date_range"); setSingleMonth(""); setFromMonth(""); setToMonth(""); setSelectedYear(""); setSingleDate(""); setYearFrom(""); setYearTo(""); setAppliedFrom(""); setAppliedTo(""); }}>
                        <i className="bi bi-calendar2-range me-1" />Date Range
                    </button>
                    <button type="button"
                        className={`btn ${filterMode==="year_range" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => { setFilterMode("year_range"); setSingleMonth(""); setFromMonth(""); setToMonth(""); setSelectedYear(""); setSingleDate(""); setRangeFromDate(""); setRangeToDate(""); setAppliedFrom(""); setAppliedTo(""); }}>
                        <i className="bi bi-calendar4-range me-1" />Year Range
                    </button>
                </div>

                {/* Row 2: filter inputs + clear + showing label */}
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    {filterMode==="single" && (
                        <input type="month" className="form-control form-control-sm" style={{ width:"auto" }}
                            value={singleMonth}
                            onChange={e => { setSingleMonth(e.target.value); setAppliedFrom(e.target.value); setAppliedTo(e.target.value); }} />
                    )}

                    {filterMode==="range" && (
                        <>
                            <input type="month" className="form-control form-control-sm" style={{ width:"auto" }}
                                value={fromMonth}
                                onChange={e => { setFromMonth(e.target.value); setAppliedFrom(e.target.value); }} />
                            <span className="text-muted small">to</span>
                            <input type="month" className="form-control form-control-sm" style={{ width:"auto" }}
                                value={toMonth}
                                onChange={e => { setToMonth(e.target.value); setAppliedTo(e.target.value); }} />
                        </>
                    )}

                    {filterMode==="year" && (
                        <select className="form-select form-select-sm"
                            style={{ width:"6rem", height:"26px", padding:"0 0.5rem", fontSize:"0.8rem" }}
                            value={selectedYear}
                            onChange={e => {
                                setSelectedYear(e.target.value);
                                setAppliedFrom(e.target.value ? `${e.target.value}-01` : "");
                                setAppliedTo(e.target.value ? `${e.target.value}-12` : "");
                            }}>
                            <option value="">—</option>
                            {fullYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    )}

                    {filterMode==="single_date" && (
                        <input type="date" className="form-control form-control-sm" style={{ width:"auto" }}
                            value={singleDate}
                            onChange={e => { setSingleDate(e.target.value); setAppliedFrom(e.target.value); setAppliedTo(e.target.value); }} />
                    )}

                    {filterMode==="date_range" && (
                        <>
                            <input type="date" className="form-control form-control-sm" style={{ width:"auto" }}
                                value={rangeFromDate}
                                onChange={e => { setRangeFromDate(e.target.value); setAppliedFrom(e.target.value); }} />
                            <span className="text-muted small">to</span>
                            <input type="date" className="form-control form-control-sm" style={{ width:"auto" }}
                                value={rangeToDate}
                                onChange={e => { setRangeToDate(e.target.value); setAppliedTo(e.target.value); }} />
                        </>
                    )}

                    {filterMode==="year_range" && (
                        <>
                            <select className="form-select form-select-sm"
                                style={{ width:"6rem", height:"26px", padding:"0 0.5rem", fontSize:"0.8rem" }}
                                value={yearFrom}
                                onChange={e => {
                                    setYearFrom(e.target.value);
                                    setAppliedFrom(e.target.value ? `${e.target.value}-01` : "");
                                }}>
                                <option value="">From</option>
                                {fullYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <span className="text-muted small">to</span>
                            <select className="form-select form-select-sm"
                                style={{ width:"6rem", height:"26px", padding:"0 0.5rem", fontSize:"0.8rem" }}
                                value={yearTo}
                                onChange={e => {
                                    setYearTo(e.target.value);
                                    setAppliedTo(e.target.value ? `${e.target.value}-12` : "");
                                }}>
                                <option value="">To</option>
                                {fullYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </>
                    )}

                    {(appliedFrom || appliedTo) && (
                        <button className="btn btn-sm btn-outline-secondary"
                            onClick={() => { setSingleMonth(""); setFromMonth(""); setToMonth(""); setSelectedYear(""); setSingleDate(""); setRangeFromDate(""); setRangeToDate(""); setYearFrom(""); setYearTo(""); setAppliedFrom(""); setAppliedTo(""); }}>
                            Clear
                        </button>
                    )}

                    {dataMinMonth && dataMaxMonth && (
                        <span className="text-muted small fst-italic ms-1">
                            <i className="bi bi-info-circle me-1" />Data: {dataMinMonth} → {dataMaxMonth}
                        </span>
                    )}

                    {(appliedFrom || appliedTo) && (
                        <span className="text-muted small fst-italic">
                            {filterMode==="year" && selectedYear ? `Showing: ${selectedYear}`
                                : filterMode==="year_range" && (yearFrom || yearTo) ? `Showing: ${yearFrom||'…'} → ${yearTo||'…'}`
                                : appliedFrom===appliedTo ? `Showing: ${appliedFrom}`
                                : `Showing: ${appliedFrom||dataMinMonth} → ${appliedTo||dataMaxMonth}`}
                        </span>
                    )}
                </div>
            </div>

            {/* KPI sections */}
            {kpiSections.map(section => (
                <div className="mb-4" key={section.title}>
                    <h5 className="fw-semibold mb-3">{section.title}</h5>
                    <div className="row g-3">
                        {section.cards.map(card => (
                            <div key={card.title} className="col-12 col-md-6 col-xl-4">
                                <KPICard {...card} store={store} filters={chartFilters} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Charts */}
            <h5 className="fw-semibold mb-3 mt-2">{t('Charts & Analytics')}</h5>

            {/* P&L Trend — new chart, full width */}
            <div className="row g-3 mb-3">
                <div className="col-12">
                    <ChartCard title={`${t('Monthly P&L Trend')} (${chartPeriod})`} height={320}>
                        {hasMonthly ? (
                            <Chart
                                chartType="ComboChart"
                                width="100%" height="100%"
                                data={monthlyPLData}
                                chartEvents={[{ eventName:'select', callback:onChartSelect }]}
                                options={{
                                    ...CHART_OPTS_BASE,
                                    tooltip: { isHtml:true, trigger:'selection' },
                                    seriesType: 'bars',
                                    series: {
                                        0: { type:'bars', color:'#4e73df' },
                                        1: { type:'bars', color:'#e74a3b' },
                                        2: { type:'line', color:'#1cc88a', pointSize:5, lineWidth:2 },
                                    },
                                    vAxis: { title:'SAR', textStyle:{ fontSize:10 }, format:'#,##0' },
                                    hAxis: { textStyle:{ fontSize:10 } },
                                    chartArea: { width:'78%', height:'65%' },
                                    legend: { position:'top', textStyle:{ fontSize:11 } },
                                }}
                            />
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted small">{t('No monthly data available')}</div>
                        )}
                    </ChartCard>
                </div>
            </div>

            {/* Row 2: Profit Pie + Cash Distribution */}
            <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                    <ChartCard title={t('Profit Breakdown')} height={260}>
                        {hasProfit ? (
                            <Chart
                                chartType="PieChart"
                                width="100%" height="100%"
                                data={profitPieData}
                                chartEvents={[{ eventName:'select', callback:onChartSelect }]}
                                options={{ ...CHART_OPTS_BASE, colors:['#4fc3f7','#81c784','#ffb74d'], pieHole:0.4, chartArea:{ width:'85%', height:'80%' }, pieSliceText:'percentage' }}
                            />
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted small">{t('No profit data available')}</div>
                        )}
                    </ChartCard>
                </div>
                <div className="col-12 col-md-6">
                    <ChartCard title={t('Cash Distribution')} height={260}>
                        {hasCash ? (
                            <Chart
                                chartType="PieChart"
                                width="100%" height="100%"
                                data={cashPieData}
                                chartEvents={[{ eventName:'select', callback:onChartSelect }]}
                                options={{ ...CHART_OPTS_BASE, colors:['#1a7a3a','#004ac6'], pieHole:0.4, chartArea:{ width:'85%', height:'80%' }, pieSliceText:'percentage' }}
                            />
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted small">{t('No cash data available')}</div>
                        )}
                    </ChartCard>
                </div>
            </div>

            {/* Row 3: Assets & Liabilities */}
            <div className="row g-3 mb-3">
                <div className="col-12">
                    <ChartCard title={t('Assets & Liabilities Overview')} height={280}>
                        <Chart
                            chartType="BarChart"
                            width="100%" height="100%"
                            data={assetBarData}
                            chartEvents={[{ eventName:'select', callback:onChartSelect }]}
                            options={{ ...CHART_OPTS_BASE, legend:{ position:'none' }, hAxis:{ title:'SAR', textStyle:{ fontSize:10 }, format:'#,##0' }, vAxis:{ textStyle:{ fontSize:11 } }, chartArea:{ width:'65%', height:'80%' } }}
                        />
                    </ChartCard>
                </div>
            </div>
        </div>
        <PostingIndex ref={PostingRef} />
        <VendorPending   ref={VendorPendingRef}   size="xl" />
        <CustomerPending ref={CustomerPendingRef} size="xl" />

{!!expenseCategoryFilter && (
            <ExpenseCategoryModal
                category={expenseCategoryFilter}
                appliedFrom={appliedFrom}
                appliedTo={appliedTo}
                storeId={storeId}
                vatPercent={vatPercent}
                onClose={() => setExpenseCategoryFilter(null)}
            />
        )}
        {!!customerCreditFilter && (
            <CustomerCreditModal
                customer={customerCreditFilter}
                storeId={storeId}
                appliedFrom={appliedFrom}
                appliedTo={appliedTo}
                onClose={() => setCustomerCreditFilter(null)}
            />
        )}
        {!!vendorPayablesFilter && (
            <VendorPayablesModal
                vendor={vendorPayablesFilter}
                storeId={storeId}
                appliedFrom={appliedFrom}
                appliedTo={appliedTo}
                onClose={() => setVendorPayablesFilter(null)}
            />
        )}
        </>
    );
}

export default AutoMobileDashboard;
