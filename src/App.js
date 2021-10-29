
import Dashboard from './Dashboard.js';
import Login from './user/login.js';

import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import { Redirect } from 'react-router-dom'

import Cookies from 'universal-cookie';

function App() {

  const cookies = new Cookies();

  let at = cookies.get("access_token");


  return (
    <Router>
      <Switch>
        <Route path="/dashboard/quotations">
          <Dashboard />
        </Route>

        <Route path="/">
          {at && <Redirect to="/dashboard/quotations" />}
          <Login />
        </Route>
      </Switch>
    </Router >
  );
}

export default App;
