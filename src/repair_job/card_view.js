import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from 'react-i18next';
import { Spinner } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { highlightWords } from '../utils/search.js';

export function loadKanbanLists() {
    try { const s = localStorage.getItem('repair_job_kanban_lists'); if (s) return JSON.parse(s); } catch (e) { }
    return [
        { id: 'todo', name: 'ToDo', color: '#0052cc' },
        { id: 'in_progress', name: 'In Progress', color: '#ff8b00' },
        { id: 'done', name: 'DONE', color: '#00875a' },
    ];
}
export function loadCardMap() {
    try { const s = localStorage.getItem('repair_job_kanban_card_map'); if (s) return JSON.parse(s); } catch (e) { }
    return {};
}
export function saveCardMap(map) { localStorage.setItem('repair_job_kanban_card_map', JSON.stringify(map)); }
export function statusToDefaultListId(status) {
    if (status === 'in_progress') return 'in_progress';
    if (status === 'completed' || status === 'delivered') return 'done';
    return 'todo';
}

const STATUS_OPTIONS = [
    { value: 'open', label: 'Open', color: '#1565c0', bg: '#e3f2fd' },
    { value: 'in_progress', label: 'In Progress', color: '#e65100', bg: '#fff3e0' },
    { value: 'completed', label: 'Completed', color: '#2e7d32', bg: '#e8f5e9' },
    { value: 'delivered', label: 'Delivered', color: '#6a1b9a', bg: '#f3e5f5' },
    { value: 'cancelled', label: 'Cancelled', color: '#c62828', bg: '#ffebee' },
];

const CUST_COLS = [
    { key: 'name', label: 'Name', w: '36%' },
    { key: 'code', label: 'Code', w: '13%' },
    { key: 'phone', label: 'Phone', w: '21%' },
    { key: 'vat_no', label: 'VAT No.', w: '18%' },
    { key: 'credit_balance', label: 'Balance', w: '12%' },
];

function fmtCurrency(val) { return val == null ? '0.00' : parseFloat(val || 0).toFixed(2); }
function fmtDate(val) { if (!val) return ''; try { return format(new Date(val), 'yyyy-MM-dd'); } catch (e) { return ''; } }
function toISOSafe(str) { if (!str) return null; try { const d = new Date(str); return isNaN(d) ? null : d.toISOString(); } catch (e) { return null; } }

