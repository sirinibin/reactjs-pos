import React, { useState, useEffect, useRef } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
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

    // Fetch store settings once on mount (for feature flags like enable_notification)
    useEffect(() => {
        const storeId = localStorage.getItem("store_id");
        const token = localStorage.getItem("access_token");
        if (!storeId || !token) return;
        fetch(`/v1/store/${storeId}?select=id,settings`, { headers: { Authorization: "Bearer " + token } })
            .then(async res => {
                const data = res.ok && await res.json();
                if (data && data.result && data.result.settings) {
                    setStoreSettings(data.result.settings);
                    localStorage.setItem('_store_settings_cache', JSON.stringify(data.result.settings));
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

    return (<nav className="navbar navbar-expand navbar-light navbar-bg">
        <a href="/" onClick={onTrigger} className="sidebar-toggle js-sidebar-toggle collapsed">
            <i className="hamburger align-self-center"></i>
        </a>


        <div className="navbar-collapse collapse">
            {localStorage.getItem("branch_name") ? t('labels.branch') + ": " + localStorage.getItem("branch_name") : ""}


            <ul className="navbar-nav navbar-align">

                {/* Delivery Note Reminders Bell */}
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
                    {/* Language Switcher */}
                    <LanguageSwitcher />
                </li>

                <li className="nav-item dropdown">
                    <a href="/"
                        className="nav-icon dropdown-toggle d-inline-block d-sm-none"

                        data-bs-toggle="dropdown"
                    >
                        <i className="align-middle" data-feather="settings"></i>
                    </a>


                    <DropdownButton
                        id="dropdown-basic-button"
                        title={localStorage.getItem("user_name")}
                        drop={"down"}
                    >
                        <Dropdown.Item onClick={(e) => {
                            logOut(e);
                        }} > <i className="bi bi-box-arrow-right"></i> {t('buttons.logout')}</Dropdown.Item>
                    </DropdownButton>

                    {/*<div className="dropdown-menu dropdown-menu-end">
                        <a href="/" onClick={logOut} className="dropdown-item">
                            <i className="align-middle me-1" data-feather="log-out"></i> Log out</a>
                    </div>*/}
                </li>
            </ul>
        </div>
    </nav >);
}

export default Topbar;