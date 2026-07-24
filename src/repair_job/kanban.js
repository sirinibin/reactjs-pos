import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from 'react-i18next';
import { Spinner } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from 'react-bootstrap-typeahead';
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';

const DEFAULT_LISTS = [
    { id: 'todo', name: 'ToDo', color: '#0052cc' },
    { id: 'in_progress', name: 'In Progress', color: '#ff8b00' },
    { id: 'done', name: 'DONE', color: '#00875a' },
];

function loadLists() {
    try { const s = localStorage.getItem('repair_job_kanban_lists'); if (s) return JSON.parse(s); } catch (e) { }
    return DEFAULT_LISTS.map(l => ({ ...l }));
}
function saveLists(lists) { localStorage.setItem('repair_job_kanban_lists', JSON.stringify(lists)); }

function loadCardMap() {
    try { const s = localStorage.getItem('repair_job_kanban_card_map'); if (s) return JSON.parse(s); } catch (e) { }
    return {};
}
function saveCardMap(map) { localStorage.setItem('repair_job_kanban_card_map', JSON.stringify(map)); }

function statusToListId(status) {
    if (status === 'in_progress') return 'in_progress';
    if (status === 'completed' || status === 'delivered') return 'done';
    return 'todo';
}

const STATUS_COLORS = {
    open: { bg: '#e3f2fd', color: '#1565c0' },
    in_progress: { bg: '#fff3e0', color: '#e65100' },
    completed: { bg: '#e8f5e9', color: '#2e7d32' },
    delivered: { bg: '#f3e5f5', color: '#6a1b9a' },
    cancelled: { bg: '#ffebee', color: '#c62828' },
};

