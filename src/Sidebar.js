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
            'delivery notes',
            'quotations',
            'vendors',
            'stores',
            'customers',
            'products',
            'product category',
            'expense category',
            'expenses',
            'analytics',
            'customer deposits',
            'customer withdrawals',
            'capitals',
            'capital withdrawals',
            'dividents',
            'ledger',
            'accounts',
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

    return <nav id="sidebar" className={'sidebar ' + props.isSidebarOpen + ' js-sidebar'} style={{ overflowY: 'scroll' }}>
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
                    <Link to="/dashboard/delivery-notes" className="sidebar-link">
                        <i className="bi bi-file-earmark-text" />
                        <span className="align-middle">Delivery Notes</span>
                    </Link>
                </li>

                <li onClick={() => {
                    toggleActive(appState.tabs[5]);
                }} className={toggleActiveStyles(appState.tabs[5])} >
                    <Link to="/dashboard/quotations" className="sidebar-link">
                        <i className="bi bi-file-earmark-text" />
                        <span className="align-middle">Quotations</span>
                    </Link>
                </li>

                <li onClick={() => {
                    toggleActive(appState.tabs[6]);
                }} className={toggleActiveStyles(appState.tabs[6])}>
                    <Link to="/dashboard/vendors" className="sidebar-link">
                        <i className="bi bi-shop" />
                        <span className="align-middle">Vendors/Suppliers</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[7]);
                }} className={toggleActiveStyles(appState.tabs[7])}>
                    <Link to="/dashboard/stores" className="sidebar-link">
                        <i className="bi bi-shop" />
                        <span className="align-middle">Stores</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[8]);
                }} className={toggleActiveStyles(appState.tabs[8])}>
                    <Link to="/dashboard/customers" className="sidebar-link">
                        <i className="bi bi-people" />
                        <span className="align-middle">Customers</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[9]);
                }} className={toggleActiveStyles(appState.tabs[9])}>
                    <Link to="/dashboard/products" className="sidebar-link">
                        <i className="bi bi-cart" />
                        <span className="align-middle">Products</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[10]);
                }} className={toggleActiveStyles(appState.tabs[10])}>
                    <Link to="/dashboard/product_category" className="sidebar-link">
                        <i className="bi bi-diagram-3" />
                        <span className="align-middle">Product Category</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[11]);
                }} className={toggleActiveStyles(appState.tabs[11])}>
                    <Link to="/dashboard/expense_category" className="sidebar-link">
                        <i className="bi bi-diagram-3" />
                        <span className="align-middle">Expense Category</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[12]);
                }} className={toggleActiveStyles(appState.tabs[12])}>
                    <Link to="/dashboard/expenses" className="sidebar-link">
                        <i className="bi bi-diagram-3" />
                        <span className="align-middle">Expenses</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[13]);
                }} className={toggleActiveStyles(appState.tabs[13])}>
                    <Link to="/dashboard/analytics" className="sidebar-link">
                        <i className="bi bi-graph-up" />
                        <span className="align-middle">Dashboard</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[14]);
                }} className={toggleActiveStyles(appState.tabs[14])}>
                    <Link to="/dashboard/customer_deposits" className="sidebar-link">
                        <i className="bi bi-diagram-3" />
                        <span className="align-middle">Customer Deposits</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[15]);
                }} className={toggleActiveStyles(appState.tabs[15])}>
                    <Link to="/dashboard/customer_withdrawals" className="sidebar-link">
                        <i className="bi bi-diagram-3" />
                        <span className="align-middle">Customer Withdrawals</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[16]);
                }} className={toggleActiveStyles(appState.tabs[16])}>
                    <Link to="/dashboard/capitals" className="sidebar-link">
                        <i className="bi bi-diagram-3" />
                        <span className="align-middle">Capital Investments</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[17]);
                }} className={toggleActiveStyles(appState.tabs[17])}>
                    <Link to="/dashboard/capital_withdrawals" className="sidebar-link">
                        <i className="bi bi-diagram-3" />
                        <span className="align-middle">Capital Withdrawals</span>
                    </Link>
                </li>
                <li onClick={() => {
                    toggleActive(appState.tabs[18]);
                }} className={toggleActiveStyles(appState.tabs[18])}>
                    <Link to="/dashboard/dividents" className="sidebar-link">
                        <i className="bi bi-diagram-3" />
                        <span className="align-middle">Divident Withdrawals</span>
                    </Link>
                </li>
                {cookies.get('admin') === "true" ? <li onClick={() => {
                    toggleActive(appState.tabs[19]);
                }} className={toggleActiveStyles(appState.tabs[19])}>
                    <Link to="/dashboard/ledger" className="sidebar-link">
                        <i className="bi bi-file-earmark-text" />
                        <span className="align-middle">Ledger</span>
                    </Link>
                </li> : ""}
                {cookies.get('admin') === "true" ? <li onClick={() => {
                    toggleActive(appState.tabs[20]);
                }} className={toggleActiveStyles(appState.tabs[20])}>
                    <Link to="/dashboard/accounts" className="sidebar-link">
                        <i className="bi bi-file-person" />
                        <span className="align-middle">Accounts & Trial balances</span>
                    </Link>
                </li> : ""}
                {cookies.get('admin') === "true" ? <li onClick={() => {
                    toggleActive(appState.tabs[21]);
                }} className={toggleActiveStyles(appState.tabs[21])}>
                    <Link to="/dashboard/users" className="sidebar-link">
                        <i className="bi bi-file-person" />
                        <span className="align-middle">Users</span>
                    </Link>
                </li> : ""}
                <li onClick={() => {
                    toggleActive(appState.tabs[22]);
                }} className={toggleActiveStyles(appState.tabs[22])}>
                    <Link to="/dashboard/signatures" className="sidebar-link">
                        <i className="bi bi-fingerprint" />
                        <span className="align-middle">Signatures</span>
                    </Link>
                </li>
            </ul>

            <div className="sidebar-cta">
                <div className="sidebar-cta-content">
                </div>x
            </div>
        </div>
    </nav>;
}

export default Sidebar;