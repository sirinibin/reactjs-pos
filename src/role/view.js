import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal } from "react-bootstrap";
import { DEFAULT_MENU } from '../sidebar_menu_config.js';

const ACTIONS = ["read", "create", "update", "delete"];

const UserRoleView = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        open(id) {
            setRole(null);
            if (id) loadRole(id);
            setShow(true);
        },
    }));

    const [show, setShow] = useState(false);
    const [role, setRole] = useState(null);

    function handleClose() { setShow(false); }

    function loadRole(id) {
        const storeId = localStorage.getItem("store_id");
        fetch("/v1/user-role/" + id + "?search[store_id]=" + storeId, {
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("access_token"),
            },
        })
            .then(r => r.json())
            .then(data => { if (data.result) setRole(data.result); });
    }

    // Merge saved permissions with full menu label list
    const enrichedPerms = role
        ? DEFAULT_MENU.map(item => {
            const saved = (role.permissions || []).find(p => p.resource === item.resource);
            return { label: item.label, resource: item.resource, ...(saved || { read: false, create: false, update: false, delete: false }) };
        })
        : [];

    const check = val => val
        ? <span style={{ color: "#1a7f4a", fontSize: "13px" }}>✓</span>
        : <span style={{ color: "#c5c8d0", fontSize: "13px" }}>—</span>;

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
                    {role ? `Role: ${role.name}` : "Role Detail"}
                </Modal.Title>
                {role && (
                    <button type="button"
                        style={{ background: "#d0e1fb", color: "#54647a", border: "none", borderRadius: "4px", padding: "6px 14px", fontSize: "13px", fontWeight: 600, fontFamily: '"Inter", sans-serif', cursor: "pointer", flexShrink: 0 }}
                        onClick={() => { handleClose(); if (props.openCreateView) props.openCreateView(role.id); }}>
                        <i className="bi bi-pencil me-1" />Edit
                    </button>
                )}
                <button type="button" className="btn-close" onClick={handleClose} aria-label="Close" />
            </Modal.Header>

            <Modal.Body className="ur-body">
                {!role ? (
                    <div className="text-center py-5 text-muted">Loading…</div>
                ) : (
                    <>
                        <div style={{ marginBottom: "20px", display: "flex", gap: "32px", flexWrap: "wrap" }}>
                            <div>
                                <div style={{ fontSize: "11px", fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".05em" }}>Role Name</div>
                                <div style={{ fontSize: "15px", fontWeight: 700, color: "#191c1e", marginTop: "2px" }}>{role.name}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: "11px", fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".05em" }}>Created By</div>
                                <div style={{ fontSize: "13px", color: "#2c2f3a", marginTop: "2px" }}>{role.created_by_name || "—"}</div>
                            </div>
                        </div>

                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#191c1e", marginBottom: "12px", fontFamily: '"Hanken Grotesk", sans-serif' }}>
                            Permissions
                        </div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", fontFamily: '"Inter", sans-serif' }}>
                                <thead>
                                    <tr style={{ background: "#f2f4f6" }}>
                                        <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, minWidth: "200px" }}>Module</th>
                                        {ACTIONS.map(a => (
                                            <th key={a} style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, minWidth: "80px", textTransform: "capitalize" }}>{a}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {enrichedPerms.map((perm, idx) => (
                                        <tr key={perm.resource} style={{ borderBottom: "1px solid #e8eaed", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                                            <td style={{ padding: "8px 12px", fontWeight: 500, color: "#2c2f3a" }}>{perm.label}</td>
                                            {ACTIONS.map(a => (
                                                <td key={a} style={{ padding: "8px 12px", textAlign: "center" }}>{check(perm[a])}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Modal.Body>
        </Modal>
        </>
    );
});

export default UserRoleView;
