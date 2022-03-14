import React, { useState } from 'react';
import {
    Link
} from "react-router-dom";
import Cookies from "universal-cookie";

function Sidebar(props) {

    const cookies = new Cookies();


    const [appState, ChangeState] = useState({
        activeTab: '',
        tabs: [
            'sales',
            'sales return',
            'purchases',
            'purchase return',
            'quotations',
            'vendors',
            'stores',
            'customers',
            'products',
            'product category',
            'users',
            'signatures'
        ],
    });



    function toggleActive(tabName) {

        ChangeState({ ...appState, activeTab: tabName });

        if (window.innerWidth <= 991.98) {
            props.parentCallback();
        }

    };

    function toggleActiveStyles(tabName) {
        if (tabName === appState.activeTab) {
            return "sidebar-item active";
        } else {
            return "sidebar-item";
        }
    }

    return <nav id="sidebar" className={'sidebar ' + props.isSidebarOpen + ' js-sidebar'}>
        <div className="sidebar-content js-simplebar">
            <div className="sidebar-brand">
                <span className="align-middle">
                    {cookies.get('store_name') ? cookies.get('store_name') : "Start POS"}
                </span>
            </div>

            <ul className="sidebar-nav">
                <li onClick={() => {
                    toggleActive(appState.tabs[0]);
                }} className={toggleActiveStyles(appState.tabs[0])}>
                    <Link to="/dashboard/sales" className="sidebar-link">
                        <i className="bi bi-currency-dollar" />
                        <span className="align-middle">Sales</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[1]);
                }} className={toggleActiveStyles(appState.tabs[1])}>
                    <Link to="/dashboard/salesreturn" className="sidebar-link">
                        <i className="bi bi-currency-dollar" />
                        <span className="align-middle">Sales Return</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[2]);
                }} className={toggleActiveStyles(appState.tabs[2])}>
                    <Link to="/dashboard/purchases" className="sidebar-link">
                        <i className="bi bi-currency-dollar" />
                        <span className="align-middle">Purchases</span>
                    </Link>
                </li>

                <li onClick={() => {
                    toggleActive(appState.tabs[3]);
                }} className={toggleActiveStyles(appState.tabs[3])}>
                    <Link to="/dashboard/purchasereturn" className="sidebar-link">
                        <i className="bi bi-currency-dollar" />
                        <span className="align-middle">Purchase Return</span>
                    </Link>
                </li>

                <li onClick={() => {
                    toggleActive(appState.tabs[4]);
                }} className={toggleActiveStyles(appState.tabs[4])} >
                    <Link to="/dashboard/quotations" className="sidebar-link">
                        <i className="bi bi-file-earmark-text" />
                        <span className="align-middle">Quotations</span>
                    </Link>
                </li>

                <li onClick={() => {
                    toggleActive(appState.tabs[5]);
                }} className={toggleActiveStyles(appState.tabs[5])}>
                    <Link to="/dashboard/vendors" className="sidebar-link">
                        <i className="bi bi-shop" />
                        <span className="align-middle">Vendors/Suppliers</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[6]);
                }} className={toggleActiveStyles(appState.tabs[6])}>
                    <Link to="/dashboard/stores" className="sidebar-link">
                        <i className="bi bi-shop" />
                        <span className="align-middle">Stores</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[7]);
                }} className={toggleActiveStyles(appState.tabs[7])}>
                    <Link to="/dashboard/customers" className="sidebar-link">
                        <i className="bi bi-people" />
                        <span className="align-middle">Customers</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[8]);
                }} className={toggleActiveStyles(appState.tabs[8])}>
                    <Link to="/dashboard/products" className="sidebar-link">
                        <i className="bi bi-cart" />
                        <span className="align-middle">Products</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[9]);
                }} className={toggleActiveStyles(appState.tabs[9])}>
                    <Link to="/dashboard/product_category" className="sidebar-link">
                        <i className="bi bi-diagram-3" />
                        <span className="align-middle">Product Category</span>
                    </Link>
                </li>
                {cookies.get('admin') === "true" ? <li onClick={() => {
                    toggleActive(appState.tabs[10]);
                }} className={toggleActiveStyles(appState.tabs[10])}>
                    <Link to="/dashboard/users" className="sidebar-link">
                        <i className="bi bi-file-person" />
                        <span className="align-middle">Users</span>
                    </Link>
                </li> : ""}
                <li onClick={() => {
                    toggleActive(appState.tabs[11]);
                }} className={toggleActiveStyles(appState.tabs[11])}>
                    <Link to="/dashboard/signatures" className="sidebar-link">
                        <i className="bi bi-fingerprint" />
                        <span className="align-middle">Signatures</span>
                    </Link>
                </li>
            </ul>

            <div className="sidebar-cta">
                <div className="sidebar-cta-content">
                </div>
            </div>
        </div>
    </nav>;
}

export default Sidebar;