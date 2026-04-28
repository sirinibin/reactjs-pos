import React, { useState, useEffect } from "react";
import { Modal, Button } from 'react-bootstrap';
import {
    BrowserRouter as Router,
    Switch,
    Route,
} from "react-router-dom";
import PostingIndex from './posting/index.js';
import QuotationIndex from './quotation/index.js';
import QuotationSalesReturnIndex from './quotation_sales_return/index.js';
import DeliveryNoteIndex from './delivery_note/index.js';
import OrderIndex from './order/index.js';
import StockTransferIndex from './stock_transfer/index.js';
import SalesCashDiscountIndex from './sales_cash_discount/index.js';
import PurchaseCashDiscountIndex from './purchase_cash_discount/index.js';

import SalesPaymentIndex from './sales_payment/index.js';
import PurchasePaymentIndex from './purchase_payment/index.js';

import SalesReturnPaymentIndex from './sales_return_payment/index.js';
import PurchaseReturnPaymentIndex from './purchase_return_payment/index.js';

import SalesReturnIndex from './sales_return/index.js';
import PurchaseIndex from './purchase/index.js';
import PurchaseReturnIndex from './purchase_return/index.js';
import VendorIndex from './vendor/index.js';
import StoreIndex from './store/index.js';
import WarehouseIndex from './warehouse/index.js';
import CustomerIndex from './customer/index.js';
import ProductIndex from './product/index.js';
import ProductCategoryIndex from './product_category/index.js';
import ProductBrandIndex from './product_brand/index.js';
import ExpenseCategoryIndex from './expense_category/index.js';
import ExpenseIndex from './expense/index.js';

import CustomerDepositIndex from './customer_deposit/index.js';
import CustomerWithdrawalIndex from './customer_withdrawal/index.js';

import CapitalIndex from './capital/index.js';
import CapitalWithdrawalIndex from './capital_withdrawal/index.js';
import DividentIndex from './divident/index.js';
import LedgerIndex from './ledger/index.js';
import AccountIndex from './account/index.js';

import UserIndex from './user/index.js';
import SignatureIndex from './signature/index.js';
import Footer from './Footer';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Login from './user/login.js';
import { Redirect } from 'react-router-dom'
import Toast from 'react-bootstrap/Toast'
import ToastContainer from 'react-bootstrap/ToastContainer'
import eventEmitter from './utils/eventEmitter'
import './dashboard.css'
import Analytics from './analytics/index.js';
import StatsIndex from './stats/index.js';

