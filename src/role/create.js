import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { DEFAULT_MENU } from '../sidebar_menu_config.js';

const ACTIONS = ["read", "create", "update", "delete"];

const defaultPermissions = () =>
    DEFAULT_MENU.map(item => ({
        resource: item.resource,
        label: item.label,
        read: true,
        create: true,
        update: true,
        delete: true,
    }));

const UserRoleCreate = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        open(id) {
            setFormData({});
            setErrors({});
            setPermissions(defaultPermissions());
            if (id) loadRole(id);
            setShow(true);
        },
    }));

    const [show, setShow] = useState(false);
    const [formData, setFormData] = useState({});
    const [permissions, setPermissions] = useState(defaultPermissions());
    const [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);

    function handleClose() { setShow(false); }

    useEffect(() => {
        const at = localStorage.getItem("access_token");
        if (!at) window.location = "/";
    });

    function loadRole(id) {
        const storeId = localStorage.getItem("store_id");
        fetch("/v1/user-role/" + id + "?search[store_id]=" + storeId, {
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        })
            .then(r => r.json())
            .then(data => {
                if (data.result) {
                    setFormData(data.result);
                    // Merge saved permissions with full menu list
                    const saved = data.result.permissions || [];
                    const merged = DEFAULT_MENU.map(item => {
                        const existing = saved.find(p => p.resource === item.resource);
                        return existing
                            ? { ...existing, label: item.label }
                            : { resource: item.resource, label: item.label, read: false, create: false, update: false, delete: false };
                    });
                    setPermissions(merged);
                }
            });
    }

    function toggleAll(action, value) {
        setPermissions(prev => prev.map(p => {
            const updated = { ...p, [action]: value };
            // unchecking all READ → uncheck all write actions too
            if (action === "read" && !value) {
                updated.create = false;
                updated.update = false;
                updated.delete = false;
            }
            // checking all CREATE/UPDATE/DELETE → check READ too
            if (action !== "read" && value) {
                updated.read = true;
            }
            return updated;
        }));
    }

    function toggleRow(idx, action) {
        setPermissions(prev => {
            const next = [...prev];
            const current = next[idx];
            const newVal = !current[action];
            next[idx] = { ...current, [action]: newVal };
            // unchecking READ must also uncheck the write actions
            if (action === "read" && !newVal) {
                next[idx] = { ...next[idx], create: false, update: false, delete: false };
            }
            // checking CREATE/UPDATE/DELETE must also check READ
            if (action !== "read" && newVal) {
                next[idx] = { ...next[idx], read: true };
            }
            return next;
        });
    }

    function toggleRowAll(idx, value) {
        setPermissions(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], read: value, create: value, update: value, delete: value };
            return next;
        });
    }

    function handleSubmit() {
        const storeId = localStorage.getItem("store_id");
        const method = formData.id ? "PUT" : "POST";
        const baseUrl = formData.id ? "/v1/user-role/" + formData.id : "/v1/user-role";
        const url = baseUrl + (storeId ? "?search[store_id]=" + storeId : "");

        const body = {
            name: formData.name,
            permissions: permissions.map(({ resource, read, create, update, delete: del }) => ({
                resource, read, create, update, delete: del,
            })),
        };
        if (storeId) body.store_id = storeId;

        setProcessing(true);
        fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
            body: JSON.stringify(body),
        })
            .then(async r => {
                const data = await r.json();
                setProcessing(false);
                if (!r.ok) {
                    setErrors(data.errors || {});
                    if (props.showToastMessage) props.showToastMessage("Failed to save role!", "danger");
                    return;
                }
                setErrors({});
                if (props.showToastMessage)
                    props.showToastMessage(formData.id ? "Role updated!" : "Role created!", "success");
                localStorage.setItem("rbac_role_updated", Date.now().toString());
                window.dispatchEvent(new CustomEvent("rbac_role_updated"));
                if (props.refreshList) props.refreshList();
                handleClose();
                if (props.openDetailsView) props.openDetailsView(data.result?.id);
            })
            .catch(() => {
                setProcessing(false);
                if (props.showToastMessage) props.showToastMessage("Failed to save role!", "danger");
            });
    }

    const allChecked = action => permissions.every(p => p[action]);
    const someChecked = action => permissions.some(p => p[action]);

    return (
        <>
        <style>{`
          .ur-modal .modal-content { display: flex; flex-direction: column; height: 100%; }
          .ur-header { background: #fff; border-bottom: 1px solid #c3c6d7; padding: 10px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
          .ur-title { font-family: "Hanken Grotesk", sans-serif; font-size: 16px; font-weight: 700; color: #191c1e; flex: 1; min-width: 120px; }
          .ur-body { padding: 20px 16px; overflow-y: auto; flex: 1; }
          @media (min-width: 576px) { .ur-header { padding: 10px 24px; } .ur-body { padding: 24px; } .ur-title { font-size: 17px; } }
        `}</style>
        <Modal show={show} fullscreen onHide={handleClose} animation={false} backdrop="static" dialogClassName="ur-modal">
            <Modal.Header className="ur-header">
                <button type="button" onClick={handleClose}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#434655", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 600, fontFamily: "Inter, sans-serif", padding: "4px 8px", borderRadius: "4px", flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f0f2f4"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <i className="bi bi-arrow-left" style={{ fontSize: "16px" }} /> Back
                </button>
                <Modal.Title className="ur-title">
                    {formData.id ? `Edit Role — ${formData.name}` : "Create New Role"}
                </Modal.Title>
                <button type="button"
                    style={{ background: "#004ac6", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 14px", fontSize: "13px", fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
                    onClick={handleSubmit} disabled={isProcessing}>
                    {isProcessing && <Spinner as="span" animation="border" size="sm" />}
                    {formData.id ? "Update" : "Create"}
                </button>
                <button type="button" className="btn-close" onClick={handleClose} aria-label="Close" />
            </Modal.Header>

            <Modal.Body className="ur-body">
                {/* Role Name */}
                <div style={{ marginBottom: "24px", maxWidth: "420px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#191c1e", marginBottom: "4px" }}>
                        Role Name <span style={{ color: "#ba1a1a" }}>*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.name || ""}
                        onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                        style={{ border: "1px solid #c3c6d7", borderRadius: "4px", padding: "8px 12px", fontSize: "13px", width: "100%", outline: "none" }}
                        placeholder="e.g. Sales Manager"
                    />
                    {errors.name && <div style={{ color: "#ba1a1a", fontSize: "12px", marginTop: "3px" }}>{errors.name}</div>}
                </div>

                {/* Permission Matrix */}
                <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#191c1e", marginBottom: "12px", fontFamily: '"Hanken Grotesk", sans-serif' }}>
                        Permissions
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", fontFamily: '"Inter", sans-serif' }}>
                            <thead>
                                <tr style={{ background: "#f2f4f6" }}>
                                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, minWidth: "200px" }}>Module</th>
                                    {ACTIONS.map(action => (
                                        <th key={action} style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, minWidth: "90px" }}>
                                            <div style={{ textTransform: "capitalize", marginBottom: "4px" }}>{action}</div>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={allChecked(action)}
                                                    ref={el => { if (el) el.indeterminate = !allChecked(action) && someChecked(action); }}
                                                    onChange={e => toggleAll(action, e.target.checked)}
                                                    style={{ cursor: "pointer", width: "14px", height: "14px" }}
                                                />
                                                <span style={{ fontSize: "10px", color: "#666" }}>All</span>
                                            </div>
                                        </th>
                                    ))}
                                    <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, minWidth: "80px" }}>
                                        <div style={{ marginBottom: "4px" }}>All</div>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                            <input
                                                type="checkbox"
                                                checked={permissions.every(p => p.read && p.create && p.update && p.delete)}
                                                onChange={e => {
                                                    ACTIONS.forEach(a => toggleAll(a, e.target.checked));
                                                }}
                                                style={{ cursor: "pointer", width: "14px", height: "14px" }}
                                            />
                                            <span style={{ fontSize: "10px", color: "#666" }}>All</span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {permissions.map((perm, idx) => (
                                    <tr key={perm.resource} style={{ borderBottom: "1px solid #e8eaed", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                                        <td style={{ padding: "8px 12px", fontWeight: 500, color: "#2c2f3a" }}>{perm.label}</td>
                                        {ACTIONS.map(action => (
                                            <td key={action} style={{ padding: "8px 12px", textAlign: "center" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!perm[action]}
                                                    onChange={() => toggleRow(idx, action)}
                                                    style={{ cursor: "pointer", width: "15px", height: "15px", accentColor: "#004ac6" }}
                                                />
                                            </td>
                                        ))}
                                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                            <input
                                                type="checkbox"
                                                checked={ACTIONS.every(a => perm[a])}
                                                onChange={e => toggleRowAll(idx, e.target.checked)}
                                                style={{ cursor: "pointer", width: "15px", height: "15px", accentColor: "#004ac6" }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
        </>
    );
});

export default UserRoleCreate;
