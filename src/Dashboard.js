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
    return (<Router><div className="wrapper">
        <Sidebar isSidebarOpen={isSidebarOpen} parentCallback={handleToggle} />
        <div className="main">
            <Topbar parentCallback={handleToggle} />
            <main className="content">
                <Switch>
                    <Route path="/dashboard/orders">
                        <OrderIndex />
                    </Route>
                    <Route path="/dashboard/quotations">
                        <QuotationIndex />
                    </Route>
                    <Route path="/dashboard/stores">
                        <StoreIndex />
                    </Route>
                    <Route path="/dashboard/customers">
                        <CustomerIndex />
                    </Route>
                    <Route path="/dashboard/products">
                        <ProductIndex />
                    </Route>
                    <Route path="/dashboard/product_category">
                        <ProductCategoryIndex />
                    </Route>
                    <Route path="/dashboard/users">
                        <UserIndex />
                    </Route>
                    <Route path="/dashboard/signatures">
                        <SignatureIndex />
                    </Route>
                </Switch>
            </main>
            <Footer />
        </div>

    </div>

    </Router>);
}

export default Dashboard;