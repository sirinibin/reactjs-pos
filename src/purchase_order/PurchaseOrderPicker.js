import React, { useState, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import { format } from "date-fns";
import NumberFormat from "react-number-format";
import { useTranslation } from "react-i18next";
import { ObjectToSearchQueryParams } from "../utils/queryUtils.js";
import { trimTo2Decimals } from "../utils/numberUtils";
import { highlightWords } from "../utils/search.js";
import TableSettingsModal from "../utils/TableSettingsModal.js";

const STATUS_COLORS = {
    draft: "#6b7280",
    sent: "#2563eb",
    confirmed: "#7c3aed",
    partially_received: "#d97706",
    received: "#16a34a",
    cancelled: "#dc2626",
};

const STATUS_LABELS = {
    draft: "Draft",
    sent: "Sent",
    confirmed: "Confirmed",
    partially_received: "Partially Received",
    received: "Received",
    cancelled: "Cancelled",
};

const DEFAULT_VENDOR_COLS = [
    { key: "code",   label: "Code",    width: 10, visible: true },
    { key: "name",   label: "Name",    width: 50, visible: true },
    { key: "phone",  label: "Phone",   width: 20, visible: true },
    { key: "vat_no", label: "VAT No.", width: 20, visible: true },
];
const VENDOR_COLS_KEY = "po_picker_vendor_columns";

function loadVendorCols() {
    try {
        const saved = localStorage.getItem(VENDOR_COLS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            const keyMap = {};
            parsed.forEach(c => { keyMap[c.key] = c; });
            return DEFAULT_VENDOR_COLS.map(d => keyMap[d.key] ? { ...d, ...keyMap[d.key] } : d);
        }
    } catch (_) {}
    return DEFAULT_VENDOR_COLS.map(c => ({ ...c }));
}

const PurchaseOrderPicker = forwardRef((props, ref) => {
    const { t } = useTranslation("common");
    const [show, setShow] = useState(false);
    const [list, setList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [codeSearch, setCodeSearch] = useState("");
    const [vendorOptions, setVendorOptions] = useState([]);
    const [selectedVendors, setSelectedVendors] = useState([]);
    const [statusFilter, setStatusFilter] = useState("");
    const timerRef = useRef(null);
    const callbackRef = useRef(null);
    const vendorSearchRef = useRef(null);

    // controlled open state — same pattern as purchase form
    let [openVendorSearch, setOpenVendorSearch] = useState(false);

    // Vendor search column settings
    const [vendorCols, setVendorCols] = useState(loadVendorCols);
    const [showVendorSettings, setShowVendorSettings] = useState(false);

    useImperativeHandle(ref, () => ({
        open(callback, defaultVendor = null) {
            callbackRef.current = callback;
            setCodeSearch("");
            setStatusFilter("");
            setList([]);
            openVendorSearch = false;
            setOpenVendorSearch(false);
            setVendorOptions([]);
            setSelectedVendors(defaultVendor ? [defaultVendor] : []);
            fetchList(defaultVendor ? { vendor_id: defaultVendor.id } : {});
            setShow(true);
        },
    }));

    // vendor client-side filter (mirrors purchase form's customVendorFilter)
    const customVendorFilter = useCallback((option, query) => {
        const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim() || "";
        const q = normalize(query);
        const qWords = q.split(" ");
        const fields = [
            option.code            || "",
            option.vat_no          || "",
            option.name            || "",
            option.name_in_arabic  || "",
            option.phone           || "",
            option.search_label    || "",
        ];
        const searchable = normalize(fields.join(" "));
        const searchableCompact = fields.join(" ").toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, "")
            .replace(/\s+/g, " ").trim();
        return qWords.every(word => {
            if (searchable.includes(word)) return true;
            const wordCompact = word.replace(/[^\p{L}\p{N}]/gu, "");
            if (!wordCompact || /^[^\p{L}\p{N}]/u.test(word)) return false;
            return searchableCompact.includes(wordCompact);
        });
    }, []);

    const vendorPercentOccurrence = (words, vendor) => {
        const fields = [vendor.code, vendor.name, vendor.name_in_arabic, vendor.phone, vendor.vat_no];
        const searchable = fields.join(" ").toLowerCase();
        const searchableWords = searchable.split(/\s+/).filter(Boolean);
        let totalMatches = 0;
        words.forEach(word => {
            if (word) {
                const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
                const matches = searchable.match(regex);
                totalMatches += matches ? matches.length : 0;
            }
        });
        return searchableWords.length > 0 ? (totalMatches / searchableWords.length) : 0;
    };

    async function suggestVendors(searchTerm) {
        setVendorOptions([]);
        if (!searchTerm) {
            setTimeout(() => {
                openVendorSearch = false;
                setOpenVendorSearch(false);
            }, 300);
            return;
        }
        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        };
        searchTerm = searchTerm.replace(/\s+/g, " ").trim();
        if (!searchTerm) return;
        const qp = ObjectToSearchQueryParams({ store_id: localStorage.getItem("store_id"), query: searchTerm });
        const Select = "select=id,code,vat_no,name,phone,name_in_arabic,search_label";
        const result = await fetch(`/v1/vendor?limit=100&${Select}&${qp}`, requestOptions);
        const data = await result.json();
        if (!data.result || data.result.length === 0) {
            openVendorSearch = false;
            setOpenVendorSearch(false);
            return;
        }
        const filtered = data.result.filter(opt => customVendorFilter(opt, searchTerm));
        const searchPhrase = searchTerm.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
        const words = searchPhrase.split(/\s+/).filter(Boolean);
        const sorted = filtered.sort((a, b) => {
            const getSearchable = item => [item.code, item.name, item.name_in_arabic, item.phone, item.vat_no]
                .join(" ").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
            const aS = getSearchable(a), bS = getSearchable(b);
            const aIdx = aS.indexOf(searchPhrase), bIdx = bS.indexOf(searchPhrase);
            if (aIdx === 0 && bIdx !== 0) return -1;
            if (bIdx === 0 && aIdx !== 0) return 1;
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return vendorPercentOccurrence(words, b) - vendorPercentOccurrence(words, a);
        });
        openVendorSearch = true;
        setOpenVendorSearch(true);
        setVendorOptions(sorted);
    }

    const fetchList = useCallback((overrides = {}) => {
        setIsLoading(true);
        const storeId = localStorage.getItem("store_id");
        let parts = [`search[store_id]=${storeId}`, `limit=30`, `sort=-created_at`];
        if (overrides.code) parts.push(`search[code]=${encodeURIComponent(overrides.code)}`);
        if (overrides.vendor_id) parts.push(`search[vendor_id]=${overrides.vendor_id}`);
        if (overrides.status) parts.push(`search[status]=${overrides.status}`);
        fetch("/v1/purchase-order?" + parts.join("&"), {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        })
            .then(async r => {
                const d = await r.json();
                setIsLoading(false);
                if (r.ok) setList(d.result || []);
            })
            .catch(() => setIsLoading(false));
    }, []);

    // current filter state -> used by handleSearch to combine all active filters
    const currentFilters = useRef({ code: "", vendor_id: "", status: "" });

    function handleSearch(overrides = {}) {
        const merged = { ...currentFilters.current, ...overrides };
        currentFilters.current = merged;
        const params = {};
        if (merged.code) params.code = merged.code;
        if (merged.vendor_id) params.vendor_id = merged.vendor_id;
        if (merged.status) params.status = merged.status;
        fetchList(params);
    }

    function handleSelect(po) {
        if (callbackRef.current) callbackRef.current(po);
        setShow(false);
    }

    // Vendor col handlers
    function handleToggleVendorCol(index) {
        const updated = vendorCols.map((c, i) => i === index ? { ...c, visible: !c.visible } : c);
        setVendorCols(updated);
        localStorage.setItem(VENDOR_COLS_KEY, JSON.stringify(updated));
    }
    function handleVendorColDragEnd(result) {
        if (!result.destination) return;
        const reordered = Array.from(vendorCols);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setVendorCols(reordered);
        localStorage.setItem(VENDOR_COLS_KEY, JSON.stringify(reordered));
    }
    function restoreVendorColDefaults() {
        const cloned = DEFAULT_VENDOR_COLS.map(c => ({ ...c }));
        setVendorCols(cloned);
        localStorage.setItem(VENDOR_COLS_KEY, JSON.stringify(cloned));
    }
    const startVendorColResize = useCallback((e, colKey) => {
        e.preventDefault(); e.stopPropagation();
        const startX = e.clientX;
        let currentCols = null;
        setVendorCols(prev => { currentCols = prev; return prev; });
        setTimeout(() => {
            const cols = currentCols || DEFAULT_VENDOR_COLS;
            const col = cols.find(c => c.key === colKey);
            if (!col) return;
            const startWidth = col.width;
            const totalW = cols.filter(c => c.visible).reduce((s, c) => s + c.width, 0);
            const pxPerUnit = (window.innerWidth * 0.95) / totalW;
            function onMouseMove(ev) {
                const newWidth = Math.max(3, startWidth + (ev.clientX - startX) / pxPerUnit);
                setVendorCols(prev => {
                    const updated = prev.map(c => c.key === colKey ? { ...c, width: parseFloat(newWidth.toFixed(1)) } : c);
                    localStorage.setItem(VENDOR_COLS_KEY, JSON.stringify(updated));
                    return updated;
                });
            }
            function onMouseUp() {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                document.body.style.cursor = "";
            }
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "col-resize";
        }, 0);
    }, []);

    const statusOptions = Object.entries(STATUS_LABELS).map(([id, label]) => ({ id, label }));

    const visCols = vendorCols.filter(c => c.visible);
    const totW = visCols.reduce((s, c) => s + c.width, 0);
    const cw = (col) => `${(col.width / totW) * 100}%`;
    const resizeHandle = (colKey) => (
        <div onMouseDown={e => startVendorColResize(e, colKey)}
            style={{ position: "absolute", right: 0, top: "10%", bottom: "10%", width: "5px", cursor: "col-resize", zIndex: 2 }} />
    );

    return (
        <>
            <Modal show={show} onHide={() => setShow(false)} size="xl" animation={false}>
                <Modal.Header style={{ backgroundColor: "#fff", borderBottom: "1px solid #c3c6d7", padding: "12px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                        <i className="bi bi-file-earmark-text" style={{ color: "#004ac6", fontSize: "18px" }}></i>
                        <h5 style={{ margin: 0, fontWeight: 700, fontFamily: "'Hanken Grotesk', sans-serif", color: "#191c1e" }}>
                            {t("Import from Purchase Order")}
                        </h5>
                    </div>
                    <button type="button" className="btn-close" onClick={() => setShow(false)} aria-label="Close" />
                </Modal.Header>
                <Modal.Body style={{ padding: "16px 20px" }}>

                    {/* Filters */}
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px", alignItems: "flex-end" }}>
                        <div style={{ position: "relative", minWidth: "150px" }}>
                            <span style={{ position: "absolute", top: "-8px", left: "8px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px", lineHeight: 1, zIndex: 1 }}>{t("Code")}</span>
                            <input type="text" className="form-control form-control-sm" value={codeSearch}
                                onChange={e => {
                                    const val = e.target.value;
                                    setCodeSearch(val);
                                    if (timerRef.current) clearTimeout(timerRef.current);
                                    timerRef.current = setTimeout(() => handleSearch({ code: val || undefined }), 400);
                                }}
                                placeholder="PO-..." style={{ minWidth: "140px" }} />
                        </div>

                        {/* Vendor search — same pattern as purchase form */}
                        <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
                            <span style={{ position: "absolute", top: "-8px", left: "8px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px", lineHeight: 1, zIndex: 1 }}>{t("Vendor")}</span>
                            <Typeahead
                                id="po_picker_vendor"
                                positionFixed={true}
                                filterBy={() => true}
                                labelKey="name"
                                open={openVendorSearch}
                                options={vendorOptions}
                                selected={selectedVendors}
                                size="sm"
                                placeholder={t("Vendor Name / Mob / VAT # / ID")}
                                highlightOnlyResult={true}
                                ref={vendorSearchRef}
                                onKeyDown={e => {
                                    if (e.key === "Escape") {
                                        openVendorSearch = false;
                                        setOpenVendorSearch(false);
                                        setSelectedVendors([]);
                                        setVendorOptions([]);
                                        vendorSearchRef.current?.clear();
                                        handleSearch({ vendor_id: undefined });
                                    }
                                }}
                                onChange={sel => {
                                    openVendorSearch = false;
                                    setOpenVendorSearch(false);
                                    setSelectedVendors(sel);
                                    handleSearch({ vendor_id: sel[0]?.id });
                                }}
                                onInputChange={term => {
                                    if (timerRef.current) clearTimeout(timerRef.current);
                                    timerRef.current = setTimeout(() => suggestVendors(term), 350);
                                }}
                                renderMenu={(results, menuProps, state) => {
                                    const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);
                                    return (
                                        <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: "95vw", maxWidth: "95vw", minWidth: "300px", zIndex: 9999 }}>
                                            <MenuItem disabled style={{ position: "sticky", top: 0, padding: 0, margin: 0 }}>
                                                <div style={{ display: "flex", fontWeight: 700, color: "#374151", padding: "4px 8px", background: "#f8f9fa", borderBottom: "1px solid #e2e8f0", pointerEvents: "auto", position: "relative" }}>
                                                    {visCols.map(col => (
                                                        <div key={col.key} style={{ width: cw(col), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", position: "relative" }}>
                                                            {col.key === "code"   && t("Code")}
                                                            {col.key === "name"   && t("Name")}
                                                            {col.key === "phone"  && t("Phone")}
                                                            {col.key === "vat_no" && t("VAT No.")}
                                                            {resizeHandle(col.key)}
                                                        </div>
                                                    ))}
                                                    <div style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}
                                                        onClick={e => { e.stopPropagation(); setShowVendorSettings(true); }}>
                                                        <i className="bi bi-gear-fill" style={{ fontSize: "13px", color: "#6b7280" }} />
                                                    </div>
                                                </div>
                                            </MenuItem>
                                            {results.map((option, idx) => {
                                                const isActive = state.activeIndex === idx || results.length === 1;
                                                const rowBg = isActive ? "#e8f0fe" : "transparent";
                                                return (
                                                    <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                        <div style={{ display: "flex", padding: "5px 8px", alignItems: "center", background: rowBg }}>
                                                            {visCols.map(col => (
                                                                <div key={col.key} style={{ width: cw(col), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                    {col.key === "code"   && <span style={{ fontFamily: "monospace", color: isActive ? "#004ac6" : "#374151", fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.code, searchWords, isActive)}</span>}
                                                                    {col.key === "name"   && <span style={{ color: isActive ? "#191c1e" : "#374151", fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.name + (option.name_in_arabic ? " - " + option.name_in_arabic : ""), searchWords, isActive)}</span>}
                                                                    {col.key === "phone"  && <span style={{ color: "#6b7280" }}>{highlightWords(option.phone || "–", searchWords, isActive)}</span>}
                                                                    {col.key === "vat_no" && <span style={{ color: "#6b7280" }}>{highlightWords(option.vat_no || "–", searchWords, isActive)}</span>}
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

                        <div style={{ position: "relative", minWidth: "170px" }}>
                            <span style={{ position: "absolute", top: "-8px", left: "8px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px", lineHeight: 1, zIndex: 1 }}>{t("Status")}</span>
                            <select className="form-select form-select-sm" value={statusFilter}
                                onChange={e => {
                                    const val = e.target.value;
                                    setStatusFilter(val);
                                    handleSearch({ status: val || undefined });
                                }}>
                                <option value="">{t("All Statuses")}</option>
                                {statusOptions.map(s => <option key={s.id} value={s.id}>{t(s.label)}</option>)}
                            </select>
                        </div>
                        <button type="button" onClick={() => handleSearch()}
                            style={{ background: "#004ac6", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                            <i className="bi bi-search" /> {t("Search")}
                        </button>
                    </div>

                    {/* PO Table */}
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                        <div className="table-responsive" style={{ maxHeight: "420px", overflowY: "auto" }}>
                            <table className="table table-sm table-hover" style={{ marginBottom: 0, fontSize: "13px" }}>
                                <thead style={{ background: "#f8f9fa", position: "sticky", top: 0, zIndex: 1 }}>
                                    <tr>
                                        <th style={{ padding: "8px 12px", fontWeight: 700, fontSize: "12px", color: "#374151" }}>{t("Code")}</th>
                                        <th style={{ padding: "8px 10px", fontWeight: 700, fontSize: "12px", color: "#374151" }}>{t("Date")}</th>
                                        <th style={{ padding: "8px 10px", fontWeight: 700, fontSize: "12px", color: "#374151" }}>{t("Vendor")}</th>
                                        <th style={{ padding: "8px 10px", fontWeight: 700, fontSize: "12px", color: "#374151" }}>{t("Status")}</th>
                                        <th style={{ padding: "8px 10px", fontWeight: 700, fontSize: "12px", color: "#374151", textAlign: "right" }}>{t("Net Total")}</th>
                                        <th style={{ padding: "8px 10px", fontWeight: 700, fontSize: "12px", color: "#374151", textAlign: "center" }}>{t("Products")}</th>
                                        <th style={{ padding: "8px 10px", fontWeight: 700, fontSize: "12px", color: "#374151" }}>{t("Expected Date")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "#6b7280" }}>
                                            <Spinner animation="border" size="sm" /> {t("Loading...")}
                                        </td></tr>
                                    ) : list.length === 0 ? (
                                        <tr><td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "#9ca3af", fontStyle: "italic" }}>
                                            {t("No purchase orders found.")}
                                        </td></tr>
                                    ) : list.map(po => (
                                        <tr key={po.id} onClick={() => handleSelect(po)}
                                            style={{ cursor: "pointer" }}
                                            title={t("Click to import products from this PO")}>
                                            <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "#004ac6" }}>{po.code}</td>
                                            <td style={{ padding: "8px 10px" }}>{po.date ? format(new Date(po.date), "dd-MMM-yyyy") : "–"}</td>
                                            <td style={{ padding: "8px 10px", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{po.vendor_name || "–"}</td>
                                            <td style={{ padding: "8px 10px" }}>
                                                <span style={{
                                                    background: `${STATUS_COLORS[po.status] || "#6b7280"}18`,
                                                    color: STATUS_COLORS[po.status] || "#6b7280",
                                                    border: `1px solid ${STATUS_COLORS[po.status] || "#6b7280"}40`,
                                                    borderRadius: "10px", padding: "2px 8px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap"
                                                }}>
                                                    {t(STATUS_LABELS[po.status] || po.status)}
                                                </span>
                                            </td>
                                            <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>
                                                <NumberFormat value={trimTo2Decimals(po.net_total || 0)} displayType="text" thousandSeparator={true} renderText={v => v} />
                                            </td>
                                            <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                                <span style={{ background: "#e8edf5", borderRadius: "10px", padding: "2px 8px", fontSize: "11px", fontWeight: 600 }}>
                                                    {(po.products || []).length}
                                                </span>
                                            </td>
                                            <td style={{ padding: "8px 10px", color: "#6b7280" }}>{po.expected_date ? format(new Date(po.expected_date), "dd-MMM-yyyy") : "–"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div style={{ marginTop: "10px", fontSize: "12px", color: "#6b7280" }}>
                        <i className="bi bi-info-circle" style={{ marginRight: "4px" }} />
                        {t("Click on a row to import its products into the current form.")}
                    </div>
                </Modal.Body>
            </Modal>

            <TableSettingsModal
                show={showVendorSettings}
                onHide={() => setShowVendorSettings(false)}
                title={t("Vendor Search Settings")}
                columns={vendorCols}
                onToggleColumn={handleToggleVendorCol}
                onDragEnd={handleVendorColDragEnd}
                onRestoreDefaults={restoreVendorColDefaults}
            />
        </>
    );
});

export default PurchaseOrderPicker;
