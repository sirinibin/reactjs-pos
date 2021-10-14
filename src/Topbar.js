import React from 'react';
import avatar from './avatar.jpg';
class Topbar extends React.Component {

    onTrigger = (event) => {
        this.props.parentCallback();
        event.preventDefault();
    }


    render() {
        return <nav className="navbar navbar-expand navbar-light navbar-bg">
            <a href="/" onClick={this.onTrigger} className="sidebar-toggle js-sidebar-toggle collapsed">
                <i className="hamburger align-self-center"></i>
            </a>

            <div className="navbar-collapse collapse ">
                <ul className="navbar-nav navbar-align">
                    <li className="nav-item dropdown">
                        <a href="/"
                            className="nav-icon dropdown-toggle d-inline-block d-sm-none"

                            data-bs-toggle="dropdown"
                        >
                            <i className="align-middle" data-feather="settings"></i>
                        </a>

                        <a href="/"
                            className="nav-link dropdown-toggle d-none d-sm-inline-block"

                            data-bs-toggle="dropdown"
                        >
                            <img
                                src={avatar}
                                className="avatar img-fluid rounded me-1"
                                alt="Charles Hall"
                            />
                            <span className="text-dark">Charles Hall</span>
                        </a>
                        <div className="dropdown-menu dropdown-menu-end">
                            <a href="/" className="dropdown-item">
                                <i className="align-middle me-1" data-feather="log-out"></i> Log out</a>
                        </div>
                    </li>
                </ul>
            </div>
        </nav>;
    }
}

export default Topbar;