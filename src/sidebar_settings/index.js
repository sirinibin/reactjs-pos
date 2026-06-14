import React, { useState, useEffect, useRef } from "react";
import { DEFAULT_MENU, loadSidebarConfig, saveSidebarConfig } from "../sidebar_menu_config";

export default function SidebarSettings() {
    const [items, setItems]       = useState([]);
    const [saved, setSaved]       = useState(false);
    const dragIndex               = useRef(null);
    const [draggingId, setDraggingId] = useState(null);

    useEffect(() => { setItems(loadSidebarConfig()); }, []);

    // ── Drag handlers (HTML5 native, no library) ────────────────────────────
    function onDragStart(e, index) {
        dragIndex.current = index;
        setDraggingId(items[index].id);
        e.dataTransfer.effectAllowed = "move";
    }

    function onDragEnter(index) {
        if (dragIndex.current === null || dragIndex.current === index) return;
        setItems(prev => {
            const next = [...prev];
            const [moved] = next.splice(dragIndex.current, 1);
            next.splice(index, 0, moved);
            dragIndex.current = index;
            return next;
        });
    }

    function onDragEnd() {
        dragIndex.current = null;
        setDraggingId(null);
    }

    // ── Actions ─────────────────────────────────────────────────────────────
    function toggleVisible(id) {
        setItems(prev => prev.map(item => item.id === id ? { ...item, visible: !item.visible } : item));
        setSaved(false);
    }

    function setAsLanding(id) {
        // Move the chosen item to the front and make it visible
        setItems(prev => {
            const idx  = prev.findIndex(i => i.id === id);
            if (idx <= 0) return prev.map(i => i.id === id ? { ...i, visible: true } : i);
            const next = [...prev];
            const [target] = next.splice(idx, 1);
            next.unshift({ ...target, visible: true });
            return next;
        });
        setSaved(false);
    }

    function handleSave() {
        saveSidebarConfig(items);
        setSaved(true);
        setTimeout(() => {
            window.location.reload();
        }, 800);
    }

    function handleReset() {
        const defaults = DEFAULT_MENU.map(m => ({ ...m, visible: true }));
        saveSidebarConfig(defaults);
        setItems(defaults);
        setSaved(false);
        setTimeout(() => window.location.reload(), 400);
    }

    const landingId     = items.find(i => i.visible)?.id;
    const visibleCount  = items.filter(i => i.visible).length;

    return (
        <div className="container-fluid px-3 py-3" style={{ maxWidth: 640 }}>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-1">
                <h5 className="mb-0 fw-bold">
                    <i className="bi bi-list-ul me-2 text-primary" />
                    Menu Settings
                </h5>
                <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={handleReset}>
                        <i className="bi bi-arrow-counterclockwise me-1" />Reset
                    </button>
                    <button
                        className={`btn btn-sm ${saved ? "btn-success" : "btn-primary"}`}
                        onClick={handleSave}
                    >
                        <i className={`bi bi-${saved ? "check2" : "floppy"} me-1`} />
                        {saved ? "Saved!" : "Save & Apply"}
                    </button>
                </div>
            </div>
            <p className="text-muted small mb-3">
                Drag <i className="bi bi-grip-vertical" /> to reorder · toggle to show/hide · the first
                <span className="badge bg-success ms-1 me-1" style={{ fontSize: "0.65rem" }}>
                    <i className="bi bi-house-fill me-1" />Landing
                </span>
                visible item opens after login.
            </p>

            {/* Item list */}
            <div className="card shadow-sm">
                {items.map((item, index) => {
                    const meta       = DEFAULT_MENU.find(m => m.id === item.id);
                    if (!meta) return null;
                    const isLanding  = item.id === landingId && item.visible;
                    const isDragging = draggingId === item.id;

                    return (
                        <div
                            key={item.id}
                            draggable
                            onDragStart={e => onDragStart(e, index)}
                            onDragEnter={() => onDragEnter(index)}
                            onDragEnd={onDragEnd}
                            onDragOver={e => e.preventDefault()}
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            style={{
                                borderBottom: "1px solid #f0f0f0",
                                opacity:      isDragging ? 0.35 : 1,
                                background:   isDragging ? "#f8f9fa" : isLanding ? "#f0fff4" : "#fff",
                                cursor:       "default",
                                transition:   "background 0.15s",
                                userSelect:   "none",
                            }}
                        >
                            {/* Drag handle */}
                            <i
                                className="bi bi-grip-vertical text-muted"
                                style={{ cursor: "grab", fontSize: "1.1rem", flexShrink: 0 }}
                            />

                            {/* Icon + Label */}
                            <i className={`bi ${meta.icon} text-secondary`} style={{ flexShrink: 0 }} />
                            <span className="flex-grow-1" style={{ fontSize: "0.9rem", fontWeight: item.visible ? 500 : 400, color: item.visible ? "#212529" : "#adb5bd" }}>
                                {meta.label}
                            </span>

                            {/* Badges */}
                            <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                {meta.adminOnly     && <span className="badge bg-warning text-dark" style={{ fontSize: "0.6rem" }}>Admin</span>}
                                {meta.warehouseOnly && <span className="badge bg-info text-dark"    style={{ fontSize: "0.6rem" }}>Warehouse</span>}
                                {isLanding && (
                                    <span className="badge bg-success" style={{ fontSize: "0.6rem" }}>
                                        <i className="bi bi-house-fill me-1" />Landing
                                    </span>
                                )}
                                {!isLanding && item.visible && (
                                    <button
                                        className="btn btn-xs btn-outline-success py-0 px-1"
                                        style={{ fontSize: "0.65rem", lineHeight: 1.4 }}
                                        title="Set as landing page after login"
                                        onClick={() => setAsLanding(item.id)}
                                    >
                                        <i className="bi bi-house me-1" />Set Landing
                                    </button>
                                )}
                            </div>

                            {/* Visibility toggle */}
                            <div className="form-check form-switch mb-0 ms-1 flex-shrink-0">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    checked={item.visible}
                                    onChange={() => toggleVisible(item.id)}
                                    title={item.visible ? "Hide from sidebar" : "Show in sidebar"}
                                    style={{ cursor: "pointer" }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {visibleCount === 0 && (
                <div className="alert alert-warning mt-3 small">
                    <i className="bi bi-exclamation-triangle-fill me-2" />
                    At least one item must be visible.
                </div>
            )}

            <p className="text-muted small mt-3 mb-0">
                <i className="bi bi-info-circle me-1" />
                Changes apply immediately after saving. Your settings are stored in this browser.
            </p>
        </div>
    );
}
