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

function loadCardOrder() {
    try { const s = localStorage.getItem('repair_job_kanban_card_order'); if (s) return JSON.parse(s); } catch (e) {}
    return {};
}
function saveCardOrder(order) { localStorage.setItem('repair_job_kanban_card_order', JSON.stringify(order)); }

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
    closed: { bg: '#f0f4f8', color: '#455a64' },
};

const RepairJobKanban = forwardRef(({ onOpenCard, onCreate, onClose, onSwitchToTable, onListsChange, onCreateSalesInvoice, onCreateQuotation, presetVehicleId, presetVehicleLabel, presetCustomerId, presetCustomerName, embedded }, ref) => {
    const { t } = useTranslation('common');
    const [lists, setLists] = useState(loadLists);
    const [cardMap, setCardMap] = useState(loadCardMap);
    const [cardOrder, setCardOrder] = useState(loadCardOrder);
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Drag state
    const dragJobId = useRef(null);
    const dragListId = useRef(null);
    const [dragOverListId, setDragOverListId] = useState(null);
    const [draggingJobId, setDraggingJobId] = useState(null);
    const [draggingListId, setDraggingListId] = useState(null);
    const [dragOverJobId, setDragOverJobId] = useState(null);
    const [dragOverPosition, setDragOverPosition] = useState(null);
    const autoScrollRef = useRef(null);
    const autoScrollListId = useRef(null);
    const autoScrollCursorY = useRef(0);

    const [hoveredJobId, setHoveredJobId] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const showArchivedRef = useRef(false);

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

    // Job selection modal (for Create Sales Invoice / Create Quotation)
    const [showJobSelectModal, setShowJobSelectModal] = useState(false);
    const [jobSelectMode, setJobSelectMode] = useState('invoice');
    const [selectedJobIds, setSelectedJobIds] = useState(new Set());
    const [showCustomerRequired, setShowCustomerRequired] = useState(false);

    // Auto-scroll: holds DOM refs to each column's scrollable cards container
    const columnCardsRef = useRef({});
    const pendingScrollListId = useRef(null);

    // New Job modal (header button)
    const [showNewJobModal, setShowNewJobModal] = useState(false);
    const [newJobTitle, setNewJobTitle] = useState('');
    const [newJobListId, setNewJobListId] = useState('');

    // Filters — pre-seeded from props when embedded with a preset vehicle
    const [customerSearchText, setCustomerSearchText] = useState(presetCustomerName || '');
    const [customerResults, setCustomerResults] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(
        presetCustomerId ? { id: presetCustomerId, name: presetCustomerName || '' } : null
    );
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerDebounceRef = useRef();

    // Vehicle filter (Typeahead — scoped to selected customer)
    const _presetVehicleOption = presetVehicleId
        ? [{ id: presetVehicleId, label: presetVehicleLabel || String(presetVehicleId) }]
        : [];
    const [vehicleFilterOptions, setVehicleFilterOptions] = useState(_presetVehicleOption);
    const [selectedVehicleFilter, setSelectedVehicleFilter] = useState(_presetVehicleOption);
    const vehicleFilterRef = useRef();
    const vehicleFilterDebounceRef = useRef();

    // Global vehicle search (by vehicle number / chassis / istimara — independent of customer)
    const [vehicleSearchText, setVehicleSearchText] = useState('');
    const [vehicleSearchResults, setVehicleSearchResults] = useState([]);
    const [showVehicleSearchDropdown, setShowVehicleSearchDropdown] = useState(false);
    const vehicleSearchDebounceRef = useRef();

    // Pre-seed active filters from props (only used by useRef on first mount)
    const _initFilters = {};
    if (presetCustomerId) _initFilters.customer_id = presetCustomerId;
    if (presetVehicleId) _initFilters.vehicle_id = presetVehicleId;
    const activeFiltersRef = useRef(_initFilters);

    useImperativeHandle(ref, () => ({ refresh: refreshAll, getLists: () => lists }));
    useEffect(() => { fetchJobs(); }, []);

    function refreshAll() { setCardMap(loadCardMap()); setCardOrder(loadCardOrder()); fetchJobs(); }

    function fetchJobs() {
        const opts = { method: "GET", headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") } };
        const qp = ObjectToSearchQueryParams({ store_id: localStorage.getItem("store_id") || '', ...activeFiltersRef.current });
        const archivedParam = showArchivedRef.current ? '&search[archived]=1' : '';
        const url = `/v1/repair-job?select=id,job_number,title,vehicle_number,brand,model,technician_name,total,total_with_vat,status,customer_id,archived,order_id,order_code,order_net_total,quotation_id,quotation_code,quotation_net_total,date,estimated_delivery&limit=500&${qp}${archivedParam}`;
        console.log('[Kanban] fetchJobs:', url, 'filters:', activeFiltersRef.current);
        setIsLoading(true);
        fetch(url, opts)
            .then(async r => {
                const d = await r.json();
                console.log('[Kanban] fetchJobs result:', d.result?.length ?? 0, 'jobs', d.errors || '');
                setJobs(d.result || []);
                setIsLoading(false);
                if (pendingScrollListId.current) {
                    const targetListId = pendingScrollListId.current;
                    pendingScrollListId.current = null;
                    setTimeout(() => {
                        const el = columnCardsRef.current[targetListId];
                        if (el) el.scrollTop = el.scrollHeight;
                    }, 100);
                } else {
                    setTimeout(() => {
                        Object.values(columnCardsRef.current).forEach(el => { if (el) el.scrollTop = el.scrollHeight; });
                    }, 100);
                }
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
            // Sync vehicle search bar text
            setVehicleSearchText(selected[0].label || '');
        } else {
            const f = { ...activeFiltersRef.current };
            delete f.vehicle_id;
            activeFiltersRef.current = f;
            setVehicleSearchText('');
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
        // Also clear vehicle filters
        setSelectedVehicleFilter([]);
        setVehicleFilterOptions([]);
        vehicleFilterRef.current?.clear();
        setVehicleSearchText('');
        setVehicleSearchResults([]);
        setShowVehicleSearchDropdown(false);
        const f = { ...activeFiltersRef.current };
        delete f.customer_id;
        delete f.vehicle_id;
        activeFiltersRef.current = f;
        fetchJobs();
    }

    // Global vehicle search handlers
    function onVehicleSearchChange(value) {
        setVehicleSearchText(value);
        clearTimeout(vehicleSearchDebounceRef.current);
        if (!value.trim()) {
            setVehicleSearchResults([]);
            setShowVehicleSearchDropdown(false);
            return;
        }
        vehicleSearchDebounceRef.current = setTimeout(() => fetchVehicleSearchResults(value), 300);
    }

    async function fetchVehicleSearchResults(search) {
        const token = localStorage.getItem('access_token');
        const storeId = localStorage.getItem('store_id');
        const qp = ObjectToSearchQueryParams({ store_id: storeId || '', search, limit: 15 });
        try {
            const res = await fetch(`/v1/vehicle?select=id,vehicle_number,chassis_number,istimara_no,brand,model,customer_id,customer_name&${qp}`, { headers: { Authorization: token } });
            const data = await res.json();
            setVehicleSearchResults(data.result || []);
            setShowVehicleSearchDropdown(true);
        } catch (e) {}
    }

    function selectVehicleFromSearch(vehicle) {
        setVehicleSearchText([vehicle.vehicle_number, vehicle.brand, vehicle.model].filter(Boolean).join(' — '));
        setVehicleSearchResults([]);
        setShowVehicleSearchDropdown(false);

        const vehicleOption = {
            ...vehicle,
            label: [vehicle.vehicle_number, vehicle.brand, vehicle.model].filter(Boolean).join(' — '),
        };

        // Set customer filter
        if (vehicle.customer_id) {
            const customer = { id: vehicle.customer_id, name: vehicle.customer_name || '' };
            setSelectedCustomer(customer);
            setCustomerSearchText(vehicle.customer_name || '');
            setCustomerResults([]);
            setShowCustomerDropdown(false);
        }

        // Set vehicle filter
        setVehicleFilterOptions([vehicleOption]);
        setSelectedVehicleFilter([vehicleOption]);

        // Update active filters and refresh
        const f = { ...activeFiltersRef.current };
        if (vehicle.customer_id) f.customer_id = vehicle.customer_id;
        f.vehicle_id = vehicle.id;
        activeFiltersRef.current = f;
        fetchJobs();
    }

    function clearVehicleSearch() {
        setVehicleSearchText('');
        setVehicleSearchResults([]);
        setShowVehicleSearchDropdown(false);
    }

    function getJobListId(job) { return cardMap[job.id] || statusToListId(job.status); }

    function getListJobs(listId) {
        const filtered = jobs.filter(j => getJobListId(j) === listId);
        const order = cardOrder[listId];
        if (!order || order.length === 0) return filtered;
        const idxMap = {};
        order.forEach((id, i) => { idxMap[id] = i; });
        return [...filtered].sort((a, b) => {
            const ai = idxMap[a.id] !== undefined ? idxMap[a.id] : Infinity;
            const bi = idxMap[b.id] !== undefined ? idxMap[b.id] : Infinity;
            return ai - bi;
        });
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

        // Tilted drag ghost (Trello-style)
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const ghost = card.cloneNode(true);
        Object.assign(ghost.style, {
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            width: rect.width + 'px',
            transform: 'rotate(5deg)',
            boxShadow: '0 12px 28px rgba(9,30,66,0.4)',
            borderRadius: '6px',
            opacity: '1',
            pointerEvents: 'none',
            background: '#fff',
            zIndex: '9999',
        });
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, rect.width / 2, 30);
        setTimeout(() => document.body.removeChild(ghost), 0);
    }

    // List drag
    function onListDragStart(e, listId) {
        dragListId.current = listId;
        dragJobId.current = null;
        setDraggingListId(listId);
        setDraggingJobId(null);
        e.dataTransfer.effectAllowed = 'move';
    }

    function onCardDragOver(e, jobId) {
        e.preventDefault();
        if (!dragJobId.current || dragJobId.current === jobId) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOverJobId(jobId);
        setDragOverPosition(e.clientY < rect.top + rect.height / 2 ? 'above' : 'below');
    }

    function onCardDragLeave() {
        // Intentionally empty — clearing here causes blink when placeholder shifts layout.
        // dragOverJobId is cleared by onColumnDragLeave (leaving the column) or onDragEnd/onColumnDrop.
    }

    function onDragEnd() {
        stopAutoScroll();
        dragJobId.current = null;
        dragListId.current = null;
        setDraggingJobId(null);
        setDraggingListId(null);
        setDragOverListId(null);
        setDragOverJobId(null);
        setDragOverPosition(null);
    }

    function stopAutoScroll() {
        autoScrollListId.current = null;
        if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null; }
    }

    function ensureAutoScrollLoop() {
        if (autoScrollRef.current) return; // loop already running
        const tick = () => {
            const listId = autoScrollListId.current;
            if (!listId) { autoScrollRef.current = null; return; }
            const container = columnCardsRef.current[listId];
            if (container) {
                const rect = container.getBoundingClientRect();
                const EDGE = 60;
                const distBottom = rect.bottom - autoScrollCursorY.current;
                const distTop = autoScrollCursorY.current - rect.top;
                if (distBottom > 0 && distBottom < EDGE) {
                    container.scrollTop += Math.ceil(((EDGE - distBottom) / EDGE) * 12);
                } else if (distTop > 0 && distTop < EDGE) {
                    container.scrollTop -= Math.ceil(((EDGE - distTop) / EDGE) * 12);
                }
            }
            autoScrollRef.current = requestAnimationFrame(tick);
        };
        autoScrollRef.current = requestAnimationFrame(tick);
    }

    function onColumnDragOver(e, listId) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverListId(listId);
        autoScrollCursorY.current = e.clientY;
        autoScrollListId.current = listId;
        ensureAutoScrollLoop();
    }

    function onColumnDragLeave(e) {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) {
            stopAutoScroll();
            setDragOverListId(null);
            setDragOverJobId(null);
            setDragOverPosition(null);
        }
    }

    function onColumnDrop(e, listId) {
        e.preventDefault();
        if (dragJobId.current) {
            const jobId = dragJobId.current;

            // Build ordered id list for target column, excluding the card being moved
            const targetJobs = getListJobs(listId);
            const orderedIds = targetJobs.map(j => j.id).filter(id => id !== jobId);

            if (dragOverJobId) {
                const targetIdx = orderedIds.indexOf(dragOverJobId);
                if (targetIdx >= 0) {
                    orderedIds.splice(dragOverPosition === 'above' ? targetIdx : targetIdx + 1, 0, jobId);
                } else {
                    orderedIds.push(jobId);
                }
            } else {
                orderedIds.push(jobId);
            }

            // Update card order: remove from source list, insert into target list
            const sourceListId = getJobListId(jobs.find(j => j.id === jobId));
            const newCardOrder = { ...cardOrder };
            if (sourceListId && sourceListId !== listId) {
                newCardOrder[sourceListId] = (newCardOrder[sourceListId] || []).filter(id => id !== jobId);
            }
            newCardOrder[listId] = orderedIds;
            setCardOrder(newCardOrder);
            saveCardOrder(newCardOrder);

            moveJob(jobId, listId);

            // Scroll the placed card into view after React re-renders
            const _scrollJobId = jobId;
            const _scrollListId = listId;
            setTimeout(() => {
                const container = columnCardsRef.current[_scrollListId];
                if (!container) return;
                const cardEl = container.querySelector(`[data-job-id="${_scrollJobId}"]`);
                if (cardEl) cardEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }, 100);

            if (lists.length > 0) {
                const isLastList = listId === lists[lists.length - 1].id;
                const job = jobs.find(j => j.id === jobId);
                if (isLastList) {
                    if (job && job.status !== 'closed') {
                        patchJob(jobId, { status: 'closed' }).then(updated => {
                            if (updated) setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'closed' } : j));
                        });
                    }
                } else {
                    if (job && job.status === 'closed') {
                        patchJob(jobId, { status: 'open' }).then(updated => {
                            if (updated) setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'open' } : j));
                        });
                    }
                }
            }
        } else if (dragListId.current && dragListId.current !== listId) {
            reorderLists(dragListId.current, listId);
        }
        stopAutoScroll();
        dragJobId.current = null;
        dragListId.current = null;
        setDraggingJobId(null);
        setDraggingListId(null);
        setDragOverListId(null);
        setDragOverJobId(null);
        setDragOverPosition(null);
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
        const body = { title: title.trim(), store_id: storeId, date: now, status: 'open' };
        if (selectedCustomer?.id)           body.customer_id    = selectedCustomer.id;
        if (selectedVehicleFilter[0]?.id) {
            body.vehicle_id     = selectedVehicleFilter[0].id;
            body.vehicle_number = selectedVehicleFilter[0].vehicle_number || '';
            body.brand          = selectedVehicleFilter[0].brand || '';
            body.model          = selectedVehicleFilter[0].model || '';
        }
        try {
            const res = await fetch(`/v1/repair-job?search[store_id]=${storeId || ''}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok && data.result && data.result.id) {
                const newMap = { ...cardMap, [data.result.id]: listId };
                setCardMap(newMap);
                saveCardMap(newMap);
                pendingScrollListId.current = listId;
                fetchJobs();
                setIsCreatingCard(false);
                return true;
            }
        } catch (e) { }
        setIsCreatingCard(false);
        return false;
    }

    async function patchJob(jobId, patch) {
        const storeId = localStorage.getItem('store_id');
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`/v1/repair-job/${jobId}?search[store_id]=${storeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: token },
                body: JSON.stringify(patch),
            });
            const data = await res.json();
            return data?.result || null;
        } catch (e) { return null; }
    }

    async function archiveJob(jobId) {
        const updated = await patchJob(jobId, { archived: true });
        if (updated !== null) setJobs(prev => prev.filter(j => j.id !== jobId));
    }

    async function unarchiveJob(jobId) {
        const updated = await patchJob(jobId, { archived: false });
        if (updated !== null) setJobs(prev => prev.filter(j => j.id !== jobId));
    }

    function toggleShowArchived() {
        const next = !showArchivedRef.current;
        showArchivedRef.current = next;
        setShowArchived(next);
        fetchJobs();
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

    function handleJobSelectConfirm() {
        const selectedJobs = jobs.filter(j => selectedJobIds.has(j.id));
        if (selectedJobs.length === 0) return;
        const commonCustomer = selectedJobs.length === 1 && selectedJobs[0].customer_id
            ? { id: selectedJobs[0].customer_id, name: selectedJobs[0].customer_name }
            : (selectedCustomer || null);
        setShowJobSelectModal(false);
        setSelectedJobIds(new Set());
        if (jobSelectMode === 'invoice') onCreateSalesInvoice?.(selectedJobs, commonCustomer);
        else onCreateQuotation?.(selectedJobs, commonCustomer);
    }

    function fmtCurrency(val) { return val && parseFloat(val) > 0 ? parseFloat(val).toFixed(2) : null; }
    function fmtDate(iso) { if (!iso) return null; try { return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return null; } }

    function StatusBadge({ status }) {
        const c = STATUS_COLORS[status] || STATUS_COLORS.open;
        return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: c.bg, color: c.color, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {status === 'in_progress' ? 'In Progress' : (status || 'open')}
        </span>;
    }

    const filterInputStyle = { background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 12, width: 150 };
    const filterBoxStyle = { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.13)', borderRadius: 5, padding: '5px 10px', gap: 6, position: 'relative' };

    return (
        <div style={embedded
            ? { display: 'flex', flexDirection: 'column', background: '#1a2744', overflow: 'hidden', width: '100%', minHeight: 'calc(100vh - 130px)' }
            : { position: 'fixed', inset: 0, zIndex: 900, display: 'flex', flexDirection: 'column', background: '#1a2744', overflow: 'hidden' }
        }>

            {/* Board header — title row */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px 6px', background: 'rgba(0,0,0,0.3)', flexWrap: 'wrap' }}>
                <i className="bi bi-kanban" style={{ fontSize: 20, color: '#fff' }}></i>
                <span style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontWeight: 700, fontSize: 17, color: '#fff', flex: 1, minWidth: 0 }}>{t('Repair Jobs Board')}</span>
                <button type="button" onClick={() => fetchJobs()} disabled={isLoading}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isLoading ? <Spinner as="span" animation="border" size="sm" /> : <i className="fa fa-refresh"></i>}
                    <span>{t('Refresh')}</span>
                </button>
                <button type="button" onClick={() => { setNewJobTitle(''); setNewJobListId(lists[0]?.id || 'todo'); setShowNewJobModal(true); }}
                    style={{ background: '#0052cc', border: 'none', color: '#fff', borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    <i className="bi bi-plus-lg me-1"></i>{t('New Job')}
                </button>
                <button type="button" onClick={toggleShowArchived}
                    style={{ background: showArchived ? '#455a64' : 'rgba(255,255,255,0.15)', border: showArchived ? '1.5px solid #90a4ae' : 'none', color: '#fff', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className={showArchived ? 'bi bi-archive-fill' : 'bi bi-archive'}></i>
                    <span>{showArchived ? t('Hide Archived') : t('Show Archived')}</span>
                </button>
                {onCreateSalesInvoice && (
                    <button type="button" onClick={() => {
                        if (!selectedCustomer) { setShowCustomerRequired(true); return; }
                        setJobSelectMode('invoice'); setSelectedJobIds(new Set()); setShowJobSelectModal(true);
                    }}
                        style={{ background: '#1a7fe8', border: 'none', color: '#fff', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="bi bi-receipt"></i><span>{t('Create Sales Invoice')}</span>
                    </button>
                )}
                {onCreateQuotation && (
                    <button type="button" onClick={() => {
                        if (!selectedCustomer) { setShowCustomerRequired(true); return; }
                        setJobSelectMode('quotation'); setSelectedJobIds(new Set()); setShowJobSelectModal(true);
                    }}
                        style={{ background: '#fff', border: '1.5px solid #1a7fe8', color: '#1a7fe8', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="bi bi-file-earmark-text"></i><span>{t('Create Quotation')}</span>
                    </button>
                )}
                {!embedded && (onSwitchToTable ? (
                    <button type="button" onClick={onSwitchToTable}
                        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="bi bi-table"></i>
                        <span>{t('Table')}</span>
                    </button>
                ) : (
                    <>
                        <button type="button" onClick={onClose}
                            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className="bi bi-arrow-left"></i>
                            <span>{t('Back')}</span>
                        </button>
                        <button type="button" onClick={onClose}
                            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                            ×
                        </button>
                    </>
                ))}
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

                {/* Global vehicle search — by number / chassis / istimara */}
                <div style={{ position: 'relative' }}>
                    <div style={filterBoxStyle}>
                        <i className="bi bi-search" style={{ color: '#b3bac5', fontSize: 12 }}></i>
                        <input
                            type="text"
                            value={vehicleSearchText}
                            onChange={e => onVehicleSearchChange(e.target.value)}
                            onFocus={() => { if (vehicleSearchResults.length > 0) setShowVehicleSearchDropdown(true); }}
                            onBlur={() => setTimeout(() => setShowVehicleSearchDropdown(false), 150)}
                            placeholder={t('Search vehicle...')}
                            style={{ ...filterInputStyle, width: 170 }}
                        />
                        {vehicleSearchText && (
                            <button type="button" onClick={clearVehicleSearch}
                                style={{ background: 'none', border: 'none', color: '#b3bac5', cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1 }}>
                                <i className="bi bi-x"></i>
                            </button>
                        )}
                    </div>
                    {showVehicleSearchDropdown && vehicleSearchResults.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', zIndex: 200, minWidth: 280, maxHeight: 260, overflowY: 'auto', marginTop: 3 }}>
                            {vehicleSearchResults.map(v => (
                                <div key={v.id}
                                    onMouseDown={e => { e.preventDefault(); selectVehicleFromSearch(v); }}
                                    style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #f4f5f7' }}
                                    onMouseOver={e => e.currentTarget.style.background = '#f4f5f7'}
                                    onMouseOut={e => e.currentTarget.style.background = '#fff'}
                                >
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#172b4d' }}>
                                        <i className="bi bi-car-front me-2" style={{ color: '#5e6c84', fontSize: 11 }}></i>
                                        {[v.vehicle_number, v.brand, v.model].filter(Boolean).join(' — ') || '—'}
                                    </div>
                                    {v.chassis_number && (
                                        <div style={{ fontSize: 11, color: '#5e6c84', marginTop: 2 }}>
                                            <span style={{ fontWeight: 600 }}>{t('Chassis')}:</span> {v.chassis_number}
                                        </div>
                                    )}
                                    {v.customer_name && (
                                        <div style={{ fontSize: 11, color: '#5e6c84' }}>
                                            <i className="bi bi-person me-1"></i>{v.customer_name}
                                        </div>
                                    )}
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
                            <button type="button" onClick={() => { setSelectedVehicleFilter([]); setVehicleFilterOptions([]); vehicleFilterRef.current?.clear(); const f = { ...activeFiltersRef.current }; delete f.vehicle_id; activeFiltersRef.current = f; fetchJobs(); }}
                                style={{ background: 'none', border: 'none', color: '#b3bac5', cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
                                <i className="bi bi-x"></i>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Columns area */}
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: 12, padding: '14px 18px', alignItems: 'flex-start' }}>
                {lists.map(list => {
                    const listJobs = getListJobs(list.id);
                    const isCardTarget = dragOverListId === list.id && draggingJobId && !dragOverJobId;
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
                            <div ref={el => { columnCardsRef.current[list.id] = el; }} style={{ flex: 1, overflowY: 'auto', padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60 }}>
                                {(() => {
                                    const firstDroppable = listJobs.find(j => j.id !== draggingJobId);
                                    return draggingJobId && firstDroppable ? (
                                        <div
                                            style={{ height: 6, flexShrink: 0 }}
                                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverJobId(firstDroppable.id); setDragOverPosition('above'); }}
                                        />
                                    ) : null;
                                })()}
                                {listJobs.map(job => {
                                    const isHovered = hoveredJobId === job.id;
                                    const isDragging = draggingJobId === job.id;
                                    const showAbove = dragOverJobId === job.id && dragOverPosition === 'above' && !isDragging;
                                    const showBelow = dragOverJobId === job.id && dragOverPosition === 'below' && !isDragging;
                                    const dropPlaceholder = (
                                        <div style={{ height: 56, border: '2px dashed #0052cc', borderRadius: 6, background: 'rgba(0,82,204,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#0052cc', fontWeight: 600, flexShrink: 0 }}>
                                            {t('Drop here')}
                                        </div>
                                    );
                                    return (
                                        <React.Fragment key={job.id}>
                                            {showAbove && dropPlaceholder}
                                            <div
                                                data-job-id={job.id}
                                                draggable
                                                onDragStart={(e) => { onCardDragStart(e, job.id); setHoveredJobId(null); }}
                                                onDragEnd={onDragEnd}
                                                onDragOver={(e) => onCardDragOver(e, job.id)}
                                                onDragLeave={onCardDragLeave}
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
                                            {/* Action buttons on hover */}
                                            {isHovered && !isDragging && (
                                                <div style={{ position: 'absolute', top: 7, right: 7, display: 'flex', gap: 3, zIndex: 1 }}>
                                                    {showArchived ? (
                                                        <div
                                                            onMouseDown={e => e.stopPropagation()}
                                                            onClick={e => { e.stopPropagation(); unarchiveJob(job.id); }}
                                                            style={{ background: '#fff3cd', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                            title={t('Unarchive')}
                                                        >
                                                            <i className="bi bi-arrow-counterclockwise" style={{ fontSize: 11, color: '#856404' }}></i>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onMouseDown={e => e.stopPropagation()}
                                                            onClick={e => { e.stopPropagation(); archiveJob(job.id); }}
                                                            style={{ background: '#dfe1e6', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                            title={t('Archive')}
                                                        >
                                                            <i className="bi bi-archive" style={{ fontSize: 11, color: '#42526e' }}></i>
                                                        </div>
                                                    )}
                                                    <div
                                                        onMouseDown={e => e.stopPropagation()}
                                                        onClick={e => { e.stopPropagation(); if (onOpenCard) onOpenCard(job.id); }}
                                                        style={{ background: '#dfe1e6', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                        title={t('Open Card')}
                                                    >
                                                        <i className="bi bi-pencil" style={{ fontSize: 11, color: '#42526e' }}></i>
                                                    </div>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 4, paddingRight: isHovered ? 54 : 0 }}>
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
                                            {(fmtDate(job.date) || fmtDate(job.estimated_delivery)) && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 3 }}>
                                                    {fmtDate(job.date) && (
                                                        <div style={{ fontSize: 11, color: '#42526e', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                            <i className="bi bi-calendar" style={{ fontSize: 10 }}></i>
                                                            <span>{fmtDate(job.date)}</span>
                                                        </div>
                                                    )}
                                                    {fmtDate(job.estimated_delivery) && (
                                                        <div style={{ fontSize: 11, color: '#974f0c', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                            <i className="bi bi-calendar-check" style={{ fontSize: 10 }}></i>
                                                            <span>{fmtDate(job.estimated_delivery)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {(job.total_with_vat || job.total) ? (
                                                <div style={{ fontSize: 12, fontWeight: 600, color: '#0052cc', marginTop: 4 }}>{fmtCurrency(job.total_with_vat || job.total)}</div>
                                            ) : null}
                                            {(job.order_id || job.quotation_id) && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                                                    {job.order_id && (
                                                        <span style={{ fontSize: 10, background: '#e3fcef', color: '#006644', borderRadius: 3, padding: '2px 6px', fontWeight: 600, border: '1px solid #abf5d1' }}>
                                                            <i className="bi bi-receipt" style={{ marginRight: 3 }}></i>
                                                            {job.order_code}{job.order_net_total ? ` · ${fmtCurrency(job.order_net_total)}` : ''}
                                                        </span>
                                                    )}
                                                    {job.quotation_id && (
                                                        <span style={{ fontSize: 10, background: '#fffae6', color: '#974f0c', borderRadius: 3, padding: '2px 6px', fontWeight: 600, border: '1px solid #ffe380' }}>
                                                            <i className="bi bi-file-earmark-text" style={{ marginRight: 3 }}></i>
                                                            {job.quotation_code}{job.quotation_net_total ? ` · ${fmtCurrency(job.quotation_net_total)}` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            </div>
                                            {showBelow && dropPlaceholder}
                                        </React.Fragment>
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

            {/* Customer required alert modal */}
            {showCustomerRequired && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                    <div style={{ background: '#fff', borderRadius: 10, padding: 28, maxWidth: 360, width: '90%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>
                            <i className="bi bi-person-exclamation" style={{ color: '#f59e0b' }}></i>
                        </div>
                        <h5 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: '#1a2744' }}>{t('Customer Required')}</h5>
                        <p style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>{t('Please select a customer from the filter bar before creating a sales invoice or quotation.')}</p>
                        <button type="button" onClick={() => setShowCustomerRequired(false)}
                            style={{ background: '#0052cc', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 28px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            {t('OK')}
                        </button>
                    </div>
                </div>
            )}

            {/* Job card selection modal for Create Sales Invoice / Create Quotation */}
            {showJobSelectModal && (() => {
                const availableJobs = jobs.filter(j =>
                    jobSelectMode === 'invoice' ? !j.order_id : !j.quotation_id
                );
                return (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                    <div style={{ background: '#fff', borderRadius: 10, padding: 24, maxWidth: 640, width: '95%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h5 style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>
                                {jobSelectMode === 'invoice' ? t('Select Job Cards for Sales Invoice') : t('Select Job Cards for Quotation')}
                            </h5>
                            <button type="button" onClick={() => setShowJobSelectModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666', lineHeight: 1 }}>×</button>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#666' }}>{t('Select one or more job cards to include.')}</p>
                        <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e5e7eb', borderRadius: 6 }}>
                            {availableJobs.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 13 }}>
                                    {jobs.length === 0
                                        ? t('No jobs visible on this board.')
                                        : jobSelectMode === 'invoice'
                                            ? t('All job cards on this board already have a sales invoice.')
                                            : t('All job cards on this board already have a quotation.')}
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e5e7eb' }}>
                                            <th style={{ width: 40, padding: '8px 12px' }}>
                                                <input type="checkbox"
                                                    checked={availableJobs.length > 0 && availableJobs.every(j => selectedJobIds.has(j.id))}
                                                    onChange={e => setSelectedJobIds(e.target.checked ? new Set(availableJobs.map(j => j.id)) : new Set())}
                                                />
                                            </th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('Job')}</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('Vehicle')}</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>{t('Amount')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {availableJobs.map(job => (
                                            <tr key={job.id}
                                                style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: selectedJobIds.has(job.id) ? '#f0f4ff' : undefined }}
                                                onClick={() => {
                                                    const next = new Set(selectedJobIds);
                                                    if (next.has(job.id)) next.delete(job.id); else next.add(job.id);
                                                    setSelectedJobIds(next);
                                                }}>
                                                <td style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}>
                                                    <input type="checkbox" checked={selectedJobIds.has(job.id)} onChange={() => {
                                                        const next = new Set(selectedJobIds);
                                                        if (next.has(job.id)) next.delete(job.id); else next.add(job.id);
                                                        setSelectedJobIds(next);
                                                    }} />
                                                </td>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{job.job_number || job.title || '-'}</td>
                                                <td style={{ padding: '8px 12px' }}>{[job.vehicle_number, job.brand, job.model].filter(Boolean).join(' ') || '-'}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>{job.total_with_vat ? parseFloat(job.total_with_vat).toFixed(2) : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        {selectedJobIds.size > 0 && (() => {
                            const selectedTotal = availableJobs
                                .filter(j => selectedJobIds.has(j.id))
                                .reduce((sum, j) => sum + (parseFloat(j.total_with_vat) || 0), 0);
                            return (
                                <div style={{ background: '#f0f4ff', border: '1px solid #c7d7fa', borderRadius: 6, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 13, color: '#374151' }}>
                                        {t('Net Amount')} <span style={{ color: '#6b7280' }}>({selectedJobIds.size} {selectedJobIds.size === 1 ? t('job') : t('jobs')})</span>
                                    </span>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: '#004ac6' }}>
                                        {selectedTotal.toFixed(2)}
                                    </span>
                                </div>
                            );
                        })()}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setShowJobSelectModal(false)}
                                style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 }}>{t('Cancel')}</button>
                            <button type="button" disabled={selectedJobIds.size === 0} onClick={handleJobSelectConfirm}
                                style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: selectedJobIds.size > 0 ? '#0052cc' : '#ccc', color: '#fff', cursor: selectedJobIds.size > 0 ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}>
                                {jobSelectMode === 'invoice' ? t('Create Sales Invoice') : t('Create Quotation')}{selectedJobIds.size > 0 ? ` (${selectedJobIds.size})` : ''}
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}
        </div>
    );
});

export default RepairJobKanban;
