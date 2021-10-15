import React from 'react';
import {
    BrowserRouter as Router,
    Switch,
    Route,
} from "react-router-dom";
import QuotationIndex from './quotation/index.js';
import OrderIndex from './order/index.js';
import BusinessIndex from './business/index.js';
import ClientIndex from './client/index.js';
import ProductIndex from './product/index.js';
import UserIndex from './user/index.js';
import Footer from './Footer';
import Sidebar from './Sidebar';
import Topbar from './Topbar';



class Dashboard extends React.Component {

    state = {
        isSidebarOpen: ""
    }
    handleToggle = () => {
        if (this.state.isSidebarOpen === "collapsed") {
            this.setState({
                isSidebarOpen: ""
            });
        } else {
            this.setState({
                isSidebarOpen: "collapsed"
            });
        }

    };

    render() {
        return <Router><div className="wrapper">
            <Sidebar isSidebarOpen={this.state.isSidebarOpen} />
            <div className="main">
                <Topbar parentCallback={this.handleToggle} />
                <main className="content">
                    <Switch>
                        <Route path="/dashboard/orders">
                            <OrderIndex />
                        </Route>
                        <Route path="/dashboard/quotations">
                            <QuotationIndex />
                        </Route>
                        <Route path="/dashboard/businesses">
                            <BusinessIndex />
                        </Route>
                        <Route path="/dashboard/clients">
                            <ClientIndex />
                        </Route>
                        <Route path="/dashboard/products">
                            <ProductIndex />
                        </Route>
                        <Route path="/dashboard/users">
                            <UserIndex />
                        </Route>
                    </Switch>
                </main>
                <Footer />
            </div>

        </div>

        </Router>
            ;

    }
}

export default Dashboard;