const RepairJobKanban = forwardRef(({ onOpenCard, onCreate, onClose, onListsChange }, ref) => {
    const { t } = useTranslation('common');
    const [lists, setLists] = useState(loadLists);
    const [cardMap, setCardMap] = useState(loadCardMap);
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Drag state
    const dragJobId = useRef(null);
    const dragListId = useRef(null);
    const [dragOverListId, setDragOverListId] = useState(null);
    const [draggingJobId, setDraggingJobId] = useState(null);
    const [draggingListId, setDraggingListId] = useState(null);

    const [hoveredJobId, setHoveredJobId] = useState(null);


    // List editing
    const [editingListId, setEditingListId] = useState(null);
    const [editingListName, setEditingListName] = useState('');
    const [addingList, setAddingList] = useState(false);
    const [newListName, setNewListName] = useState('');
    const editInputRef = useRef();

    // Inline card creation
    const [addingCardToListId, setAddingCardToListId] = useState(null);
    const [newCardTitle, setNewCardTitle] = useState('');
    const [isCreatingCard, setIsCreatingCard] = useState(false);

    // New Job modal (header button)
    const [showNewJobModal, setShowNewJobModal] = useState(false);
    const [newJobTitle, setNewJobTitle] = useState('');
    const [newJobListId, setNewJobListId] = useState('');

    // Filters
    const [customerSearchText, setCustomerSearchText] = useState('');
    const [customerResults, setCustomerResults] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerDebounceRef = useRef();

    // Vehicle filter (Typeahead)
    const [vehicleFilterOptions, setVehicleFilterOptions] = useState([]);
    const [selectedVehicleFilter, setSelectedVehicleFilter] = useState([]);
    const vehicleFilterRef = useRef();
    const vehicleFilterDebounceRef = useRef();

    const activeFiltersRef = useRef({});

    useImperativeHandle(ref, () => ({ refresh: refreshAll, getLists: () => lists }));
    useEffect(() => { fetchJobs(); }, []);

    function refreshAll() { setCardMap(loadCardMap()); fetchJobs(); }

    function fetchJobs() {
        const opts = { method: "GET", headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") } };
        const qp = ObjectToSearchQueryParams({ store_id: localStorage.getItem("store_id") || '', ...activeFiltersRef.current });
        const url = `/v1/repair-job?select=id,job_number,title,vehicle_number,brand,model,technician_name,total,status,customer_id&limit=500&${qp}`;
        console.log('[Kanban] fetchJobs:', url, 'filters:', activeFiltersRef.current);
        setIsLoading(true);
        fetch(url, opts)
            .then(async r => {
                const d = await r.json();
                console.log('[Kanban] fetchJobs result:', d.result?.length ?? 0, 'jobs', d.errors || '');
                setJobs(d.result || []);
                setIsLoading(false);
            })
            .catch(e => { console.error('[Kanban] fetchJobs error:', e); setIsLoading(false); });
    }

    // Vehicle filter Typeahead — suggests vehicles (scoped to selected customer)
    async function suggestVehiclesForKanban(term) {
        const customerId = selectedCustomer?.id;
        if (!customerId) return; // require customer to be selected
        const token = localStorage.getItem('access_token');
        const storeId = localStorage.getItem('store_id');
        const params = { store_id: storeId || '' };
        if (term) params.search = term;
        if (customerId) params.customer_id = customerId;
        const qp = ObjectToSearchQueryParams(params);
        try {
            const res = await fetch(`/v1/vehicle?select=id,vehicle_number,brand,model&${qp}&limit=30`, { headers: { Authorization: token } });
            const d = await res.json();
            setVehicleFilterOptions((d.result || []).map(v => ({
                ...v,
                label: [v.vehicle_number, v.brand, v.model].filter(Boolean).join(' — '),
            })));
        } catch (e) {}
    }

    function onVehicleFilterChange(selected) {
        setSelectedVehicleFilter(selected);
        if (selected.length > 0) {
            activeFiltersRef.current = { ...activeFiltersRef.current, vehicle_id: selected[0].id };
        } else {
            const f = { ...activeFiltersRef.current };
            delete f.vehicle_id;
            activeFiltersRef.current = f;
        }
        fetchJobs();
    }

    // Customer search
    function onCustomerSearchChange(value) {
        setCustomerSearchText(value);
        setSelectedCustomer(null);
        clearTimeout(customerDebounceRef.current);
        if (!value.trim()) {
            setCustomerResults([]);
            setShowCustomerDropdown(false);
            const f = { ...activeFiltersRef.current };
            delete f.customer_id;
            activeFiltersRef.current = f;
            fetchJobs();
            return;
        }
        customerDebounceRef.current = setTimeout(() => fetchCustomerSuggestions(value), 300);
    }

    async function fetchCustomerSuggestions(search) {
        const token = localStorage.getItem('access_token');
        const storeId = localStorage.getItem('store_id');
        const qp = ObjectToSearchQueryParams({ store_id: storeId || '', name: search, limit: 10 });
        try {
            const res = await fetch(`/v1/customer?select=id,name&${qp}`, { headers: { Authorization: token } });
            const data = await res.json();
            setCustomerResults(data.result || []);
            setShowCustomerDropdown(true);
        } catch (e) { }
    }

    function selectCustomer(customer) {
        setSelectedCustomer(customer);
        setCustomerSearchText(customer.name);
        setCustomerResults([]);
        setShowCustomerDropdown(false);
        // Clear vehicle filter when customer changes
        setSelectedVehicleFilter([]);
        setVehicleFilterOptions([]);
        vehicleFilterRef.current?.clear();
        const f = { ...activeFiltersRef.current };
        delete f.vehicle_id;
        f.customer_id = customer.id;
        activeFiltersRef.current = f;
        fetchJobs();
        // Pre-fetch vehicles for this customer
        const token = localStorage.getItem('access_token');
        const storeId = localStorage.getItem('store_id');
        const qp = ObjectToSearchQueryParams({ store_id: storeId || '', customer_id: customer.id });
        fetch(`/v1/vehicle?select=id,vehicle_number,brand,model&${qp}&limit=30`, { headers: { Authorization: token } })
            .then(r => r.json())
            .then(d => setVehicleFilterOptions((d.result || []).map(v => ({
                ...v,
                label: [v.vehicle_number, v.brand, v.model].filter(Boolean).join(' — '),
            }))))
            .catch(() => {});
    }

    function clearCustomerFilter() {
        setSelectedCustomer(null);
        setCustomerSearchText('');
        setCustomerResults([]);
        setShowCustomerDropdown(false);
        // Also clear vehicle filter
        setSelectedVehicleFilter([]);
        setVehicleFilterOptions([]);
        vehicleFilterRef.current?.clear();
        const f = { ...activeFiltersRef.current };
        delete f.customer_id;
        delete f.vehicle_id;
        activeFiltersRef.current = f;
        fetchJobs();
    }

    function getJobListId(job) { return cardMap[job.id] || statusToListId(job.status); }

    function getListJobs(listId) {
        return jobs.filter(j => getJobListId(j) === listId);
    }

    function moveJob(jobId, toListId) {
        const newMap = { ...cardMap, [jobId]: toListId };
        setCardMap(newMap);
        saveCardMap(newMap);
    }

    function reorderLists(fromId, toId) {
        const arr = [...lists];
        const fromIdx = arr.findIndex(l => l.id === fromId);
        const toIdx = arr.findIndex(l => l.id === toId);
        if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
        const [moved] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, moved);
        setLists(arr);
        saveLists(arr);
    }

    // Card drag
    function onCardDragStart(e, jobId) {
        e.stopPropagation();
        dragJobId.current = jobId;
        dragListId.current = null;
        setDraggingJobId(jobId);
        setDraggingListId(null);
        e.dataTransfer.effectAllowed = 'move';
    }

    // List drag
    function onListDragStart(e, listId) {
        dragListId.current = listId;
        dragJobId.current = null;
        setDraggingListId(listId);
        setDraggingJobId(null);
        e.dataTransfer.effectAllowed = 'move';
    }

    function onDragEnd() {
        dragJobId.current = null;
        dragListId.current = null;
        setDraggingJobId(null);
        setDraggingListId(null);
        setDragOverListId(null);
    }

    function onColumnDragOver(e, listId) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverListId(listId);
    }

    function onColumnDragLeave(e) {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setDragOverListId(null);
        }
    }

    function onColumnDrop(e, listId) {
        e.preventDefault();
        if (dragJobId.current) {
            moveJob(dragJobId.current, listId);
        } else if (dragListId.current && dragListId.current !== listId) {
            reorderLists(dragListId.current, listId);
        }
        dragJobId.current = null;
        dragListId.current = null;
        setDraggingJobId(null);
        setDraggingListId(null);
        setDragOverListId(null);
    }

    function startEditList(list) {
        setEditingListId(list.id);
        setEditingListName(list.name);
        setTimeout(() => editInputRef.current?.select(), 30);
    }

    function commitEditList() {
        if (!editingListName.trim()) { setEditingListId(null); return; }
        const updated = lists.map(l => l.id === editingListId ? { ...l, name: editingListName.trim() } : l);
        setLists(updated); saveLists(updated); setEditingListId(null);
        if (onListsChange) onListsChange(updated);
    }

    function deleteList(listId) {
        const count = getListJobs(listId).length;
        if (count > 0 && !window.confirm(`This list has ${count} card(s). Cards will be moved to the first list. Continue?`)) return;
        const updated = lists.filter(l => l.id !== listId);
        setLists(updated); saveLists(updated);
        if (updated.length > 0) {
            const newMap = { ...cardMap };
            Object.keys(newMap).forEach(jid => { if (newMap[jid] === listId) newMap[jid] = updated[0].id; });
            setCardMap(newMap); saveCardMap(newMap);
        }
        if (onListsChange) onListsChange(updated);
    }

    function addList() {
        if (!newListName.trim()) return;
        const updated = [...lists, { id: 'list_' + Date.now(), name: newListName.trim(), color: '#5e6c84' }];
        setLists(updated); saveLists(updated); setNewListName(''); setAddingList(false);
        if (onListsChange) onListsChange(updated);
    }

    async function createJob(title, listId) {
        if (!title.trim()) return false;
        setIsCreatingCard(true);
        const token = localStorage.getItem('access_token');
        const storeId = localStorage.getItem('store_id');
        const now = new Date().toISOString();
        try {
            const res = await fetch(`/v1/repair-job?search[store_id]=${storeId || ''}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify({ title: title.trim(), store_id: storeId, date: now, status: 'open' }),
            });
            const data = await res.json();
            if (res.ok && data.result && data.result.id) {
                const newMap = { ...cardMap, [data.result.id]: listId };
                setCardMap(newMap);
                saveCardMap(newMap);
                fetchJobs();
                setIsCreatingCard(false);
                return true;
            }
        } catch (e) { }
        setIsCreatingCard(false);
        return false;
    }

    async function createCardInline(listId) {
        const title = newCardTitle.trim();
        if (!title) { setAddingCardToListId(null); setNewCardTitle(''); return; }
        const ok = await createJob(title, listId);
        if (ok) { setNewCardTitle(''); setAddingCardToListId(null); }
    }

    async function handleCreateNewJob() {
        const title = newJobTitle.trim();
        const listId = newJobListId || lists[0]?.id || 'todo';
        if (!title) return;
        const ok = await createJob(title, listId);
        if (ok) { setShowNewJobModal(false); setNewJobTitle(''); }
    }

    function fmtCurrency(val) { return val && parseFloat(val) > 0 ? parseFloat(val).toFixed(2) : null; }

    function StatusBadge({ status }) {
        const c = STATUS_COLORS[status] || STATUS_COLORS.open;
        return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: c.bg, color: c.color, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {status === 'in_progress' ? 'In Progress' : (status || 'open')}
        </span>;
    }

    const filterInputStyle = { background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 12, width: 150 };
    const filterBoxStyle = { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.13)', borderRadius: 5, padding: '5px 10px', gap: 6, position: 'relative' };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', flexDirection: 'column', background: '#1a2744', overflow: 'hidden' }}>

            {/* Board header — title row */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px 6px', background: 'rgba(0,0,0,0.3)' }}>
                <i className="bi bi-kanban" style={{ fontSize: 20, color: '#fff' }}></i>
                <span style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontWeight: 700, fontSize: 17, color: '#fff', flex: 1 }}>{t('Repair Jobs Board')}</span>
                <button type="button" onClick={() => fetchJobs()} disabled={isLoading}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isLoading ? <Spinner as="span" animation="border" size="sm" /> : <i className="fa fa-refresh"></i>}
                    <span>{t('Refresh')}</span>
                </button>
                <button type="button" onClick={() => { setNewJobTitle(''); setNewJobListId(lists[0]?.id || 'todo'); setShowNewJobModal(true); }}
                    style={{ background: '#0052cc', border: 'none', color: '#fff', borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    <i className="bi bi-plus-lg me-1"></i>{t('New Job')}
                </button>
                <button type="button" onClick={onClose}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="bi bi-table"></i>
                    <span style={{ fontSize: 12 }}>{t('Table View')}</span>
                </button>
            </div>

            {/* Filter bar */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 18px 10px', background: 'rgba(0,0,0,0.22)', flexWrap: 'wrap' }}>
                {/* Customer filter */}
                <div style={{ position: 'relative' }}>
                    <div style={filterBoxStyle}>
                        <i className="bi bi-person" style={{ color: '#b3bac5', fontSize: 13 }}></i>
                        <input
                            type="text"
                            value={customerSearchText}
                            onChange={e => onCustomerSearchChange(e.target.value)}
                            onFocus={() => { if (customerResults.length > 0) setShowCustomerDropdown(true); }}
                            onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                            placeholder={t('Filter by customer...')}
                            style={filterInputStyle}
                        />
                        {(customerSearchText || selectedCustomer) && (
                            <button type="button" onClick={clearCustomerFilter}
                                style={{ background: 'none', border: 'none', color: '#b3bac5', cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1 }}>
                                <i className="bi bi-x"></i>
                            </button>
                        )}
                        {selectedCustomer && <i className="bi bi-check-circle-fill" style={{ color: '#57d9a3', fontSize: 12, flexShrink: 0 }}></i>}
                    </div>
                    {showCustomerDropdown && customerResults.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', zIndex: 200, minWidth: 240, maxHeight: 220, overflowY: 'auto', marginTop: 3 }}>
                            {customerResults.map(c => (
                                <div key={c.id}
                                    onMouseDown={(e) => { e.preventDefault(); selectCustomer(c); }}
                                    style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: '#172b4d', borderBottom: '1px solid #f4f5f7' }}
                                    onMouseOver={e => e.currentTarget.style.background = '#f4f5f7'}
                                    onMouseOut={e => e.currentTarget.style.background = '#fff'}
                                >
                                    <i className="bi bi-person me-2" style={{ color: '#5e6c84', fontSize: 11 }}></i>
                                    {c.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Vehicle filter — Typeahead (requires customer) */}
                {selectedCustomer && (
                    <div style={{ ...filterBoxStyle, padding: '2px 10px', minWidth: 200 }}>
                        <i className="bi bi-car-front" style={{ color: '#b3bac5', fontSize: 13, flexShrink: 0 }}></i>
                        <Typeahead
                            id="kanban-vehicle-filter"
                            ref={vehicleFilterRef}
                            labelKey="label"
                            filterBy={() => true}
                            minLength={0}
                            emptyLabel=""
                            selected={selectedVehicleFilter}
                            options={vehicleFilterOptions}
                            placeholder={t('Filter by vehicle...')}
                            onChange={onVehicleFilterChange}
                            onInputChange={term => {
                                clearTimeout(vehicleFilterDebounceRef.current);
                                vehicleFilterDebounceRef.current = setTimeout(() => suggestVehiclesForKanban(term), 300);
                            }}
                            onFocus={() => { if (vehicleFilterOptions.length === 0) suggestVehiclesForKanban(''); }}
                            renderMenu={(results, menuProps) => {
                                if (!results.length) return <Menu {...menuProps} style={{ display: 'none' }}></Menu>;
                                return (
                                    <Menu {...menuProps} style={{ ...(menuProps.style || {}), zIndex: 9999, minWidth: 260, background: '#fff', borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                                        {results.map((opt, idx) => (
                                            <MenuItem option={opt} position={idx} key={idx}>
                                                <div style={{ fontSize: 13, color: '#172b4d', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <i className="bi bi-car-front" style={{ color: '#5e6c84', fontSize: 11 }}></i>
                                                    {opt.label}
                                                </div>
                                            </MenuItem>
                                        ))}
                                    </Menu>
                                );
                            }}
                            inputProps={{ style: { ...filterInputStyle, background: 'transparent', padding: 0, height: 'auto' } }}
                        />
                        {selectedVehicleFilter.length > 0 && (
                            <i className="bi bi-check-circle-fill" style={{ color: '#57d9a3', fontSize: 12, flexShrink: 0 }}></i>
                        )}
                    </div>
                )}
            </div>

            {/* Columns area */}
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: 12, padding: '14px 18px', alignItems: 'flex-start' }}>
                {lists.map(list => {
                    const listJobs = getListJobs(list.id);
                    const isCardTarget = dragOverListId === list.id && draggingJobId;
                    const isListTarget = dragOverListId === list.id && draggingListId && draggingListId !== list.id;
                    const isBeingDragged = draggingListId === list.id;

                    return (
                        <div
                            key={list.id}
                            onDragOver={(e) => onColumnDragOver(e, list.id)}
                            onDragLeave={onColumnDragLeave}
                            onDrop={(e) => onColumnDrop(e, list.id)}
                            style={{
                                width: 272, flexShrink: 0, display: 'flex', flexDirection: 'column', maxHeight: '100%',
                                background: isListTarget ? '#c0d4f0' : isCardTarget ? '#c5d4eb' : '#ebecf0',
                                borderRadius: 8, borderTop: `3px solid ${isListTarget ? '#0052cc' : list.color}`,
                                outline: isListTarget ? '2px dashed #0052cc' : 'none',
                                opacity: isBeingDragged ? 0.35 : 1,
                                transition: 'background 0.12s, opacity 0.12s',
                            }}
                        >
                            {/* Column header */}
                            <div
                                draggable={editingListId !== list.id}
                                onDragStart={(e) => onListDragStart(e, list.id)}
                                onDragEnd={onDragEnd}
                                style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'grab', userSelect: 'none' }}
                            >
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: list.color, flexShrink: 0 }}></div>
                                {editingListId === list.id ? (
                                    <input
                                        ref={editInputRef}
                                        value={editingListName}
                                        onChange={(e) => setEditingListName(e.target.value)}
                                        onBlur={commitEditList}
                                        onKeyDown={(e) => { if (e.key === 'Enter') commitEditList(); if (e.key === 'Escape') setEditingListId(null); }}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ flex: 1, fontWeight: 700, fontSize: 13, border: '2px solid #0052cc', borderRadius: 3, padding: '2px 6px', outline: 'none', background: '#fff', cursor: 'text' }}
                                    />
                                ) : (
                                    <span
                                        style={{ flex: 1, fontWeight: 700, fontSize: 13, color: '#172b4d' }}
                                        onDoubleClick={(e) => { e.stopPropagation(); startEditList(list); }}
                                        title={t('Double-click to rename • Drag to reorder')}
                                    >
                                        {list.name}
                                    </span>
                                )}
                                <span style={{ fontSize: 11, background: '#dfe1e6', borderRadius: 10, padding: '1px 7px', fontWeight: 600, color: '#5e6c84', flexShrink: 0 }}>{listJobs.length}</span>
                                <button type="button" title={t('Delete list')}
                                    onClick={(e) => { e.stopPropagation(); deleteList(list.id); }}
                                    style={{ background: 'none', border: 'none', color: '#97a0af', cursor: 'pointer', padding: '0 2px', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
                                    <i className="bi bi-x"></i>
                                </button>
                            </div>

                            {/* Cards */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60 }}>
                                {listJobs.map(job => {
                                    const isHovered = hoveredJobId === job.id;
                                    const isDragging = draggingJobId === job.id;
                                    return (
                                        <div
                                            key={job.id}
                                            draggable
                                            onDragStart={(e) => { onCardDragStart(e, job.id); setHoveredJobId(null); }}
                                            onDragEnd={onDragEnd}
                                            onMouseEnter={() => setHoveredJobId(job.id)}
                                            onMouseLeave={() => setHoveredJobId(null)}
                                            onClick={() => { if (!isDragging && onOpenCard) onOpenCard(job.id); }}
                                            style={{
                                                position: 'relative',
                                                background: isDragging ? '#f0f4ff' : isHovered ? '#e8edf9' : '#fff',
                                                borderRadius: 6,
                                                padding: '10px 12px',
                                                boxShadow: isHovered && !isDragging
                                                    ? '0 4px 12px rgba(9,30,66,0.22), 0 1px 3px rgba(9,30,66,0.1)'
                                                    : '0 1px 3px rgba(9,30,66,0.15)',
                                                cursor: isDragging ? 'grabbing' : 'pointer',
                                                opacity: isDragging ? 0.4 : 1,
                                                userSelect: 'none',
                                                transform: isHovered && !isDragging ? 'translateY(-1px)' : 'none',
                                                transition: 'background 0.1s, box-shadow 0.1s, transform 0.1s',
                                            }}
                                        >
                                            {/* Pencil icon on hover */}
                                            {isHovered && !isDragging && (
                                                <div
                                                    onMouseDown={e => e.stopPropagation()}
                                                    onClick={e => { e.stopPropagation(); if (onOpenCard) onOpenCard(job.id); }}
                                                    style={{ position: 'absolute', top: 7, right: 7, background: '#dfe1e6', border: 'none', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}
                                                    title={t('Open Card')}
                                                >
                                                    <i className="bi bi-pencil" style={{ fontSize: 11, color: '#42526e' }}></i>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 4, paddingRight: isHovered ? 22 : 0 }}>
                                                <span style={{ fontSize: 10, color: '#97a0af', fontWeight: 600, fontFamily: 'monospace', flexShrink: 0 }}>{job.job_number}</span>
                                                <StatusBadge status={job.status} />
                                            </div>
                                            {job.title
                                                ? <div style={{ fontWeight: 600, fontSize: 13, color: '#172b4d', marginBottom: 5, lineHeight: 1.35 }}>{job.title}</div>
                                                : <div style={{ fontStyle: 'italic', fontSize: 12, color: '#b3bac5', marginBottom: 5 }}>{t('No title')}</div>
                                            }
                                            {(job.vehicle_number || job.brand) && (
                                                <div style={{ fontSize: 11, color: '#42526e', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <i className="bi bi-car-front" style={{ fontSize: 10, flexShrink: 0 }}></i>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {[job.vehicle_number, job.brand, job.model].filter(Boolean).join(' ')}
                                                    </span>
                                                </div>
                                            )}
                                            {job.technician_name && (
                                                <div style={{ fontSize: 11, color: '#42526e', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <i className="bi bi-person" style={{ fontSize: 10, flexShrink: 0 }}></i>
                                                    <span>{job.technician_name}</span>
                                                </div>
                                            )}
                                            {fmtCurrency(job.total) && (
                                                <div style={{ fontSize: 12, fontWeight: 600, color: '#0052cc', marginTop: 4 }}>{fmtCurrency(job.total)}</div>
                                            )}
                                        </div>
                                    );
                                })}

                                {isCardTarget && (
                                    <div style={{ height: 56, border: '2px dashed #0052cc', borderRadius: 6, background: 'rgba(0,82,204,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#0052cc', fontWeight: 600 }}>
                                        {t('Drop here')}
                                    </div>
                                )}
                            </div>

                            {/* Inline add card */}
                            <div style={{ padding: '6px 8px 10px', flexShrink: 0 }}>
                                {addingCardToListId === list.id ? (
                                    <div>
                                        <textarea
                                            autoFocus
                                            value={newCardTitle}
                                            onChange={(e) => setNewCardTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); createCardInline(list.id); }
                                                if (e.key === 'Escape') { setAddingCardToListId(null); setNewCardTitle(''); }
                                            }}
                                            placeholder={t('Enter a title for this card...')}
                                            rows={3}
                                            style={{ width: '100%', border: '2px solid #0052cc', borderRadius: 4, padding: '8px 10px', fontSize: 13, outline: 'none', resize: 'none', marginBottom: 6, fontFamily: 'inherit', background: '#fff' }}
                                        />
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <button type="button"
                                                onClick={() => createCardInline(list.id)}
                                                disabled={isCreatingCard || !newCardTitle.trim()}
                                                style={{ background: '#0052cc', border: 'none', color: '#fff', borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                {isCreatingCard ? <Spinner as="span" animation="border" size="sm" /> : null}
                                                {t('Add card')}
                                            </button>
                                            <button type="button"
                                                onClick={() => { setAddingCardToListId(null); setNewCardTitle(''); }}
                                                style={{ background: 'none', border: 'none', color: '#5e6c84', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>
                                                <i className="bi bi-x"></i>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button type="button"
                                        onClick={() => { setAddingCardToListId(list.id); setNewCardTitle(''); }}
                                        style={{ width: '100%', background: 'none', border: 'none', borderRadius: 5, padding: '7px 10px', cursor: 'pointer', fontSize: 12, color: '#5e6c84', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5 }}
                                        onMouseOver={e => e.currentTarget.style.background = '#cdd2da'}
                                        onMouseOut={e => e.currentTarget.style.background = 'none'}>
                                        <i className="bi bi-plus"></i> {t('Add a card')}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Add list */}
                <div style={{ width: 272, flexShrink: 0 }}>
                    {addingList ? (
                        <div style={{ background: '#ebecf0', borderRadius: 8, padding: 10 }}>
                            <input autoFocus value={newListName} onChange={(e) => setNewListName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addList(); if (e.key === 'Escape') { setAddingList(false); setNewListName(''); } }}
                                placeholder={t('Enter list name...')}
                                style={{ width: '100%', border: '2px solid #0052cc', borderRadius: 3, padding: '6px 8px', fontSize: 13, outline: 'none', marginBottom: 8, background: '#fff' }} />
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button type="button" onClick={addList}
                                    style={{ background: '#0052cc', border: 'none', color: '#fff', borderRadius: 3, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                    {t('Add list')}
                                </button>
                                <button type="button" onClick={() => { setAddingList(false); setNewListName(''); }}
                                    style={{ background: 'none', border: 'none', color: '#5e6c84', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>
                                    <i className="bi bi-x"></i>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setAddingList(true)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}>
                            <i className="bi bi-plus-lg"></i> {t('Add another list')}
                        </button>
                    )}
                </div>
            </div>

            {/* New Job modal */}
            {showNewJobModal && (
                <div onClick={() => setShowNewJobModal(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: '#fff', borderRadius: 10, padding: '24px 28px', width: 380, maxWidth: '90vw', boxShadow: '0 8px 40px rgba(0,0,0,0.35)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 8 }}>
                            <i className="bi bi-kanban" style={{ fontSize: 18, color: '#0052cc' }}></i>
                            <span style={{ fontWeight: 700, fontSize: 15, color: '#172b4d' }}>{t('New Repair Job')}</span>
                        </div>

                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{t('Title')} *</label>
                        <input
                            autoFocus
                            value={newJobTitle}
                            onChange={e => setNewJobTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleCreateNewJob(); if (e.key === 'Escape') setShowNewJobModal(false); }}
                            placeholder={t('e.g. Engine overhaul, AC repair...')}
                            style={{ width: '100%', border: '2px solid #dfe1e6', borderRadius: 5, padding: '8px 12px', fontSize: 13, outline: 'none', marginBottom: 14, boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                            onFocus={e => { e.target.style.borderColor = '#0052cc'; }}
                            onBlur={e => { e.target.style.borderColor = '#dfe1e6'; }}
                        />

                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{t('Add to List')}</label>
                        <select
                            value={newJobListId}
                            onChange={e => setNewJobListId(e.target.value)}
                            style={{ width: '100%', border: '2px solid #dfe1e6', borderRadius: 5, padding: '8px 12px', fontSize: 13, outline: 'none', marginBottom: 20, boxSizing: 'border-box', background: '#fff', color: '#172b4d' }}
                        >
                            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setShowNewJobModal(false)}
                                style={{ background: '#f4f5f7', border: 'none', color: '#42526e', borderRadius: 5, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                                {t('Cancel')}
                            </button>
                            <button type="button" onClick={handleCreateNewJob} disabled={!newJobTitle.trim() || isCreatingCard}
                                style={{ background: newJobTitle.trim() && !isCreatingCard ? '#0052cc' : '#b3c5e0', border: 'none', color: '#fff', borderRadius: 5, padding: '8px 20px', cursor: newJobTitle.trim() && !isCreatingCard ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {isCreatingCard && <Spinner as="span" animation="border" size="sm" />}
                                {t('Create Card')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default RepairJobKanban;
