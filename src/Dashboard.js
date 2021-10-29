import React, { useState, useEffect } from "react";
import {
    BrowserRouter as Router,
    Switch,
    Route,
} from "react-router-dom";
import QuotationIndex from './quotation/index.js';
import OrderIndex from './order/index.js';
import StoreIndex from './store/index.js';
import CustomerIndex from './customer/index.js';
import ProductIndex from './product/index.js';
import ProductCategoryIndex from './product_category/index.js';
import UserIndex from './user/index.js';
import SignatureIndex from './signature/index.js';
import Footer from './Footer';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Cookies from 'universal-cookie';
import Login from './user/login.js';
import { Redirect } from 'react-router-dom'

function Dashboard() {

    const [isSidebarOpen, SetSidebarOpen] = useState("");

    const cookies = new Cookies();

    let at = cookies.get("access_token");

    useEffect(() => {
        let at = cookies.get("access_token");
        if (!at) {
            window.location = "/";
        }
    });

    function handleToggle() {
        if (isSidebarOpen === "collapsed") {
            SetSidebarOpen("");
        } else {
            SetSidebarOpen("collapsed");
        }
    };


    if (!at) {
        return <></>;
    }
    return (<Router>
        <Switch>
            <Route path="/dashboard/orders">
                <div className="wrapper">
                    <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
                    <div className="main">
                        <Topbar parentCallback={handleToggle} />
                        <main className="content">
                            <OrderIndex />
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
                            <QuotationIndex />
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
                            <StoreIndex />
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
                            <CustomerIndex />
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
                            <ProductIndex />
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
                            <ProductCategoryIndex />
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
                            <UserIndex />
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
                            <SignatureIndex />
                        </main>
                        <Footer />
                    </div>
                </div>
            </Route>
            <Route path="/">
                {at && <Redirect to="/dashboard/quotations" />}
                <Login />
            </Route>
        </Switch>


    </Router>);
}

export default Dashboard;