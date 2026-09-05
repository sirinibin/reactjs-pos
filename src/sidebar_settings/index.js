import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_MENU, loadSidebarConfig, saveSidebarConfig } from "../sidebar_menu_config";

export default function SidebarSettings() {
    const [items, setItems]       = useState([]);
    const [saved, setSaved]       = useState(false);
    const [serverLoading, setServerLoading] = useState(false);
    const [syncError, setSyncError] = useState(null);
    const dragIndex               = useRef(null);
    const [draggingId, setDraggingId] = useState(null);

    const { t } = useTranslation('common');
    const isAdmin = localStorage.getItem("user_role") === "Admin";
    const storeSettings = (() => {
        try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; }
    })();
    const serverSyncEnabled = !!storeSettings?.save_sidebar_config_to_server;
    const warehouseEnabled   = !!storeSettings?.enable_warehouse_module;
    const automobileEnabled  = !!storeSettings?.enable_automobile_module;
    const employeeEnabled    = !!storeSettings?.enable_employee_module;
    const servicesEnabled        = !!storeSettings?.enable_services;
    const purchaseOrderEnabled   = !!storeSettings?.enable_purchase_order_module;
    const purchaseRequestEnabled = !!storeSettings?.enable_purchase_request_module;
    const aiRFQBotEnabled        = !!storeSettings?.enable_ai_rfq_bot;

    useEffect(() => {
        // Always start with localStorage (fast, synchronous)
        setItems(loadSidebarConfig());

        // If server sync is enabled, fetch from server and override
        if (serverSyncEnabled) {
            const storeId = localStorage.getItem('store_id');
            const token = localStorage.getItem('access_token');
            if (storeId && token) {
                setServerLoading(true);
                fetch('/v1/store/' + storeId, { headers: { 'Authorization': token } })
                    .then(r => r.json())
                    .then(data => {
                        const serverConfig = data?.result?.settings?.sidebar_config;
                        if (serverConfig && serverConfig.length > 0) {
                            // Merge server config with DEFAULT_MENU metadata
                            const mapped = serverConfig
                                .map(s => DEFAULT_MENU.find(m => m.id === s.id) ? { ...DEFAULT_MENU.find(m => m.id === s.id), visible: s.visible } : null)
                                .filter(Boolean);
                            const savedIds = new Set(serverConfig.map(s => s.id));
                            DEFAULT_MENU.filter(m => !savedIds.has(m.id)).forEach(newItem => {
                                const defaultIdx = DEFAULT_MENU.findIndex(m => m.id === newItem.id);
                                let insertAt = mapped.length;
                                for (let i = mapped.length - 1; i >= 0; i--) {
                                    const existingIdx = DEFAULT_MENU.findIndex(m => m.id === mapped[i].id);
                                    if (existingIdx < defaultIdx) { insertAt = i + 1; break; }
                                    if (i === 0) insertAt = 0;
                                }
                                mapped.splice(insertAt, 0, { ...newItem, visible: true });
                            });
                            setItems(mapped);
                            // Update localStorage cache so Sidebar renders correctly
                            localStorage.setItem('sidebar_config', JSON.stringify(mapped.map(({ id, visible }) => ({ id, visible }))));
                        }
                    })
                    .catch(() => {})
                    .finally(() => setServerLoading(false));
            }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        setSyncError(null);
        const result = saveSidebarConfig(items);
        setSaved(true);
        window.dispatchEvent(new StorageEvent('storage', { key: 'sidebar_config' }));
        if (result && typeof result.then === 'function') {
            result.then(r => {
                if (r && !r.synced && r.error !== undefined) {
                    setSyncError(typeof r.error === 'string' ? r.error : JSON.stringify(r.error));
                }
            });
        }
    }

    function handleReset() {
        setSyncError(null);
        const defaults = DEFAULT_MENU.map(m => ({ ...m, visible: true }));
        saveSidebarConfig(defaults);
        setItems(defaults);
        setSaved(false);
        window.dispatchEvent(new StorageEvent('storage', { key: 'sidebar_config' }));
    }

    const landingId     = items.find(i => i.visible)?.id;
    const visibleCount  = items.filter(i => i.visible).length;

    return (
        <div className="container-fluid px-3 py-3" style={{ maxWidth: 640 }}>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-1">
                <h5 className="mb-0 fw-bold">
                    <i className="bi bi-list-ul me-2 text-primary" />
                    {t('Menu Settings')}
                </h5>
                <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={handleReset}>
                        <i className="bi bi-arrow-counterclockwise me-1" />{t('Reset')}
                    </button>
                    <button
                        className={`btn btn-sm ${saved ? "btn-success" : "btn-primary"}`}
                        onClick={handleSave}
                        disabled={serverLoading}
                    >
                        {serverLoading
                            ? <><span className="spinner-border spinner-border-sm me-1" />{t('Loading...')}</>
                            : <><i className={`bi bi-${saved ? "check2" : "floppy"} me-1`} />{saved ? t('Saved!') : t('Save & Apply')}</>
                        }
                    </button>
                </div>
            </div>
            <p className="text-muted small mb-3">
                {t('Drag to reorder, toggle to show/hide, the first')} <i className="bi bi-grip-vertical" />
                <span className="badge bg-success ms-1 me-1" style={{ fontSize: "0.65rem" }}>
                    <i className="bi bi-house-fill me-1" />{t('Landing')}
                </span>
                {t('visible item opens after login.')}
            </p>

            {/* Item list */}
            <div className="card shadow-sm">
                {items.map((item, index) => {
                    const meta       = DEFAULT_MENU.find(m => m.id === item.id);
                    if (!meta) return null;
                    if (meta.adminOnly && !isAdmin) return null;
                    if (meta.warehouseOnly && !warehouseEnabled) return null;
                    if (meta.requiresAutomobileModule && !automobileEnabled) return null;
                    if (meta.requiresEmployeeModule && !employeeEnabled) return null;
                    if (meta.requiresServices && !servicesEnabled) return null;
                    if (meta.requiresPurchaseOrderModule && !purchaseOrderEnabled) return null;
                    if (meta.purchaseRequestOnly && !purchaseRequestEnabled) return null;
                    if (meta.requiresAIRFQBot && !aiRFQBotEnabled) return null;
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
                            {meta.parentId && <span style={{ color: "#adb5bd", fontSize: "0.85rem", marginLeft: "8px" }}>↳</span>}
                            <i className={`bi ${meta.icon} text-secondary`} style={{ flexShrink: 0 }} />
                            <span className="flex-grow-1" style={{ fontSize: "0.9rem", fontWeight: item.visible ? 500 : 400, color: item.visible ? "#212529" : "#adb5bd" }}>
                                {t(meta.label)}
                            </span>

                            {/* Badges */}
                            <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                {meta.adminOnly                && <span className="badge bg-warning text-dark" style={{ fontSize: "0.6rem" }}>{t('Admin')}</span>}
                                {meta.warehouseOnly            && <span className="badge bg-info text-dark"    style={{ fontSize: "0.6rem" }}>{t('Warehouse')}</span>}
                                {meta.requiresAutomobileModule && <span className="badge bg-secondary text-white" style={{ fontSize: "0.6rem" }}>{t('Automobiles')}</span>}
                                {meta.requiresEmployeeModule   && <span className="badge bg-secondary text-white" style={{ fontSize: "0.6rem" }}>{t('Employees')}</span>}
                                {meta.requiresServices             && <span className="badge bg-secondary text-white" style={{ fontSize: "0.6rem" }}>{t('Services')}</span>}
                                {meta.requiresPurchaseOrderModule  && <span className="badge bg-secondary text-white" style={{ fontSize: "0.6rem" }}>{t('Purchase Orders')}</span>}
                                {meta.purchaseRequestOnly          && <span className="badge bg-secondary text-white" style={{ fontSize: "0.6rem" }}>{t('Purchase Requests')}</span>}
                                {meta.requiresAIRFQBot             && <span className="badge bg-primary text-white"    style={{ fontSize: "0.6rem" }}><i className="bi bi-robot me-1" />{t('AI RFQ Bot')}</span>}
                                {isLanding && (
                                    <span className="badge bg-success" style={{ fontSize: "0.6rem" }}>
                                        <i className="bi bi-house-fill me-1" />{t('Landing')}
                                    </span>
                                )}
                                {!isLanding && item.visible && (
                                    <button
                                        className="btn btn-xs btn-outline-success py-0 px-1"
                                        style={{ fontSize: "0.65rem", lineHeight: 1.4 }}
                                        title={t('Set as landing page after login')}
                                        onClick={() => setAsLanding(item.id)}
                                    >
                                        <i className="bi bi-house me-1" />{t('Set Landing')}
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
                    {t('At least one item must be visible.')}
                </div>
            )}

            {syncError && (
                <div className="alert alert-danger mt-3 small py-2 px-3">
                    <i className="bi bi-exclamation-triangle-fill me-2" />
                    {t('Server sync failed')}: {syncError}
                </div>
            )}
            <p className="text-muted small mt-3 mb-0">
                <i className="bi bi-info-circle me-1" />
                {serverSyncEnabled
                    ? t('Changes apply immediately after saving. Your settings are synced to the server and shared across devices.')
                    : t('Changes apply immediately after saving. Your settings are stored in this browser.')}
            </p>
        </div>
    );
}
