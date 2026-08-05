import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from 'react-i18next';
import { Spinner, OverlayTrigger, Tooltip, Dropdown } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';
import { highlightWords } from '../utils/search.js';
import CustomerCreate from '../customer/create.js';
import CustomerHistoryModal from '../customer/history_modal.js';
import Customers from '../utils/customers.js';
import VehicleCreate from '../vehicle/create.js';
import VehicleView from '../vehicle/view.js';
import EmployeeCreate from '../employee/create.js';

import { loadKanbanLists, loadCardMap, saveCardMap, statusToDefaultListId } from './kanban_utils.js';
export { loadKanbanLists, loadCardMap, saveCardMap, statusToDefaultListId } from './kanban_utils.js';


const CUST_COLS = [
    { key: 'name', label: 'Name', w: '36%' },
    { key: 'code', label: 'Code', w: '13%' },
    { key: 'phone', label: 'Phone', w: '21%' },
    { key: 'vat_no', label: 'VAT No.', w: '18%' },
    { key: 'credit_balance', label: 'Balance', w: '12%' },
];

function fmtCurrency(val) { const n = parseFloat(val); return isNaN(n) ? '0.00' : n.toFixed(2); }
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

const RepairJobCardView = forwardRef(({ onFullEdit, onKanbanListChange, onJobUpdated, showToastMessage, onCreateSalesInvoice, onCreateQuotation, onCreateNonVatInvoice, onOpenSalesInvoice, onOpenQuotation, onOpenNonVatInvoice, openUpdateProductForm }, ref) => {
    const { t } = useTranslation('common');
    const [show, setShow] = useState(false);
    const [panelZIndex, setPanelZIndex] = useState(1049);
    const cardStack = useRef([]);
    const [isLoading, setIsLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');

    const [job, setJob] = useState({});
    const jobRef = useRef({});

    const [showHeaderCreateDD, setShowHeaderCreateDD] = useState(false);
    const headerCreateRef = useRef();
    useEffect(() => {
        if (!showHeaderCreateDD) return;
        function handleOutside(e) {
            if (headerCreateRef.current && !headerCreateRef.current.contains(e.target)) {
                setShowHeaderCreateDD(false);
            }
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [showHeaderCreateDD]);
    const [lineDiscountStaging, setLineDiscountStaging] = useState({});

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

    // Customer create / browse / history refs
    const customerCreateRef = useRef();
    const customersRef = useRef();
    const customerHistoryRef = useRef();

    // Vehicle history ref
    const vehicleViewRef = useRef();

    // History dropdown auto-close (4s after mouse leave)
    const [showCustomerHistoryDD, setShowCustomerHistoryDD] = useState(false);
    const [showVehicleHistoryDD, setShowVehicleHistoryDD] = useState(false);
    const customerHistoryDDTimer = useRef();
    const vehicleHistoryDDTimer = useRef();

    // Customer browse modal
    const [showCustomerListModal, setShowCustomerListModal] = useState(false);
    const [customerListItems, setCustomerListItems] = useState([]);
    const [customerListLoading, setCustomerListLoading] = useState(false);
    const [customerListSearch, setCustomerListSearch] = useState('');
    const customerListDebounce = useRef();

    // Vehicle create / browse
    const vehicleCreateRef = useRef();
    const editingVehicleIdRef = useRef(null);
    const [showVehicleListModal, setShowVehicleListModal] = useState(false);
    const [vehicleListForModal, setVehicleListForModal] = useState([]);
    const [vehicleListModalLoading, setVehicleListModalLoading] = useState(false);
    const [vehicleListSearch, setVehicleListSearch] = useState('');
    const vehicleListDebounce = useRef();

    // Technicians (multi)
    const [technicians, setTechnicians] = useState([]); // [{id, name}]
    const [techSearch, setTechSearch] = useState('');
    const [techOptions, setTechOptions] = useState([]);
    const [techLoading, setTechLoading] = useState(false);
    const techDebounce = useRef();
    const employeeCreateRef = useRef();
    const [showTechList, setShowTechList] = useState(false);
    const [techListItems, setTechListItems] = useState([]);
    const [techListSearch, setTechListSearch] = useState('');

    // Labour charge — local state so summary updates on every keystroke
    const [labourInput, setLabourInput] = useState(0);
    useEffect(() => { setLabourInput(job.labour_charge ?? 0); }, [job.labour_charge]);

    const [vatPercent, setVatPercent] = useState(0);
    useEffect(() => {
        const storeId = localStorage.getItem('store_id');
        const token = localStorage.getItem('access_token');
        if (!storeId) return;
        fetch(`/v1/store/${storeId}?select=vat_percent`, { headers: { Authorization: token } })
            .then(r => r.json())
            .then(d => { if (d.result?.vat_percent != null) { const vp = parseFloat(d.result.vat_percent) || 0; setVatPercent(vp); jobRef.current = { ...jobRef.current, vat_percent: vp }; } })
            .catch(() => {});
    }, []);

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

    function openCard(jobId, zIdx) {
        if (show && jobRef.current?.id) {
            cardStack.current.push({ jobId: jobRef.current.id, zIdx: panelZIndex });
        }
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
        setPanelZIndex(zIdx || 1049);
        fetchJob(jobId);
        setShow(true);
    }

    useImperativeHandle(ref, () => ({
        open(jobId, zIdx) { openCard(jobId, zIdx); },
        updateCardMap(jobId, listId) {
            setCardMap(prev => ({ ...prev, [jobId]: listId }));
        }
    }));

    function handleClose() {
        if (cardStack.current.length > 0) {
            const prev = cardStack.current.pop();
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
            setPanelZIndex(prev.zIdx);
            fetchJob(prev.jobId);
        } else {
            setShow(false);
            setJob({});
            jobRef.current = {};
            setPanelZIndex(1049);
            cardStack.current = [];
        }
    }

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
                    const initDisc = {};
                    (j.parts || []).forEach((part, idx) => {
                        if (part.unit_discount_with_vat) {
                            initDisc[idx] = parseFloat(((part.unit_discount_with_vat || 0) * (part.qty || 0)).toFixed(2));
                        }
                    });
                    setLineDiscountStaging(initDisc);
                    lineDiscountStagingRef.current = { ...initDisc };
                    setTitleValue(j.title || '');
                    setTechSearch('');
                    if (j.technician_ids?.length) {
                        setTechnicians(j.technician_ids.map((id, i) => ({ id, name: (j.technician_names || [])[i] || '' })));
                    } else if (j.technician_id) {
                        setTechnicians([{ id: j.technician_id, name: j.technician_name || '' }]);
                    } else {
                        setTechnicians([]);
                    }
                    if (j.customer_id) fetchCustomerById(j.customer_id);
                    else fetchAndSetUnknownCustomer();
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
    const lineTotalTimerRef = useRef();
    const lineTotalStagingRef = useRef({});
    const lineDiscountStagingRef = useRef({});

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
        suggestVehicles('', customerId);
    }

    async function fetchAndSetUnknownCustomer() {
        const storeId = localStorage.getItem('store_id');
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`/v1/customer?select=id,name,code,phone,vat_no,credit_balance&search[name]=UNKNOWN&search[store_id]=${storeId}&limit=1`, {
                headers: { Authorization: token }
            });
            const d = await res.json();
            const c = d.result?.[0];
            if (c) {
                setSelectedCustomers([{ ...c, label: c.name || 'UNKNOWN' }]);
                saveJobFields({ customer_id: c.id, customer_name: c.name || 'UNKNOWN' });
            } else {
                saveJobFields({ customer_id: null, customer_name: '' });
            }
        } catch (e) {
            saveJobFields({ customer_id: null, customer_name: '' });
        }
    }

    function clearCustomer() {
        setSelectedCustomers([]);
        setCustomerOptions([]);
        setSelectedVehicles([]);
        setVehicleOptions([]);
        vehicleSearchRef.current?.clear();
        customerSearchRef.current?.clear();
        saveJobFields({ customer_id: null, customer_name: '', vehicle_id: null, vehicle_number: '', brand: '', model: '' });
    }

    // ── Vehicle ──
    async function suggestVehicles(searchTerm, customerIdFilter) {
        setVehicleOptions([]);
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

    async function openVehicleListModal() {
        setShowVehicleListModal(true);
        setVehicleListSearch('');
        setVehicleListForModal([]);
        await fetchVehicleListForModal('', selectedCustomers[0]?.id || null);
    }

    async function fetchVehicleListForModal(term, customerId) {
        setVehicleListModalLoading(true);
        const params = {};
        if (term) params.search = term;
        if (customerId) params.customer_id = customerId;
        const storeId = localStorage.getItem('store_id');
        if (storeId) params.store_id = storeId;
        const qp = ObjectToSearchQueryParams(params);
        try {
            const res = await fetch(`/v1/vehicle?select=id,vehicle_number,brand,model,year,chassis_number,istimara_no,customer_name,customer_id&${qp}&limit=100`, {
                headers: { Authorization: localStorage.getItem('access_token') }
            });
            const d = await res.json();
            setVehicleListForModal(d.result || []);
        } catch (e) {}
        setVehicleListModalLoading(false);
    }

    function selectVehicleFromModal(v) {
        const vehicleLabel = `${v.vehicle_number || ''} - ${v.brand || ''} ${v.model || ''}`;
        setSelectedVehicles([{ ...v, label: vehicleLabel }]);
        const fields = { vehicle_id: v.id, vehicle_number: v.vehicle_number || '', brand: v.brand || '', model: v.model || '' };
        if (v.customer_id && !selectedCustomers[0]?.id) {
            fields.customer_id = v.customer_id;
            fields.customer_name = v.customer_name || '';
            fetchCustomerById(v.customer_id);
        }
        saveJobFields(fields);
        setShowVehicleListModal(false);
    }

    // ── Customer browse modal ──
    async function openCustomerListModal() {
        setCustomerListSearch('');
        setCustomerListItems([]);
        setShowCustomerListModal(true);
        fetchCustomerListForModal('');
    }

    async function fetchCustomerListForModal(term) {
        setCustomerListLoading(true);
        const storeId = localStorage.getItem('store_id') || '';
        const token = localStorage.getItem('access_token');
        const params = { select: 'id,name,code,phone,vat_no', limit: 100 };
        if (storeId) params['search[store_id]'] = storeId;
        if (term) params['search[name]'] = term;
        const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
        try {
            const res = await fetch(`/v1/customer?${qs}`, {
                headers: { 'Content-Type': 'application/json', Authorization: token },
            });
            const data = await res.json();
            setCustomerListItems(data?.result || []);
        } catch (_) { setCustomerListItems([]); }
        setCustomerListLoading(false);
    }

    function selectCustomerFromModal(c) {
        setSelectedCustomers([{ ...c, label: c.name || '' }]);
        saveJobFields({ customer_id: c.id, customer_name: c.name || '' });
        suggestVehicles('', c.id);
        setShowCustomerListModal(false);
    }

    // ── Technicians (multi) ──
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
        setTechSearch('');
        setTechOptions([]);
        if (technicians.some(t => t.id === emp.id)) return;
        const updated = [...technicians, { id: emp.id, name: emp.name }];
        setTechnicians(updated);
        saveJobFields({
            technician_id: emp.id,
            technician_name: emp.name,
            technician_ids: updated.map(t => t.id),
            technician_names: updated.map(t => t.name),
        });
    }
    function removeTechnician(id) {
        const updated = technicians.filter(t => t.id !== id);
        setTechnicians(updated);
        const first = updated[0];
        saveJobFields({
            technician_id: first?.id || null,
            technician_name: first?.name || '',
            technician_ids: updated.map(t => t.id),
            technician_names: updated.map(t => t.name),
        });
    }

    async function openTechList() {
        const storeId = localStorage.getItem('store_id') || '';
        const qp = storeId ? `search[store_id]=${storeId}&` : '';
        try {
            const res = await fetch(`/v1/employee?${qp}select=id,name,position&limit=200`, {
                headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('access_token') },
            });
            const data = await res.json();
            setTechListItems(data?.result || []);
        } catch (_) { setTechListItems([]); }
        setTechListSearch('');
        setShowTechList(true);
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
            ? `,product_stores.${storeId}.purchase_unit_price,product_stores.${storeId}.retail_unit_price,product_stores.${storeId}.retail_unit_price_with_vat,product_stores.${storeId}.stock,product_stores.${storeId}.warehouse_stocks`
            : '';
        try {
            const res = await fetch(`/v1/product?select=id,name,is_service,item_code,part_number${psFields}${qs}&limit=20`, {
                headers: { Authorization: localStorage.getItem('access_token') }
            });
            const d = await res.json();
            const mapped = (d.result || []).map(p => {
                const ps = (storeId && p.product_stores?.[storeId]) || {};
                const excl = ps.retail_unit_price ?? p.price ?? 0;
                const incl = ps.retail_unit_price_with_vat ?? p.unit_price_with_vat ?? excl;
                return { ...p, retail_price: excl, retail_price_with_vat: incl, purchase_unit_price: ps.purchase_unit_price ?? 0, stock: ps.stock ?? 0, warehouse_stocks: ps.warehouse_stocks ?? {} };
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
        const vatMul = 1 + (vatPercent / 100);
        const excl = parseFloat(product.retail_price || 0);
        const storedIncl = parseFloat(product.retail_price_with_vat || 0);
        const incl = storedIncl > excl ? storedIncl : parseFloat((excl * vatMul).toFixed(2));
        const newPart = {
            product_id: product.id,
            item_code: product.item_code || '',
            part_number: product.part_number || '',
            name: product.name,
            qty: 1,
            purchase_unit_price: parseFloat(product.purchase_unit_price || 0),
            stock: parseFloat(product.stock || 0),
            warehouse_stocks: product.warehouse_stocks || {},
            unit_price: excl,
            unit_price_with_vat: incl,
            total_price: excl,
            total_price_with_vat: incl,
        };
        saveJobFields({ parts: [...currentParts, newPart] });
    }
    function removePartByProductId(productId) {
        const parts = (jobRef.current.parts || []).filter(p => p.product_id !== productId);
        saveJobFields({ parts });
    }

    function updatePart(index, field, value) {
        const vatMul = 1 + (vatPercent / 100);
        const parts = (jobRef.current.parts || []).map((p, i) => {
            if (i !== index) return p;
            const updated = { ...p, [field]: value };
            if (field === 'unit_price') {
                updated.unit_price_with_vat = parseFloat((parseFloat(value || 0) * vatMul).toFixed(2));
                updated.total_price = parseFloat(updated.qty || 0) * (parseFloat(updated.unit_price || 0) - parseFloat(updated.unit_discount || 0));
                updated.total_price_with_vat = parseFloat(updated.qty || 0) * (parseFloat(updated.unit_price_with_vat || 0) - parseFloat(updated.unit_discount_with_vat || 0));
            } else if (field === 'qty') {
                updated.total_price = parseFloat(updated.qty || 0) * (parseFloat(updated.unit_price || 0) - parseFloat(updated.unit_discount || 0));
                updated.total_price_with_vat = parseFloat(updated.qty || 0) * (parseFloat(updated.unit_price_with_vat || 0) - parseFloat(updated.unit_discount_with_vat || 0));
            } else if (field === 'unit_price_with_vat') {
                updated.unit_price = parseFloat((parseFloat(value || 0) / vatMul).toFixed(4));
                updated.total_price = parseFloat(updated.qty || 0) * (parseFloat(updated.unit_price || 0) - parseFloat(updated.unit_discount || 0));
                updated.total_price_with_vat = parseFloat(updated.qty || 0) * (parseFloat(updated.unit_price_with_vat || 0) - parseFloat(updated.unit_discount_with_vat || 0));
            } else if (field === 'line_discount_with_vat') {
                const qty = parseFloat(updated.qty || 0) || 1;
                const numVal = parseFloat(value || 0) || 0;
                updated.unit_discount_with_vat = parseFloat((numVal / qty).toFixed(8));
                updated.unit_discount = parseFloat((updated.unit_discount_with_vat / vatMul).toFixed(8));
                // updated.line_discount_with_vat is already set to value (raw string or number) via the spread above
                updated.total_price = parseFloat(p.qty || 0) * (parseFloat(p.unit_price || 0) - updated.unit_discount);
                updated.total_price_with_vat = parseFloat(p.qty || 0) * (parseFloat(p.unit_price_with_vat || 0) - updated.unit_discount_with_vat);
            } else if (field === 'total_price_with_vat') {
                const qty = parseFloat(updated.qty || 0) || 1;
                updated.unit_price_with_vat = parseFloat(((parseFloat(value || 0) / qty) + parseFloat(updated.unit_discount_with_vat || 0)).toFixed(4));
                updated.unit_price = parseFloat((updated.unit_price_with_vat / vatMul).toFixed(4));
                updated.total_price = parseFloat((qty * (updated.unit_price - parseFloat(updated.unit_discount || 0))).toFixed(2));
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
        const vatMul = 1 + (vatPercent / 100);
        let partsExcl = 0, partsIncl = 0;
        parts.forEach(p => {
            const excl = parseFloat(p.total_price || 0);
            const storedIncl = parseFloat(p.total_price_with_vat || 0);
            const incl = storedIncl > excl ? storedIncl : parseFloat((excl * vatMul).toFixed(2));
            partsExcl += excl;
            partsIncl += incl;
        });
        const labour = parseFloat(labourInput || 0);
        const labourExcl = vatMul > 1 ? parseFloat((labour / vatMul).toFixed(2)) : labour;
        const subtotal = parseFloat((partsExcl + labourExcl).toFixed(2));
        const vatAmount = parseFloat((subtotal * vatPercent / 100).toFixed(2));
        const totalIncl = parseFloat((subtotal + vatAmount).toFixed(2));
        return { partsExcl, partsIncl, labour, labourExcl, subtotal, vatAmount, totalIncl };
    }

    const currentListId = cardMap[job.id] || statusToDefaultListId(job.status);
    const currentList = kanbanLists.find(l => l.id === currentListId);
    const summary = computeSummary();

    const SL = { fontSize: 11, fontWeight: 700, color: '#5e6c84', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 };
    const inputCls = { width: '100%', border: '1px solid #dfe1e6', borderRadius: 5, padding: '7px 10px', fontSize: 13, outline: 'none', background: '#fff', color: '#172b4d', fontFamily: 'inherit' };
    const sectionBox = { background: '#fff', borderRadius: 7, padding: '13px 15px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: 10 };

    return createPortal(
        <>
            <style>{`
                .rj-card-body { display: flex; gap: 12px; padding: 12px 14px 18px; flex-wrap: wrap; }
                .rj-main { flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; }
                .rj-sidebar { flex: 0 0 280px; display: flex; flex-direction: column; gap: 10px; }
                @media (max-width: 640px) {
                    .rj-sidebar { flex: 1 1 100%; }
                    .rj-main { flex: 1 1 100%; }
                    .rj-card-body { padding: 10px 10px 14px; gap: 8px; }
                }
                .rbt-input-main { height: 34px !important; padding: 6px 10px !important; font-size: 13px !important; border-color: #dfe1e6 !important; }
                .rj-create-toggle::after { display: none !important; }
                .rj-create-item:hover { background: #f4f5f7 !important; }
            `}</style>

            {/* Backdrop + Card panel (only when open) */}
            {show && <div
                onClick={handleClose}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: panelZIndex, overflowY: 'auto', padding: isMobile ? '0' : '24px 12px' }}
            >
                {/* Card */}
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: '#f4f5f7', borderRadius: isMobile ? 0 : 10,
                        width: '100%', maxWidth: 1200, margin: '0 auto',
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

                                {/* ── Header: Cost Summary + Create ── */}
                                {job.id && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.1)', flexWrap: 'wrap' }}>
                                        {/* Summary pills */}
                                        <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                            {!isMobile && [
                                                { label: t('Parts (excl.)'), val: summary.partsExcl },
                                                { label: t('Labour (excl.)'), val: summary.labourExcl },
                                                { label: `VAT ${vatPercent}%`, val: summary.vatAmount },
                                            ].map(item => (
                                                <div key={item.label} style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 7, padding: '5px 12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 80 }}>
                                                    <span style={{ fontSize: 9, fontWeight: 700, color: '#5e6c84', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 1 }}>{item.label}</span>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#172b4d', fontFamily: 'monospace' }}>{fmtCurrency(item.val)}</span>
                                                </div>
                                            ))}
                                            {/* Total — always visible */}
                                            <div style={{ background: '#172b4d', borderRadius: 8, padding: '6px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', boxShadow: '0 2px 8px rgba(23,43,77,0.25)' }}>
                                                <span style={{ fontSize: 9, fontWeight: 700, color: '#8db4e2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 1 }}>{t('Total (incl. VAT)')}</span>
                                                <span style={{ fontSize: 17, fontWeight: 900, color: '#57d9a3', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>{fmtCurrency(summary.totalIncl)}</span>
                                            </div>
                                        </div>

                                        {/* Create dropdown — custom (Bootstrap Dropdown won't close inside portal due to stopPropagation) */}
                                        {(onCreateSalesInvoice || onCreateQuotation || onCreateNonVatInvoice) && (() => {
                                            const disabled = summary.totalIncl === 0;
                                            return (
                                                <div ref={headerCreateRef} style={{ position: 'relative', flexShrink: 0 }}>
                                                    <button
                                                        disabled={disabled}
                                                        onClick={() => { if (!disabled) setShowHeaderCreateDD(v => !v); }}
                                                        style={{
                                                            background: disabled ? '#dfe1e6' : 'linear-gradient(135deg,#0065ff,#0052cc)',
                                                            color: disabled ? '#8993a4' : '#fff',
                                                            border: 'none', borderRadius: 7,
                                                            padding: '9px 20px', fontSize: 13, fontWeight: 700,
                                                            cursor: disabled ? 'not-allowed' : 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: 7,
                                                            whiteSpace: 'nowrap',
                                                            boxShadow: disabled ? 'none' : '0 2px 10px rgba(0,82,204,0.35)',
                                                            letterSpacing: '0.02em',
                                                        }}
                                                    >
                                                        <i className="bi bi-plus-lg" style={{ fontSize: 14 }}></i>
                                                        {t('Create')}
                                                        <i className="bi bi-chevron-down" style={{ fontSize: 10, opacity: 0.8 }}></i>
                                                    </button>
                                                    {showHeaderCreateDD && (
                                                        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 5px)', zIndex: 9999, minWidth: 230, background: '#fff', boxShadow: '0 8px 28px rgba(0,0,0,0.18)', border: '1px solid #e0e4ef', borderRadius: 9, padding: '6px 0' }}>
                                                            <div style={{ padding: '6px 14px 8px', borderBottom: '1px solid #f0f1f5', marginBottom: 4 }}>
                                                                <span style={{ fontSize: 10, fontWeight: 700, color: '#8993a4', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{t('Create Document')}</span>
                                                            </div>
                                                            {onCreateSalesInvoice && (
                                                                job.order_id ? (
                                                                    <div className="rj-create-item"
                                                                        onMouseDown={() => { setShowHeaderCreateDD(false); setShow(false); onOpenSalesInvoice?.(job.order_id); }}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}
                                                                    >
                                                                        <div style={{ width: 32, height: 32, borderRadius: 7, background: '#e3fcef', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                            <i className="bi bi-check-circle-fill" style={{ color: '#006644', fontSize: 15 }}></i>
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontWeight: 700, color: '#172b4d', fontSize: 12, lineHeight: 1.3 }}>{t('Sales Invoice')}</div>
                                                                            <div style={{ fontSize: 10, color: '#006644', fontWeight: 600 }}>{job.order_code} · {t('Open')}</div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="rj-create-item"
                                                                        onMouseDown={() => { setShowHeaderCreateDD(false); setShow(false); onCreateSalesInvoice(job); }}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}
                                                                    >
                                                                        <div style={{ width: 32, height: 32, borderRadius: 7, background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                            <i className="bi bi-receipt" style={{ color: '#004ac6', fontSize: 15 }}></i>
                                                                        </div>
                                                                        <div style={{ fontWeight: 600, color: '#172b4d', fontSize: 13 }}>{t('Sales Invoice')}</div>
                                                                    </div>
                                                                )
                                                            )}
                                                            {onCreateQuotation && (
                                                                job.quotation_id ? (
                                                                    <div className="rj-create-item"
                                                                        onMouseDown={() => { setShowHeaderCreateDD(false); setShow(false); onOpenQuotation?.(job.quotation_id); }}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}
                                                                    >
                                                                        <div style={{ width: 32, height: 32, borderRadius: 7, background: '#fffae6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                            <i className="bi bi-check-circle-fill" style={{ color: '#974f0c', fontSize: 15 }}></i>
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontWeight: 700, color: '#172b4d', fontSize: 12, lineHeight: 1.3 }}>{t('Quotation')}</div>
                                                                            <div style={{ fontSize: 10, color: '#974f0c', fontWeight: 600 }}>{job.quotation_code} · {t('Open')}</div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="rj-create-item"
                                                                        onMouseDown={() => { setShowHeaderCreateDD(false); setShow(false); onCreateQuotation(job); }}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}
                                                                    >
                                                                        <div style={{ width: 32, height: 32, borderRadius: 7, background: '#fff8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                            <i className="bi bi-file-earmark-text" style={{ color: '#974f0c', fontSize: 15 }}></i>
                                                                        </div>
                                                                        <div style={{ fontWeight: 600, color: '#172b4d', fontSize: 13 }}>{t('Quotation')}</div>
                                                                    </div>
                                                                )
                                                            )}
                                                            {onCreateNonVatInvoice && (
                                                                job.non_vat_sales_id ? (
                                                                    <div className="rj-create-item"
                                                                        onMouseDown={() => { setShowHeaderCreateDD(false); setShow(false); onOpenNonVatInvoice?.(job.non_vat_sales_id); }}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}
                                                                    >
                                                                        <div style={{ width: 32, height: 32, borderRadius: 7, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                            <i className="bi bi-check-circle-fill" style={{ color: '#6b21a8', fontSize: 15 }}></i>
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontWeight: 700, color: '#172b4d', fontSize: 12, lineHeight: 1.3 }}>{t('Non-VAT Invoice')}</div>
                                                                            <div style={{ fontSize: 10, color: '#6b21a8', fontWeight: 600 }}>{job.non_vat_sales_code} · {t('Open')}</div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="rj-create-item"
                                                                        onMouseDown={() => { setShowHeaderCreateDD(false); setShow(false); onCreateNonVatInvoice(job); }}
                                                                        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}
                                                                    >
                                                                        <div style={{ width: 32, height: 32, borderRadius: 7, background: '#f5f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                            <i className="bi bi-receipt-cutoff" style={{ color: '#6b21a8', fontSize: 15 }}></i>
                                                                        </div>
                                                                        <div style={{ fontWeight: 600, color: '#172b4d', fontSize: 13 }}>{t('Non-VAT Invoice')}</div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Body */}
                            <div className="rj-card-body">

                                {/* === LEFT MAIN === */}
                                <div className="rj-main">

                                    {/* Customer */}
                                    <div style={sectionBox}>
                                        <div style={{ ...SL, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span><i className="bi bi-person-vcard"></i>{t('Customer')}</span>
                                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                {selectedCustomers.length > 0 && (
                                                    <button type="button" onClick={clearCustomer} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '0 2px', fontSize: 13, lineHeight: 1 }} title={t('Clear customer')}>
                                                        <i className="bi bi-x-circle"></i>
                                                    </button>
                                                )}
                                                {selectedCustomers.length > 0 && (
                                                    <button type="button" onClick={() => customerCreateRef.current?.open(selectedCustomers[0]?.id, (saved) => {
                                                        if (!saved) return;
                                                        const updated = { id: saved.id, name: saved.name, label: saved.name, code: saved.code, phone: saved.phone, vat_no: saved.vat_no, credit_balance: saved.credit_balance };
                                                        setSelectedCustomers([updated]);
                                                        saveJobFields({ customer_id: saved.id, customer_name: saved.name || '' });
                                                    })} style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', color: '#0052cc', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', lineHeight: '18px' }} title={t('Edit customer')}>
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                )}
                                                {selectedCustomers.length > 0 && (
                                                    <div
                                                        onMouseEnter={() => clearTimeout(customerHistoryDDTimer.current)}
                                                        onMouseLeave={() => { customerHistoryDDTimer.current = setTimeout(() => setShowCustomerHistoryDD(false), 300); }}
                                                    >
                                                        <Dropdown align="end" show={showCustomerHistoryDD} onToggle={v => { clearTimeout(customerHistoryDDTimer.current); setShowCustomerHistoryDD(v); }}>
                                                            <Dropdown.Toggle variant="outline-secondary" size="sm" style={{ padding: '2px 8px', fontSize: 11, lineHeight: '18px', border: '1px solid #c7d2fe', color: '#0052cc', background: '#f0f4ff' }} title={t('History')}>
                                                                <i className="bi bi-clock-history"></i>
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu style={{ minWidth: 230, zIndex: 9999 }}>
                                                                <Dropdown.Item onClick={() => { setShowCustomerHistoryDD(false); customerHistoryRef.current?.open(selectedCustomers[0]?.id, 'repairs'); }}>
                                                                    <i className="bi bi-tools me-2 text-warning"></i>{t('Repair History')}
                                                                </Dropdown.Item>
                                                                <Dropdown.Item onClick={() => { setShowCustomerHistoryDD(false); customerHistoryRef.current?.open(selectedCustomers[0]?.id, 'vehicles'); }}>
                                                                    <i className="bi bi-car-front me-2 text-secondary"></i>{t('Vehicle History')}
                                                                </Dropdown.Item>
                                                                <Dropdown.Divider />
                                                                <Dropdown.Item onClick={() => { setShowCustomerHistoryDD(false); customerHistoryRef.current?.open(selectedCustomers[0]?.id, 'sales'); }}>
                                                                    <i className="bi bi-receipt me-2 text-success"></i>{t('Sales History')}
                                                                </Dropdown.Item>
                                                                <Dropdown.Item onClick={() => { setShowCustomerHistoryDD(false); customerHistoryRef.current?.open(selectedCustomers[0]?.id, 'sales_returns'); }}>
                                                                    <i className="bi bi-receipt-cutoff me-2 text-warning"></i>{t('Sales Return History')}
                                                                </Dropdown.Item>
                                                                <Dropdown.Divider />
                                                                <Dropdown.Item onClick={() => { setShowCustomerHistoryDD(false); customerHistoryRef.current?.open(selectedCustomers[0]?.id, 'quotations'); }}>
                                                                    <i className="bi bi-file-earmark-text me-2 text-info"></i>{t('Quotation History')}
                                                                </Dropdown.Item>
                                                                <Dropdown.Divider />
                                                                <Dropdown.Item onClick={() => { setShowCustomerHistoryDD(false); customerHistoryRef.current?.open(selectedCustomers[0]?.id, 'non_vat_sales'); }}>
                                                                    <i className="bi bi-file-earmark-minus me-2" style={{ color: '#6b21a8' }}></i>{t('Non VAT Sales History')}
                                                                </Dropdown.Item>
                                                                <Dropdown.Item onClick={() => { setShowCustomerHistoryDD(false); customerHistoryRef.current?.open(selectedCustomers[0]?.id, 'non_vat_sales_returns'); }}>
                                                                    <i className="bi bi-arrow-return-left me-2" style={{ color: '#9d174d' }}></i>{t('Non VAT Return History')}
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </div>
                                                )}
                                                <button type="button" onClick={() => customerCreateRef.current?.open()} style={{ background: '#0052cc', border: 'none', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', lineHeight: '18px' }} title={t('Add new customer')}>
                                                    <i className="bi bi-plus-lg"></i>
                                                </button>
                                                <button type="button" onClick={openCustomerListModal} style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', color: '#0052cc', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', lineHeight: '18px' }} title={t('Browse customers')}>
                                                    <i className="bi bi-list"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <Typeahead
                                            id="cv-customer"
                                            labelKey="label"
                                            filterBy={() => true}
                                            minLength={1}
                                            emptyLabel=""
                                            positionFixed
                                            open={customerOptions.length === 0 ? false : undefined}
                                            onChange={(selectedItems) => {
                                                if (selectedItems.length === 0) {
                                                    clearCustomer();
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
                                            onInputChange={(searchTerm) => {
                                                if (!searchTerm) {
                                                    setSelectedCustomers([]);
                                                    setCustomerOptions([]);
                                                    return;
                                                }
                                                if (selectedCustomers.length > 0 && searchTerm === selectedCustomers[0]?.label) return;
                                                suggestCustomers(searchTerm);
                                            }}
                                            ref={customerSearchRef}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') { clearCustomer(); }
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
                                                    <Menu {...menuProps} style={{ ...(menuProps.style || {}), minWidth: 'min(95vw, 680px)', zIndex: 9999, padding: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
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
                                        <div style={{ ...SL, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span><i className="bi bi-car-front"></i>{t('Vehicle')}</span>
                                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                {selectedVehicles.length > 0 && (
                                                    <button type="button" onClick={() => { setSelectedVehicles([]); vehicleSearchRef.current?.clear(); saveJobFields({ vehicle_id: null, vehicle_number: '', brand: '', model: '' }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '0 2px', fontSize: 13, lineHeight: 1 }} title={t('Clear vehicle')}>
                                                        <i className="bi bi-x-circle"></i>
                                                    </button>
                                                )}
                                                {selectedVehicles.length > 0 && (
                                                    <button type="button" onClick={() => {
                                                        editingVehicleIdRef.current = selectedVehicles[0]?.id;
                                                        vehicleCreateRef.current?.open(selectedVehicles[0]?.id);
                                                    }} style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', color: '#0052cc', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', lineHeight: '18px' }} title={t('Edit vehicle')}>
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                )}
                                                {selectedVehicles.length > 0 && (
                                                    <div
                                                        onMouseEnter={() => clearTimeout(vehicleHistoryDDTimer.current)}
                                                        onMouseLeave={() => { vehicleHistoryDDTimer.current = setTimeout(() => setShowVehicleHistoryDD(false), 300); }}
                                                    >
                                                        <Dropdown align="end" show={showVehicleHistoryDD} onToggle={v => { clearTimeout(vehicleHistoryDDTimer.current); setShowVehicleHistoryDD(v); }}>
                                                            <Dropdown.Toggle variant="outline-secondary" size="sm" style={{ padding: '2px 8px', fontSize: 11, lineHeight: '18px', border: '1px solid #c7d2fe', color: '#0052cc', background: '#f0f4ff' }} title={t('History')}>
                                                                <i className="bi bi-clock-history"></i>
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu style={{ minWidth: 200, zIndex: 9999 }}>
                                                                <Dropdown.Item onClick={() => { setShowVehicleHistoryDD(false); vehicleViewRef.current?.open(selectedVehicles[0]?.id, 'repairs'); }}>
                                                                    <i className="bi bi-wrench me-2 text-danger"></i>{t('Repair History')}
                                                                </Dropdown.Item>
                                                                <Dropdown.Divider />
                                                                <Dropdown.Item onClick={() => { setShowVehicleHistoryDD(false); vehicleViewRef.current?.open(selectedVehicles[0]?.id, 'sales'); }}>
                                                                    <i className="bi bi-receipt me-2 text-success"></i>{t('Sales History')}
                                                                </Dropdown.Item>
                                                                <Dropdown.Item onClick={() => { setShowVehicleHistoryDD(false); vehicleViewRef.current?.open(selectedVehicles[0]?.id, 'quotations'); }}>
                                                                    <i className="bi bi-file-earmark-text me-2 text-info"></i>{t('Quotation History')}
                                                                </Dropdown.Item>
                                                                <Dropdown.Divider />
                                                                <Dropdown.Item onClick={() => { setShowVehicleHistoryDD(false); vehicleViewRef.current?.open(selectedVehicles[0]?.id, 'trello'); }}>
                                                                    <i className="bi bi-kanban me-2" style={{ color: '#0052cc' }}></i>{t('Repair Job Board')}
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </div>
                                                )}
                                                <button type="button" onClick={() => vehicleCreateRef.current?.open(undefined, selectedCustomers[0]?.id, selectedCustomers[0] ? { name: selectedCustomers[0].name } : undefined)} style={{ background: '#0052cc', border: 'none', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', lineHeight: '18px' }} title={t('Add new vehicle')}>
                                                    <i className="bi bi-plus-lg"></i>
                                                </button>
                                                <button type="button" onClick={openVehicleListModal} style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', color: '#0052cc', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', lineHeight: '18px' }} title={t('Browse vehicles')}>
                                                    <i className="bi bi-list"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <Typeahead
                                            id="cv-vehicle"
                                            labelKey="label"
                                            filterBy={() => true}
                                            minLength={selectedCustomers.length > 0 ? 0 : 1}
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
                                                if (v.customer_id && !selectedCustomers[0]?.id) {
                                                    fields.customer_id = v.customer_id;
                                                    fields.customer_name = v.customer_name || '';
                                                    setSelectedCustomers([{ id: v.customer_id, name: v.customer_name || '', label: v.customer_name || '' }]);
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
                                                    <Menu {...menuProps} style={{ ...(menuProps.style || {}), zIndex: 9999, padding: 0 }}>
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
                                                                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                if (checked) { removePartByProductId(option.id); } else { addPart(option); }
                                                                                setOpenProductSearch(true);
                                                                            }}
                                                                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: checked ? '#e8f0fe' : (idx % 2 === 0 ? '#fff' : '#f8fafc'), cursor: 'pointer', borderBottom: '1px solid #e5e7eb' }}
                                                                        >
                                                                            <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${checked ? '#004ac6' : '#94a3b8'}`, background: checked ? '#004ac6' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                                {checked && <i className="bi bi-check" style={{ color: '#fff', fontSize: 12 }}></i>}
                                                                            </div>
                                                                            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                                                                <div style={{ fontWeight: checked ? 700 : 500, fontSize: 13, color: '#191c1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{highlightWords(option.name, searchWords, checked)}</div>
                                                                                <div style={{ fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                                            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#5e6c84', fontWeight: 700, width: 80 }}>{t('P. U.Price(excl.)')}</th>
                                                            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#5e6c84', fontWeight: 700, width: 60 }}>{t('Stock')}</th>
                                                            <th style={{ textAlign: 'center', padding: '6px 8px', color: '#5e6c84', fontWeight: 700, width: 60 }}>{t('Qty')}</th>
                                                            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#5e6c84', fontWeight: 700, width: 100 }}>{t('Price (excl.)')}</th>
                                                            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#5e6c84', fontWeight: 700, width: 100 }}>{t('Price (incl.)')}</th>
                                                            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#5e6c84', fontWeight: 700, width: 100 }}>{t('L. Disc. (incl. VAT)')}</th>
                                                            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#5e6c84', fontWeight: 700, width: 90 }}>{t('Total')}</th>
                                                            <th style={{ width: 32 }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {job.parts.map((p, i) => {
                                                            const qty = parseFloat(p.qty || 0) || 1;
                                                            const ltDiscUnit = lineDiscountStaging[i] != null
                                                                ? (parseFloat(lineDiscountStaging[i]) || 0) / qty
                                                                : (parseFloat(p.unit_discount_with_vat) || 0);
                                                            return (
                                                            <tr key={i} style={{ borderBottom: '1px solid #f4f5f7' }}>
                                                                <td style={{ padding: '5px 8px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                        <input
                                                                            defaultValue={p.name}
                                                                            onBlur={e => { updatePart(i, 'name', e.target.value); saveParts(); }}
                                                                            style={{ border: '1px solid #dfe1e6', borderRadius: 3, padding: '3px 6px', fontSize: 12, flex: 1, minWidth: 0, outline: 'none' }}
                                                                        />
                                                                        {openUpdateProductForm && p.product_id && (
                                                                            <button type="button" onClick={() => openUpdateProductForm(p.product_id, p.is_service)}
                                                                                style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', color: '#6b7280', flexShrink: 0 }}
                                                                                title={t('Edit product')}>
                                                                                <i className="bi bi-pencil" style={{ fontSize: 11 }}></i>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>
                                                                    {(p.purchase_unit_price || 0).toFixed(2)}
                                                                </td>
                                                                <td style={{ padding: '5px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                                    {p.product_id ? (
                                                                        <OverlayTrigger
                                                                            placement="top"
                                                                            overlay={
                                                                                <Tooltip id={`cv-stock-tooltip-${i}`}>
                                                                                    {(() => {
                                                                                        const ws = p.warehouse_stocks || {};
                                                                                        const entries = [];
                                                                                        if (ws.hasOwnProperty('main_store')) entries.push(['main_store', ws['main_store']]);
                                                                                        Object.entries(ws).forEach(([k, v]) => { if (k !== 'main_store') entries.push([k, v]); });
                                                                                        const details = entries.map(([k, v]) => `${k === 'main_store' ? t('Main Store') : k.replace(/^wh/, 'WH').toUpperCase()}: ${v}`).join(', ');
                                                                                        return details || `${t('Main Store')}: ${p.stock ?? 0}`;
                                                                                    })()}
                                                                                </Tooltip>
                                                                            }
                                                                        >
                                                                            <span style={{ cursor: 'pointer', textDecoration: 'underline dotted', fontSize: 12 }}>
                                                                                {p.stock ?? 0}
                                                                            </span>
                                                                        </OverlayTrigger>
                                                                    ) : null}
                                                                </td>
                                                                <td style={{ padding: '5px 4px' }}>
                                                                    <input
                                                                        type="number"
                                                                        defaultValue={p.qty}
                                                                        min="0"
                                                                        onChange={e => updatePart(i, 'qty', parseFloat(e.target.value) || 0)}
                                                                        onBlur={e => { updatePart(i, 'qty', parseFloat(e.target.value) || 0); saveParts(); }}
                                                                        onFocus={e => { const el = e.target; setTimeout(() => el.select(), 20); }}
                                                                        style={{ border: '1px solid #dfe1e6', borderRadius: 3, padding: '3px 4px', fontSize: 12, width: '100%', textAlign: 'center', outline: 'none' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '5px 4px' }}>
                                                                    <input
                                                                        type="number"
                                                                        value={p.unit_price ?? ""}
                                                                        min="0"
                                                                        step="0.01"
                                                                        onChange={e => updatePart(i, 'unit_price', e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                                                        onBlur={e => { updatePart(i, 'unit_price', parseFloat(e.target.value) || 0); saveParts(); }}
                                                                        onFocus={e => { const el = e.target; setTimeout(() => el.select(), 20); }}
                                                                        onWheel={e => e.target.blur()}
                                                                        style={{ border: '1px solid #dfe1e6', borderRadius: 3, padding: '3px 4px', fontSize: 12, width: '100%', textAlign: 'right', outline: 'none' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '5px 4px' }}>
                                                                    <input
                                                                        type="number"
                                                                        value={(p.unit_price_with_vat ?? p.unit_price) ?? ""}
                                                                        min="0"
                                                                        step="0.01"
                                                                        onChange={e => updatePart(i, 'unit_price_with_vat', e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                                                        onBlur={e => { updatePart(i, 'unit_price_with_vat', parseFloat(e.target.value) || 0); saveParts(); }}
                                                                        onFocus={e => { const el = e.target; setTimeout(() => el.select(), 20); }}
                                                                        onWheel={e => e.target.blur()}
                                                                        style={{ border: '1px solid #dfe1e6', borderRadius: 3, padding: '3px 4px', fontSize: 12, width: '100%', textAlign: 'right', outline: 'none', color: '#0052cc' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '5px 4px' }}>
                                                                    <input
                                                                        type="number"
                                                                        value={lineDiscountStaging[i] != null ? lineDiscountStaging[i] : (parseFloat(((p.unit_discount_with_vat || 0) * (p.qty || 0)).toFixed(2)) || "")}
                                                                        min="0"
                                                                        step="any"
                                                                        onChange={e => {
                                                                            const val = parseFloat(e.target.value) || 0;
                                                                            const staged = e.target.value === "" ? "" : val;
                                                                            lineDiscountStagingRef.current[i] = val;
                                                                            setLineDiscountStaging(prev => ({ ...prev, [i]: staged }));
                                                                            updatePart(i, 'line_discount_with_vat', staged);
                                                                        }}
                                                                        onBlur={e => {
                                                                            const val = parseFloat(e.target.value) || 0;
                                                                            lineDiscountStagingRef.current[i] = val;
                                                                            setLineDiscountStaging(prev => ({ ...prev, [i]: val }));
                                                                            updatePart(i, 'line_discount_with_vat', val);
                                                                            saveParts();
                                                                        }}
                                                                        onFocus={e => { const el = e.target; setTimeout(() => el.select(), 20); }}
                                                                        style={{ border: '1px solid #dfe1e6', borderRadius: 3, padding: '3px 4px', fontSize: 12, width: '100%', textAlign: 'right', outline: 'none' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '5px 4px' }}>
                                                                    <input
                                                                        type="number"
                                                                        value={parseFloat(parseFloat(((p.unit_price_with_vat || 0) - ltDiscUnit) * qty).toFixed(2)) || ""}
                                                                        min="0"
                                                                        step="0.01"
                                                                        onWheel={e => e.target.blur()}
                                                                        onFocus={e => { const el = e.target; setTimeout(() => el.select(), 20); }}
                                                                        onChange={e => {
                                                                            if (lineTotalTimerRef.current) clearTimeout(lineTotalTimerRef.current);
                                                                            if (!e.target.value || parseFloat(e.target.value) === 0) {
                                                                                updatePart(i, 'total_price_with_vat', 0);
                                                                                return;
                                                                            }
                                                                            const typed = parseFloat(e.target.value);
                                                                            // Store line_total_with_vat on part + call setJob immediately (SalesType5Form pattern).
                                                                            // unit_price_with_vat unchanged → value prop stays same → React leaves DOM alone.
                                                                            const parts1 = (jobRef.current.parts || []).map((p2, j) => j === i ? { ...p2, line_total_with_vat: typed } : p2);
                                                                            const next1 = { ...jobRef.current, parts: parts1 };
                                                                            jobRef.current = next1;
                                                                            setJob({ ...next1 });
                                                                            lineTotalStagingRef.current[i] = typed;
                                                                            lineTotalTimerRef.current = setTimeout(() => {
                                                                                const staged = lineTotalStagingRef.current[i];
                                                                                if (staged == null) return;
                                                                                const vatMul = 1 + (vatPercent / 100);
                                                                                const newParts = (jobRef.current.parts || []).map((p2, j) => {
                                                                                    if (j !== i) return p2;
                                                                                    const qty = parseFloat(p2.qty || 0) || 1;
                                                                                    // Use lineDiscountStagingRef — survives server round-trips that wipe unit_discount_with_vat
                                                                                    const discWithVat = lineDiscountStagingRef.current[j] != null
                                                                                        ? (parseFloat(lineDiscountStagingRef.current[j]) || 0) / qty
                                                                                        : (parseFloat(p2.unit_discount_with_vat) || 0);
                                                                                    const disc = parseFloat((discWithVat / vatMul).toFixed(8));
                                                                                    const uwv = parseFloat(((staged / qty) + discWithVat).toFixed(4));
                                                                                    const up = parseFloat((uwv / vatMul).toFixed(4));
                                                                                    return {
                                                                                        ...p2,
                                                                                        unit_price_with_vat: uwv,
                                                                                        unit_price: up,
                                                                                        unit_discount_with_vat: discWithVat,
                                                                                        unit_discount: disc,
                                                                                        total_price_with_vat: staged,
                                                                                        total_price: parseFloat((qty * (up - disc)).toFixed(2)),
                                                                                    };
                                                                                });
                                                                                const next = { ...jobRef.current, parts: newParts };
                                                                                jobRef.current = next;
                                                                                setJob({ ...next });
                                                                            }, 150);
                                                                        }}
                                                                        onBlur={e => {
                                                                            if (lineTotalTimerRef.current) clearTimeout(lineTotalTimerRef.current);
                                                                            const blurVal = parseFloat(e.target.value) || 0;
                                                                            const vatMul = 1 + (vatPercent / 100);
                                                                            const blurParts = (jobRef.current.parts || []).map((p2, j) => {
                                                                                if (j !== i) return p2;
                                                                                const qty = parseFloat(p2.qty || 0) || 1;
                                                                                const discWithVat = lineDiscountStagingRef.current[j] != null
                                                                                    ? (parseFloat(lineDiscountStagingRef.current[j]) || 0) / qty
                                                                                    : (parseFloat(p2.unit_discount_with_vat) || 0);
                                                                                const disc = parseFloat((discWithVat / vatMul).toFixed(8));
                                                                                const uwv = parseFloat(((blurVal / qty) + discWithVat).toFixed(4));
                                                                                const up = parseFloat((uwv / vatMul).toFixed(4));
                                                                                return {
                                                                                    ...p2,
                                                                                    unit_price_with_vat: uwv,
                                                                                    unit_price: up,
                                                                                    unit_discount_with_vat: discWithVat,
                                                                                    unit_discount: disc,
                                                                                    total_price_with_vat: blurVal,
                                                                                    total_price: parseFloat((qty * (up - disc)).toFixed(2)),
                                                                                };
                                                                            });
                                                                            const blurNext = { ...jobRef.current, parts: blurParts };
                                                                            jobRef.current = blurNext;
                                                                            setJob({ ...blurNext });
                                                                            saveParts();
                                                                        }}
                                                                        style={{ border: '1px solid #dfe1e6', borderRadius: 3, padding: '3px 4px', fontSize: 12, width: '100%', textAlign: 'right', outline: 'none', fontWeight: 600, color: '#172b4d' }}
                                                                    />
                                                                </td>
                                                                <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                                                                    <button type="button" onClick={() => removePart(i)}
                                                                        style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', padding: '2px 4px', fontSize: 15, lineHeight: 1 }}>
                                                                        <i className="bi bi-x"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                            );
                                                        })}
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

                                    {/* Technicians (multi) */}
                                    <div style={sectionBox}>
                                        <div style={SL}><i className="bi bi-person-gear"></i>{t('Technicians')}</div>
                                        {technicians.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                                {technicians.map(tech => {
                                                    const initials = tech.name ? tech.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
                                                    return (
                                                        <div key={tech.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#e0e7ff', borderRadius: 16, padding: '3px 8px 3px 4px', fontSize: 12 }}>
                                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                                                            <span style={{ color: '#3730a3', fontWeight: 500 }}>{tech.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeTechnician(tech.id)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: 0, lineHeight: 1, fontSize: 14 }}
                                                                title={t('Remove')}
                                                            >×</button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
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
                                        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                            <button type="button" onClick={() => employeeCreateRef.current?.open(null, { position: 'Technician' })}
                                                style={{ fontSize: 10, padding: '2px 7px', border: '1px solid #c3c6d7', borderRadius: 3, background: '#f0f2f5', cursor: 'pointer', color: '#374151', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                <i className="bi bi-person-plus" style={{ fontSize: 10 }}></i> {t('+ New')}
                                            </button>
                                            <button type="button" onClick={openTechList}
                                                style={{ fontSize: 10, padding: '2px 7px', border: '1px solid #c3c6d7', borderRadius: 3, background: '#f0f2f5', cursor: 'pointer', color: '#374151', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                <i className="bi bi-people" style={{ fontSize: 10 }}></i> {t('List All')}
                                            </button>
                                        </div>
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

                                    {/* Labour Charge */}
                                    <div style={sectionBox}>
                                        <div style={SL}><i className="bi bi-hammer"></i>{t('Labour Charge')} ({t('incl. VAT')})</div>
                                        <input
                                            type="number"
                                            value={labourInput}
                                            min="0"
                                            step="0.01"
                                            onChange={e => setLabourInput(e.target.value)}
                                            onBlur={e => { const v = parseFloat(e.target.value) || 0; setLabourInput(v); saveJobFields({ labour_charge: v }); }}
                                            onFocus={e => { const el = e.target; setTimeout(() => el.select(), 20); }}
                                            style={inputCls}
                                        />
                                        {parseFloat(labourInput) > 0 && vatPercent > 0 && (
                                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>
                                                {t('Labour (excl. VAT)')}: <span style={{ fontWeight: 600 }}>{fmtCurrency(parseFloat((parseFloat(labourInput) / (1 + vatPercent / 100)).toFixed(2)))}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Cost Summary */}
                                    <div style={{ ...sectionBox, background: '#172b4d', color: '#fff' }}>
                                        <div style={{ ...SL, color: '#8db4e2' }}><i className="bi bi-cash-stack"></i>{t('Cost Summary')}</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b3c6e0' }}>
                                                <span>{t('Parts (excl. VAT)')}:</span>
                                                <span>{fmtCurrency(summary.partsExcl)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b3c6e0' }}>
                                                <span>{t('Labour (excl. VAT)')}:</span>
                                                <span>{fmtCurrency(summary.labourExcl)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b3c6e0', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 5, marginTop: 2 }}>
                                                <span>{t('Subtotal (excl. VAT)')}:</span>
                                                <span>{fmtCurrency(summary.subtotal)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b3c6e0' }}>
                                                <span>{t('VAT')} ({vatPercent}%):</span>
                                                <span>{fmtCurrency(summary.vatAmount)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#57d9a3', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 7, marginTop: 3 }}>
                                                <span>{t('Total (incl. VAT)')}:</span>
                                                <span>{fmtCurrency(summary.totalIncl)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Create Sales / Quotation */}
                                    {(onCreateSalesInvoice || onCreateQuotation || onCreateNonVatInvoice) && (() => {
                                        const docsDisabled = summary.totalIncl === 0;
                                        return (
                                            <div style={{ ...sectionBox, opacity: docsDisabled ? 0.55 : 1 }}>
                                                <div style={SL}><i className="bi bi-file-earmark-plus"></i>{t('Document')}</div>
                                                {docsDisabled && (
                                                    <div style={{ fontSize: 11, color: '#c62828', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <i className="bi bi-info-circle"></i>{t('Total must be greater than 0')}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {onCreateSalesInvoice && (
                                                        job.order_id ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#e3fcef', border: '1px solid #abf5d1', borderRadius: 5, padding: '8px 12px' }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontSize: 11, color: '#006644', fontWeight: 700 }}><i className="bi bi-receipt me-1"></i>{t('Sales Invoice Created')}</div>
                                                                    <div style={{ fontSize: 11, color: '#006644' }}>{job.order_code}{job.order_net_total ? ` · ${parseFloat(job.order_net_total).toFixed(2)}` : ''}</div>
                                                                </div>
                                                                {onOpenSalesInvoice && (
                                                                    <button type="button"
                                                                        disabled={docsDisabled}
                                                                        onClick={() => { setShow(false); onOpenSalesInvoice(job.order_id); }}
                                                                        style={{ background: '#006644', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: docsDisabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                                                                        <i className="bi bi-box-arrow-up-right me-1"></i>{t('View')}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <button type="button"
                                                                disabled={docsDisabled}
                                                                onClick={() => { if (!docsDisabled) { setShow(false); onCreateSalesInvoice(job); } }}
                                                                style={{ background: '#004ac6', color: '#fff', border: 'none', borderRadius: 5, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: docsDisabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <i className="bi bi-receipt"></i>{t('Create Sales Invoice')}
                                                            </button>
                                                        )
                                                    )}
                                                    {onCreateQuotation && (
                                                        job.quotation_id ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fffae6', border: '1px solid #ffe380', borderRadius: 5, padding: '8px 12px' }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontSize: 11, color: '#974f0c', fontWeight: 700 }}><i className="bi bi-file-earmark-text me-1"></i>{t('Quotation Created')}</div>
                                                                    <div style={{ fontSize: 11, color: '#974f0c' }}>{job.quotation_code}{job.quotation_net_total ? ` · ${parseFloat(job.quotation_net_total).toFixed(2)}` : ''}</div>
                                                                </div>
                                                                {onOpenQuotation && (
                                                                    <button type="button"
                                                                        disabled={docsDisabled}
                                                                        onClick={() => { setShow(false); onOpenQuotation(job.quotation_id); }}
                                                                        style={{ background: '#974f0c', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: docsDisabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                                                                        <i className="bi bi-box-arrow-up-right me-1"></i>{t('View')}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <button type="button"
                                                                disabled={docsDisabled}
                                                                onClick={() => { if (!docsDisabled) { setShow(false); onCreateQuotation(job); } }}
                                                                style={{ background: '#fff', color: '#004ac6', border: '2px solid #004ac6', borderRadius: 5, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: docsDisabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <i className="bi bi-file-earmark-text"></i>{t('Create Quotation')}
                                                            </button>
                                                        )
                                                    )}
                                                    {onCreateNonVatInvoice && (
                                                        job.non_vat_sales_id ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 5, padding: '8px 12px' }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontSize: 11, color: '#6b21a8', fontWeight: 700 }}><i className="bi bi-receipt-cutoff me-1"></i>{t('Non VAT Invoice Created')}</div>
                                                                    <div style={{ fontSize: 11, color: '#6b21a8' }}>{job.non_vat_sales_code}{job.non_vat_sales_net_total ? ` · ${parseFloat(job.non_vat_sales_net_total).toFixed(2)}` : ''}</div>
                                                                </div>
                                                                {onOpenNonVatInvoice && (
                                                                    <button type="button"
                                                                        onClick={() => { setShow(false); onOpenNonVatInvoice(job.non_vat_sales_id); }}
                                                                        style={{ background: '#6b21a8', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                                        <i className="bi bi-box-arrow-up-right me-1"></i>{t('View')}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <button type="button"
                                                                disabled={docsDisabled}
                                                                onClick={() => { if (!docsDisabled) { setShow(false); onCreateNonVatInvoice(job); } }}
                                                                style={{ background: '#fff', color: '#6b21a8', border: '2px solid #6b21a8', borderRadius: 5, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: docsDisabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <i className="bi bi-receipt-cutoff"></i>{t('Create Non VAT Invoice')}
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

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
            </div>}
            {/* Customer Create / Browse / History */}
            <CustomerCreate ref={customerCreateRef} showToastMessage={showToastMessage} refreshList={() => {}} />
            <CustomerHistoryModal ref={customerHistoryRef} showToastMessage={showToastMessage} onOpenJobCard={(jobId) => openCard(jobId, 1200)} />
            <Customers ref={customersRef} showToastMessage={showToastMessage} onSelectCustomer={(customer) => {
                setSelectedCustomers([{ ...customer, label: customer.name || '' }]);
                saveJobFields({ customer_id: customer.id, customer_name: customer.name || '' });
                suggestVehicles('', customer.id);
            }} />

            {/* Vehicle Create */}
            <VehicleCreate ref={vehicleCreateRef} showToastMessage={showToastMessage} refreshList={() => {
                if (!editingVehicleIdRef.current) return;
                const vid = editingVehicleIdRef.current;
                editingVehicleIdRef.current = null;
                fetch(`/v1/vehicle/${vid}?store_id=${localStorage.getItem('store_id')}`, { headers: { Authorization: localStorage.getItem('access_token') } })
                    .then(r => r.json()).then(d => {
                        if (!d.result) return;
                        const v = d.result;
                        const vehicleLabel = `${v.vehicle_number || ''} - ${v.brand || ''} ${v.model || ''}`;
                        setSelectedVehicles([{ ...v, label: vehicleLabel }]);
                        saveJobFields({ vehicle_id: v.id, vehicle_number: v.vehicle_number || '', brand: v.brand || '', model: v.model || '' });
                    });
            }} openDetailsView={(id, tab) => vehicleViewRef.current?.open(id, tab)} />
            <VehicleView ref={vehicleViewRef} showToastMessage={showToastMessage} noRepairJobBoard onOpenJobCard={(jobId) => openCard(jobId, 1200)} />

            {/* Employee / Technician Create */}
            <EmployeeCreate ref={employeeCreateRef} showToastMessage={showToastMessage} refreshList={() => {}} />

            {/* All Technicians Modal */}
            {showTechList && (
                <div onClick={() => setShowTechList(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 12px', overflowY: 'auto' }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 520, maxHeight: '75vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <i className="bi bi-people" style={{ fontSize: 16, color: '#0052cc' }}></i>
                            <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{t('All Technicians')}</span>
                            <button type="button" onClick={() => setShowTechList(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280', lineHeight: 1, padding: '0 4px' }}>
                                <i className="bi bi-x"></i>
                            </button>
                        </div>
                        <div style={{ padding: '10px 18px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
                            <input autoFocus value={techListSearch} onChange={e => setTechListSearch(e.target.value)}
                                placeholder={t('Search by name or position...')}
                                style={{ width: '100%', border: '1px solid #c3c6d7', borderRadius: 6, padding: '7px 12px', fontSize: 13 }} />
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {techListItems.filter(e => {
                                const q = techListSearch.toLowerCase();
                                return !q || e.name?.toLowerCase().includes(q) || e.position?.toLowerCase().includes(q);
                            }).map(emp => (
                                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 18px', borderBottom: '1px solid #f3f4f6', gap: 10 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                        {(emp.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.name}</div>
                                        {emp.position && <div style={{ fontSize: 11, color: '#6b7280' }}>{emp.position}</div>}
                                    </div>
                                    {technicians.some(t => t.id === emp.id)
                                        ? <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}><i className="bi bi-check2"></i> {t('Added')}</span>
                                        : <button type="button" onClick={() => { onTechSelect(emp); }}
                                            style={{ fontSize: 12, padding: '4px 12px', border: '1px solid #0052cc', borderRadius: 4, background: '#fff', color: '#0052cc', cursor: 'pointer', fontWeight: 600 }}>
                                            + {t('Add')}
                                          </button>
                                    }
                                </div>
                            ))}
                            {techListItems.length === 0 && (
                                <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>{t('No employees found')}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Browse Modal */}
            {showCustomerListModal && (
                <div onClick={() => setShowCustomerListModal(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 12px', overflowY: 'auto' }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 680, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <i className="bi bi-person-vcard" style={{ fontSize: 16, color: '#0052cc' }}></i>
                            <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{t('Select Customer')}</span>
                            <button type="button" onClick={() => setShowCustomerListModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280', lineHeight: 1, padding: '0 4px' }}>
                                <i className="bi bi-x"></i>
                            </button>
                        </div>
                        <div style={{ padding: '10px 18px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                            <input
                                autoFocus
                                value={customerListSearch}
                                onChange={e => {
                                    const val = e.target.value;
                                    setCustomerListSearch(val);
                                    clearTimeout(customerListDebounce.current);
                                    customerListDebounce.current = setTimeout(() => fetchCustomerListForModal(val), 300);
                                }}
                                placeholder={t('Search by name, phone, code...')}
                                style={{ width: '100%', border: '1px solid #dfe1e6', borderRadius: 5, padding: '7px 10px', fontSize: 13, outline: 'none' }}
                            />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {customerListLoading ? (
                                <div style={{ padding: 32, textAlign: 'center' }}><Spinner animation="border" size="sm" /></div>
                            ) : customerListItems.length === 0 ? (
                                <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>
                                    <i className="bi bi-people" style={{ fontSize: 28, display: 'block', marginBottom: 8 }}></i>
                                    {t('No customers found')}
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                                        <tr>
                                            <th style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', fontSize: 11, textAlign: 'left', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>{t('Name')}</th>
                                            <th style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', fontSize: 11, textAlign: 'left', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>{t('Phone')}</th>
                                            <th style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', fontSize: 11, textAlign: 'left', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>{t('Code')}</th>
                                            <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0', width: 80 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerListItems.map((c, i) => (
                                            <tr key={c.id}
                                                style={{ cursor: 'pointer', background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f0f0f0' }}
                                                onClick={() => selectCustomerFromModal(c)}
                                                onMouseOver={e => e.currentTarget.style.background = '#e8f0fe'}
                                                onMouseOut={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f8fafc'}>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{c.name || '—'}</td>
                                                <td style={{ padding: '8px 12px' }}>{c.phone || '—'}</td>
                                                <td style={{ padding: '8px 12px', color: '#6b7280' }}>{c.code || '—'}</td>
                                                <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                                                    <button type="button"
                                                        onClick={e => { e.stopPropagation(); selectCustomerFromModal(c); }}
                                                        style={{ background: '#0052cc', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                                                        {t('Select')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Vehicle Browse Modal */}
            {showVehicleListModal && (
                <div onClick={() => setShowVehicleListModal(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 12px', overflowY: 'auto' }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 720, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <i className="bi bi-car-front" style={{ fontSize: 16, color: '#0052cc' }}></i>
                            <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{t('Select Vehicle')}</span>
                            <button type="button" onClick={() => setShowVehicleListModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280', lineHeight: 1, padding: '0 4px' }}>
                                <i className="bi bi-x"></i>
                            </button>
                        </div>
                        <div style={{ padding: '10px 18px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                            <input
                                autoFocus
                                value={vehicleListSearch}
                                onChange={e => {
                                    const val = e.target.value;
                                    setVehicleListSearch(val);
                                    clearTimeout(vehicleListDebounce.current);
                                    vehicleListDebounce.current = setTimeout(() => fetchVehicleListForModal(val, selectedCustomers[0]?.id || null), 300);
                                }}
                                placeholder={t('Search vehicle number, brand, model...')}
                                style={{ width: '100%', border: '1px solid #dfe1e6', borderRadius: 5, padding: '7px 10px', fontSize: 13, outline: 'none' }}
                            />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {vehicleListModalLoading ? (
                                <div style={{ padding: 32, textAlign: 'center' }}><Spinner animation="border" size="sm" /></div>
                            ) : vehicleListForModal.length === 0 ? (
                                <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>
                                    <i className="bi bi-car-front" style={{ fontSize: 28, display: 'block', marginBottom: 8 }}></i>
                                    {t('No vehicles found')}
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                                        <tr>
                                            <th style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', fontSize: 11, textAlign: 'left', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>{t('Vehicle No.')}</th>
                                            <th style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', fontSize: 11, textAlign: 'left', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>{t('Brand / Model')}</th>
                                            <th style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', fontSize: 11, textAlign: 'left', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>{t('Customer')}</th>
                                            <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0', width: 80 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vehicleListForModal.map((v, i) => (
                                            <tr key={v.id}
                                                style={{ cursor: 'pointer', background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f0f0f0' }}
                                                onClick={() => selectVehicleFromModal(v)}
                                                onMouseOver={e => e.currentTarget.style.background = '#e8f0fe'}
                                                onMouseOut={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f8fafc'}>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{v.vehicle_number || '—'}</td>
                                                <td style={{ padding: '8px 12px' }}>{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</td>
                                                <td style={{ padding: '8px 12px', color: '#6b7280' }}>{v.customer_name || '—'}</td>
                                                <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                                                    <button type="button"
                                                        onClick={e => { e.stopPropagation(); selectVehicleFromModal(v); }}
                                                        style={{ background: '#0052cc', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                                                        {t('Select')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>,
        document.body
    );
});

export default RepairJobCardView;
