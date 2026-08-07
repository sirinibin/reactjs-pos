import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from 'react-i18next';
import { Spinner } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from 'react-bootstrap-typeahead';
import { ObjectToSearchQueryParams } from '../utils/queryUtils.js';

const PAGE_SIZE = 5;

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


const STATUS_ACCENT = {
    open: '#3b82f6',
    in_progress: '#f97316',
    completed: '#22c55e',
    delivered: '#a855f7',
    cancelled: '#ef4444',
    closed: '#64748b',
};

const RepairJobKanban = forwardRef(({ onOpenCard, onCreate, onClose, onSwitchToTable, onListsChange, onCreateSalesInvoice, onCreateQuotation, onCreateNonVatInvoice, presetVehicleId, presetVehicleLabel, presetCustomerId, presetCustomerName, embedded }, ref) => {
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

    const boardRef = useRef(null);
    const touchState = useRef(null);
    const jobsRef = useRef([]);
    const cardMapRef = useRef({});
    const cardOrderRef = useRef({});
    const listsRef = useRef([]);

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
    const [addingCardToListIdTop, setAddingCardToListIdTop] = useState(null);
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

    // Infinite scroll: how many PAGE_SIZE batches are visible per column
    const [columnPages, setColumnPages] = useState({});

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
    const [dueDateFilter, setDueDateFilter] = useState(null); // null | 'overdue' | 'due_today'
    const [showCreateDropdown, setShowCreateDropdown] = useState(false);
    const createDropdownRef = useRef();

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
        const url = `/v1/repair-job?select=id,job_number,title,vehicle_number,brand,model,technician_name,technician_names,customer_name,total,total_with_vat,status,customer_id,archived,order_id,order_code,order_net_total,quotation_id,quotation_code,quotation_net_total,quotation_type,non_vat_sales_id,non_vat_sales_code,non_vat_sales_net_total,date,estimated_delivery&limit=500&${qp}${archivedParam}`;
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
                    // Expand that column so the newly created card is visible
                    setColumnPages(prev => ({ ...prev, [targetListId]: 9999 }));
                    setTimeout(() => {
                        const el = columnCardsRef.current[targetListId];
                        if (el) el.scrollTop = el.scrollHeight;
                    }, 100);
                }
            })
            .catch(e => { console.error('[Kanban] fetchJobs error:', e); setIsLoading(false); });
    }

    // Infinite scroll: attach scroll listeners to each column's card container
    useEffect(() => {
        const cleanups = [];
        lists.forEach(list => {
            const el = columnCardsRef.current[list.id];
            if (!el) return;
            const handler = () => {
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
                    setColumnPages(prev => ({ ...prev, [list.id]: (prev[list.id] || 1) + 1 }));
                }
            };
            el.addEventListener('scroll', handler, { passive: true });
            cleanups.push(() => el.removeEventListener('scroll', handler));
        });
        return () => cleanups.forEach(fn => fn());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lists, jobs]);

    // Keep refs in sync with latest state so touch handlers can read them without stale closures
    useEffect(() => { jobsRef.current = jobs; }, [jobs]);
    useEffect(() => { cardMapRef.current = cardMap; }, [cardMap]);
    useEffect(() => { cardOrderRef.current = cardOrder; }, [cardOrder]);
    useEffect(() => { listsRef.current = lists; }, [lists]);

    // Touch drag-and-drop for mobile (HTML5 drag API doesn't work on touch screens)
    useEffect(() => {
        const board = boardRef.current;
        if (!board) return;

        function handleTouchMove(e) {
            const ts = touchState.current;
            if (!ts) return;
            const touch = e.touches[0];
            const dx = touch.clientX - ts.startX;
            const dy = touch.clientY - ts.startY;

            if (!ts.isDragging && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
                ts.isDragging = true;
                dragJobId.current = ts.jobId;
                setDraggingJobId(ts.jobId);
                if (ts.cardEl) {
                    const rect = ts.cardEl.getBoundingClientRect();
                    const ghost = ts.cardEl.cloneNode(true);
                    Object.assign(ghost.style, {
                        position: 'fixed',
                        width: rect.width + 'px',
                        height: rect.height + 'px',
                        top: (touch.clientY - 30) + 'px',
                        left: (touch.clientX - rect.width / 2) + 'px',
                        transform: 'rotate(3deg) scale(1.03)',
                        boxShadow: '0 12px 28px rgba(9,30,66,0.4)',
                        borderRadius: '8px',
                        opacity: '0.9',
                        pointerEvents: 'none',
                        background: '#fff',
                        zIndex: '9999',
                        transition: 'none',
                    });
                    document.body.appendChild(ghost);
                    ts.ghostEl = ghost;
                }
            }

            if (!ts.isDragging) return;

            e.preventDefault(); // Block page scroll while dragging a card

            if (ts.ghostEl && ts.cardEl) {
                const rect = ts.cardEl.getBoundingClientRect();
                ts.ghostEl.style.top = (touch.clientY - 30) + 'px';
                ts.ghostEl.style.left = (touch.clientX - rect.width / 2) + 'px';
            }

            // Find the element under the finger (hide ghost so it doesn't block hit-test)
            if (ts.ghostEl) ts.ghostEl.style.display = 'none';
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            if (ts.ghostEl) ts.ghostEl.style.display = '';
            if (!el) return;

            // Walk up to find column (data-list-id)
            let node = el;
            let foundListId = null;
            while (node && node !== document.body) {
                if (node.dataset && node.dataset.listId) { foundListId = node.dataset.listId; break; }
                node = node.parentElement;
            }
            if (foundListId) {
                ts.targetListId = foundListId;
                setDragOverListId(foundListId);
            }

            // Walk up to find target card (data-job-id)
            node = el;
            let foundJobId = null;
            let foundJobPos = null;
            while (node && node !== document.body) {
                if (node.dataset && node.dataset.jobId && node.dataset.jobId !== String(ts.jobId)) {
                    const jrect = node.getBoundingClientRect();
                    foundJobId = node.dataset.jobId;
                    foundJobPos = touch.clientY < jrect.top + jrect.height / 2 ? 'above' : 'below';
                    break;
                }
                node = node.parentElement;
            }
            if (foundJobId) {
                ts.targetJobId = foundJobId;
                ts.targetPosition = foundJobPos;
                setDragOverJobId(foundJobId);
                setDragOverPosition(foundJobPos);
            } else {
                ts.targetJobId = null;
                ts.targetPosition = null;
                setDragOverJobId(null);
                setDragOverPosition(null);
            }
        }

        function handleTouchEnd() {
            const ts = touchState.current;
            if (!ts) return;

            if (ts.ghostEl) {
                document.body.removeChild(ts.ghostEl);
                ts.ghostEl = null;
            }

            if (ts.isDragging && ts.targetListId) {
                const jobId = ts.jobId;
                const listId = ts.targetListId;
                const currentJobs = jobsRef.current;
                const currentCardOrder = cardOrderRef.current;
                const currentCardMap = cardMapRef.current;
                const currentLists = listsRef.current;
                const getJobListIdLocal = (j) => currentCardMap[j.id] || statusToListId(j.status);

                let targetJobs = currentJobs.filter(j => getJobListIdLocal(j) === listId);
                const order = currentCardOrder[listId];
                if (order && order.length > 0) {
                    const idxMap = {};
                    order.forEach((id, i) => { idxMap[id] = i; });
                    targetJobs = [...targetJobs].sort((a, b) => {
                        const ai = idxMap[a.id] !== undefined ? idxMap[a.id] : Infinity;
                        const bi = idxMap[b.id] !== undefined ? idxMap[b.id] : Infinity;
                        return ai - bi;
                    });
                }

                const orderedIds = targetJobs.map(j => j.id).filter(id => id !== jobId);
                if (ts.targetJobId) {
                    const targetIdx = orderedIds.indexOf(ts.targetJobId);
                    if (targetIdx >= 0) {
                        orderedIds.splice(ts.targetPosition === 'above' ? targetIdx : targetIdx + 1, 0, jobId);
                    } else {
                        orderedIds.push(jobId);
                    }
                } else {
                    orderedIds.push(jobId);
                }

                const sourceJob = currentJobs.find(j => j.id === jobId);
                const sourceListId = sourceJob ? getJobListIdLocal(sourceJob) : null;
                const newCardOrder = { ...currentCardOrder };
                if (sourceListId && sourceListId !== listId) {
                    newCardOrder[sourceListId] = (newCardOrder[sourceListId] || []).filter(id => id !== jobId);
                }
                newCardOrder[listId] = orderedIds;
                setCardOrder(newCardOrder);
                saveCardOrder(newCardOrder);

                const newMap = { ...currentCardMap, [jobId]: listId };
                setCardMap(newMap);
                saveCardMap(newMap);

                if (currentLists.length > 0) {
                    const isLastList = listId === currentLists[currentLists.length - 1].id;
                    const job = currentJobs.find(j => j.id === jobId);
                    if (isLastList && job && job.status !== 'closed') {
                        patchJob(jobId, { status: 'closed' }).then(updated => {
                            if (updated) setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'closed' } : j));
                        });
                    } else if (!isLastList && job && job.status === 'closed') {
                        patchJob(jobId, { status: 'open' }).then(updated => {
                            if (updated) setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'open' } : j));
                        });
                    }
                }
            }

            dragJobId.current = null;
            setDraggingJobId(null);
            setDragOverListId(null);
            setDragOverJobId(null);
            setDragOverPosition(null);
            touchState.current = null;
        }

        board.addEventListener('touchmove', handleTouchMove, { passive: false });
        board.addEventListener('touchend', handleTouchEnd);
        board.addEventListener('touchcancel', handleTouchEnd);
        return () => {
            board.removeEventListener('touchmove', handleTouchMove);
            board.removeEventListener('touchend', handleTouchEnd);
            board.removeEventListener('touchcancel', handleTouchEnd);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const DONE_STATUSES = ['completed', 'delivered', 'cancelled', 'closed'];
    function isOverdue(job) {
        if (!job.estimated_delivery) return false;
        if (DONE_STATUSES.includes(job.status)) return false;
        const due = new Date(job.estimated_delivery);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return due < today;
    }
    function isDueToday(job) {
        if (!job.estimated_delivery) return false;
        const due = new Date(job.estimated_delivery);
        const today = new Date();
        return due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth() && due.getDate() === today.getDate();
    }
    const overdueCount = jobs.filter(isOverdue).length;
    const dueTodayCount = jobs.filter(isDueToday).length;

    function getListJobs(listId) {
        let filtered = jobs.filter(j => getJobListId(j) === listId);
        if (dueDateFilter === 'overdue') filtered = filtered.filter(isOverdue);
        else if (dueDateFilter === 'due_today') filtered = filtered.filter(isDueToday);
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

    function onCardTouchStart(e, jobId) {
        const touch = e.touches[0];
        touchState.current = {
            jobId,
            startX: touch.clientX,
            startY: touch.clientY,
            isDragging: false,
            ghostEl: null,
            targetListId: null,
            targetJobId: null,
            targetPosition: null,
            cardEl: e.currentTarget,
        };
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

    async function createJob(title, listId, position = 'bottom') {
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
                if (position === 'top') {
                    const existingIds = getListJobs(listId).map(j => j.id);
                    const newOrder = { ...cardOrder, [listId]: [data.result.id, ...existingIds] };
                    setCardOrder(newOrder);
                    saveCardOrder(newOrder);
                } else {
                    pendingScrollListId.current = listId;
                }
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

    async function createCardInline(listId, position = 'bottom') {
        const title = newCardTitle.trim();
        if (!title) {
            if (position === 'top') { setAddingCardToListIdTop(null); } else { setAddingCardToListId(null); }
            setNewCardTitle('');
            return;
        }
        const ok = await createJob(title, listId, position);
        if (ok) {
            setNewCardTitle('');
            if (position === 'top') { setAddingCardToListIdTop(null); } else { setAddingCardToListId(null); }
        }
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
        else if (jobSelectMode === 'quotation') onCreateQuotation?.(selectedJobs, commonCustomer);
        else if (jobSelectMode === 'non_vat_invoice') onCreateNonVatInvoice?.(selectedJobs, commonCustomer);
    }

    function fmtCurrency(val) { return val && parseFloat(val) > 0 ? parseFloat(val).toFixed(2) : null; }
    function fmtDate(iso) { if (!iso) return null; try { return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return null; } }



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
                <button type="button" onClick={() => setDueDateFilter(f => f === 'overdue' ? null : 'overdue')}
                    style={{ background: dueDateFilter === 'overdue' ? '#c62828' : 'rgba(255,255,255,0.15)', border: dueDateFilter === 'overdue' ? '1.5px solid #ef9a9a' : 'none', color: '#fff', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ color: dueDateFilter === 'overdue' ? '#fff' : '#f44336' }}></i>
                    <span>{t('Overdue')}</span>
                    {overdueCount > 0 && <span style={{ background: '#f44336', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{overdueCount}</span>}
                </button>
                <button type="button" onClick={() => setDueDateFilter(f => f === 'due_today' ? null : 'due_today')}
                    style={{ background: dueDateFilter === 'due_today' ? '#e65100' : 'rgba(255,255,255,0.15)', border: dueDateFilter === 'due_today' ? '1.5px solid #ffb74d' : 'none', color: '#fff', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="bi bi-calendar-event-fill" style={{ color: dueDateFilter === 'due_today' ? '#fff' : '#ff8b00' }}></i>
                    <span>{t('Due Today')}</span>
                    <span style={{ background: '#ff8b00', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{dueTodayCount}</span>
                </button>
                {/* Create dropdown */}
                <div ref={createDropdownRef} style={{ position: 'relative' }}>
                    <button type="button" onClick={() => setShowCreateDropdown(v => !v)}
                        style={{ background: '#0052cc', border: 'none', color: '#fff', borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="bi bi-plus-lg"></i>
                        <span>{t('Create')}</span>
                        <i className="bi bi-chevron-down" style={{ fontSize: 10 }}></i>
                    </button>
                    {showCreateDropdown && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 2000, minWidth: 180, overflow: 'hidden' }}
                            onMouseLeave={() => setShowCreateDropdown(false)}>
                            <button type="button" onClick={() => { setShowCreateDropdown(false); setNewJobTitle(''); setNewJobListId(lists[0]?.id || 'todo'); setShowNewJobModal(true); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#172b4d', textAlign: 'left' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                <i className="bi bi-kanban" style={{ color: '#0052cc', width: 16 }}></i>{t('New Job')}
                            </button>
                            {onCreateSalesInvoice && (
                                <button type="button" onClick={() => { setShowCreateDropdown(false); if (!selectedCustomer) { setShowCustomerRequired(true); return; } setJobSelectMode('invoice'); setSelectedJobIds(new Set()); setShowJobSelectModal(true); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#172b4d', textAlign: 'left' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                    <i className="bi bi-receipt" style={{ color: '#1a7fe8', width: 16 }}></i>{t('Sales Invoice')}
                                </button>
                            )}
                            {onCreateQuotation && (
                                <button type="button" onClick={() => { setShowCreateDropdown(false); if (!selectedCustomer) { setShowCustomerRequired(true); return; } setJobSelectMode('quotation'); setSelectedJobIds(new Set()); setShowJobSelectModal(true); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#172b4d', textAlign: 'left' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                    <i className="bi bi-file-earmark-text" style={{ color: '#6554c0', width: 16 }}></i>{t('Quotation')}
                                </button>
                            )}
                            {onCreateNonVatInvoice && (
                                <button type="button" onClick={() => { setShowCreateDropdown(false); if (!selectedCustomer) { setShowCustomerRequired(true); return; } setJobSelectMode('non_vat_invoice'); setSelectedJobIds(new Set()); setShowJobSelectModal(true); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#172b4d', textAlign: 'left' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                    <i className="bi bi-file-earmark-minus" style={{ color: '#00875a', width: 16 }}></i>{t('Non VAT Invoice')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <button type="button" onClick={toggleShowArchived}
                    style={{ background: showArchived ? '#455a64' : 'rgba(255,255,255,0.15)', border: showArchived ? '1.5px solid #90a4ae' : 'none', color: '#fff', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className={showArchived ? 'bi bi-archive-fill' : 'bi bi-archive'}></i>
                    <span>{showArchived ? t('Hide Archived') : t('Show Archived')}</span>
                </button>
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
            <div ref={boardRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: 12, padding: '14px 18px', alignItems: 'stretch' }}>
                {lists.map(list => {
                    const listJobs = getListJobs(list.id);
                    const visibleJobs = listJobs.slice(0, (columnPages[list.id] || 1) * PAGE_SIZE);
                    const hasMoreJobs = listJobs.length > visibleJobs.length;
                    const isCardTarget = dragOverListId === list.id && draggingJobId && !dragOverJobId;
                    const isListTarget = dragOverListId === list.id && draggingListId && draggingListId !== list.id;
                    const isBeingDragged = draggingListId === list.id;

                    return (
                        <div
                            key={list.id}
                            data-list-id={list.id}
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
                                {/* Inline add card at top */}
                                {addingCardToListIdTop === list.id ? (
                                    <div style={{ marginBottom: 2 }}>
                                        <textarea
                                            autoFocus
                                            value={newCardTitle}
                                            onChange={(e) => setNewCardTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); createCardInline(list.id, 'top'); }
                                                if (e.key === 'Escape') { setAddingCardToListIdTop(null); setNewCardTitle(''); }
                                            }}
                                            placeholder={t('Enter a title for this card...')}
                                            rows={3}
                                            style={{ width: '100%', border: '2px solid #0052cc', borderRadius: 4, padding: '8px 10px', fontSize: 13, outline: 'none', resize: 'none', marginBottom: 6, fontFamily: 'inherit', background: '#fff' }}
                                        />
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <button type="button"
                                                onClick={() => createCardInline(list.id, 'top')}
                                                disabled={isCreatingCard || !newCardTitle.trim()}
                                                style={{ background: '#0052cc', border: 'none', color: '#fff', borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                                                {isCreatingCard ? <Spinner as="span" animation="border" size="sm" /> : null}
                                                {t('Add card')}
                                            </button>
                                            <button type="button"
                                                onClick={() => { setAddingCardToListIdTop(null); setNewCardTitle(''); }}
                                                style={{ background: 'none', border: 'none', color: '#5e6c84', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>
                                                <i className="bi bi-x"></i>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button type="button"
                                        onClick={() => { setAddingCardToListIdTop(list.id); setAddingCardToListId(null); setNewCardTitle(''); }}
                                        style={{ width: '100%', background: 'none', border: 'none', borderRadius: 5, padding: '7px 10px', cursor: 'pointer', fontSize: 12, color: '#5e6c84', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 5 }}
                                        onMouseOver={e => e.currentTarget.style.background = '#cdd2da'}
                                        onMouseOut={e => e.currentTarget.style.background = 'none'}>
                                        <i className="bi bi-plus"></i> {t('Add a card')}
                                    </button>
                                )}
                                {(() => {
                                    const firstDroppable = visibleJobs.find(j => j.id !== draggingJobId);
                                    return draggingJobId && firstDroppable ? (
                                        <div
                                            style={{ height: 6, flexShrink: 0 }}
                                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverJobId(firstDroppable.id); setDragOverPosition('above'); }}
                                        />
                                    ) : null;
                                })()}
                                {visibleJobs.map(job => {
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
                                                onTouchStart={(e) => onCardTouchStart(e, job.id)}
                                                onDragStart={(e) => { onCardDragStart(e, job.id); setHoveredJobId(null); }}
                                                onDragEnd={onDragEnd}
                                                onDragOver={(e) => onCardDragOver(e, job.id)}
                                                onDragLeave={onCardDragLeave}
                                                onMouseEnter={() => setHoveredJobId(job.id)}
                                                onMouseLeave={() => setHoveredJobId(null)}
                                                onClick={() => { if (!isDragging && onOpenCard) onOpenCard(job.id); }}
                                                style={{
                                                    position: 'relative',
                                                    background: isDragging ? '#eef2ff' : 'linear-gradient(160deg, #ffffff 0%, #f9fbfe 100%)',
                                                    borderRadius: 10,
                                                    padding: '12px 13px 11px 15px',
                                                    border: '1px solid #e8ecf2',
                                                    borderLeftWidth: 3,
                                                    borderLeftColor: STATUS_ACCENT[job.status] || '#94a3b8',
                                                    boxShadow: isHovered && !isDragging
                                                        ? '0 8px 24px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.06)'
                                                        : '0 1px 3px rgba(15,23,42,0.07)',
                                                    cursor: isDragging ? 'grabbing' : 'pointer',
                                                    opacity: isDragging ? 0.45 : 1,
                                                    userSelect: 'none',
                                                    transform: isHovered && !isDragging ? 'translateY(-2px)' : 'none',
                                                    transition: 'box-shadow 0.18s ease, transform 0.18s ease',
                                                }}
                                            >
                                            {/* Action buttons on hover */}
                                            {isHovered && !isDragging && (
                                                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 3, zIndex: 1 }}>
                                                    {showArchived ? (
                                                        <div onMouseDown={e => e.stopPropagation()}
                                                            onClick={e => { e.stopPropagation(); unarchiveJob(job.id); }}
                                                            style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 5, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                            title={t('Unarchive')}>
                                                            <i className="bi bi-arrow-counterclockwise" style={{ fontSize: 11, color: '#92400e' }}></i>
                                                        </div>
                                                    ) : (
                                                        <div onMouseDown={e => e.stopPropagation()}
                                                            onClick={e => { e.stopPropagation(); if (window.confirm(t('Archive this repair job?'))) archiveJob(job.id); }}
                                                            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 5, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                            title={t('Archive')}>
                                                            <i className="bi bi-archive" style={{ fontSize: 11, color: '#64748b' }}></i>
                                                        </div>
                                                    )}
                                                    <div onMouseDown={e => e.stopPropagation()}
                                                        onClick={e => { e.stopPropagation(); if (onOpenCard) onOpenCard(job.id); }}
                                                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 5, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                        title={t('Open Card')}>
                                                        <i className="bi bi-arrow-up-right-square" style={{ fontSize: 11, color: '#2563eb' }}></i>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Header row: job number + status */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7, paddingRight: isHovered ? 60 : 0 }}>
                                                <span style={{ fontSize: 10, color: '#b0bbc8', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                                                    {job.job_number || '—'}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_ACCENT[job.status] || '#94a3b8', display: 'inline-block', flexShrink: 0 }}></span>
                                                    <span style={{ fontSize: 10, color: STATUS_ACCENT[job.status] || '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                                                        {job.status === 'in_progress' ? 'In Progress' : (job.status || 'open')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Title */}
                                            {job.title
                                                ? <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 9, lineHeight: 1.45, letterSpacing: '-0.01em' }}>{job.title}</div>
                                                : <div style={{ fontStyle: 'italic', fontSize: 12, color: '#cbd5e1', marginBottom: 9 }}>{t('No title')}</div>
                                            }

                                            {/* Info chips */}
                                            {(job.vehicle_number || job.brand || job.customer_name) && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                                                    {(job.vehicle_number || job.brand) && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 20, padding: '3px 9px', alignSelf: 'flex-start', maxWidth: '100%' }}>
                                                            <i className="bi bi-car-front-fill" style={{ fontSize: 10, color: '#2563eb', flexShrink: 0 }}></i>
                                                            <span style={{ fontSize: 11, color: '#1e40af', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {[job.vehicle_number, job.brand, job.model].filter(Boolean).join(' · ')}
                                                            </span>
                                                        </span>
                                                    )}
                                                    {job.customer_name && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '3px 9px', alignSelf: 'flex-start', maxWidth: '100%' }}>
                                                            <i className="bi bi-person-fill" style={{ fontSize: 10, color: '#16a34a', flexShrink: 0 }}></i>
                                                            <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {job.customer_name}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Technicians as avatar circles */}
                                            {(() => {
                                                const names = (job.technician_names && job.technician_names.length > 0)
                                                    ? job.technician_names
                                                    : (job.technician_name ? [job.technician_name] : []);
                                                if (!names.length) return null;
                                                const AV_COLORS = ['#6366f1', '#f97316', '#0ea5e9', '#8b5cf6', '#10b981'];
                                                return (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                                                        <i className="bi bi-tools" style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}></i>
                                                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                                                            {names.map((name, i) => {
                                                                const initials = name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
                                                                return (
                                                                    <div key={i} title={name}
                                                                        style={{ width: 22, height: 22, borderRadius: '50%', background: AV_COLORS[i % AV_COLORS.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, marginLeft: i > 0 ? -7 : 0, border: '2px solid #fff', position: 'relative', zIndex: names.length - i, cursor: 'default' }}>
                                                                        {initials}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {names.length === 1 && (
                                                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{names[0]}</span>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Footer: dates + total */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #edf0f5', gap: 6 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    {fmtDate(job.date) && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b' }}>
                                                            <i className="bi bi-calendar3" style={{ fontSize: 9, color: '#94a3b8' }}></i>
                                                            <span>{fmtDate(job.date)}</span>
                                                        </div>
                                                    )}
                                                    {fmtDate(job.estimated_delivery) && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#b45309' }}>
                                                            <i className="bi bi-hourglass-split" style={{ fontSize: 9 }}></i>
                                                            <span>Due {fmtDate(job.estimated_delivery)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {fmtCurrency(job.total_with_vat || job.total) && (
                                                    <div style={{ fontSize: 14, fontWeight: 900, color: '#111827', whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '-0.02em' }}>
                                                        {fmtCurrency(job.total_with_vat || job.total)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Linked documents */}
                                            {(job.order_id || job.quotation_id || job.non_vat_sales_id) && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                                                    {job.order_id && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '2px 8px', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                                                            <i className="bi bi-receipt" style={{ fontSize: 9 }}></i>
                                                            INV{job.order_net_total ? ` · ${fmtCurrency(job.order_net_total)}` : ''}
                                                        </span>
                                                    )}
                                                    {job.quotation_id && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, background: '#fef9c3', color: '#a16207', borderRadius: 20, padding: '2px 8px', fontWeight: 700, border: '1px solid #fde68a' }}>
                                                            <i className="bi bi-file-earmark-text" style={{ fontSize: 9 }}></i>
                                                            QTN{job.quotation_net_total ? ` · ${fmtCurrency(job.quotation_net_total)}` : ''}
                                                        </span>
                                                    )}
                                                    {job.non_vat_sales_id && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, background: '#faf5ff', color: '#7e22ce', borderRadius: 20, padding: '2px 8px', fontWeight: 700, border: '1px solid #e9d5ff' }}>
                                                            <i className="bi bi-receipt-cutoff" style={{ fontSize: 9 }}></i>
                                                            N-VAT{job.non_vat_sales_net_total ? ` · ${fmtCurrency(job.non_vat_sales_net_total)}` : ''}
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

                            {/* Always-visible "N more" strip — click or scroll to load next batch */}
                            {hasMoreJobs && (
                                <div
                                    onClick={() => setColumnPages(prev => ({ ...prev, [list.id]: (prev[list.id] || 1) + 1 }))}
                                    style={{ flexShrink: 0, background: '#dfe1e6', borderTop: '1px solid #c1c7d0', padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, color: '#5e6c84', userSelect: 'none', cursor: 'pointer' }}
                                    onMouseOver={e => e.currentTarget.style.background = '#c8cdd6'}
                                    onMouseOut={e => e.currentTarget.style.background = '#dfe1e6'}
                                >
                                    <i className="bi bi-arrow-down-circle" style={{ fontSize: 12 }}></i>
                                    {listJobs.length - visibleJobs.length} {t('more')} — {t('scroll or click to load')}
                                </div>
                            )}

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
                                        onClick={() => { setAddingCardToListId(list.id); setAddingCardToListIdTop(null); setNewCardTitle(''); }}
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
                    jobSelectMode === 'non_vat_invoice' ? !j.non_vat_sales_id
                    : jobSelectMode === 'quotation' ? !j.quotation_id : !j.order_id
                );
                return (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                    <div style={{ background: '#fff', borderRadius: 10, padding: 24, maxWidth: 640, width: '95%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h5 style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>
                                {jobSelectMode === 'quotation' ? t('Select Job Cards for Quotation') : jobSelectMode === 'non_vat_invoice' ? t('Select Job Cards for Non-VAT Invoice') : t('Select Job Cards for Sales Invoice')}
                            </h5>
                            <button type="button" onClick={() => setShowJobSelectModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666', lineHeight: 1 }}>×</button>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#666' }}>{t('Select one or more job cards to include.')}</p>
                        <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e5e7eb', borderRadius: 6 }}>
                            {availableJobs.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 13 }}>
                                    {jobs.length === 0
                                        ? t('No jobs visible on this board.')
                                        : jobSelectMode === 'quotation'
                                            ? t('All job cards on this board already have a quotation.')
                                            : jobSelectMode === 'non_vat_invoice'
                                                ? t('All job cards on this board already have a non-VAT invoice.')
                                                : t('All job cards on this board already have a sales invoice.')}
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
                                {jobSelectMode === 'quotation' ? t('Create Quotation') : jobSelectMode === 'non_vat_invoice' ? t('Create Non-VAT Invoice') : t('Create Sales Invoice')}{selectedJobIds.size > 0 ? ` (${selectedJobIds.size})` : ''}
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
