import React from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';

function Topbar(props) {
    function onTrigger(event) {
        props.parentCallback();
        event.preventDefault();
    }

    function logOut(event) {
        event.preventDefault();
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_id");
        localStorage.removeItem("user_photo");
        localStorage.removeItem("user_name");
        localStorage.removeItem("store_name");
        localStorage.removeItem("store_id");
        localStorage.removeItem("admin");
        window.location = "/";
    }

    return (<nav className="navbar navbar-expand navbar-light navbar-bg">
        <a href="/" onClick={onTrigger} className="sidebar-toggle js-sidebar-toggle collapsed">
            <i className="hamburger align-self-center"></i>
        </a>


        <div className="navbar-collapse collapse">
            {localStorage.getItem("branch_name") ? "Branch: " + localStorage.getItem("branch_name") : ""}


            <ul className="navbar-nav navbar-align">

                <li className="nav-item dropdown">
                    <a href="/"
                        className="nav-icon dropdown-toggle d-inline-block d-sm-none"

                        data-bs-toggle="dropdown"
                    >
                        <i className="align-middle" data-feather="settings"></i>
                    </a>


                    <DropdownButton
                        id="dropdown-basic-button"
                        title={localStorage.getItem("user_name")}
                        drop={"down"}
                    >
                        <Dropdown.Item onClick={(e) => {
                            logOut(e);
                        }} > <i class="bi bi-box-arrow-right"></i> LotOut</Dropdown.Item>
                    </DropdownButton>

                    {/*<a href="/"
                        className="nav-link dropdown-toggle d-none d-sm-inline-block"

                        data-bs-toggle="dropdown"
                    >
                        {?
                            <img
                                src={}
                                className="avatar img-fluid rounded me-1"
                                alt="Charles Hall"
                            />
                            : null}
                        <span className="text-dark">{      localStorage.getItem('user_name')}</span>
                    </a>*/}



                    {/*<Dropdown style={{ marginLeft: "70px", height: "0px" }}>
                        <Dropdown.Toggle variant="secondary" id="dropdown-secondary" style={{ marginTop: "-48px", height: "28px" }}>

                        </Dropdown.Toggle>

                        <Dropdown.Menu>
                            <Dropdown.Item onClick={() => {
                                logOut();
                            }}>
                                <i className="bi bi-box-arrow-right"></i>
                                &nbsp;
                                LogOut
                            </Dropdown.Item>




                        </Dropdown.Menu>
                    </Dropdown>*/}
                    {/*<div className="dropdown-menu dropdown-menu-end">
                        <a href="/" onClick={logOut} className="dropdown-item">
                            <i className="align-middle me-1" data-feather="log-out"></i> Log out</a>
                    </div>*/}
                </li>
            </ul>
        </div>
    </nav >);
}

export default Topbar;