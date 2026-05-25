import React, { useState, useEffect, useRef } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import eventEmitter from './utils/eventEmitter';

function Topbar(props) {
    const { t } = useTranslation('common');
    const [notifications, setNotifications] = useState([]);
    const notificationsRef = useRef([]);

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

    // Add a notification, avoiding duplicates by id
    function addNotification(notif) {
        const current = notificationsRef.current;
        if (current.find(n => n.id === notif.id)) return;
        const updated = [...current, notif];
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
                const res = await fetch(`/v1/delivery-note/reminders?store_id=${storeId}`, {
                    headers: { Authorization: "Bearer " + token },
                });
                const data = await res.json();
                if (data.status && Array.isArray(data.result)) {
                    data.result.forEach(dn => addNotification({ id: dn.id, code: dn.code, notify_at: dn.notify_at }));
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

    function dismissNotification(id) {
        const updated = notificationsRef.current.filter(n => n.id !== id);
        notificationsRef.current = updated;
        setNotifications([...updated]);
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
                        <Dropdown.Menu align="end" style={{ minWidth: "320px", maxHeight: "400px", overflowY: "auto" }}>
                            {notifications.length === 0 ? (
                                <Dropdown.ItemText className="text-muted small">No pending reminders</Dropdown.ItemText>
                            ) : (
                                notifications.map(notif => (
                                    <Dropdown.Item
                                        key={notif.id}
                                        onClick={() => openSalesFromDN(notif)}
                                        style={{ whiteSpace: "normal" }}
                                    >
                                        <i className="bi bi-file-earmark-text text-primary me-2"></i>
                                        Time to Create Sales For Delivery Note <strong>{notif.code}</strong>
                                    </Dropdown.Item>
                                ))
                            )}
                        </Dropdown.Menu>
                    </Dropdown>
                </li>

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