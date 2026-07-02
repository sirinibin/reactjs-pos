import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { DEFAULT_MENU } from "../sidebar_menu_config";

const CustomerPackageCreate = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        open(id) {
            setFormData({ tab_ids: [] });
            setErrors({});
            if (id) fetchPackage(id);
            setShow(true);
        },
    }));

    const [formData, setFormData] = useState({ tab_ids: [] });
    const [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const [show, setShow] = useState(false);

    useEffect(() => {
        const listener = (e) => {
            if (e.code === "Enter" || e.code === "NumpadEnter") {
                const form = e.target.form;
                if (form) {
                    const index = Array.prototype.indexOf.call(form, e.target);
                    if (form.elements[index + 1]) {
                        form.elements[index + 1].focus();
                        e.preventDefault();
                    }
                }
            }
        };
        document.addEventListener("keydown", listener);
        return () => document.removeEventListener("keydown", listener);
    }, []);

    function fetchPackage(id) {
        fetch("/v1/customer-package/" + id, {
            headers: { Authorization: localStorage.getItem("access_token") },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.result) {
                    setFormData({ ...data.result, tab_ids: data.result.tab_ids || [] });
                }
            });
    }

    function handleSave(e) {
        e.preventDefault();
        const endpoint = formData.id
            ? "/v1/customer-package/" + formData.id
            : "/v1/customer-package";
        const method = formData.id ? "PUT" : "POST";

        setProcessing(true);
        fetch(endpoint, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
            body: JSON.stringify(formData),
        })
            .then((r) => r.json())
            .then((data) => {
                setProcessing(false);
                if (!data.status) {
                    setErrors(data.errors || {});
                    if (props.showToastMessage) props.showToastMessage("Error saving package!", "danger");
                    return;
                }
                setErrors({});
                if (props.showToastMessage)
                    props.showToastMessage(
                        formData.id ? "Package Updated!" : "Package Created!",
                        "success"
                    );
                if (props.refreshList) props.refreshList();
                setShow(false);
            })
            .catch(() => {
                setProcessing(false);
                if (props.showToastMessage) props.showToastMessage("Error saving package!", "danger");
            });
    }

    function toggleTab(id) {
        const current = formData.tab_ids || [];
        const updated = current.includes(id)
            ? current.filter((t) => t !== id)
            : [...current, id];
        setFormData({ ...formData, tab_ids: updated });
    }

    function selectAll() {
        setFormData({ ...formData, tab_ids: DEFAULT_MENU.map((m) => m.id) });
    }

    function clearAll() {
        setFormData({ ...formData, tab_ids: [] });
    }

    const allErrors = Object.entries(errors).filter(([, v]) => v);

    const CARD = {
        background: "#ffffff",
        border: "1px solid #c3c6d7",
        borderRadius: "8px",
        padding: "24px",
        marginBottom: "20px",
    };
    const INPUT = {
        border: "1px solid #c3c6d7",
        borderRadius: "4px",
        padding: "7px 12px",
        fontSize: "13px",
        fontFamily: '"Inter", sans-serif',
        width: "100%",
        outline: "none",
        color: "#191c1e",
        background: "#fff",
    };

    return (
        <Modal show={show} fullscreen onHide={() => setShow(false)} animation={false} backdrop="static" dialogClassName="pw-modal">
            <Modal.Header style={{ background: "#ffffff", borderBottom: "1px solid #c3c6d7", padding: "10px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                <button type="button" onClick={() => setShow(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#434655", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 600, fontFamily: "Inter, sans-serif", padding: "4px 8px", borderRadius: "4px" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f2f4")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                    <i className="bi bi-arrow-left" style={{ fontSize: "16px" }}></i> Back
                </button>
                <Modal.Title style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: "17px", fontWeight: 700, color: "#191c1e", flex: 1 }}>
                    {formData.id ? `Update Package — ${formData.name}` : "Create New Package"}
                </Modal.Title>
                <button type="button"
                    style={{ background: "#004ac6", color: "#ffffff", border: "none", borderRadius: "4px", padding: "6px 18px", fontSize: "13px", fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    onClick={handleSave} disabled={isProcessing}>
                    {isProcessing && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden />}
                    {formData.id ? "Update" : "Create"}
                </button>
                <button type="button" className="btn-close ms-1" onClick={() => setShow(false)} aria-label="Close" />
            </Modal.Header>

            <style>{`
              .pw-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
              .pw-body { padding: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; }
            `}</style>

            <Modal.Body className="pw-body">
                <form onSubmit={handleSave} style={{ flex: 1, overflow: "auto", padding: "24px 32px", background: "#f7f9fb" }}>
                    <div style={{ maxWidth: "700px", margin: "0 auto" }}>

                        {allErrors.length > 0 && (
                            <div style={{ background: "#ffdad6", border: "1px solid #f4adaa", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
                                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#93000a", marginBottom: "8px", fontSize: "13px" }}>
                                    <i className="bi bi-exclamation-circle-fill" style={{ marginRight: "6px" }}></i>
                                    {allErrors.length} error{allErrors.length > 1 ? "s" : ""} — please fix before saving:
                                </div>
                                <ul style={{ margin: 0, paddingLeft: "18px" }}>
                                    {allErrors.map(([k, v]) => (
                                        <li key={k} style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#93000a" }}>{v}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Package Name */}
                        <div style={CARD}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                                <i className="bi bi-box-seam" style={{ fontSize: "18px", color: "#004ac6" }}></i>
                                <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: "16px", fontWeight: 600, color: "#191c1e", margin: 0 }}>Package Details</h3>
                            </div>
                            <div>
                                <label style={{ display: "block", fontFamily: '"Inter", sans-serif', fontSize: "13px", fontWeight: 600, color: "#191c1e", marginBottom: "4px" }}>
                                    Name<span style={{ color: "#ba1a1a", marginLeft: "2px" }}>*</span>
                                </label>
                                <input
                                    value={formData.name || ""}
                                    type="text"
                                    onChange={(e) => {
                                        errors.name = "";
                                        setErrors({ ...errors });
                                        setFormData({ ...formData, name: e.target.value });
                                    }}
                                    style={INPUT}
                                    placeholder="Package name"
                                />
                                {errors.name && (
                                    <div style={{ color: "#ba1a1a", fontSize: "12px", marginTop: "3px" }}>
                                        <i className="bi bi-x-lg" style={{ marginRight: "4px" }}></i>{errors.name}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tab Selection */}
                        <div style={CARD}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <i className="bi bi-layout-sidebar" style={{ fontSize: "18px", color: "#004ac6" }}></i>
                                    <h3 style={{ fontFamily: '"Hanken Grotesk", sans-serif', fontSize: "16px", fontWeight: 600, color: "#191c1e", margin: 0 }}>Available Tabs</h3>
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button type="button" onClick={selectAll}
                                        style={{ fontSize: "12px", fontFamily: "Inter, sans-serif", padding: "4px 10px", border: "1px solid #004ac6", borderRadius: "4px", background: "none", color: "#004ac6", cursor: "pointer" }}>
                                        Select All
                                    </button>
                                    <button type="button" onClick={clearAll}
                                        style={{ fontSize: "12px", fontFamily: "Inter, sans-serif", padding: "4px 10px", border: "1px solid #c3c6d7", borderRadius: "4px", background: "none", color: "#434655", cursor: "pointer" }}>
                                        Clear All
                                    </button>
                                </div>
                            </div>
                            <p style={{ fontSize: "12px", color: "#6b7280", fontFamily: "Inter, sans-serif", marginBottom: "16px" }}>
                                Select which tabs are available to non-admin users of stores assigned this package.
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
                                {DEFAULT_MENU.map((item) => {
                                    const checked = (formData.tab_ids || []).includes(item.id);
                                    return (
                                        <label key={item.id}
                                            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", border: `1px solid ${checked ? "#004ac6" : "#c3c6d7"}`, borderRadius: "6px", cursor: "pointer", background: checked ? "#eef2ff" : "#fff", transition: "all 0.15s" }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleTab(item.id)}
                                                style={{ accentColor: "#004ac6", width: "16px", height: "16px", flexShrink: 0 }}
                                            />
                                            <i className={`bi ${item.icon}`} style={{ fontSize: "15px", color: checked ? "#004ac6" : "#6b7280", flexShrink: 0 }}></i>
                                            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: checked ? 600 : 400, color: checked ? "#191c1e" : "#434655" }}>
                                                {item.label}
                                                {item.adminOnly && (
                                                    <span style={{ fontSize: "10px", marginLeft: "4px", color: "#004ac6", fontWeight: 600 }}>Admin</span>
                                                )}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                            <div style={{ marginTop: "12px", fontSize: "12px", color: "#6b7280", fontFamily: "Inter, sans-serif" }}>
                                {(formData.tab_ids || []).length} of {DEFAULT_MENU.length} tabs selected
                            </div>
                        </div>

                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
});

export default CustomerPackageCreate;
