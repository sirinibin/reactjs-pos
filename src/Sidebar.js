import React, { useEffect, useState, useCallback } from 'react';
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { loadSidebarConfig } from './sidebar_menu_config';

function Sidebar(props) {
    const { t } = useTranslation('common');
    const [activeTab, setActiveTab] = useState('');
    const [menuItems, setMenuItems] = useState([]);
    const [store, setStore] = useState({});

    const isAdmin        = localStorage.getItem("user_role") === "Admin";
    const storeId        = localStorage.getItem("store_id");

    const getStore = useCallback(async (id) => {
        if (!id) return;
        const res = await fetch('/v1/store/' + id, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        }).then(r => r.json()).catch(() => ({}));
        if (res?.result) setStore(res.result);
    }, []);

    useEffect(() => {
        getStore(storeId);
    }, [getStore, storeId]);

    // Reload menu whenever sidebar settings change (storage event fires across tabs,
    // but we also reload on mount so a same-tab save+reload picks up the new config).
    useEffect(() => {
        setMenuItems(loadSidebarConfig());
        function onStorage(e) {
            if (e.key === "sidebar_config") setMenuItems(loadSidebarConfig());
        }
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    function toggleActive(path) {
        setActiveTab(path);
        if (window.innerWidth <= 991.98) props.parentCallback();
    }

    // Package tab restriction for non-admin users
    const packageTabIDs = store?.customer_package_tab_ids;
    const hasPackage = Array.isArray(packageTabIDs) && packageTabIDs.length > 0;

    // Filter items: respect visibility, adminOnly, warehouseOnly, productsOnly, package
    const visibleItems = menuItems.filter(item => {
        if (!item.visible) return false;
        if (item.adminOnly && !isAdmin) return false;
        if (item.warehouseOnly && !store?.settings?.enable_warehouse_module) return false;
        if (item.requiresPurchaseOrderModule && store?.id && !store?.settings?.enable_purchase_order_module) return false;
        // productsOnly: hide only when services mode is active but products are not enabled.
        // Backward compat: if neither flag is set (old stores), show everything.
        if (item.productsOnly && store?.settings?.enable_services && !store?.settings?.enable_products) return false;
        if (item.requiresServices && !store?.settings?.enable_services) return false;
        // Package restriction: non-admin users only see tabs in the assigned package
        if (!isAdmin && hasPackage && !packageTabIDs.includes(item.id)) return false;
        return true;
    });

    return (
        <nav id="sidebar" className={'sidebar ' + props.isSidebarOpen + ' js-sidebar'} style={{ overflowY: 'scroll' }}>
            <div className="sidebar-content js-simplebar">
                <div className="sidebar-brand">
                    <span className="align-middle">Start POS</span>
                </div>

                <ul className="sidebar-nav">
                    {visibleItems.map(item => (
                        <li
                            key={item.id}
                            onClick={() => toggleActive(item.path)}
                            className={activeTab === item.path ? "sidebar-item active" : "sidebar-item"}
                        >
                            <Link to={item.path} className="sidebar-link">
                                <i className={`bi ${item.icon}`} />
                                <span className="align-middle">{t(item.label)}</span>
                            </Link>
                        </li>
                    ))}

                    {/* Settings link — always at the bottom */}
                    <li
                        onClick={() => toggleActive("/dashboard/sidebar-settings")}
                        className={activeTab === "/dashboard/sidebar-settings" ? "sidebar-item active" : "sidebar-item"}
                        style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.1)" }}
                    >
                        <Link to="/dashboard/sidebar-settings" className="sidebar-link">
                            <i className="bi bi-list-ul" />
                            <span className="align-middle">{t("Menu Settings")}</span>
                        </Link>
                    </li>
                </ul>

                <div className="sidebar-cta">
                    <div className="sidebar-cta-content" />
                </div>
            </div>
        </nav>
    );
}

export default Sidebar;
