import React, { useState, useEffect } from "react";
import {
    BrowserRouter as Router,
    Switch,
    Route,
} from "react-router-dom";
import PostingIndex from './posting/index.js';
import QuotationIndex from './quotation/index.js';
import DeliveryNoteIndex from './delivery_note/index.js';
import OrderIndex from './order/index.js';
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
import './dashboard.css'
import Analytics from './analytics/index.js';

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

    function handleToggle() {
        if (isSidebarOpen === "collapsed") {
            SetSidebarOpen("");
        } else {
            SetSidebarOpen("collapsed");
        }
    };



    let [toastMessages, setToastMessages] = useState([]);

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

    if (!at) {
        return <></>;
    }
    return (<Router>
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
            <Route path="/dashboard/customer_deposits">
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

            <Route path="/dashboard/customer_withdrawals">
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