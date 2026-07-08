import React, { useState, useRef, forwardRef, useImperativeHandle, useCallback, useEffect } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { Typeahead, Menu, MenuItem } from "react-bootstrap-typeahead";
import { highlightWords } from "../utils/search.js";
import { format } from "date-fns";
import NumberFormat from "react-number-format";
import { useTranslation } from "react-i18next";
import { trimTo2Decimals } from "../utils/numberUtils";
import TableSettingsModal from "../utils/TableSettingsModal.js";

const DEFAULT_PARTY_COLS = [
    { key: 'code',   label: 'Code',    width: 12, visible: true },
    { key: 'name',   label: 'Name',    width: 48, visible: true },
    { key: 'phone',  label: 'Phone',   width: 20, visible: true },
    { key: 'vat_no', label: 'VAT No.', width: 20, visible: true },
];
const PARTY_COLS_KEY = 'po_src_picker_party_search_columns';

const DOC_CONFIGS = {
    quotation:       { title: "Import from Quotation",       apiPath: "quotation",       partyType: "customer", codePrefix: "QT-" },
    sales:           { title: "Import from Sales",           apiPath: "order",           partyType: "customer", codePrefix: "SI-" },
    sales_return:    { title: "Import from Sales Return",    apiPath: "sales-return",    partyType: "customer", codePrefix: "SR-" },
    purchase:        { title: "Import from Purchase",        apiPath: "purchase",        partyType: "vendor",   codePrefix: "PI-" },
    purchase_return: { title: "Import from Purchase Return", apiPath: "purchase-return", partyType: "vendor",   codePrefix: "PR-" },
    delivery_note:   { title: "Import from Delivery Note",   apiPath: "delivery-note",   partyType: "customer", codePrefix: "DN-" },
};

const PAGE_SIZE = 20;

const customPartyFilter = (option, props) => {
    const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim() || "";
    const q = normalize(props.text);
    const qWords = q.split(" ");
    const fields = [
        option.code,
        option.vat_no,
        option.name,
        option.name_in_arabic,
        option.phone,
        option.search_label,
        option.phone_in_arabic,
        ...(Array.isArray(option.additional_keywords) ? option.additional_keywords : []),
    ];
    const searchable = normalize(fields.join(" "));
    return qWords.every((word) => searchable.includes(word));
};

