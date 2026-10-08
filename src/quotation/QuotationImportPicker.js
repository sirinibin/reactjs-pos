import React, { useState, useRef, forwardRef, useImperativeHandle, useMemo } from "react";
import { Modal } from "react-bootstrap";
import NumberFormat from "react-number-format";
import { format } from "date-fns";
import { trimTo2Decimals } from "../utils/numberUtils";
import SourceDocumentPicker from "../purchase_order/SourceDocumentPicker.js";

// Two-step import into a quotation form ("From Quotations", "From Purchases", "From Sales"):
//   1. pick a document (SourceDocumentPicker in quotation, purchase or sales mode)
//   2. pick which of its products to import
// open({ docType, onImport, existingProductIds, defaultParties, excludeId, prepareProducts })
//   docType: "quotation" (default), "purchase" or "sales"
//   defaultParties: customers (quotation, sales) / vendors (purchase) to pre-filter the search
//   prepareProducts(products, doc): optional async step that turns the document's lines into
//     quotation lines (e.g. looks up selling prices for purchase lines) before they are listed
// onImport(products, doc) receives the chosen lines (with edited quantities).
// Prop modalClassName (default "above-sales-modal") sets the class of both modals so a host
// form can stack them above itself.
// Fixed size: index.css gives every `.table thead input` min-width: 120px, which stretched the select-all box.
const DOC_LABELS = { quotation: "quotation", purchase: "purchase", sales: "sale" };

const CHECKBOX_STYLE = { width: "16px", minWidth: "16px", maxWidth: "16px", height: "16px", padding: 0, margin: 0, float: "none", display: "inline-block", verticalAlign: "middle" };

