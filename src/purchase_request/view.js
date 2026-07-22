import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button, Spinner, Badge, Table } from "react-bootstrap";
import PurchaseOrderCreate from '../purchase_order/create.js';
import Preview from '../order/preview.js';

const STATUS_META = {
    pending:            { label: "Pending",            variant: "warning" },
    accepted:           { label: "Accepted",           variant: "success" },
    partially_accepted: { label: "Partially Accepted", variant: "info" },
    rejected:           { label: "Rejected",           variant: "danger" },
};

const PurchaseRequestView = forwardRef((props, ref) => {
    const [show, setShow] = useState(false);
    const [pr, setPr] = useState(null);
    const [isReceiver, setIsReceiver] = useState(false);
    const [isActing, setIsActing] = useState(false);
    const [actionError, setActionError] = useState("");
    const poCreateRef = useRef();
    const PreviewRef = useRef();
    const [showPreview, setShowPreview] = useState(false);

    function openPreview() {
        setShowPreview(true);
        setTimeout(() => { PreviewRef.current?.open(pr, undefined, "purchase_request"); }, 100);
    }

    function openWhatsApp() {
        setShowPreview(true);
        setTimeout(() => { PreviewRef.current?.open(pr, "whatsapp", "whatsapp_purchase_request"); }, 100);
    }

    useImperativeHandle(ref, () => ({
        open(id, receiver) {
            setIsReceiver(!!receiver);
            setActionError("");
            loadPR(id);
            setShow(true);
        },
    }));

    async function loadPR(id) {
        setPr(null);
        const storeId = localStorage.getItem("store_id");
        const token = localStorage.getItem("access_token");
        const res = await fetch(`/v1/purchase-request/${id}?search[store_id]=${storeId}`, {
            headers: { Authorization: token },
        });
        const data = await res.json();
        if (data.status) setPr(data.result);
    }

    async function doAction(action, body = {}) {
        setIsActing(true);
        setActionError("");
        const storeId = localStorage.getItem("store_id");
        const token = localStorage.getItem("access_token");
        const res = await fetch(`/v1/purchase-request/${pr.id}/${action}?search[store_id]=${storeId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: token },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        setIsActing(false);
        if (data.status) {
            // Reload from server to get updated state
            await loadPR(pr.id);
            if (props.onSave) props.onSave();
        } else {
            setActionError(Object.values(data.errors || {}).join(". ") || "Action failed");
        }
    }

    const formatDate = (iso) => {
        if (!iso) return "—";
        return new Date(iso).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
        });
    };

    const statusMeta = pr ? (STATUS_META[pr.status] || { label: pr.status, variant: "secondary" }) : null;

    const canAct = isReceiver && pr?.status === "pending";
    const canCreatePO = pr && pr.status === "accepted" && !pr.purchase_order_id;

    return (
        <>
        <Modal show={show} onHide={() => setShow(false)} size="lg" fullscreen="sm-down" scrollable>
            <Modal.Header closeButton>
                <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2 me-2">
                    {pr ? <>P.R {pr.code} <Badge bg={statusMeta?.variant}>{statusMeta?.label}</Badge></> : "Purchase Request"}
                </Modal.Title>
                {pr && (
                    <div className="d-flex gap-1 ms-auto me-2">
                        <button type="button" title="Print / Preview" onClick={openPreview}
                            style={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '4px', padding: '3px 8px', fontSize: '13px', cursor: 'pointer', color: '#374151' }}>
                            <i className="bi bi-printer" />
                        </button>
                        <button type="button" title="Share via WhatsApp" onClick={openWhatsApp}
                            style={{ background: '#25d366', border: '1px solid #128c3a', borderRadius: '4px', padding: '3px 8px', fontSize: '13px', cursor: 'pointer', color: '#fff' }}>
                            <i className="bi bi-whatsapp" />
                        </button>
                    </div>
                )}
            </Modal.Header>
            <Modal.Body>
                {!pr && (
                    <div className="text-center py-4">
                        <Spinner animation="border" />
                    </div>
                )}
                {pr && (
                    <>
                        {/* Meta info */}
                        <div className="row g-2 mb-3">
                            <div className="col-6 col-md-3">
                                <div className="small text-muted">Date</div>
                                <div className="fw-semibold">{formatDate(pr.date)}</div>
                            </div>
                            <div className="col-6 col-md-3">
                                <div className="small text-muted">Created By</div>
                                <div className="fw-semibold">{pr.created_by_name || "—"}</div>
                            </div>
                            <div className="col-6 col-md-3">
                                <div className="small text-muted">Assigned To</div>
                                <div className="fw-semibold">{pr.assigned_to_name || "—"}</div>
                            </div>
                            <div className="col-6 col-md-3">
                                <div className="small text-muted">Status</div>
                                <Badge bg={statusMeta?.variant}>{statusMeta?.label}</Badge>
                            </div>
                            {pr.notes && (
                                <div className="col-12">
                                    <div className="small text-muted">Notes</div>
                                    <div>{pr.notes}</div>
                                </div>
                            )}
                            {pr.purchase_order_code && (
                                <div className="col-12">
                                    <div className="small text-muted">Purchase Order Created</div>
                                    <div className="text-success fw-semibold">
                                        <i className="bi bi-check-circle me-1"></i>
                                        {pr.purchase_order_code}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Products - mobile cards */}
                        <h6 className="fw-bold mb-2">Products</h6>

                        {/* Mobile */}
                        <div className="d-md-none">
                            {(pr.products || []).map((p, idx) => (
                                <div key={idx} className="border rounded p-2 mb-2 small">
                                    <div className="fw-semibold">{p.name}</div>
                                    <div className="d-flex justify-content-between text-muted mt-1">
                                        <span>Qty: {p.quantity}</span>
                                        <span>Price: {p.purchase_unit_price?.toFixed(2)}</span>
                                        {p.unit_discount > 0 && <span>Disc: {p.unit_discount?.toFixed(2)}</span>}
                                        <span className="fw-semibold text-dark">
                                            {((p.quantity || 0) * ((p.purchase_unit_price || 0) - (p.unit_discount || 0))).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop table */}
                        <div className="d-none d-md-block">
                            <Table size="sm" bordered hover responsive>
                                <thead className="table-light">
                                    <tr>
                                        <th>#</th>
                                        <th>Product</th>
                                        <th className="text-end">Qty</th>
                                        <th className="text-end">Unit Price</th>
                                        <th className="text-end">Discount</th>
                                        <th className="text-end">Line Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(pr.products || []).map((p, idx) => (
                                        <tr key={idx}>
                                            <td>{idx + 1}</td>
                                            <td>{p.name}</td>
                                            <td className="text-end">{p.quantity}</td>
                                            <td className="text-end">{p.purchase_unit_price?.toFixed(2)}</td>
                                            <td className="text-end">{p.unit_discount?.toFixed(2)}</td>
                                            <td className="text-end fw-semibold">
                                                {((p.quantity || 0) * ((p.purchase_unit_price || 0) - (p.unit_discount || 0))).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>

                        {/* Totals */}
                        <div className="d-flex flex-column align-items-end gap-1 mt-2">
                            {pr.discount > 0 && (
                                <div className="small text-muted">Discount: {pr.discount?.toFixed(2)}</div>
                            )}
                            {pr.vat_price > 0 && (
                                <div className="small text-muted">VAT: {pr.vat_price?.toFixed(2)}</div>
                            )}
                            <div className="fw-bold">Net Total: {pr.net_total?.toFixed(2)}</div>
                        </div>

                        {/* Action error */}
                        {actionError && (
                            <div className="alert alert-danger mt-3 py-2 small">{actionError}</div>
                        )}

                        {/* Receiver Actions */}
                        {canAct && (
                            <div className="mt-3 d-flex flex-wrap gap-2">
                                <Button
                                    variant="success"
                                    size="sm"
                                    disabled={isActing}
                                    onClick={() => doAction("accept", { partial: false })}
                                >
                                    {isActing ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-check-circle me-1"></i>Accept</>}
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    disabled={isActing}
                                    onClick={() => doAction("reject")}
                                >
                                    {isActing ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-x-circle me-1"></i>Reject</>}
                                </Button>
                            </div>
                        )}

                        {/* Create PO action */}
                        {canCreatePO && (
                            <div className="mt-3">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                        setShow(false);
                                        poCreateRef.current?.openFromPR(pr);
                                    }}
                                >
                                    <i className="bi bi-cart-plus me-1"></i>Create Purchase Order
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="outline-secondary" size="sm" onClick={() => setShow(false)}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
        <PurchaseOrderCreate ref={poCreateRef} showToastMessage={props.showToastMessage} onCreated={props.onSave} />
        {showPreview && <Preview ref={PreviewRef} showToastMessage={props.showToastMessage} />}
        </>
    );
});

export default PurchaseRequestView;