const SourceDocumentPicker = forwardRef((props, ref) => {
    const { t } = useTranslation("common");
    const [show, setShow] = useState(false);
    const [docType, setDocType] = useState("quotation");
    const [list, setList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [codeSearch, setCodeSearch] = useState("");
    const [partyOptions, setPartyOptions] = useState([]);
    const [selectedParties, setSelectedParties] = useState([]);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const timerRef = useRef(null);
    const callbackRef = useRef(null);
    const partySearchRef = useRef(null);
    const codeRef = useRef("");
    const selectedPartiesRef = useRef([]);
    const [showPartySearchSettings, setShowPartySearchSettings] = useState(false);
    const [partySearchColumns, setPartySearchColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(PARTY_COLS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const keyMap = {};
                parsed.forEach(c => { keyMap[c.key] = c; });
                return DEFAULT_PARTY_COLS.map(d => keyMap[d.key] ? { ...d, ...keyMap[d.key] } : d);
            }
        } catch {}
        return DEFAULT_PARTY_COLS.map(c => ({ ...c }));
    });
    function handleTogglePartyCol(index) {
        const updated = partySearchColumns.map((c, i) => i === index ? { ...c, visible: !c.visible } : c);
        setPartySearchColumns(updated);
        localStorage.setItem(PARTY_COLS_KEY, JSON.stringify(updated));
    }
    function handlePartyColDragEnd(result) {
        if (!result.destination) return;
        const reordered = Array.from(partySearchColumns);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setPartySearchColumns(reordered);
        localStorage.setItem(PARTY_COLS_KEY, JSON.stringify(reordered));
    }
    function restorePartyColDefaults() {
        const cloned = DEFAULT_PARTY_COLS.map(c => ({ ...c }));
        setPartySearchColumns(cloned);
        localStorage.setItem(PARTY_COLS_KEY, JSON.stringify(cloned));
    }
    const startPartyColResize = useCallback((e, colKey) => {
        e.preventDefault(); e.stopPropagation();
        const startX = e.clientX;
        let currentCols = null;
        setPartySearchColumns(prev => { currentCols = prev; return prev; });
        setTimeout(() => {
            const cols = currentCols || DEFAULT_PARTY_COLS;
            const col = cols.find(c => c.key === colKey);
            if (!col) return;
            const startWidth = col.width;
            const totalW = cols.filter(c => c.visible).reduce((s, c) => s + c.width, 0);
            const pxPerUnit = (window.innerWidth * 0.95) / totalW;
            function onMouseMove(ev) {
                const newWidth = Math.max(3, startWidth + (ev.clientX - startX) / pxPerUnit);
                setPartySearchColumns(prev => {
                    const updated = prev.map(c => c.key === colKey ? { ...c, width: parseFloat(newWidth.toFixed(1)) } : c);
                    localStorage.setItem(PARTY_COLS_KEY, JSON.stringify(updated));
                    return updated;
                });
            }
            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
            }
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'col-resize';
        }, 0);
    }, []);

    const cfg = DOC_CONFIGS[docType] || DOC_CONFIGS.quotation;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    useImperativeHandle(ref, () => ({
        open(callback, type, defaultParties = []) {
            callbackRef.current = callback;
            setDocType(type || "quotation");
            setCodeSearch("");
            codeRef.current = "";
            const parties = Array.isArray(defaultParties) ? defaultParties : [];
            setSelectedParties(parties);
            selectedPartiesRef.current = parties;
            setPartyOptions([]);
            setList([]);
            setTotalCount(0);
            setPage(1);
            setShow(true);
        },
    }));

    const fetchList = useCallback((pageNum = 1, code = "", parties = []) => {
        const currentCfg = DOC_CONFIGS[docType] || DOC_CONFIGS.quotation;
        setIsLoading(true);
        const storeId = localStorage.getItem("store_id");
        const parts = [
            `search[store_id]=${storeId}`,
            `select=id,code,date,net_total,vendor_name,vendor_id,customer_name,customer_id,products`,
            `limit=${PAGE_SIZE}`,
            `page=${pageNum}`,
            `sort=created_at`,
            `sort_by=desc`,
        ];
        if (code) parts.push(`search[code]=${encodeURIComponent(code)}`);
        if (parties.length > 0) {
            const ids = parties.map(p => p.id).join(",");
            if (currentCfg.partyType === "vendor") parts.push(`search[vendor_id]=${ids}`);
            else parts.push(`search[customer_id]=${ids}`);
        }
        fetch(`/v1/${currentCfg.apiPath}?` + parts.join("&"), {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") },
        })
            .then(async r => {
                const d = await r.json();
                setIsLoading(false);
                if (r.ok) {
                    setList(d.result || []);
                    setTotalCount(d.total_count || 0);
                }
            })
            .catch(() => setIsLoading(false));
    }, [docType]);

    useEffect(() => {
        if (show) fetchList(1, codeRef.current, selectedPartiesRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, docType]);

    function suggestParty(term) {
        if (!term) return;
        const endpoint = cfg.partyType === "vendor" ? "vendor" : "customer";
        const storeId = localStorage.getItem("store_id");
        const qs = `search[query]=${encodeURIComponent(term)}&search[store_id]=${storeId}`;
        const select = cfg.partyType === "vendor"
            ? "select=id,code,name,search_label,additional_keywords,vat_no,phone"
            : "select=id,code,name,search_label,additional_keywords,vat_no,phone,name_in_arabic,phone_in_arabic";
        fetch(`/v1/${endpoint}?${select}&${qs}&limit=20`, {
            headers: { Authorization: localStorage.getItem("access_token") },
        })
            .then(async r => { const d = await r.json(); if (r.ok) setPartyOptions(d.result || []); });
    }

    function doSearch(pageNum, code, parties) {
        setPage(pageNum);
        fetchList(pageNum, code, parties);
    }

    function handleSelect(doc) {
        if (callbackRef.current) callbackRef.current(doc, docType);
        setShow(false);
    }

    function goToPage(p) {
        const newPage = Math.max(1, Math.min(p, totalPages));
        setPage(newPage);
        fetchList(newPage, codeRef.current, selectedPartiesRef.current);
    }

    const partyLabel = cfg.partyType === "vendor" ? t("Vendor") : t("Customer");
    const partyPlaceholder = cfg.partyType === "vendor"
        ? t("Vendor Name / Code / VAT #")
        : t("Customer Name / Mob / VAT # / ID");
    const getPartyName = (doc) => doc.vendor_name || doc.customer_name || "–";

    const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, totalCount);

    return (
        <>
        <Modal show={show} onHide={() => setShow(false)} size="xl" animation={false}>
            <Modal.Header style={{ backgroundColor: "#fff", borderBottom: "1px solid #c3c6d7", padding: "12px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                    <i className="bi bi-file-earmark-arrow-down" style={{ color: "#004ac6", fontSize: "18px" }}></i>
                    <h5 style={{ margin: 0, fontWeight: 700, fontFamily: "'Hanken Grotesk', sans-serif", color: "#191c1e" }}>
                        {t(cfg.title)}
                    </h5>
                </div>
                <button type="button" className="btn-close" onClick={() => setShow(false)} aria-label="Close" />
            </Modal.Header>
            <Modal.Body style={{ padding: "16px 20px" }}>
                {/* Filters */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px", alignItems: "flex-end" }}>
                    <div style={{ position: "relative", minWidth: "150px" }}>
                        <span style={{ position: "absolute", top: "-8px", left: "8px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px", lineHeight: 1, zIndex: 1 }}>{t("Code")}</span>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            value={codeSearch}
                            onChange={e => {
                                const v = e.target.value;
                                setCodeSearch(v);
                                codeRef.current = v;
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => doSearch(1, codeRef.current, selectedPartiesRef.current), 400);
                            }}
                            placeholder={cfg.codePrefix + "..."}
                            style={{ minWidth: "140px" }}
                        />
                    </div>
                    <div style={{ position: "relative", minWidth: "300px" }}>
                        <span style={{ position: "absolute", top: "-8px", left: "8px", fontSize: "10px", fontWeight: 600, color: "#6b7280", background: "#fff", padding: "0 4px", lineHeight: 1, zIndex: 1 }}>{partyLabel}</span>
                        <Typeahead
                            id="src_picker_party"
                            ref={partySearchRef}
                            filterBy={customPartyFilter}
                            labelKey="search_label"
                            multiple
                            options={partyOptions}
                            selected={selectedParties}
                            placeholder={partyPlaceholder}
                            highlightOnlyResult={true}
                            onChange={sel => {
                                setSelectedParties(sel);
                                selectedPartiesRef.current = sel;
                                doSearch(1, codeRef.current, sel);
                            }}
                            onInputChange={term => {
                                if (timerRef.current) clearTimeout(timerRef.current);
                                timerRef.current = setTimeout(() => suggestParty(term), 100);
                            }}
                            onKeyDown={e => {
                                if (e.key === "Escape") {
                                    setPartyOptions([]);
                                    partySearchRef.current?.clear();
                                }
                            }}
                            renderMenu={(results, menuProps, state) => {
                                const searchWords = state.text.toLowerCase().split(" ").filter(Boolean);
                                const visCols = partySearchColumns.filter(c => c.visible);
                                const totW = visCols.reduce((s, c) => s + c.width, 0);
                                const cw = (col) => `${(col.width / totW) * 100}%`;
                                const resizeHandle = (colKey) => (
                                    <div onMouseDown={e => startPartyColResize(e, colKey)}
                                        style={{ position: 'absolute', right: 0, top: '10%', bottom: '10%', width: '5px', cursor: 'col-resize', zIndex: 2 }} />
                                );
                                return (
                                    <Menu {...menuProps} style={{ ...(menuProps.style || {}), width: '95vw', maxWidth: '95vw', minWidth: '300px', zIndex: 9999 }}>
                                        <MenuItem disabled style={{ position: 'sticky', top: 0, padding: 0, margin: 0 }}>
                                            <div style={{ display: 'flex', fontWeight: 700, color: '#374151', padding: '4px 8px', background: '#f8f9fa', borderBottom: '1px solid #e2e8f0', pointerEvents: 'auto', fontSize: '12px', position: 'relative' }}>
                                                {visCols.map(col => (
                                                    <div key={col.key} style={{ width: cw(col), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'relative' }}>
                                                        {col.key === 'code'   && t('Code')}
                                                        {col.key === 'name'   && t('Name')}
                                                        {col.key === 'phone'  && t('Phone')}
                                                        {col.key === 'vat_no' && t('VAT No.')}
                                                        {resizeHandle(col.key)}
                                                    </div>
                                                ))}
                                                <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                                                    onClick={e => { e.stopPropagation(); setShowPartySearchSettings(true); }}>
                                                    <i className="bi bi-gear-fill" style={{ fontSize: '13px', color: '#6b7280' }} />
                                                </div>
                                            </div>
                                        </MenuItem>
                                        {results.map((option, idx) => {
                                            const isActive = state.activeIndex === idx || results.length === 1;
                                            const rowBg = isActive ? '#e8f0fe' : 'transparent';
                                            return (
                                                <MenuItem option={option} position={idx} key={idx} style={{ padding: 0 }}>
                                                    <div style={{ display: 'flex', padding: '5px 8px', alignItems: 'center', background: rowBg, fontSize: '13px' }}>
                                                        {visCols.map(col => (
                                                            <div key={col.key} style={{ width: cw(col), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {col.key === 'code' && <span style={{ fontFamily: 'monospace', color: isActive ? '#004ac6' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.code, searchWords, isActive)}</span>}
                                                                {col.key === 'name' && <span style={{ color: isActive ? '#191c1e' : '#374151', fontWeight: isActive ? 600 : 400 }}>{highlightWords(option.name + (option.name_in_arabic ? ' - ' + option.name_in_arabic : ''), searchWords, isActive)}</span>}
                                                                {col.key === 'phone' && <span style={{ color: '#6b7280' }}>{highlightWords(option.phone || '–', searchWords, isActive)}</span>}
                                                                {col.key === 'vat_no' && <span style={{ color: '#6b7280' }}>{highlightWords(option.vat_no || '–', searchWords, isActive)}</span>}
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
                    <button
                        type="button"
                        onClick={() => doSearch(1, codeRef.current, selectedPartiesRef.current)}
                        style={{ background: "#004ac6", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                        <i className="bi bi-search" /> {t("Search")}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCodeSearch("");
                            codeRef.current = "";
                            setSelectedParties([]);
                            selectedPartiesRef.current = [];
                            setPartyOptions([]);
                            setPage(1);
                            fetchList(1, "", []);
                        }}
                        style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: "4px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                        {t("Clear")}
                    </button>
                </div>

                {/* Table */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                    <div className="table-responsive" style={{ maxHeight: "380px", overflowY: "auto" }}>
                        <table className="table table-sm table-hover" style={{ marginBottom: 0, fontSize: "13px" }}>
                            <thead style={{ background: "#f8f9fa", position: "sticky", top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={{ padding: "8px 12px", fontWeight: 700, fontSize: "12px", color: "#374151" }}>{t("Code")}</th>
                                    <th style={{ padding: "8px 10px", fontWeight: 700, fontSize: "12px", color: "#374151" }}>{t("Date")}</th>
                                    <th style={{ padding: "8px 10px", fontWeight: 700, fontSize: "12px", color: "#374151" }}>{partyLabel}</th>
                                    <th style={{ padding: "8px 10px", fontWeight: 700, fontSize: "12px", color: "#374151", textAlign: "right" }}>{t("Net Total")}</th>
                                    <th style={{ padding: "8px 10px", fontWeight: 700, fontSize: "12px", color: "#374151", textAlign: "center" }}>{t("Products")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "#6b7280" }}>
                                        <Spinner animation="border" size="sm" /> {t("Loading...")}
                                    </td></tr>
                                ) : list.length === 0 ? (
                                    <tr><td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "#9ca3af", fontStyle: "italic" }}>
                                        {t("No documents found.")}
                                    </td></tr>
                                ) : list.map(doc => (
                                    <tr key={doc.id} onClick={() => handleSelect(doc)}
                                        style={{ cursor: "pointer" }}
                                        title={t("Click to import products from this document")}>
                                        <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "#004ac6" }}>{doc.code}</td>
                                        <td style={{ padding: "8px 10px" }}>{doc.date ? format(new Date(doc.date), "dd-MMM-yyyy") : "–"}</td>
                                        <td style={{ padding: "8px 10px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getPartyName(doc)}</td>
                                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>
                                            <NumberFormat value={trimTo2Decimals(doc.net_total || 0)} displayType="text" thousandSeparator={true} renderText={v => v} />
                                        </td>
                                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                            <span style={{ background: "#e8edf5", borderRadius: "10px", padding: "2px 8px", fontSize: "11px", fontWeight: 600 }}>
                                                {(doc.products || []).length}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                        {totalCount > 0 ? `${from}–${to} of ${totalCount}` : ""}
                    </span>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <button type="button" disabled={page <= 1 || isLoading} onClick={() => goToPage(1)}
                            style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", background: page <= 1 ? "#f3f4f6" : "#fff", color: page <= 1 ? "#9ca3af" : "#374151", cursor: page <= 1 ? "default" : "pointer" }}>
                            «
                        </button>
                        <button type="button" disabled={page <= 1 || isLoading} onClick={() => goToPage(page - 1)}
                            style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", background: page <= 1 ? "#f3f4f6" : "#fff", color: page <= 1 ? "#9ca3af" : "#374151", cursor: page <= 1 ? "default" : "pointer" }}>
                            ‹ {t("Prev")}
                        </button>
                        <span style={{ fontSize: "12px", color: "#374151", padding: "0 6px" }}>
                            {t("Page")} {page} / {totalPages}
                        </span>
                        <button type="button" disabled={page >= totalPages || isLoading} onClick={() => goToPage(page + 1)}
                            style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", background: page >= totalPages ? "#f3f4f6" : "#004ac6", color: page >= totalPages ? "#9ca3af" : "#fff", cursor: page >= totalPages ? "default" : "pointer" }}>
                            {t("Next")} ›
                        </button>
                        <button type="button" disabled={page >= totalPages || isLoading} onClick={() => goToPage(totalPages)}
                            style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", background: page >= totalPages ? "#f3f4f6" : "#fff", color: page >= totalPages ? "#9ca3af" : "#374151", cursor: page >= totalPages ? "default" : "pointer" }}>
                            »
                        </button>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
        <TableSettingsModal
            show={showPartySearchSettings}
            onHide={() => setShowPartySearchSettings(false)}
            title={t('Party Search Settings')}
            columns={partySearchColumns}
            onToggleColumn={handleTogglePartyCol}
            onDragEnd={handlePartyColDragEnd}
            onRestoreDefaults={restorePartyColDefaults}
        />
        </>
    );
});

export default SourceDocumentPicker;
