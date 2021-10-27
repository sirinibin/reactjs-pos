import React, { useState } from 'react';
import {
    Link
} from "react-router-dom";


function Sidebar(props) {

    const [appState, ChangeState] = useState({
        activeTab: 'quotations',
        tabs: [
            'quotations',
            'orders',
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
            <a className="sidebar-brand" href="index.html">
                <span className="align-middle">GULF UNION OZONE CO.</span>
            </a>

            <ul className="sidebar-nav">
                <li onClick={() => {
                    toggleActive(appState.tabs[0]);
                }} className={toggleActiveStyles(appState.tabs[0])} >
                    <Link to="/dashboard/quotations" className="sidebar-link">
                        <i className="bi bi-file-earmark-text" />
                        <span className="align-middle">Quotations</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[1]);
                }} className={toggleActiveStyles(appState.tabs[1])}>
                    <Link to="/dashboard/orders" className="sidebar-link">
                        <i className="bi bi-currency-dollar" />
                        <span className="align-middle">Orders</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[2]);
                }} className={toggleActiveStyles(appState.tabs[2])}>
                    <Link to="/dashboard/stores" className="sidebar-link">
                        <i className="bi bi-shop" />
                        <span className="align-middle">Stores</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[3]);
                }} className={toggleActiveStyles(appState.tabs[3])}>
                    <Link to="/dashboard/customers" className="sidebar-link">
                        <i className="bi bi-people" />
                        <span className="align-middle">Customers</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[4]);
                }} className={toggleActiveStyles(appState.tabs[4])}>
                    <Link to="/dashboard/products" className="sidebar-link">
                        <i className="bi bi-cart" />
                        <span className="align-middle">Products</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[5]);
                }} className={toggleActiveStyles(appState.tabs[5])}>
                    <Link to="/dashboard/product_category" className="sidebar-link">
                        <i className="bi bi-diagram-3" />
                        <span className="align-middle">Product Category</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[6]);
                }} className={toggleActiveStyles(appState.tabs[6])}>
                    <Link to="/dashboard/users" className="sidebar-link">
                        <i className="bi bi-file-person" />
                        <span className="align-middle">Users</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[7]);
                }} className={toggleActiveStyles(appState.tabs[7])}>
                    <Link to="/dashboard/signatures" className="sidebar-link">
                        <i className="bi bi-vector-pen" />
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