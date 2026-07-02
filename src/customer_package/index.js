import React, { useState, useEffect, useRef } from "react";
import CustomerPackageCreate from "./create.js";
import { confirm } from "react-bootstrap-confirmation";
import { Button, Spinner } from "react-bootstrap";

function CustomerPackageIndex(props) {
    const [list, setList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 20;
    const createRef = useRef();

    useEffect(() => {
        fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    function fetchList() {
        setIsLoading(true);
        fetch(`/v1/customer-package?page=${page}&limit=${pageSize}`, {
            headers: { Authorization: localStorage.getItem("access_token") },
        })
            .then((r) => r.json())
            .then((data) => {
                setIsLoading(false);
                if (data.status) {
                    setList(data.result || []);
                    setTotalItems(data.total_count || 0);
                }
            })
            .catch(() => setIsLoading(false));
    }

    async function handleDelete(id, name) {
        const ok = await confirm(`Delete package "${name}"?`, {
            title: "Confirm Delete",
            okText: "Delete",
            cancelText: "Cancel",
            okButtonStyle: "danger",
        });
        if (!ok) return;
        fetch("/v1/customer-package/" + id, {
            method: "DELETE",
            headers: { Authorization: localStorage.getItem("access_token") },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.status) {
                    if (props.showToastMessage) props.showToastMessage("Package deleted!", "success");
                    fetchList();
                }
            });
    }

    const totalPages = Math.ceil(totalItems / pageSize);

    return (
        <div style={{ padding: "24px", background: "#f7f9fb", minHeight: "100vh" }}>
            <CustomerPackageCreate ref={createRef} refreshList={fetchList} showToastMessage={props.showToastMessage} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                <div>
                    <h2 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: "22px", fontWeight: 700, color: "#191c1e", margin: 0 }}>
                        <i className="bi bi-box-seam me-2" style={{ color: "#004ac6" }}></i>Customer Packages
                    </h2>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>
                        Manage tab visibility packages and assign them to stores.
                    </p>
                </div>
                <Button
                    style={{ background: "#004ac6", border: "none", borderRadius: "6px", padding: "8px 18px", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}
                    onClick={() => createRef.current.open()}>
                    <i className="bi bi-plus-lg me-1"></i> New Package
                </Button>
            </div>

            {/* Table */}
            <div style={{ background: "#fff", border: "1px solid #c3c6d7", borderRadius: "8px", overflow: "hidden" }}>
                {isLoading ? (
                    <div style={{ padding: "48px", textAlign: "center" }}>
                        <Spinner animation="border" size="sm" /> Loading...
                    </div>
                ) : list.length === 0 ? (
                    <div style={{ padding: "48px", textAlign: "center", color: "#6b7280", fontFamily: "Inter, sans-serif", fontSize: "14px" }}>
                        No packages found. <button type="button" onClick={() => createRef.current.open()} style={{ background: "none", border: "none", color: "#004ac6", cursor: "pointer", fontWeight: 600 }}>Create one</button>
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#f2f4f6", borderBottom: "1px solid #c3c6d7" }}>
                                <th style={TH}>Name</th>
                                <th style={TH}>Tabs Enabled</th>
                                <th style={TH}>Created By</th>
                                <th style={{ ...TH, width: "120px" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((pkg, i) => (
                                <tr key={pkg.id} style={{ borderBottom: "1px solid #e8eaed", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                                    <td style={TD}>
                                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, color: "#191c1e" }}>{pkg.name}</span>
                                    </td>
                                    <td style={TD}>
                                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#434655" }}>
                                            {(pkg.tab_ids || []).length} tabs
                                        </span>
                                    </td>
                                    <td style={TD}>
                                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#434655" }}>
                                            {pkg.created_by_name || "—"}
                                        </span>
                                    </td>
                                    <td style={TD}>
                                        <div style={{ display: "flex", gap: "6px" }}>
                                            <button type="button"
                                                style={{ background: "#d0e1fb", border: "none", borderRadius: "4px", padding: "5px 10px", fontSize: "12px", color: "#004ac6", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                                                onClick={() => createRef.current.open(pkg.id)}>
                                                <i className="bi bi-pencil me-1"></i>Edit
                                            </button>
                                            <button type="button"
                                                style={{ background: "#ffdad6", border: "none", borderRadius: "4px", padding: "5px 10px", fontSize: "12px", color: "#93000a", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                                                onClick={() => handleDelete(pkg.id, pkg.name)}>
                                                <i className="bi bi-trash me-1"></i>Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "20px" }}>
                    <button type="button" disabled={page <= 1}
                        style={{ border: "1px solid #c3c6d7", borderRadius: "4px", padding: "5px 12px", background: "#fff", cursor: page > 1 ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif", fontSize: "13px" }}
                        onClick={() => setPage(page - 1)}>Prev</button>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#434655" }}>Page {page} of {totalPages}</span>
                    <button type="button" disabled={page >= totalPages}
                        style={{ border: "1px solid #c3c6d7", borderRadius: "4px", padding: "5px 12px", background: "#fff", cursor: page < totalPages ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif", fontSize: "13px" }}
                        onClick={() => setPage(page + 1)}>Next</button>
                </div>
            )}
        </div>
    );
}

const TH = { padding: "10px 16px", fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#434655", textAlign: "left" };
const TD = { padding: "10px 16px", verticalAlign: "middle" };

export default CustomerPackageIndex;
