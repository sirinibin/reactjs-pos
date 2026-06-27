import React, { useState, useEffect, useRef } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import eventEmitter from './utils/eventEmitter';

function formatTimeAgo(isoString) {
    if (!isoString) return '';
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now - then;
    if (diffMs < 0) return 'just now';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return diffSec + 's ago';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + 'm ago';
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    const diffDay = Math.floor(diffHr / 24);
    return diffDay + 'd ago';
}

function formatDateTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    });
}

// Persist map of { [id]: notify_at } for manually dismissed notifications.
// Key includes notify_at so a rescheduled reminder (new notify_at) still shows.
function getDismissedMap() {
    try { return JSON.parse(localStorage.getItem('dn_dismissed') || '{}'); }
    catch (_) { return {}; }
}
function saveDismissedMap(map) {
    localStorage.setItem('dn_dismissed', JSON.stringify(map));
}

function Topbar(props) {
    const { t } = useTranslation('common');
    const [notifications, setNotifications] = useState([]);
    const [, setTick] = useState(0); // used to re-render "time ago" every minute
    const notificationsRef = useRef([]);
    const [storeSettings, setStoreSettings] = useState(() => {
        try { return JSON.parse(localStorage.getItem('_store_settings_cache') || 'null'); } catch (_) { return null; }
    });
    const storeName = localStorage.getItem("store_name") || "";
    const branchName = localStorage.getItem("branch_name") || "";
    const [stores, setStores] = useState([]);
    const [storesLoading, setStoresLoading] = useState(false);
    const [storeCode, setStoreCode] = useState("");
    const [storeZatca, setStoreZatca] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    async function fetchStores() {
        if (stores.length > 0) return;
        setStoresLoading(true);
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch('/v1/store?select=id,name,code,branch_name,zatca&limit=10000', { headers: { Authorization: "Bearer " + token } });
            const data = res.ok && await res.json();
            if (data && Array.isArray(data.result)) setStores(data.result);
        } catch (_) {}
        setStoresLoading(false);
    }

    async function switchStore(store) {
        const token = localStorage.getItem("access_token");
        localStorage.setItem("store_id", store.id);
        localStorage.setItem("store_name", store.name);
        try {
            const res = await fetch(`/v1/store/${store.id}?select=id,branch_name`, { headers: { Authorization: "Bearer " + token } });
            const data = res.ok && await res.json();
            if (data?.result?.branch_name) {
                localStorage.setItem("branch_name", data.result.branch_name);
            } else {
                localStorage.removeItem("branch_name");
            }
        } catch (_) {}
        window.location.reload();
    }

    // Fetch store settings once on mount (for feature flags like enable_notification)
    useEffect(() => {
        const storeId = localStorage.getItem("store_id");
        const token = localStorage.getItem("access_token");
        if (!storeId || !token) return;
        fetch(`/v1/store/${storeId}?select=id,code,settings,zatca`, { headers: { Authorization: "Bearer " + token } })
            .then(async res => {
                const data = res.ok && await res.json();
                if (data && data.result) {
                    if (data.result.settings) {
                        setStoreSettings(data.result.settings);
                        localStorage.setItem('_store_settings_cache', JSON.stringify(data.result.settings));
                    }
                    if (data.result.code) setStoreCode(data.result.code);
                    if (data.result.zatca) setStoreZatca(data.result.zatca);
                }
            })
            .catch(() => { });
    }, []);

    function onTrigger(event) {
        props.parentCallback();
        event.preventDefault();
    }

    function logOut(event) {
        event.preventDefault();
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_id");
        localStorage.removeItem("user_photo");
        localStorage.removeItem("user_name");
        localStorage.removeItem("store_name");
        localStorage.removeItem("branch_name");
        localStorage.removeItem("store_id");
        localStorage.removeItem("admin");
        window.location = "/";
    }

    // Add a notification, avoiding duplicates by id.
    // arrived_at uses the server's notify_at so it stays stable across refreshes.
    function addNotification(notif) {
        const current = notificationsRef.current;
        if (current.find(n => n.id === notif.id)) return;
        const stamped = { ...notif, arrived_at: notif.arrived_at || notif.notify_at || new Date().toISOString() };
        const updated = [...current, stamped];
        notificationsRef.current = updated;
        setNotifications([...updated]);
    }

    // Fetch active (already notified) reminders when the WebSocket connects
    useEffect(() => {
        // Immediately restore notifications saved before page navigation (avoids visual flash)
        const saved = localStorage.getItem("dn_notifications");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                localStorage.removeItem("dn_notifications");
                if (Array.isArray(parsed)) {
                    parsed.forEach(n => addNotification(n));
                }
            } catch (_) { }
        }

        const fetchReminders = async () => {
            const storeId = localStorage.getItem("store_id");
            const token = localStorage.getItem("access_token");
            if (!storeId || !token) return;
            try {
                const res = await fetch(`/v1/delivery-note/reminders?search[store_id]=${storeId}`, {
                    headers: { Authorization: "Bearer " + token },
                });
                const data = await res.json();
                if (data.status && Array.isArray(data.result)) {
                    const dismissed = getDismissedMap();
                    data.result.forEach(dn => {
                        // Skip if the user manually dismissed this exact reminder
                        if (dismissed[dn.id] === (dn.notify_at || '')) return;
                        addNotification({ id: dn.id, code: dn.code, notify_at: dn.notify_at });
                    });
                }
            } catch (_) { }
        };

        fetchReminders();
        eventEmitter.on("socket_connection_open", fetchReminders);
        return () => eventEmitter.off("socket_connection_open", fetchReminders);
    }, []);

    // Listen for real-time delivery_note_reminder push events
    useEffect(() => {
        const handleReminder = (data) => {
            if (data && data.id && data.code) {
                addNotification({ id: data.id, code: data.code, notify_at: data.notify_at });
            }
        };
        eventEmitter.on("delivery_note_reminder", handleReminder);
        return () => eventEmitter.off("delivery_note_reminder", handleReminder);
    }, []);

    // Remove notification when a sale is created for the DN (server push)
    useEffect(() => {
        const handleLinked = (data) => {
            if (data && data.delivery_note_id) {
                dismissNotification(data.delivery_note_id);
            }
        };
        eventEmitter.on("delivery_note_order_linked", handleLinked);
        return () => eventEmitter.off("delivery_note_order_linked", handleLinked);
    }, []);

    // Re-render every 60 s so "time ago" text stays current
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(timer);
    }, []);

    // persist=true when user manually closes; false when auto-dismissed via order link
    function dismissNotification(id, persist = false) {
        const notif = notificationsRef.current.find(n => n.id === id);
        const updated = notificationsRef.current.filter(n => n.id !== id);
        notificationsRef.current = updated;
        setNotifications([...updated]);
        if (persist && notif) {
            const map = getDismissedMap();
            map[id] = notif.notify_at || '';
            saveDismissedMap(map);
        }
    }

    function openSalesFromDN(notif) {
        // Do NOT dismiss here — notification stays until the sale is actually created
        // Store the pending action so OrderIndex can pick it up after navigation
        localStorage.setItem("pending_sales_from_dn", JSON.stringify({ id: notif.id, code: notif.code }));
        // If already on the sales page, emit immediately; otherwise navigate
        if (window.location.pathname === "/dashboard/sales") {
            eventEmitter.emit("create_sales_from_dn", { id: notif.id, code: notif.code });
            localStorage.removeItem("pending_sales_from_dn");
        } else {
            // Persist current notifications so new Topbar can restore them instantly after reload
            localStorage.setItem("dn_notifications", JSON.stringify(notificationsRef.current));
            window.location.href = "/dashboard/sales";
        }
    }

    return (
        <>
            <nav className="navbar navbar-expand navbar-light navbar-bg">
                <a href="/" onClick={onTrigger} className="sidebar-toggle js-sidebar-toggle collapsed">
                    <i className="hamburger align-self-center"></i>
                </a>

                <div className="navbar-collapse collapse">
                    <Dropdown onToggle={(isOpen) => { if (isOpen) fetchStores(); }} className="ms-2" style={{ flex: "0 1 auto", minWidth: 0, overflow: "hidden" }}>
                        <Dropdown.Toggle
                            as="span"
                            style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", userSelect: "none", maxWidth: "100%", overflow: "hidden" }}
                            id="store-switcher-toggle"
                        >
                            <i className="bi bi-shop" style={{ fontSize: "15px", flexShrink: 0 }}></i>
                            <span style={{
                                fontWeight: 600,
                                maxWidth: "80px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flexShrink: 1,
                            }}>{storeName}</span>
                            {storeCode && (
                                <span className="d-none d-sm-inline text-muted" style={{ fontWeight: 400, fontSize: "12px", flexShrink: 0 }}>({storeCode})</span>
                            )}
                            {branchName && (
                                <span className="d-none d-sm-inline text-muted" style={{ fontWeight: 400, flexShrink: 0, whiteSpace: "nowrap" }}>· {branchName}</span>
                            )}
                            {storeZatca?.phase === "2" && storeZatca?.env && (
                                <span className="d-none d-sm-inline" style={{
                                    fontSize: "11px", fontWeight: 600, padding: "1px 6px",
                                    borderRadius: "4px", background: "#dbeafe", color: "#1d4ed8",
                                    flexShrink: 0, whiteSpace: "nowrap",
                                }}>{storeZatca.env}</span>
                            )}
                            <i className="bi bi-chevron-down" style={{ fontSize: "11px", flexShrink: 0 }}></i>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            {storesLoading ? (
                                <Dropdown.ItemText className="text-muted small">Loading...</Dropdown.ItemText>
                            ) : stores.length === 0 ? (
                                <Dropdown.ItemText className="text-muted small">No stores found</Dropdown.ItemText>
                            ) : (
                                stores.map(s => {
                                    const isActive = s.id === localStorage.getItem("store_id");
                                    const mutedColor = isActive ? "rgba(255,255,255,0.75)" : "#6c757d";
                                    return (
                                        <Dropdown.Item
                                            key={s.id}
                                            active={isActive}
                                            onClick={() => switchStore(s)}
                                        >
                                            <strong>{s.name}</strong>
                                            {s.code && <span style={{ fontSize: "12px", marginLeft: "4px", color: mutedColor }}>({s.code})</span>}
                                            {s.branch_name && <span style={{ marginLeft: "4px", color: mutedColor }}>· {s.branch_name}</span>}
                                            {s.zatca?.phase === "2" && s.zatca?.env && (
                                                <span style={{
                                                    fontSize: "11px", fontWeight: 600, padding: "1px 6px", marginLeft: "6px",
                                                    borderRadius: "4px", background: "#dbeafe", color: "#1d4ed8",
                                                }}>{s.zatca.env}</span>
                                            )}
                                        </Dropdown.Item>
                                    );
                                })
                            )}
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* Mobile menu button — inside collapse so ms-auto works in the flex row */}
                    <button
                        className="d-flex d-sm-none align-items-center ms-auto"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 10px", color: "#495057", flexShrink: 0 }}
                        onClick={() => setMobileMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        <i className="bi bi-three-dots-vertical" style={{ fontSize: "22px" }}></i>
                    </button>

                    {/* Desktop nav items — hidden on mobile */}
                    <ul className="navbar-nav navbar-align d-none d-sm-flex">

                        {storeSettings?.enable_notification === true && (
                            <li className="nav-item dropdown me-2">
                                <Dropdown>
                                    <Dropdown.Toggle
                                        as="span"
                                        style={{ cursor: "pointer", position: "relative", display: "inline-block", padding: "0 8px" }}
                                        id="dn-notifications-toggle"
                                    >
                                        <i className="bi bi-bell fs-5"></i>
                                        {notifications.length > 0 && (
                                            <span style={{
                                                position: "absolute",
                                                top: "-4px",
                                                right: "2px",
                                                background: "red",
                                                color: "white",
                                                borderRadius: "50%",
                                                fontSize: "11px",
                                                fontWeight: "bold",
                                                minWidth: "18px",
                                                height: "18px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                padding: "0 3px",
                                            }}>
                                                {notifications.length}
                                            </span>
                                        )}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu align="end" style={{ minWidth: "340px", maxHeight: "450px", overflowY: "auto" }}>
                                        {notifications.length === 0 ? (
                                            <Dropdown.ItemText className="text-muted small">No pending reminders</Dropdown.ItemText>
                                        ) : (
                                            notifications.map(notif => (
                                                <div
                                                    key={notif.id}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "flex-start",
                                                        padding: "8px 14px",
                                                        borderBottom: "1px solid #f0f0f0",
                                                        gap: "6px",
                                                    }}
                                                >
                                                    <div
                                                        style={{ flex: 1, cursor: "pointer", minWidth: 0 }}
                                                        onClick={() => openSalesFromDN(notif)}
                                                    >
                                                        <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
                                                            <i className="bi bi-file-earmark-text text-primary me-2"></i>
                                                            Create Sales For Delivery Note <strong>{notif.code}</strong>
                                                        </div>
                                                        {notif.arrived_at && (
                                                            <div style={{ fontSize: "11px", color: "#888", marginTop: "3px" }}>
                                                                {formatDateTime(notif.arrived_at)}
                                                                <span style={{ marginLeft: "6px", fontWeight: 600, color: "#555" }}>
                                                                    · {formatTimeAgo(notif.arrived_at)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id, true); }}
                                                        title="Dismiss"
                                                        style={{
                                                            background: "none",
                                                            border: "none",
                                                            cursor: "pointer",
                                                            color: "#aaa",
                                                            fontSize: "16px",
                                                            lineHeight: 1,
                                                            padding: "0 2px",
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </Dropdown.Menu>
                                </Dropdown>
                            </li>
                        )}

                        <li className="nav-item dropdown">
                            <LanguageSwitcher />
                        </li>

                        <li className="nav-item dropdown">
                            <Dropdown drop="down" align="end">
                                <Dropdown.Toggle
                                    as="span"
                                    id="user-menu-toggle"
                                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px", userSelect: "none" }}
                                >
                                    <i className="bi bi-person-circle" style={{ fontSize: "20px" }}></i>
                                    <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                                        {localStorage.getItem("user_name")}
                                    </span>
                                </Dropdown.Toggle>
                                <Dropdown.Menu align="end">
                                    <Dropdown.ItemText style={{ fontWeight: 600, color: "#333" }}>
                                        <i className="bi bi-person me-2"></i>{localStorage.getItem("user_name")}
                                    </Dropdown.ItemText>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={(e) => { logOut(e); }}>
                                        <i className="bi bi-box-arrow-right me-2"></i>{t('buttons.logout')}
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </li>
                    </ul>
                </div>

            </nav>

            {/* Mobile right drawer */}
            {mobileMenuOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setMobileMenuOpen(false)}
                        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1040 }}
                    />
                    {/* Drawer panel */}
                    <div style={{
                        position: "fixed", top: 0, right: 0, bottom: 0,
                        width: "270px", background: "#fff",
                        zIndex: 1050, boxShadow: "-3px 0 16px rgba(0,0,0,0.18)",
                        display: "flex", flexDirection: "column",
                    }}>
                        {/* Drawer header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #eee" }}>
                            <span style={{ fontWeight: 600, fontSize: "15px", color: "#333" }}>Menu</span>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "24px", color: "#666", lineHeight: 1 }}
                                aria-label="Close menu"
                            >
                                &times;
                            </button>
                        </div>

                        {/* User info */}
                        <div style={{ padding: "20px 16px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                                width: "46px", height: "46px", borderRadius: "50%",
                                background: "#3b7ddd", display: "flex", alignItems: "center",
                                justifyContent: "center", flexShrink: 0,
                            }}>
                                <i className="bi bi-person-fill" style={{ fontSize: "24px", color: "#fff" }}></i>
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: "15px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {localStorage.getItem("user_name")}
                                </div>
                                {storeName && (
                                    <div style={{ fontSize: "12px", color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
                                        <i className="bi bi-shop me-1"></i>{storeName}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Drawer actions */}
                        <div style={{ flex: 1, padding: "8px 0" }}>
                            <button
                                onClick={() => { setMobileMenuOpen(false); logOut({ preventDefault: () => {} }); }}
                                style={{
                                    display: "flex", alignItems: "center", gap: "10px",
                                    width: "100%", padding: "13px 18px",
                                    background: "none", border: "none", cursor: "pointer",
                                    fontSize: "14px", color: "#dc3545", textAlign: "left",
                                }}
                            >
                                <i className="bi bi-box-arrow-right" style={{ fontSize: "18px" }}></i>
                                {t('buttons.logout')}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

export default Topbar;