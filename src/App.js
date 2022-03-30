import Dashboard from './Dashboard.js';
import Login from './user/login.js';

import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
//import { Redirect } from 'react-router-dom'

//import Cookies from 'universal-cookie';

function App() {

  // const cookies = new Cookies();

  // let at = cookies.get("access_token");


  return (
    <Router>
      <Switch>
        <Route path="/dashboard/sales">
          <Dashboard />
        </Route>

        <Route path="/dashboard/sales-cash-discounts">
          <Dashboard />
        </Route>

        <Route path="/dashboard/sales-payments">
          <Dashboard />
        </Route>

        <Route path="/dashboard/salesreturn">
          <Dashboard />
        </Route>

        <Route path="/dashboard/sales-return-payments">
          <Dashboard />
        </Route>

        <Route path="/dashboard/purchases">
          <Dashboard />
        </Route>

        <Route path="/dashboard/purchase-cash-discounts">
          <Dashboard />
        </Route>

        <Route path="/dashboard/purchase-payments">
          <Dashboard />
        </Route>

        <Route path="/dashboard/purchasereturn">
          <Dashboard />
        </Route>


        <Route path="/dashboard/delivery-notes">
          <Dashboard />
        </Route>

        <Route path="/dashboard/quotations">
          <Dashboard />
        </Route>

        <Route path="/dashboard/vendors">
          <Dashboard />
        </Route>

        <Route path="/dashboard/stores">
          <Dashboard />
        </Route>

        <Route path="/dashboard/customers">
          <Dashboard />
        </Route>

        <Route path="/dashboard/products">
          <Dashboard />
        </Route>

        <Route path="/dashboard/product_category">
          <Dashboard />
        </Route>

        <Route path="/dashboard/users">
          <Dashboard />
        </Route>

        <Route path="/dashboard/signatures">
          <Dashboard />
        </Route>

        <Route path="/">
          <Login />
        </Route>
      </Switch>
    </Router >
  );
}

export default App;