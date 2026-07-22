import React, { useState, useEffect, useRef, useCallback } from "react";
import PurchaseRequestCreate from "./create.js";
import PurchaseRequestView from "./view.js";
import PurchaseOrderCreate from "../purchase_order/create.js";
import Preview from '../order/preview.js';
import { Button, Spinner, Badge } from "react-bootstrap";
import ReactPaginate from "react-paginate";
import eventEmitter from "../utils/eventEmitter";

const STATUS_LABELS = {
    pending: { label: "Pending", variant: "warning" },
    accepted: { label: "Accepted", variant: "success" },
    partially_accepted: { label: "Partially Accepted", variant: "info" },
    rejected: { label: "Rejected", variant: "danger" },
};

function PurchaseRequestIndex(props) {
    const createRef = useRef();
    const viewRef = useRef();
    const poCreateRef = useRef();
    const PreviewRef = useRef();
    const [showPreview, setShowPreview] = useState(false);
    const [actingId, setActingId] = useState(null);

    const [activeTab, setActiveTab] = useState("sent");
    const [list, setList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize] = useState(10);
    const [statusFilter, setStatusFilter] = useState("");

    const currentUserId = localStorage.getItem("user_id");

    const fetchList = useCallback(async () => {
        setIsLoading(true);
        const storeId = localStorage.getItem("store_id");
        const token = localStorage.getItem("access_token");

        const params = new URLSearchParams({
            "search[store_id]": storeId,
            "search[limit]": pageSize,
            "search[page]": page,
            "search[sort_by]": "created_at",
            "search[sort_order]": "desc",
        });

        if (activeTab === "sent") {
            params.set("search[created_by]", currentUserId);
        } else {
            params.set("search[assigned_to]", currentUserId);
        }

        if (statusFilter) {
            params.set("search[status]", statusFilter);
        }

        try {
            const res = await fetch(`/v1/purchase-request?${params.toString()}`, {
                headers: { Authorization: token },
            });
            const data = await res.json();
            if (data.status) {
                setList(data.result || []);
                setTotalItems(data.total_count || 0);
                setTotalPages(Math.ceil((data.total_count || 0) / pageSize));
            }
        } catch (_) {}
        setIsLoading(false);
    }, [activeTab, page, pageSize, statusFilter, currentUserId]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    useEffect(() => {
        const handler = () => fetchList();
        eventEmitter.on("purchase_request_updated", handler);
        eventEmitter.on("purchase_order_updated", handler);
        eventEmitter.on("socket_connection_open", fetchList);
        return () => {
            eventEmitter.off("purchase_request_updated", handler);
            eventEmitter.off("purchase_order_updated", handler);
            eventEmitter.off("socket_connection_open", fetchList);
        };
    }, [fetchList]);

    function handleTabChange(tab) {
        setActiveTab(tab);
        setPage(1);
        setStatusFilter("");
    }

    function handleStatusFilter(status) {
        setStatusFilter(prev => prev === status ? "" : status);
        setPage(1);
    }

    function openCreate(id) {
        createRef.current.open(id);
    }

    function openView(id) {
        viewRef.current.open(id, activeTab === "received");
    }

    function openPreview(pr) {
        setShowPreview(true);
        setTimeout(() => { PreviewRef.current?.open(pr, undefined, "purchase_request"); }, 100);
    }

    function openWhatsApp(pr) {
        setShowPreview(true);
        setTimeout(() => { PreviewRef.current?.open(pr, "whatsapp", "whatsapp_purchase_request"); }, 100);
    }

    async function doAction(pr, action, body = {}) {
        setActingId(pr.id);
        const storeId = localStorage.getItem("store_id");
        const token = localStorage.getItem("access_token");
        const res = await fetch(`/v1/purchase-request/${pr.id}/${action}?search[store_id]=${storeId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: token },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        setActingId(null);
        if (data.status) fetchList();
    }

    const formatDate = (isoStr) => {
        if (!isoStr) return "";
        return new Date(isoStr).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric",
        });
    };

    return (
        <div className="container-fluid px-2 px-md-3">
            {/* Header */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <h4 className="mb-0 fw-bold">Purchase Requests</h4>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openCreate(null)}
                    className="d-flex align-items-center gap-1"
                >
                    <i className="bi bi-plus-lg"></i>
                    <span>New P.R</span>
                </Button>
            </div>

            {/* Tabs */}
            <ul className="nav nav-tabs mb-3" style={{ flexWrap: "nowrap", overflowX: "auto" }}>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === "sent" ? "active fw-semibold" : ""}`}
                        onClick={() => handleTabChange("sent")}
                    >
                        <i className="bi bi-send me-1"></i>Sent
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === "received" ? "active fw-semibold" : ""}`}
                        onClick={() => handleTabChange("received")}
                    >
                        <i className="bi bi-inbox me-1"></i>Received
                    </button>
                </li>
            </ul>

            {/* Status Filters */}
            <div className="d-flex flex-wrap gap-2 mb-3">
                {Object.entries(STATUS_LABELS).filter(([key]) => key !== "partially_accepted").map(([key, { label, variant }]) => (
                    <Badge
                        key={key}
                        bg={statusFilter === key ? variant : "secondary"}
                        style={{ cursor: "pointer", fontSize: "0.8rem", padding: "6px 10px" }}
                        onClick={() => handleStatusFilter(key)}
                    >
                        {label}
                        {statusFilter === key && <i className="bi bi-x ms-1"></i>}
                    </Badge>
                ))}
                {statusFilter && (
                    <Badge
                        bg="light"
                        text="dark"
                        style={{ cursor: "pointer", fontSize: "0.8rem", padding: "6px 10px", border: "1px solid #dee2e6" }}
                        onClick={() => setStatusFilter("")}
                    >
                        Clear filter
                    </Badge>
                )}
            </div>

            {/* Count */}
            <div className="text-muted small mb-2">
                {totalItems} record{totalItems !== 1 ? "s" : ""}
                {isLoading && <Spinner size="sm" animation="border" className="ms-2" />}
            </div>

            {/* Mobile Card List (visible on xs/sm) */}
            <div className="d-md-none">
                {list.length === 0 && !isLoading && (
                    <div className="text-center text-muted py-4">No purchase requests found.</div>
                )}
                {list.map((pr) => {
                    const s = STATUS_LABELS[pr.status] || { label: pr.status, variant: "secondary" };
                    const isActing = actingId === pr.id;
                    const canAct = activeTab === "received" && pr.status === "pending";
                    const canCreatePO = pr.status === "accepted" && !pr.purchase_order_id;
                    return (
                        <div
                            key={pr.id}
                            className="card mb-2 shadow-sm"
                            onClick={() => openView(pr.id)}
                            style={{ cursor: "pointer" }}
                        >
                            <div className="card-body py-2 px-3">
                                <div className="d-flex justify-content-between align-items-start mb-1">
                                    <span className="fw-semibold text-primary">{pr.code}</span>
                                    <Badge bg={s.variant}>{s.label}</Badge>
                                </div>
                                <div className="small text-muted">
                                    {activeTab === "sent"
                                        ? <span><i className="bi bi-person me-1"></i>To: {pr.assigned_to_name}</span>
                                        : <span><i className="bi bi-person me-1"></i>From: {pr.created_by_name}</span>
                                    }
                                </div>
                                <div className="d-flex justify-content-between align-items-center mt-1">
                                    <span className="small text-muted">{formatDate(pr.created_at)}</span>
                                    <span className="fw-semibold">{pr.net_total?.toFixed(2)}</span>
                                </div>
                                {pr.purchase_order_code && (
                                    <div className="small text-success mt-1">
                                        <i className="bi bi-check-circle me-1"></i>P.O: {pr.purchase_order_code}
                                    </div>
                                )}
                                <div className="mt-2 d-flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                                    {activeTab === "sent" && (
                                        <Button size="sm" variant="outline-secondary" onClick={() => openCreate(pr.id)} title="Edit">
                                            <i className="bi bi-pencil"></i>
                                        </Button>
                                    )}
                                    {canAct && (
                                        <>
                                            <Button size="sm" variant="success" disabled={isActing} onClick={() => doAction(pr, "accept", { partial: false })} title="Accept">
                                                {isActing ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-check-circle me-1"></i>Accept</>}
                                            </Button>
                                            <Button size="sm" variant="danger" disabled={isActing} onClick={() => doAction(pr, "reject")} title="Reject">
                                                {isActing ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-x-circle me-1"></i>Reject</>}
                                            </Button>
                                        </>
                                    )}
                                    {canCreatePO && (
                                        <Button size="sm" variant="primary" onClick={() => poCreateRef.current?.openFromPR(pr)} title="Create Purchase Order">
                                            <i className="bi bi-cart-plus me-1"></i>Create P.O
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline-primary" onClick={() => openPreview(pr)} title="Print / Preview">
                                        <i className="bi bi-printer"></i>
                                    </Button>
                                    <Button size="sm" variant="outline-success" onClick={() => openWhatsApp(pr)} title="Share via WhatsApp">
                                        <i className="bi bi-whatsapp"></i>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop Table (hidden on xs/sm) */}
            <div className="d-none d-md-block">
                <div className="table-responsive">
                    <table className="table table-hover table-sm align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>Code</th>
                                <th>{activeTab === "sent" ? "Assigned To" : "Created By"}</th>
                                <th>Products</th>
                                <th>Net Total</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>P.O</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={8} className="text-center text-muted py-4">
                                        No purchase requests found.
                                    </td>
                                </tr>
                            )}
                            {list.map((pr) => {
                                const s = STATUS_LABELS[pr.status] || { label: pr.status, variant: "secondary" };
                                const isActing = actingId === pr.id;
                                const canAct = activeTab === "received" && pr.status === "pending";
                                const canCreatePO = pr.status === "accepted" && !pr.purchase_order_id;
                                return (
                                    <tr key={pr.id} style={{ cursor: "pointer" }} onClick={() => openView(pr.id)}>
                                        <td className="fw-semibold text-primary">{pr.code}</td>
                                        <td>{activeTab === "sent" ? pr.assigned_to_name : pr.created_by_name}</td>
                                        <td>{pr.products?.length || 0}</td>
                                        <td>{pr.net_total?.toFixed(2)}</td>
                                        <td className="text-nowrap">{formatDate(pr.created_at)}</td>
                                        <td><Badge bg={s.variant}>{s.label}</Badge></td>
                                        <td className="text-success small">
                                            {pr.purchase_order_code || "—"}
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div className="d-flex flex-wrap gap-1">
                                                <Button size="sm" variant="outline-primary" onClick={() => openView(pr.id)} title="View">
                                                    <i className="bi bi-eye"></i>
                                                </Button>
                                                {activeTab === "sent" && (
                                                    <Button size="sm" variant="outline-secondary" onClick={() => openCreate(pr.id)} title="Edit">
                                                        <i className="bi bi-pencil"></i>
                                                    </Button>
                                                )}
                                                {canAct && (
                                                    <>
                                                        <Button size="sm" variant="success" disabled={isActing} onClick={() => doAction(pr, "accept", { partial: false })} title="Accept">
                                                            {isActing ? <Spinner size="sm" animation="border" /> : <i className="bi bi-check-circle"></i>}
                                                        </Button>
                                                        <Button size="sm" variant="danger" disabled={isActing} onClick={() => doAction(pr, "reject")} title="Reject">
                                                            {isActing ? <Spinner size="sm" animation="border" /> : <i className="bi bi-x-circle"></i>}
                                                        </Button>
                                                    </>
                                                )}
                                                {canCreatePO && (
                                                    <Button size="sm" variant="primary" onClick={() => poCreateRef.current?.openFromPR(pr)} title="Create Purchase Order">
                                                        <i className="bi bi-cart-plus"></i>
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="outline-primary" onClick={() => openPreview(pr)} title="Print / Preview">
                                                    <i className="bi bi-printer"></i>
                                                </Button>
                                                <Button size="sm" variant="outline-success" onClick={() => openWhatsApp(pr)} title="Share via WhatsApp">
                                                    <i className="bi bi-whatsapp"></i>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-3">
                    <ReactPaginate
                        previousLabel={<i className="bi bi-chevron-left"></i>}
                        nextLabel={<i className="bi bi-chevron-right"></i>}
                        breakLabel="..."
                        pageCount={totalPages}
                        marginPagesDisplayed={1}
                        pageRangeDisplayed={3}
                        forcePage={page - 1}
                        onPageChange={({ selected }) => setPage(selected + 1)}
                        containerClassName="pagination pagination-sm mb-0 flex-wrap"
                        pageClassName="page-item"
                        pageLinkClassName="page-link"
                        previousClassName="page-item"
                        previousLinkClassName="page-link"
                        nextClassName="page-item"
                        nextLinkClassName="page-link"
                        breakClassName="page-item"
                        breakLinkClassName="page-link"
                        activeClassName="active"
                    />
                </div>
            )}

            <PurchaseRequestCreate ref={createRef} onSave={fetchList} showToastMessage={props.showToastMessage} />
            <PurchaseRequestView ref={viewRef} onSave={fetchList} showToastMessage={props.showToastMessage} />
            <PurchaseOrderCreate ref={poCreateRef} onCreated={fetchList} showToastMessage={props.showToastMessage} />
            {showPreview && <Preview ref={PreviewRef} showToastMessage={props.showToastMessage} />}
        </div>
    );
}

export default PurchaseRequestIndex;
