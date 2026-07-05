import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal } from "react-bootstrap";
import NumberFormat from "react-number-format";
import SalesHistory from "../utils/product_sales_history.js";
import SalesReturnHistory from "../utils/product_sales_return_history.js";
import QuotationHistory from "../utils/product_quotation_history.js";
import Dropdown from "react-bootstrap/Dropdown";
import ImageGallery from "../utils/ImageGallery.js";
import { formatInStoreTimezone } from "../utils/dateUtils.js";

const UNIT_LABELS = {
    HUR: "Hour(s)", DAY: "Day(s)", MON: "Month(s)", C62: "Session(s)",
    WEE: "Week(s)", ANN: "Year(s)", MIN: "Minute(s)",
};

const formatTz = formatInStoreTimezone;

const ServiceView = forwardRef((props, ref) => {
    const timerRef = useRef(null);
    const ImageGalleryRef = useRef();
    const SalesHistoryRef = useRef();
    const SalesReturnHistoryRef = useRef();
    const QuotationHistoryRef = useRef();

    const [model, setModel] = useState({});
    const [show, setShow] = useState(false);

    useImperativeHandle(ref, () => ({
        open(id) {
            if (!id) return;
            fetchService(id);
            setShow(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                ImageGalleryRef.current?.open();
            }, 300);
        },
    }));

    async function fetchService(id) {
        const storeId = localStorage.getItem("store_id") || "";
        const headers = { "Content-Type": "application/json", Authorization: localStorage.getItem("access_token") };
        try {
            const r = await fetch(`/v1/product/${id}?search[store_id]=${storeId}`, { method: "GET", headers });
            const data = await r.json();
            if (r.ok && data.result) setModel(data.result);
        } catch (_) {}
    }

    function handleClose() { setShow(false); }

    const storeId = localStorage.getItem("store_id");
    const activeStore = model.product_stores?.[storeId] || null;

    const unitLabel = UNIT_LABELS[model.unit] || model.unit || "Session(s)";

    const detailRows = [
        { label: "Name",          value: model.name },
        { label: "Item Code",     value: model.part_number },
        { label: "Category",      value: model.service_category_name },
        { label: "Unit",          value: unitLabel },
        { label: "Duration",      value: model.duration_minutes ? `${model.duration_minutes} min` : null },
        { label: "Delivery Mode", value: model.delivery_mode },
        { label: "Booking Required", value: model.booking_required === true ? "Yes" : model.booking_required === false ? "No" : null },
        { label: "Description",   value: model.description },
    ].filter(r => r.value);

    const card = (label, content) => (
        <div style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#434655" }}>{label}</span>
            <span style={{ fontSize: "24px", fontWeight: 600, color: "#191c1e", fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: "-0.01em" }}>{content}</span>
        </div>
    );

    return (<>
        <SalesHistory ref={SalesHistoryRef} showToastMessage={props.showToastMessage} />
        <SalesReturnHistory ref={SalesReturnHistoryRef} showToastMessage={props.showToastMessage} />
        <QuotationHistory ref={QuotationHistoryRef} showToastMessage={props.showToastMessage} />

        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Body className="p-0" style={{ backgroundColor: "#f7f9fb", fontFamily: "'Inter', sans-serif", position: "relative" }}>

                {/* Close button */}
                <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"
                    style={{ position: "absolute", top: "16px", right: "16px", zIndex: 10 }} />

                {/* Header */}
                <div style={{ padding: "24px 32px 20px", borderBottom: "1px solid #c3c6d7", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <button onClick={handleClose} style={{ display: "flex", alignItems: "center", gap: "4px", border: "1px solid #c3c6d7", backgroundColor: "#ffffff", color: "#434655", padding: "6px 12px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                                <i className="bi bi-arrow-left" style={{ fontSize: "14px" }}></i> Back
                            </button>
                            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, fontFamily: "'Hanken Grotesk', sans-serif", color: "#191c1e" }}>
                                {model.name}
                            </h1>
                            <span style={{ backgroundColor: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "2px 10px", borderRadius: "2px", fontSize: "12px", fontWeight: 600 }}>
                                Service
                            </span>
                            {model.service_category_name && (
                                <span style={{ backgroundColor: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "2px", fontSize: "12px", fontWeight: 500 }}>
                                    {model.service_category_name}
                                </span>
                            )}
                        </div>
                        {model.part_number && (
                            <p style={{ margin: 0, fontSize: "14px", color: "#434655" }}>
                                Item Code: <span style={{ fontFamily: "monospace", color: "#004ac6" }}>{model.part_number}</span>
                            </p>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: "8px", paddingRight: "32px", flexWrap: "wrap" }}>
                        <Dropdown>
                            <Dropdown.Toggle style={{ display: "flex", alignItems: "center", gap: "4px", border: "1px solid #c3c6d7", backgroundColor: "#f7f9fb", color: "#191c1e", padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }} id="svc-view-history">
                                <i className="bi bi-clock-history" style={{ fontSize: "16px" }}></i> History
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item onClick={() => SalesHistoryRef.current?.open(model)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;Sales History
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => SalesReturnHistoryRef.current?.open(model)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;Sales Return History
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => QuotationHistoryRef.current?.open(model)}>
                                    <i className="bi bi-clock-history"></i>&nbsp;Quotation History
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                        {props.openUpdateForm && (
                            <button onClick={() => { handleClose(); props.openUpdateForm(model.id); }}
                                style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#004ac6", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                                <i className="bi bi-pencil" style={{ fontSize: "16px" }}></i> Edit
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: "32px" }}>

                    {/* Summary cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
                        {card("Retail Price", activeStore?.retail_unit_price != null
                            ? <NumberFormat value={activeStore.retail_unit_price} displayType="text" thousandSeparator renderText={v => v} />
                            : "—"
                        )}
                        {card("Unit", unitLabel)}
                        {model.duration_minutes && card("Duration", `${model.duration_minutes} min`)}
                        {model.delivery_mode && card("Delivery Mode", model.delivery_mode)}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>

                        {/* Service Details */}
                        <section style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                            <div style={{ padding: "12px 24px", borderBottom: "1px solid #c3c6d7", backgroundColor: "#f2f4f6" }}>
                                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#191c1e" }}>Service Details</h3>
                            </div>
                            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "0" }}>
                                {detailRows.map((row, idx, arr) => (
                                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: idx < arr.length - 1 ? "12px" : "0", marginBottom: idx < arr.length - 1 ? "12px" : "0", borderBottom: idx < arr.length - 1 ? "1px solid #f0f0f0" : "none", gap: "16px" }}>
                                        <span style={{ fontSize: "14px", color: "#434655", flexShrink: 0 }}>{row.label}</span>
                                        <span style={{ fontSize: "14px", fontWeight: 500, color: "#191c1e", textAlign: "right" }}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Pricing & Metadata */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                            {/* Pricing */}
                            {activeStore && (
                                <section style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                                    <div style={{ padding: "12px 24px", borderBottom: "1px solid #c3c6d7", backgroundColor: "#f2f4f6" }}>
                                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#191c1e" }}>Pricing</h3>
                                    </div>
                                    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "0" }}>
                                        {[
                                            { label: "Retail Price", value: activeStore.retail_unit_price, highlight: true },
                                            { label: "Retail Price (with VAT)", value: activeStore.retail_unit_price_with_vat },
                                            { label: "Purchase Price", value: activeStore.purchase_unit_price },
                                        ].map((row, idx, arr) => (
                                            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: idx < arr.length - 1 ? "12px" : "0", marginBottom: idx < arr.length - 1 ? "12px" : "0", borderBottom: idx < arr.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                                                <span style={{ fontSize: "14px", color: "#434655" }}>{row.label}</span>
                                                <span style={{ fontSize: "14px", fontWeight: row.highlight ? 700 : 500, color: row.highlight ? "#004ac6" : "#191c1e" }}>
                                                    <NumberFormat value={row.value} displayType="text" thousandSeparator renderText={v => v || "—"} />
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Metadata */}
                            <section style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                                <div style={{ padding: "12px 24px", borderBottom: "1px solid #c3c6d7", backgroundColor: "#f2f4f6" }}>
                                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#191c1e" }}>Metadata</h3>
                                </div>
                                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {[
                                        { label: "Created By", value: model.created_by_name },
                                        { label: "Updated By", value: model.updated_by_name },
                                        { label: "Created At", value: formatTz(model.created_at) },
                                        { label: "Updated At", value: formatTz(model.updated_at) },
                                    ].filter(r => r.value).map((row, idx, arr) => (
                                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: idx < arr.length - 1 ? "12px" : "0", marginBottom: idx < arr.length - 1 ? "12px" : "0", borderBottom: idx < arr.length - 1 ? "1px solid #f0f0f0" : "none", gap: "8px" }}>
                                            <span style={{ fontSize: "14px", color: "#434655", flexShrink: 0 }}>{row.label}</span>
                                            <span style={{ fontSize: "14px", fontWeight: 500, color: "#191c1e", textAlign: "right" }}>{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Photos */}
                    <section style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                        <div style={{ padding: "12px 24px", borderBottom: "1px solid #c3c6d7", backgroundColor: "#f2f4f6" }}>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#191c1e" }}>Photos</h3>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <ImageGallery ref={ImageGalleryRef} id={model.id} storeID={model.store_id} storedImages={model.images} modelName="product" />
                        </div>
                    </section>
                </div>
            </Modal.Body>
            <Modal.Footer style={{ backgroundColor: "#ffffff", borderTop: "1px solid #c3c6d7", padding: "12px 32px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button onClick={handleClose} style={{ backgroundColor: "#d0e1fb", color: "#54647a", border: "none", padding: "8px 24px", borderRadius: "4px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                    Cancel
                </button>
                <button onClick={handleClose} style={{ backgroundColor: "#004ac6", color: "#ffffff", border: "none", padding: "8px 24px", borderRadius: "4px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                    Close
                </button>
            </Modal.Footer>
        </Modal>
    </>);
});

export default ServiceView;
