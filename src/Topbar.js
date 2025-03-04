import React from 'react';
import Cookies from 'universal-cookie';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';

function Topbar(props) {

    const cookies = new Cookies();

    function onTrigger(event) {
        props.parentCallback();
        event.preventDefault();
    }

    function logOut(event) {
        event.preventDefault();
        cookies.remove("access_token", { path: '/' });
        cookies.remove("user_id", { path: '/' });
        cookies.remove("user_photo", { path: '/' });
        cookies.remove("user_name", { path: '/' });
        cookies.remove("store_name", { path: '/' });
        cookies.remove("store_id", { path: '/' });
        cookies.remove("admin", { path: '/' });
        window.location = "/";
    }

    return (<nav className="navbar navbar-expand navbar-light navbar-bg">
        <a href="/" onClick={onTrigger} className="sidebar-toggle js-sidebar-toggle collapsed">
            <i className="hamburger align-self-center"></i>
        </a>


        <div className="navbar-collapse collapse">



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
                        title={cookies.get('user_name')}
                        drop={"down"}
                    >
                        <Dropdown.Item onClick={(e) => {
                            logOut(e);
                        }} >LotOut</Dropdown.Item>
                    </DropdownButton>

                    {/*<a href="/"
                        className="nav-link dropdown-toggle d-none d-sm-inline-block"

                        data-bs-toggle="dropdown"
                    >
                        {cookies.get('user_photo') ?
                            <img
                                src={cookies.get('user_photo')}
                                className="avatar img-fluid rounded me-1"
                                alt="Charles Hall"
                            />
                            : null}
                        <span className="text-dark">{cookies.get('user_name')}</span>
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