function Dashboard() {

    const [isSidebarOpen, SetSidebarOpen] = useState("");


    let at = localStorage.getItem("access_token")

    useEffect(() => {
        let at = localStorage.getItem("access_token");
        if (!at) {
            window.location = "/";
        }
    });

    useEffect(() => {
        const handleStorageChange = (event) => {
            console.log("event:", event);
            if (event.key === "store_id" || event.key === "access_token") {
                console.log("Store info changed in another tab, reloading...");
                window.location.reload(); // Refresh this tab
            }
        };

        window.addEventListener("storage", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    useEffect(() => {
        // Show persistent modal when geolocation is denied; close it when granted
        const handleGeoDenied = () => setShowGeoModal(true);
        const handleGeoGranted = () => setShowGeoModal(false);
        eventEmitter.on('geolocation_denied', handleGeoDenied);
        eventEmitter.on('geolocation_granted', handleGeoGranted);
        return () => {
            eventEmitter.off('geolocation_denied', handleGeoDenied);
            eventEmitter.off('geolocation_granted', handleGeoGranted);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleToggle() {
        if (isSidebarOpen === "collapsed") {
            SetSidebarOpen("");
        } else {
            SetSidebarOpen("collapsed");
        }
    };



    let [toastMessages, setToastMessages] = useState([]);
    const [showGeoModal, setShowGeoModal] = useState(false);
    const [isTauriApp, setIsTauriApp] = useState(false);
    useEffect(() => {
        // Tauri injects __TAURI__ only into the top-level WebView window (tabs.html).
        // React runs inside an <iframe> on the same origin (localhost), so we also
        // check window.parent. Cross-origin access throws, so we wrap in try/catch.
        try {
            const hasTauri =
                typeof window.__TAURI__ !== 'undefined' ||
                typeof window.__TAURI_INTERNALS__ !== 'undefined' ||
                (window.parent !== window && typeof window.parent.__TAURI__ !== 'undefined');
            setIsTauriApp(hasTauri);
        } catch (e) {
            setIsTauriApp(false);
        }
    }, []);

    function showToastMessage(message, variant) {
        toastMessages.push({
            text: message,
            variant: variant,
            show: true,
        });
        setToastMessages([...toastMessages]);
    }

    function removeToastMessage(index) {
        toastMessages = toastMessages.splice(index, 1);
        setToastMessages([...toastMessages]);
        console.log("toastMessages:", toastMessages);
    }

    function markShow(index, show) {
        toastMessages[index].show = show;
        setToastMessages([...toastMessages]);
    }

    // Re-check geolocation permission every 10s while modal is open
    // so it auto-closes the moment the user grants access in system settings
    useEffect(() => {
        if (!showGeoModal) return;
        const recheckInterval = setInterval(async () => {
            if (!navigator.geolocation) return;
            try {
                // In Tauri, navigator.permissions may never reflect 'granted' because
                // WKWebView's permission API is bypassed by Tauri's CoreLocation routing.
                // Attempt getCurrentPosition directly — if it succeeds, close the modal.
                if (isTauriApp) {
                    await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
                    });
                    setShowGeoModal(false);
                    eventEmitter.emit('geolocation_granted');
                } else if (navigator.permissions) {
                    const perm = await navigator.permissions.query({ name: 'geolocation' });
                    if (perm.state === 'granted') {
                        setShowGeoModal(false);
                        eventEmitter.emit('geolocation_granted');
                    }
                }
            } catch (_) {
                // still denied — keep modal open
            }
        }, 10000);
        return () => clearInterval(recheckInterval);
    }, [showGeoModal, isTauriApp]);

    const openLocationSettings = () => {
        if (isTauriApp) {
            // macOS System Settings → Privacy & Security → Location Services
            // Use our custom invoke command — tauri shell plugin's `open` rejects
            // x-apple.systempreferences: URLs due to its hardcoded regex filter.
            const url = 'x-apple.systempreferences:com.apple.preference.security?Privacy_LocationServices';
            const tauri = window.__TAURI__ ||
                (window.parent !== window ? window.parent.__TAURI__ : null);
            try {
                if (tauri?.core?.invoke) {
                    tauri.core.invoke('open_system_preferences', { url }).catch((e) => {
                        console.error('open_system_preferences failed:', e);
                    });
                }
            } catch (e) {
                console.error('Failed to open location settings:', e);
            }
        } else {
            window.open('https://support.google.com/chrome/answer/142065', '_blank');
        }
    };

    if (!at) {
        return <></>;
    }
    return (<Router>
        {/* Geolocation permission modal — stays visible until user grants access */}
        <Modal show={showGeoModal} backdrop="static" keyboard={false} centered>
            <Modal.Header>
                <Modal.Title>📍 Location Access Required</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>
                    Start POS needs your location to track activity and provide accurate reports.
                    Location access is currently <strong>blocked</strong>.
                </p>
                {isTauriApp ? (
                    <>
                        <p>To enable it on <strong>macOS</strong>:</p>
                        <ol>
                            <li>Click <strong>"Open Location Settings"</strong> below</li>
                            <li>Find <strong>Start POS</strong> in the list and turn it <strong>On</strong></li>
                            <li>Return to the app — this dialog will close automatically</li>
                        </ol>
                        <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                            Path: <em>System Settings → Privacy &amp; Security → Location Services → Start POS</em>
                        </p>
                    </>
                ) : (
                    <>
                        <p>To enable it in your <strong>browser</strong>:</p>
                        <ol>
                            <li>Click the <strong>lock 🔒</strong> icon in the address bar</li>
                            <li>Set <strong>Location</strong> to <em>Allow</em></li>
                            <li>Reload the page</li>
                        </ol>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={openLocationSettings}>
                    {isTauriApp ? '⚙️ Open Location Settings' : '📖 How to enable location'}
                </Button>
                <Button variant="outline-secondary" onClick={() => setShowGeoModal(false)}>
                    Dismiss
                </Button>
            </Modal.Footer>
        </Modal>

        <ToastContainer position="top-end" className="p-3" style={{
            zIndex: 1,
            position: "relative",
        }}>
            {toastMessages.map((message, index) =>

                <Toast onClose={() => {
                    markShow(index, false);
                    removeToastMessage(index);
                    message.show = false;
                }} bg={message.variant} key={"toast" + index} show={message.show} delay={4000} autohide>
                    <Toast.Header>
                        {/*
                        <img
                            src="holder.js/20x20?text=%20"
                            className="rounded me-2"
                            alt=""
                        />
                        */}

                        <strong className="me-auto">Message</strong>
                        <small>1 sec ago </small>
                    </Toast.Header>
                    <Toast.Body>{message.text}</Toast.Body>
                </Toast>
            )}

        </ToastContainer>
        <Switch>

            <Route path="/dashboard/analytics">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <Analytics />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/sales">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <OrderIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/stock-transfers">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <StockTransferIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/sales-cash-discounts">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <SalesCashDiscountIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/sales-payments">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <SalesPaymentIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/salesreturn">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <SalesReturnIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/sales-return-payments">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <SalesReturnPaymentIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/purchases">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <PurchaseIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/purchase-cash-discounts">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <PurchaseCashDiscountIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/purchase-payments">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <PurchasePaymentIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/purchasereturn">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <PurchaseReturnIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/purchase-return-payments">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <PurchaseReturnPaymentIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/delivery-notes">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <DeliveryNoteIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>


            <Route path="/dashboard/quotations">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <QuotationIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/quotation_sales_returns">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <QuotationSalesReturnIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/stats">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <StatsIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/vendors">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <VendorIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/stores">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <StoreIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/warehouses">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <WarehouseIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/customers">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <CustomerIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/products">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <ProductIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/product_category">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <ProductCategoryIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/product_brand">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <ProductBrandIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/expense_category">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <ExpenseCategoryIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/expenses">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <ExpenseIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/receivables">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <CustomerDepositIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/payables">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <CustomerWithdrawalIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/capitals">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <CapitalIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/capital_withdrawals">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <CapitalWithdrawalIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/dividents">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <DividentIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>

            <Route path="/dashboard/users">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <UserIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/signatures">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <SignatureIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/ledger">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <LedgerIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/accounts">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <AccountIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/dashboard/postings">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <PostingIndex showToastMessage={showToastMessage} />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/">
                {at && <Redirect to="/dashboard/analytics" />}
                <Login />
            </Route>
        </Switch>


    </Router>);
}

export default Dashboard;