const QuotationImportPicker = forwardRef((props, ref) => {
    const modalClassName = props.modalClassName || "above-sales-modal";
    const [show, setShow] = useState(false);
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");
    const [existingIds, setExistingIds] = useState(() => new Set());
    const optsRef = useRef({});
    const docPickerRef = useRef();
    const selectSeqRef = useRef(0);

    function openDocPicker() {
        const o = optsRef.current;
        docPickerRef.current?.open(handleDocSelected, o.docType || "quotation", o.defaultParties || o.defaultCustomers || []);
    }

    useImperativeHandle(ref, () => ({
        open(opts = {}) {
            optsRef.current = opts;
            openDocPicker();
        },
    }));

    async function handleDocSelected(selected) {
        if (!selected) return;
        const o = optsRef.current;
        if (o.excludeId && selected.id === o.excludeId) {
            if (props.showToastMessage) props.showToastMessage(`This is the ${DOC_LABELS[o.docType || "quotation"] || "document"} you are editing. Choose another one.`, "warning");
            openDocPicker();
            return;
        }
        const seq = ++selectSeqRef.current;
        setDoc(selected);
        setRows([]);
        setSearch("");
        setExistingIds(new Set(o.existingProductIds || []));
        setShow(true);

        // Lines without a product_id can't be added to a quotation, so they aren't offered.
        let products = (selected.products || []).filter(p => p && p.product_id);
        if (o.prepareProducts && products.length > 0) {
            setLoading(true);
            try {
                products = await o.prepareProducts(products, selected);
            } catch (e) {
                if (props.showToastMessage) props.showToastMessage("Could not load current prices; they will be 0.", "warning");
            }
            if (seq !== selectSeqRef.current) return; // another document was picked meanwhile
            setLoading(false);
        }
        setRows((products || []).map((p, i) => ({
            key: (p.product_id || "") + "_" + i,
            product: p,
            checked: true,
            quantity: parseFloat(p.quantity) > 0 ? parseFloat(p.quantity) : 1,
        })));
    }

    const visibleRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        const words = q.split(/\s+/);
        return rows.filter(r => {
            const p = r.product;
            const hay = [p.part_number, p.prefix_part_number, p.name, p.name_in_arabic, p.item_code].join(" ").toLowerCase();
            return words.every(w => hay.includes(w));
        });
    }, [rows, search]);

    const checkedCount = rows.filter(r => r.checked).length;
    const allVisibleChecked = visibleRows.length > 0 && visibleRows.every(r => r.checked);

    function toggleRow(key) {
        setRows(prev => prev.map(r => r.key === key ? { ...r, checked: !r.checked } : r));
    }

    function toggleAllVisible() {
        const keys = new Set(visibleRows.map(r => r.key));
        const value = !allVisibleChecked;
        setRows(prev => prev.map(r => keys.has(r.key) ? { ...r, checked: value } : r));
    }

    function setQty(key, value) {
        setRows(prev => prev.map(r => r.key === key ? { ...r, quantity: value } : r));
    }

    function handleImport() {
        const picked = rows
            .filter(r => r.checked)
            .map(r => ({ ...r.product, quantity: parseFloat(r.quantity) > 0 ? parseFloat(r.quantity) : 1 }));
        if (picked.length === 0 || loading) return;
        if (optsRef.current.onImport) optsRef.current.onImport(picked, doc);
        setShow(false);
    }

    function handleBack() {
        setShow(false);
        openDocPicker();
    }

    const docType = optsRef.current.docType || "quotation";
    const isPurchase = docType === "purchase";
    const docLabel = DOC_LABELS[docType] || "document";
    const colCount = isPurchase ? 10 : 9;
    const th = { padding: "8px 10px", fontWeight: 700, fontSize: "12px", color: "#374151", whiteSpace: "nowrap" };
    const td = { padding: "6px 10px", verticalAlign: "middle" };

    return (
        <>
            <SourceDocumentPicker ref={docPickerRef} modalClassName={modalClassName} />
            <Modal show={show} onHide={() => setShow(false)} size="xl" animation={false} className={modalClassName}>
                <Modal.Header style={{ backgroundColor: "#fff", borderBottom: "1px solid #c3c6d7", padding: "12px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0, flexWrap: "wrap" }}>
                        <i className="bi bi-box-seam" style={{ color: "#004ac6", fontSize: "18px" }}></i>
                        <h5 style={{ margin: 0, fontWeight: 700, fontFamily: "'Hanken Grotesk', sans-serif", color: "#191c1e" }}>
                            Select Products to Import
                        </h5>
                        {doc && (
                            <span style={{ fontSize: "12px", color: "#374151" }}>
                                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#004ac6" }}>{doc.code}</span>
                                {(doc.customer_name || doc.vendor_name) ? " · " + (doc.customer_name || doc.vendor_name) : ""}
                                {doc.date ? " · " + format(new Date(doc.date), "dd-MMM-yyyy") : ""}
                            </span>
                        )}
                    </div>
                    <button type="button" className="btn-close" onClick={() => setShow(false)} aria-label="Close" />
                </Modal.Header>
                <Modal.Body style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Filter by part no. / name"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ maxWidth: "320px" }}
                            data-testid="qip-filter"
                        />
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>
                            {checkedCount} of {rows.length} selected
                        </span>
                    </div>
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                        <div className="table-responsive" style={{ maxHeight: "420px", overflowY: "auto" }}>
                            <table className="table table-sm table-hover" style={{ marginBottom: 0, fontSize: "13px" }}>
                                <thead style={{ background: "#f8f9fa", position: "sticky", top: 0, zIndex: 1 }}>
                                    <tr>
                                        <th style={{ ...th, width: "36px", textAlign: "center" }}>
                                            <input type="checkbox" className="form-check-input" checked={allVisibleChecked} onChange={toggleAllVisible} aria-label="Select all" data-testid="qip-select-all" style={CHECKBOX_STYLE} />
                                        </th>
                                        <th style={th}>#</th>
                                        <th style={th}>Part No.</th>
                                        <th style={th}>Name</th>
                                        <th style={{ ...th, textAlign: "right", width: "110px" }}>Qty</th>
                                        <th style={th}>Unit</th>
                                        {isPurchase && <th style={{ ...th, textAlign: "right" }}>Purchase Price</th>}
                                        <th style={{ ...th, textAlign: "right" }}>Unit Price</th>
                                        <th style={{ ...th, textAlign: "right" }}>Unit Price(with VAT)</th>
                                        <th style={{ ...th, textAlign: "right" }}>Disc.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={colCount} style={{ textAlign: "center", padding: "32px", color: "#6b7280" }} data-testid="qip-loading">
                                            Loading current prices...
                                        </td></tr>
                                    ) : visibleRows.length === 0 ? (
                                        <tr><td colSpan={colCount} style={{ textAlign: "center", padding: "32px", color: "#9ca3af", fontStyle: "italic" }}>
                                            No products found.
                                        </td></tr>
                                    ) : visibleRows.map((r, idx) => {
                                        const p = r.product;
                                        const inQuotation = existingIds.has(p.product_id);
                                        return (
                                            <tr key={r.key} style={{ cursor: "pointer", background: r.checked ? "#f0f6ff" : undefined }} onClick={() => toggleRow(r.key)}>
                                                <td style={{ ...td, textAlign: "center" }} onClick={e => e.stopPropagation()}>
                                                    <input type="checkbox" className="form-check-input" checked={r.checked} onChange={() => toggleRow(r.key)} data-testid={"qip-row-" + idx} style={CHECKBOX_STYLE} />
                                                </td>
                                                <td style={td}>{idx + 1}</td>
                                                <td style={{ ...td, fontFamily: "monospace" }}>
                                                    {p.prefix_part_number ? `${p.prefix_part_number}-${p.part_number}` : (p.part_number || "–")}
                                                </td>
                                                <td style={td}>
                                                    {p.name}{p.name_in_arabic ? " - " + p.name_in_arabic : ""}
                                                    {inQuotation && (
                                                        <span title="Already in this form; quantity will be added" style={{ marginLeft: "6px", background: "#fef3c7", color: "#92400e", borderRadius: "10px", padding: "1px 7px", fontSize: "10px", fontWeight: 600 }}>
                                                            Already added
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ ...td, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="form-control form-control-sm"
                                                        style={{ textAlign: "right", width: "90px", marginLeft: "auto" }}
                                                        value={r.quantity}
                                                        onChange={e => setQty(r.key, e.target.value)}
                                                    />
                                                </td>
                                                <td style={td}>{p.unit || ""}</td>
                                                {isPurchase && (
                                                    <td style={{ ...td, textAlign: "right", color: "#6b7280" }}>
                                                        <NumberFormat value={trimTo2Decimals(p.purchase_unit_price || 0)} displayType="text" thousandSeparator={true} renderText={v => v} />
                                                    </td>
                                                )}
                                                <td style={{ ...td, textAlign: "right" }}>
                                                    <NumberFormat value={trimTo2Decimals(p.unit_price || 0)} displayType="text" thousandSeparator={true} renderText={v => v} />
                                                </td>
                                                <td style={{ ...td, textAlign: "right" }}>
                                                    <NumberFormat value={trimTo2Decimals(p.unit_price_with_vat || 0)} displayType="text" thousandSeparator={true} renderText={v => v} />
                                                </td>
                                                <td style={{ ...td, textAlign: "right" }}>
                                                    <NumberFormat value={trimTo2Decimals(p.unit_discount || 0)} displayType="text" thousandSeparator={true} renderText={v => v} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", gap: "8px" }}>
                        <button type="button" onClick={handleBack}
                            style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: "4px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                            ‹ Choose another {docLabel}
                        </button>
                        <button type="button" onClick={handleImport} disabled={checkedCount === 0 || loading} data-testid="qip-import"
                            style={{ background: checkedCount === 0 ? "#9ca3af" : "#004ac6", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: checkedCount === 0 ? "default" : "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                            <i className="bi bi-download" /> Import {checkedCount} Product{checkedCount !== 1 ? "s" : ""}
                        </button>
                    </div>
                </Modal.Body>
            </Modal>
        </>
    );
});

export default QuotationImportPicker;