function SearchDropdown({ value, onChange, onSelect, placeholder, options, loading, renderOption, getKey }) {
    const [focused, setFocused] = useState(false);
    const show = focused && options.length > 0;
    return (
        <div style={{ position: 'relative' }}>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 180)}
                placeholder={placeholder}
                style={{ width: '100%', border: '1px solid #dfe1e6', borderRadius: 5, padding: '7px 10px', fontSize: 13, outline: 'none', background: '#fff' }}
            />
            {loading && <Spinner as="span" animation="border" size="sm" style={{ position: 'absolute', right: 10, top: 9 }} />}
            {show && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #dfe1e6', borderRadius: 5, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 2000, maxHeight: 220, overflowY: 'auto' }}>
                    {options.map((opt, i) => (
                        <div key={getKey(opt, i)}
                            onMouseDown={e => { e.preventDefault(); onSelect(opt); setFocused(false); }}
                            style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f4f5f7', color: '#172b4d' }}
                            onMouseOver={e => e.currentTarget.style.background = '#f4f5f7'}
                            onMouseOut={e => e.currentTarget.style.background = '#fff'}
                        >
                            {renderOption(opt)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const RepairJobCardView = forwardRef(({ onFullEdit, onKanbanListChange, onJobUpdated, showToastMessage }, ref) => {
    const { t } = useTranslation('common');
    const [show, setShow] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');

    const [job, setJob] = useState({});
    const jobRef = useRef({});

    const [kanbanLists, setKanbanLists] = useState([]);
    const [cardMap, setCardMap] = useState({});

    const [editingTitle, setEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState('');

    // Customer
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const customerSearchRef = useRef();

    // Vehicle
    const [vehicleOptions, setVehicleOptions] = useState([]);
    const [selectedVehicles, setSelectedVehicles] = useState([]);
    const vehicleSearchRef = useRef();

    // Technician (SearchDropdown — simpler for sidebar)
    const [techSearch, setTechSearch] = useState('');
    const [techOptions, setTechOptions] = useState([]);
    const [techLoading, setTechLoading] = useState(false);
    const techDebounce = useRef();

    // Products
    const [productOptions, setProductOptions] = useState([]);
    const [openProductSearch, setOpenProductSearch] = useState(false);
    const productSearchRef = useRef();

    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    useImperativeHandle(ref, () => ({
        open(jobId) {
            const lists = loadKanbanLists();
            const map = loadCardMap();
            setKanbanLists(lists);
            setCardMap(map);
            setEditingTitle(false);
            setJob({});
            jobRef.current = {};
            setSelectedCustomers([]);
            setCustomerOptions([]);
            setSelectedVehicles([]);
            setVehicleOptions([]);
            setTechSearch('');
            setTechOptions([]);
            setProductOptions([]);
            setOpenProductSearch(false);
            setSaveStatus('');
            fetchJob(jobId);
            setShow(true);
        },
        updateCardMap(jobId, listId) {
            setCardMap(prev => ({ ...prev, [jobId]: listId }));
        }
    }));

    function handleClose() { setShow(false); setJob({}); jobRef.current = {}; }

    function getStoreQP() {
        const storeId = localStorage.getItem('store_id');
        return storeId ? `search[store_id]=${storeId}` : '';
    }

    function fetchJob(id) {
        const token = localStorage.getItem('access_token');
        setIsLoading(true);
        fetch(`/v1/repair-job/${id}?${getStoreQP()}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', Authorization: token },
        })
            .then(async r => {
                const d = await r.json();
                if (r.ok && d.result) {
                    const j = d.result;
                    jobRef.current = j;
                    setJob(j);
                    setTitleValue(j.title || '');
                    setTechSearch(j.technician_name || '');
                    if (j.customer_id) fetchCustomerById(j.customer_id);
                    if (j.vehicle_id) {
                        setSelectedVehicles([{
                            id: j.vehicle_id,
                            vehicle_number: j.vehicle_number,
                            brand: j.brand,
                            model: j.model,
                            label: `${j.vehicle_number || ''} - ${j.brand || ''} ${j.model || ''}`,
                        }]);
                    }
                }
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }

    const saveTimerRef = useRef();

    const saveJobFields = useCallback(async (fields) => {
        const token = localStorage.getItem('access_token');
        const current = { ...jobRef.current, ...fields };
        jobRef.current = current;
        setJob({ ...current });
        setSaveStatus('saving');
        const url = `/v1/repair-job/${current.id}?${getStoreQP()}`;
        console.log('[CardView] saveJobFields fields:', fields, 'PUT', url);
        try {
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify(current),
            });
            const data = await res.json();
            console.log('[CardView] saveJobFields response:', res.status, data.errors || (data.result ? 'ok' : 'no result'));
            if (res.ok && data.result) {
                jobRef.current = data.result;
                setJob(data.result);
                setSaveStatus('saved');
                if (showToastMessage) showToastMessage(t('Saved'), 'success');
                if (onJobUpdated) onJobUpdated(data.result);
            } else {
                setSaveStatus('error');
                if (showToastMessage) showToastMessage(t('Failed to save'), 'danger');
            }
        } catch (e) {
            console.error('[CardView] saveJobFields error:', e);
            setSaveStatus('error');
            if (showToastMessage) showToastMessage(t('Failed to save'), 'danger');
        }
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaveStatus(''), 2500);
    }, [showToastMessage, t, onJobUpdated]);

    function handleTitleSave() {
        setEditingTitle(false);
        const trimmed = titleValue.trim();
        if (trimmed === (jobRef.current.title || '')) return;
        saveJobFields({ title: trimmed });
    }

    function handleListChange(listId) {
        const newMap = { ...cardMap, [jobRef.current.id]: listId };
        setCardMap(newMap);
        saveCardMap(newMap);
        if (onKanbanListChange) onKanbanListChange(jobRef.current.id, listId);
    }

    // ── Customer ──
    async function suggestCustomers(searchTerm) {
        setCustomerOptions([]);
        if (!searchTerm) return;
        const params = { name: searchTerm };
        const storeId = localStorage.getItem('store_id');
        if (storeId) params.store_id = storeId;
        let qs = ObjectToSearchQueryParams(params);
        if (qs) qs = '&' + qs;
        try {
            const res = await fetch(`/v1/customer?select=id,name,code,phone,vat_no,credit_balance${qs}&limit=20`, {
                headers: { Authorization: localStorage.getItem('access_token') }
            });
            const d = await res.json();
            setCustomerOptions((d.result || []).map(c => ({ ...c, label: c.name || '' })));
        } catch (e) {}
    }

    async function fetchCustomerById(customerId) {
        const qp = getStoreQP();
        try {
            const res = await fetch(`/v1/customer/${customerId}?${qp}`, {
                headers: { Authorization: localStorage.getItem('access_token') }
            });
            const d = await res.json();
            if (d.result) setSelectedCustomers([{ ...d.result, label: d.result.name || '' }]);
        } catch (e) {}
    }

    // ── Vehicle ──
    async function suggestVehicles(searchTerm, customerIdFilter) {
        setVehicleOptions([]);
        if (!customerIdFilter) return; // vehicle suggestions only when customer is set
        const params = {};
        if (searchTerm) params.search = searchTerm;
        if (customerIdFilter) params.customer_id = customerIdFilter;
        const storeId = localStorage.getItem('store_id');
        if (storeId) params.store_id = storeId;
        let qs = ObjectToSearchQueryParams(params);
        if (qs) qs = '&' + qs;
        try {
            const res = await fetch(`/v1/vehicle?select=id,vehicle_number,brand,model,customer_name,customer_id${qs}&limit=20`, {
                headers: { Authorization: localStorage.getItem('access_token') }
            });
            const d = await res.json();
            setVehicleOptions((d.result || []).map(v => ({
                ...v,
                label: `${v.vehicle_number || ''} - ${v.brand || ''} ${v.model || ''}`,
            })));
        } catch (e) {}
    }

    // ── Technician ──
    function onTechSearchChange(val) {
        setTechSearch(val);
        setTechOptions([]);
        clearTimeout(techDebounce.current);
        if (!val.trim()) return;
        techDebounce.current = setTimeout(() => fetchTechnicians(val), 350);
    }
    async function fetchTechnicians(term) {
        setTechLoading(true);
        const storeId = localStorage.getItem('store_id');
        const params = { search: term };
        if (storeId) params.store_id = storeId;
        const qp = ObjectToSearchQueryParams(params);
        try {
            const res = await fetch(`/v1/employee?select=id,name,position&limit=20&${qp}`, {
                headers: { Authorization: localStorage.getItem('access_token') }
            });
            const d = await res.json();
            setTechOptions(d.result || []);
        } catch (e) {}
        setTechLoading(false);
    }
    function onTechSelect(emp) {
        setTechSearch(emp.name);
        setTechOptions([]);
        saveJobFields({ technician_id: emp.id, technician_name: emp.name });
    }

    // ── Products ──
    async function suggestProducts(searchTerm) {
        setProductOptions([]);
        if (!searchTerm) return;
        const storeId = localStorage.getItem('store_id');
        const params = { name: searchTerm };
        if (storeId) params.store_id = storeId;
        let qs = ObjectToSearchQueryParams(params);
        if (qs) qs = '&' + qs;
        const psFields = storeId
            ? `,product_stores.${storeId}.retail_unit_price,product_stores.${storeId}.retail_unit_price_with_vat`
            : '';
        try {
            const res = await fetch(`/v1/product?select=id,name,is_service,item_code${psFields}${qs}&limit=20`, {
                headers: { Authorization: localStorage.getItem('access_token') }
            });
            const d = await res.json();
            const mapped = (d.result || []).map(p => {
                const ps = (storeId && p.product_stores?.[storeId]) || {};
                const excl = ps.retail_unit_price ?? p.price ?? 0;
                const incl = ps.retail_unit_price_with_vat ?? p.unit_price_with_vat ?? excl;
                return { ...p, retail_price: excl, retail_price_with_vat: incl };
            });
            setProductOptions(mapped);
            if (mapped.length > 0) setOpenProductSearch(true);
        } catch (e) {}
    }

    function isPartAdded(productId) {
        return (job.parts || []).some(p => p.product_id === productId);
    }
    function addPart(product) {
        const currentParts = jobRef.current.parts || [];
        if (currentParts.some(p => p.product_id === product.id)) return;
        const newPart = {
            product_id: product.id,
            name: product.name,
            qty: 1,
            unit_price: parseFloat(product.retail_price || 0),
            unit_price_with_vat: parseFloat(product.retail_price_with_vat || product.retail_price || 0),
            total_price: parseFloat(product.retail_price || 0),
            total_price_with_vat: parseFloat(product.retail_price_with_vat || product.retail_price || 0),
        };
        saveJobFields({ parts: [...currentParts, newPart] });
    }
    function removePartByProductId(productId) {
        const parts = (jobRef.current.parts || []).filter(p => p.product_id !== productId);
        saveJobFields({ parts });
    }

    function updatePart(index, field, value) {
        const parts = (jobRef.current.parts || []).map((p, i) => {
            if (i !== index) return p;
            const updated = { ...p, [field]: value };
            if (field === 'qty' || field === 'unit_price') {
                updated.total_price = parseFloat(updated.qty || 0) * parseFloat(updated.unit_price || 0);
                updated.total_price_with_vat = parseFloat(updated.qty || 0) * parseFloat(updated.unit_price_with_vat || 0);
            }
            if (field === 'unit_price_with_vat') {
                updated.total_price_with_vat = parseFloat(updated.qty || 0) * parseFloat(updated.unit_price_with_vat || 0);
            }
            return updated;
        });
        const next = { ...jobRef.current, parts };
        jobRef.current = next;
        setJob({ ...next });
    }
    function saveParts() { saveJobFields({ parts: jobRef.current.parts || [] }); }
    function removePart(index) {
        const parts = (jobRef.current.parts || []).filter((_, i) => i !== index);
        saveJobFields({ parts });
    }

    function computeSummary() {
        const parts = job.parts || [];
        let partsExcl = 0, partsIncl = 0;
        parts.forEach(p => {
            partsExcl += parseFloat(p.total_price || 0);
            partsIncl += parseFloat(p.total_price_with_vat || p.total_price || 0);
        });
        const labour = parseFloat(job.labour_charge || 0);
        const vatAmount = partsIncl - partsExcl;
        return { partsExcl, partsIncl, vatAmount, labour, totalExcl: partsExcl + labour, totalIncl: partsIncl + labour };
    }

    const currentListId = cardMap[job.id] || statusToDefaultListId(job.status);
    const currentList = kanbanLists.find(l => l.id === currentListId);
    const statusOpt = STATUS_OPTIONS.find(s => s.value === job.status) || STATUS_OPTIONS[0];
    const summary = computeSummary();

    const SL = { fontSize: 11, fontWeight: 700, color: '#5e6c84', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 };
    const inputCls = { width: '100%', border: '1px solid #dfe1e6', borderRadius: 5, padding: '7px 10px', fontSize: 13, outline: 'none', background: '#fff', color: '#172b4d', fontFamily: 'inherit' };
    const sectionBox = { background: '#fff', borderRadius: 7, padding: '13px 15px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: 10 };

    if (!show) return null;

    return (
        <>
            <style>{`
                .rj-card-body { display: flex; gap: 12px; padding: 12px 14px 18px; flex-wrap: wrap; }
                .rj-main { flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; }
                .rj-sidebar { flex: 0 0 240px; display: flex; flex-direction: column; gap: 10px; }
                @media (max-width: 640px) {
                    .rj-sidebar { flex: 1 1 100%; }
                    .rj-main { flex: 1 1 100%; }
                    .rj-card-body { padding: 10px 10px 14px; gap: 8px; }
                }
                .rbt-input-main { height: 34px !important; padding: 6px 10px !important; font-size: 13px !important; border-color: #dfe1e6 !important; }
            `}</style>

            {/* Backdrop */}
            <div
                onClick={handleClose}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1060, overflowY: 'auto', padding: isMobile ? '0' : '24px 12px' }}
            >
                {/* Card */}
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: '#f4f5f7', borderRadius: isMobile ? 0 : 10,
                        width: '100%', maxWidth: 960, margin: '0 auto',
                        minHeight: isMobile ? '100vh' : undefined,
                        position: 'relative', boxShadow: '0 8px 40px rgba(0,0,0,0.3)'
                    }}
                >
                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div style={{ padding: isMobile ? '14px 46px 12px 14px' : '18px 50px 14px 20px', background: 'rgba(0,0,0,0.06)', borderRadius: isMobile ? 0 : '10px 10px 0 0' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                                    <i className="bi bi-clipboard2-pulse" style={{ color: '#5e6c84', fontSize: 18, marginTop: 4, flexShrink: 0 }}></i>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {editingTitle ? (
                                            <textarea
                                                value={titleValue}
                                                onChange={e => setTitleValue(e.target.value)}
                                                onBlur={handleTitleSave}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTitleSave(); }
                                                    if (e.key === 'Escape') { setEditingTitle(false); setTitleValue(job.title || ''); }
                                                }}
                                                autoFocus
                                                rows={2}
                                                style={{ width: '100%', fontSize: 17, fontWeight: 700, color: '#172b4d', border: '2px solid #0052cc', borderRadius: 4, padding: '4px 8px', outline: 'none', resize: 'none', background: '#fff', fontFamily: 'inherit' }}
                                            />
                                        ) : (
                                            <div
                                                onClick={() => { setEditingTitle(true); setTitleValue(job.title || ''); }}
                                                title={t('Click to edit title')}
                                                style={{ fontSize: 17, fontWeight: 700, color: job.title ? '#172b4d' : '#b3bac5', cursor: 'text', padding: '3px 8px', borderRadius: 4, minHeight: 28, fontStyle: job.title ? 'normal' : 'italic', wordBreak: 'break-word' }}
                                            >
                                                {job.title || t('Click to add title...')}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, paddingLeft: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: '#5e6c84', background: '#dfe1e6', borderRadius: 3, padding: '2px 7px' }}>{job.job_number}</span>
                                            <span style={{ fontSize: 11, color: '#5e6c84' }}>{t('in list')}</span>
                                            <select
                                                value={currentListId}
                                                onChange={e => handleListChange(e.target.value)}
                                                style={{ fontSize: 11, fontWeight: 700, color: currentList?.color || '#0052cc', background: '#fff', border: '1px solid #dfe1e6', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', outline: 'none' }}
                                            >
                                                {kanbanLists.map(l => (
                                                    <option key={l.id} value={l.id} style={{ color: '#172b4d' }}>{l.name}</option>
                                                ))}
                                            </select>
                                            {saveStatus === 'saving' && <span style={{ fontSize: 11, color: '#5e6c84', display: 'flex', alignItems: 'center', gap: 4 }}><Spinner as="span" animation="border" size="sm" />{t('Saving...')}</span>}
                                            {saveStatus === 'saved' && <span style={{ fontSize: 11, color: '#2e7d32' }}><i className="bi bi-check-circle-fill me-1"></i>{t('Saved')}</span>}
                                            {saveStatus === 'error' && <span style={{ fontSize: 11, color: '#c62828' }}><i className="bi bi-exclamation-circle me-1"></i>{t('Error')}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="rj-card-body">

                                {/* === LEFT MAIN === */}
                                <div className="rj-main">

                                    {/* Customer */}
                                    <div style={sectionBox}>
                                        <div style={SL}><i className="bi bi-person-vcard"></i>{t('Customer')}</div>
                                        <Typeahead
                                            id="cv-customer"
                                            labelKey="label"
                                            filterBy={() => true}
                                            minLength={1}
                                            emptyLabel=""
                                            open={customerOptions.length === 0 ? false : undefined}
                                            onChange={(selectedItems) => {
                                                if (selectedItems.length === 0) {
                                                    setSelectedCustomers([]);
                                                    setSelectedVehicles([]);
                                                    setVehicleOptions([]);
                                                    vehicleSearchRef.current?.clear();
                                                    saveJobFields({ customer_id: null, customer_name: '', vehicle_id: null, vehicle_number: '', brand: '', model: '' });
                                                    return;
                                                }
                                                const c = selectedItems[0];
                                                setSelectedCustomers([...selectedItems]);
                                                saveJobFields({ customer_id: c.id, customer_name: c.name || '' });
                                                suggestVehicles('', c.id);
                                            }}
                                            options={customerOptions}
                                            placeholder={t('Search customer...')}
                                            selected={selectedCustomers}
                                            highlightOnlyResult={true}
                                            onInputChange={(searchTerm) => { suggestCustomers(searchTerm); }}
                                            ref={customerSearchRef}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') { setCustomerOptions([]); customerSearchRef.current?.clear(); }
                                            }}
                                            renderMenu={(results, menuProps, state) => {
                                                if (!results.length) return <Menu {...menuProps} style={{ display: 'none' }}></Menu>;
                                                const searchWords = (state.text || '').toLowerCase().split(' ').filter(Boolean);
                                                function hl(text) {
                                                    if (!text) return '–';
                                                    if (!searchWords.length) return text;
                                                    const parts = text.split(new RegExp(`(${searchWords.join('|')})`, 'gi'));
                                                    return parts.map((p, i) => searchWords.includes(p.toLowerCase())
                                                        ? <mark key={i} style={{ background: '#fef08a', padding: 0, fontWeight: 700 }}>{p}</mark>
                                                        : p
                                                    );
                                                }
                                                return (
                                                    <Menu {...menuProps} style={{ ...(menuProps.style || {}), minWidth: 'min(95vw, 680px)', zIndex: 9999, padding: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', left: 0 }}>
                                                        <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, pointerEvents: 'none' }}>
                                                            <div style={{ display: 'flex', padding: '5px 12px', background: '#f8f9fa', borderBottom: '2px solid #e2e8f0', fontWeight: 700, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                {CUST_COLS.map(c => <div key={c.key} style={{ width: c.w, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(c.label)}</div>)}
                                                            </div>
                                                        </MenuItem>
                                                        {results.map((option, idx) => {
                                                            const isActive = state.activeIndex === idx || results.length === 1;
                                                            return (
                                                                <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                                    <div style={{ display: 'flex', padding: '7px 12px', background: isActive ? '#e8f0fe' : (idx % 2 === 0 ? '#fff' : '#f8fafc'), alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
                                                                        {CUST_COLS.map(col => (
                                                                            <div key={col.key} style={{ width: col.w, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: isActive ? '#191c1e' : '#374151', fontWeight: (isActive && col.key === 'name') ? 700 : 400 }}>
                                                                                {col.key === 'name' && hl(option.name)}
                                                                                {col.key === 'code' && (option.code || '–')}
                                                                                {col.key === 'phone' && (option.phone || '–')}
                                                                                {col.key === 'vat_no' && (option.vat_no || '–')}
                                                                                {col.key === 'credit_balance' && (
                                                                                    <span style={{ fontWeight: 600, color: (option.credit_balance || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                                                                                        {option.credit_balance != null ? parseFloat(option.credit_balance).toFixed(2) : '–'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </MenuItem>
                                                            );
                                                        })}
                                                    </Menu>
                                                );
                                            }}
                                        />
                                    </div>

                                    {/* Vehicle */}
                                    <div style={sectionBox}>
                                        <div style={SL}><i className="bi bi-car-front"></i>{t('Vehicle')}</div>
                                        <Typeahead
                                            id="cv-vehicle"
                                            labelKey="label"
                                            filterBy={() => true}
                                            minLength={1}
                                            emptyLabel=""
                                            open={vehicleOptions.length === 0 ? false : undefined}
                                            onChange={(selectedItems) => {
                                                if (selectedItems.length === 0) {
                                                    setSelectedVehicles([]);
                                                    saveJobFields({ vehicle_id: null, vehicle_number: '', brand: '', model: '' });
                                                    return;
                                                }
                                                const v = selectedItems[0];
                                                setSelectedVehicles([...selectedItems]);
                                                const fields = { vehicle_id: v.id, vehicle_number: v.vehicle_number || '', brand: v.brand || '', model: v.model || '' };
                                                if (v.customer_id && !jobRef.current.customer_id) {
                                                    fields.customer_id = v.customer_id;
                                                    fetchCustomerById(v.customer_id);
                                                }
                                                saveJobFields(fields);
                                            }}
                                            options={vehicleOptions}
                                            placeholder={t('Search vehicle...')}
                                            selected={selectedVehicles}
                                            highlightOnlyResult={true}
                                            onInputChange={(searchTerm) => {
                                                suggestVehicles(searchTerm, selectedCustomers[0]?.id || null);
                                            }}
                                            ref={vehicleSearchRef}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') { setVehicleOptions([]); vehicleSearchRef.current?.clear(); }
                                            }}
                                            renderMenu={(results, menuProps, state) => {
                                                if (!results.length) return <Menu {...menuProps} style={{ display: 'none' }}></Menu>;
                                                return (
                                                    <Menu {...menuProps} style={{ ...(menuProps.style || {}), zIndex: 9999, left: 0, padding: 0 }}>
                                                        {results.map((option, idx) => {
                                                            const isActive = state.activeIndex === idx || results.length === 1;
                                                            return (
                                                                <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                                    <div style={{ padding: '8px 12px', background: isActive ? '#e8f0fe' : (idx % 2 === 0 ? '#fff' : '#f8fafc'), borderBottom: '1px solid #f0f0f0' }}>
                                                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#191c1e' }}>
                                                                            {option.vehicle_number}
                                                                            {option.brand && <span style={{ fontWeight: 400, color: '#5e6c84' }}> — {option.brand} {option.model}</span>}
                                                                        </div>
                                                                        {option.customer_name && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}><i className="bi bi-person me-1"></i>{option.customer_name}</div>}
                                                                    </div>
                                                                </MenuItem>
                                                            );
                                                        })}
                                                    </Menu>
                                                );
                                            }}
                                        />
                                        {(job.vehicle_id || (!job.vehicle_id)) && (
                                            <div style={{ marginTop: 8 }}>
                                                <label style={{ fontSize: 11, color: '#5e6c84', display: 'block', marginBottom: 3 }}>{t('KM')}</label>
                                                <input
                                                    type="number"
                                                    key={`km-${job.id}`}
                                                    defaultValue={job.km || ''}
                                                    onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) saveJobFields({ km: v }); }}
                                                    placeholder="0"
                                                    style={{ ...inputCls, width: 140 }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Parts & Services */}
                                    <div style={sectionBox}>
                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                                            <div style={SL}><i className="bi bi-box-seam"></i>{t('Parts & Services')}</div>
                                        </div>

                                        {/* Product Typeahead */}
                                        <div style={{ marginBottom: 10 }}>
                                            <Typeahead
                                                id="cv-product"
                                                labelKey="name"
                                                filterBy={() => true}
                                                open={openProductSearch}
                                                onChange={() => {}}
                                                options={productOptions}
                                                placeholder={t('Search product / service to add...')}
                                                selected={[]}
                                                highlightOnlyResult={false}
                                                onInputChange={(searchTerm) => {
                                                    suggestProducts(searchTerm);
                                                    if (!searchTerm) { setOpenProductSearch(false); setProductOptions([]); }
                                                }}
                                                ref={productSearchRef}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') { setProductOptions([]); setOpenProductSearch(false); productSearchRef.current?.clear(); }
                                                }}
                                                renderMenu={(results, menuProps, state) => {
                                                    const searchWords = (state.text || '').toLowerCase().split(' ').filter(Boolean);
                                                    return (
                                                        <Menu {...menuProps} style={{ ...(menuProps.style || {}), minWidth: 'min(96vw, 672px)', zIndex: 9999, padding: 0 }}>
                                                            <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0, pointerEvents: 'auto' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', padding: '7px 10px', gap: 6 }}>
                                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', flex: 1 }}>{t('Select Products / Services')}</span>
                                                                    <button
                                                                        type="button"
                                                                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenProductSearch(false); productSearchRef.current?.clear(); setProductOptions([]); }}
                                                                        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                                                                    >
                                                                        ✓ {t('Done')}
                                                                    </button>
                                                                </div>
                                                            </MenuItem>
                                                            {results.map((option, idx) => {
                                                                const checked = isPartAdded(option.id);
                                                                return (
                                                                    <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (checked) { removePartByProductId(option.id); } else { addPart(option); }
                                                                                setOpenProductSearch(true);
                                                                            }}
                                                                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: checked ? '#e8f0fe' : (idx % 2 === 0 ? '#fff' : '#f8fafc'), cursor: 'pointer', borderBottom: '1px solid #e5e7eb' }}
                                                                        >
                                                                            <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${checked ? '#004ac6' : '#94a3b8'}`, background: checked ? '#004ac6' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                                {checked && <i className="bi bi-check" style={{ color: '#fff', fontSize: 12 }}></i>}
                                                                            </div>
                                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                                <div style={{ fontWeight: checked ? 700 : 500, fontSize: 13, color: '#191c1e' }}>{highlightWords(option.name, searchWords, checked)}</div>
                                                                                <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                                                                    {[option.item_code, option.is_service ? t('Service') : t('Product')].filter(Boolean).join(' • ')}
                                                                                </div>
                                                                            </div>
                                                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                                                <div style={{ fontWeight: 700, fontSize: 13, color: '#004ac6' }}>{fmtCurrency(option.retail_price_with_vat)}</div>
                                                                                <div style={{ fontSize: 10, color: '#6b7280' }}>{t('Excl.')}: {fmtCurrency(option.retail_price)}</div>
                                                                            </div>
                                                                        </div>
                                                                    </MenuItem>
                                                                );
                                                            })}
                                                        </Menu>
                                                    );
                                                }}
                                            />
                                        </div>

                                        {/* Parts table */}
                                        {job.parts && job.parts.length > 0 && (
                                            <div style={{ overflowX: 'auto', marginBottom: 10 }}>
                                                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', minWidth: 480 }}>
                                                    <thead>
                                                        <tr style={{ background: '#f4f5f7', borderBottom: '2px solid #dfe1e6' }}>
                                                            <th style={{ textAlign: 'left', padding: '6px 8px', color: '#5e6c84', fontWeight: 700 }}>{t('Name')}</th>
                                                            <th style={{ textAlign: 'center', padding: '6px 8px', color: '#5e6c84', fontWeight: 700, width: 60 }}>{t('Qty')}</th>
                                                            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#5e6c84', fontWeight: 700, width: 100 }}>{t('Price (excl.)')}</th>
                                                            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#5e6c84', fontWeight: 700, width: 100 }}>{t('Price (incl.)')}</th>
                                                            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#5e6c84', fontWeight: 700, width: 90 }}>{t('Total')}</th>
                                                            <th style={{ width: 32 }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {job.parts.map((p, i) => (
                                                            <tr key={i} style={{ borderBottom: '1px solid #f4f5f7' }}>
                                                                <td style={{ padding: '5px 8px' }}>
                                                                    <input
                                                                        defaultValue={p.name}
                                                                        onBlur={e => { updatePart(i, 'name', e.target.value); saveParts(); }}
                                                                        style={{ border: '1px solid #dfe1e6', borderRadius: 3, padding: '3px 6px', fontSize: 12, width: '100%', outline: 'none' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '5px 4px' }}>
                                                                    <input
                                                                        type="number"
                                                                        defaultValue={p.qty}
                                                                        min="0"
                                                                        onChange={e => updatePart(i, 'qty', parseFloat(e.target.value) || 0)}
                                                                        onBlur={e => { updatePart(i, 'qty', parseFloat(e.target.value) || 0); saveParts(); }}
                                                                        style={{ border: '1px solid #dfe1e6', borderRadius: 3, padding: '3px 4px', fontSize: 12, width: '100%', textAlign: 'center', outline: 'none' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '5px 4px' }}>
                                                                    <input
                                                                        type="number"
                                                                        defaultValue={p.unit_price}
                                                                        min="0"
                                                                        step="0.01"
                                                                        onChange={e => updatePart(i, 'unit_price', parseFloat(e.target.value) || 0)}
                                                                        onBlur={e => { updatePart(i, 'unit_price', parseFloat(e.target.value) || 0); saveParts(); }}
                                                                        style={{ border: '1px solid #dfe1e6', borderRadius: 3, padding: '3px 4px', fontSize: 12, width: '100%', textAlign: 'right', outline: 'none' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '5px 4px' }}>
                                                                    <input
                                                                        type="number"
                                                                        defaultValue={p.unit_price_with_vat || p.unit_price}
                                                                        min="0"
                                                                        step="0.01"
                                                                        onChange={e => updatePart(i, 'unit_price_with_vat', parseFloat(e.target.value) || 0)}
                                                                        onBlur={e => { updatePart(i, 'unit_price_with_vat', parseFloat(e.target.value) || 0); saveParts(); }}
                                                                        style={{ border: '1px solid #dfe1e6', borderRadius: 3, padding: '3px 4px', fontSize: 12, width: '100%', textAlign: 'right', outline: 'none', color: '#0052cc' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: '#172b4d', whiteSpace: 'nowrap' }}>
                                                                    {fmtCurrency(p.total_price_with_vat || p.total_price)}
                                                                </td>
                                                                <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                                                                    <button type="button" onClick={() => removePart(i)}
                                                                        style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', padding: '2px 4px', fontSize: 15, lineHeight: 1 }}>
                                                                        <i className="bi bi-x"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Complaint */}
                                    <div style={sectionBox}>
                                        <div style={SL}><i className="bi bi-chat-left-text"></i>{t('Complaint')}</div>
                                        <textarea
                                            key={`complaint-${job.id}`}
                                            defaultValue={job.complaint || ''}
                                            onBlur={e => { saveJobFields({ complaint: e.target.value }); }}
                                            placeholder={t('Describe the customer complaint...')}
                                            rows={3}
                                            style={{ ...inputCls, resize: 'vertical', lineHeight: 1.5 }}
                                        />
                                    </div>

                                    {/* Inspection */}
                                    <div style={sectionBox}>
                                        <div style={SL}><i className="bi bi-search"></i>{t('Inspection')}</div>
                                        <textarea
                                            key={`inspection-${job.id}`}
                                            defaultValue={job.inspection || ''}
                                            onBlur={e => { saveJobFields({ inspection: e.target.value }); }}
                                            placeholder={t('Inspection findings...')}
                                            rows={3}
                                            style={{ ...inputCls, resize: 'vertical', lineHeight: 1.5 }}
                                        />
                                    </div>

                                    {/* Work Done */}
                                    <div style={sectionBox}>
                                        <div style={SL}><i className="bi bi-tools"></i>{t('Work Done')}</div>
                                        <textarea
                                            key={`work_done-${job.id}`}
                                            defaultValue={job.work_done || ''}
                                            onBlur={e => { saveJobFields({ work_done: e.target.value }); }}
                                            placeholder={t('Work performed...')}
                                            rows={3}
                                            style={{ ...inputCls, resize: 'vertical', lineHeight: 1.5 }}
                                        />
                                    </div>
                                </div>

                                {/* === RIGHT SIDEBAR === */}
                                <div className="rj-sidebar">

                                    {/* Status */}
                                    <div style={sectionBox}>
                                        <div style={SL}><i className="bi bi-circle-fill" style={{ fontSize: 8, color: statusOpt.color }}></i>{t('Status')}</div>
                                        <select
                                            value={job.status || 'open'}
                                            onChange={e => saveJobFields({ status: e.target.value })}
                                            style={{ width: '100%', fontSize: 12, fontWeight: 700, color: statusOpt.color, background: statusOpt.bg, border: 'none', borderRadius: 4, padding: '6px 8px', cursor: 'pointer', outline: 'none' }}
                                        >
                                            {STATUS_OPTIONS.map(s => (
                                                <option key={s.value} value={s.value} style={{ background: '#fff', color: '#172b4d', fontWeight: 600 }}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Labour Charge */}
                                    <div style={sectionBox}>
                                        <div style={SL}><i className="bi bi-hammer"></i>{t('Labour Charge')}</div>
                                        <input
                                            type="number"
                                            key={`labour-${job.id}`}
                                            defaultValue={job.labour_charge || 0}
                                            min="0"
                                            step="0.01"
                                            onBlur={e => { const v = parseFloat(e.target.value) || 0; saveJobFields({ labour_charge: v }); }}
                                            style={inputCls}
                                        />
                                    </div>

                                    {/* Cost Summary */}
                                    <div style={{ ...sectionBox, background: '#172b4d', color: '#fff' }}>
                                        <div style={{ ...SL, color: '#8db4e2' }}><i className="bi bi-cash-stack"></i>{t('Cost Summary')}</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b3c6e0' }}>
                                                <span>{t('Parts (excl. VAT)')}:</span>
                                                <span>{fmtCurrency(summary.partsExcl)}</span>
                                            </div>
                                            {summary.vatAmount > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b3c6e0' }}>
                                                    <span>{t('VAT')}:</span>
                                                    <span>{fmtCurrency(summary.vatAmount)}</span>
                                                </div>
                                            )}
                                            {summary.partsIncl > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b3c6e0' }}>
                                                    <span>{t('Parts (incl. VAT)')}:</span>
                                                    <span>{fmtCurrency(summary.partsIncl)}</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b3c6e0' }}>
                                                <span>{t('Labour')}:</span>
                                                <span>{fmtCurrency(summary.labour)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#fff', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 7, marginTop: 3 }}>
                                                <span>{t('Total (excl.)')}:</span>
                                                <span>{fmtCurrency(summary.totalExcl)}</span>
                                            </div>
                                            {summary.vatAmount > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#57d9a3' }}>
                                                    <span>{t('Total (incl. VAT)')}:</span>
                                                    <span>{fmtCurrency(summary.totalIncl)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Technician */}
                                    <div style={sectionBox}>
                                        <div style={SL}><i className="bi bi-person-gear"></i>{t('Technician')}</div>
                                        <SearchDropdown
                                            value={techSearch}
                                            onChange={onTechSearchChange}
                                            onSelect={onTechSelect}
                                            placeholder={t('Search technician...')}
                                            options={techOptions}
                                            loading={techLoading}
                                            getKey={(e, i) => e.id || i}
                                            renderOption={e => <span><strong>{e.name}</strong>{e.position && <span style={{ color: '#5e6c84', fontSize: 11 }}> — {e.position}</span>}</span>}
                                        />
                                    </div>

                                    {/* Dates */}
                                    <div style={sectionBox}>
                                        <div style={SL}><i className="bi bi-calendar3"></i>{t('Dates')}</div>
                                        <div style={{ marginBottom: 10 }}>
                                            <label style={{ fontSize: 11, color: '#5e6c84', display: 'block', marginBottom: 3 }}>{t('Job Date')}</label>
                                            <input
                                                type="date"
                                                key={`date-${job.id}`}
                                                defaultValue={fmtDate(job.date)}
                                                onBlur={e => { const iso = toISOSafe(e.target.value); if (iso) saveJobFields({ date: iso }); }}
                                                style={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 11, color: '#5e6c84', display: 'block', marginBottom: 3 }}>{t('Est. Delivery')}</label>
                                            <input
                                                type="date"
                                                key={`estdel-${job.id}`}
                                                defaultValue={fmtDate(job.estimated_delivery)}
                                                onBlur={e => { const iso = toISOSafe(e.target.value); saveJobFields({ estimated_delivery: iso || null }); }}
                                                style={inputCls}
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </>
                    )}

                    {/* Close button */}
                    <button
                        type="button"
                        onClick={handleClose}
                        style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.08)', border: 'none', color: '#5e6c84', borderRadius: 50, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>
        </>
    );
});

export default RepairJobCardView;
