
import Dashboard from './Dashboard.js';
import Login from './user/login.js';

import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

function App() {

  return (
    <Router>
      <Switch>
        <Route path="/dashboard/quotations">
          <Dashboard />
        </Route>
        <Route path="/dashboard/orders">
          <Dashboard />
        </Route>
        <Route path="/">
          <Login />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
