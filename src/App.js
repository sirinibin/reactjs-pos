import Dashboard from './Dashboard.js';
import Login from './user/login.js';
import { WebSocketProvider } from "./utils/WebSocketContext.js";
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
//import { Redirect } from 'react-router-dom'



function App() {

  let userId = localStorage.getItem("user_id") ? localStorage.getItem("user_id") : "guest";



  return (
    <WebSocketProvider userId={userId}>
      <Router>
        <Switch>
          <Route path="/dashboard/analytics">
            <Dashboard />
          </Route>

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

          <Route path="/dashboard/purchase-return-payments">
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

          <Route path="/dashboard/product_brand">
            <Dashboard />
          </Route>


          <Route path="/dashboard/expense_category">
            <Dashboard />
          </Route>

          <Route path="/dashboard/expenses">
            <Dashboard />
          </Route>

          <Route path="/dashboard/customer_deposits">
            <Dashboard />
          </Route>

          <Route path="/dashboard/customer_withdrawals">
            <Dashboard />
          </Route>

          <Route path="/dashboard/capitals">
            <Dashboard />
          </Route>

          <Route path="/dashboard/capital_withdrawals">
            <Dashboard />
          </Route>

          <Route path="/dashboard/dividents">
            <Dashboard />
          </Route>

          <Route path="/dashboard/users">
            <Dashboard />
          </Route>

          <Route path="/dashboard/signatures">
            <Dashboard />
          </Route>

          <Route path="/dashboard/ledger">
            <Dashboard />
          </Route>

          <Route path="/dashboard/accounts">
            <Dashboard />
          </Route>

          <Route path="/dashboard/postings">
            <Dashboard />
          </Route>

          <Route path="/">
            <Login />
          </Route>
        </Switch>
      </Router >
    </WebSocketProvider>
  );
}

export default App;