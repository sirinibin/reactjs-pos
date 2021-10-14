import React from 'react';
import OrderCreate from './create.js';
import OrderView from './view.js';
import OrderUpdate from './update.js';

class OrderIndex extends React.Component {

    render() {
        return <div className="container-fluid p-0">
            <div className="row">
                <div className="col">
                    <h1 className="h3">Purchase Orders</h1>
                </div>

                <div className="col text-end">
                    <OrderCreate showCreateButton={true} />
                </div>
            </div>

            <div className="row">
                <div className="col-12">
                    <div className="card">
                        {/*
  <div   className="card-header">
                        <h5   className="card-title mb-0"></h5>
                    </div>
                    */}
                        <div className="card-body">
                            <p className="text-end">page 1 of 10</p>
                            <table className="table table-striped table-sm table-bordered">
                                <thead>
                                    <tr className="text-center">
                                        <th style={{ width: "10 %" }}>#</th>
                                        <th style={{ width: "16 %" }}>Date</th>
                                        <th style={{ width: "16 %" }}>Net Total</th>
                                        <th style={{ width: "40 %" }}>Client Name</th>
                                        <th style={{ width: "6 %" }}>Status</th>
                                        <th style={{ width: "40 %" }}>Actions</th>
                                    </tr>
                                </thead>
                                <thead>
                                    <tr className="text-center">
                                        <th>
                                            <input type="text" className="form-control" />
                                        </th>
                                        <th>
                                            <input type="text" className="form-control" />
                                        </th>
                                        <th>
                                            <input type="text" className="form-control" />
                                        </th>
                                        <th>
                                            <input type="text" className="form-control" />
                                        </th>
                                        <th>
                                            <select className="form-control">
                                                <option></option>
                                                <option>In Progress</option>
                                                <option>Accepted</option>
                                                <option>Rejected</option>
                                                <option>Deleted</option>
                                            </select>
                                        </th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody className="text-center">
                                    <tr>
                                        <td>1</td>
                                        <td>01/01/2021</td>
                                        <td>400.00 SAR</td>
                                        <td>Vanessa Tucker</td>
                                        <td>
                                            <span className="badge bg-success">Accepted</span>
                                        </td>
                                        <td>
                                            <OrderView showViewButton={true} />

                                            <OrderUpdate showUpdateButton={true} />

                                            <button
                                                className="btn btn-default btn-sm"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                title="Download"
                                            >
                                                <i className="bi bi-download"></i>
                                            </button>

                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item" >
                                                        <i className="bi bi-download"></i>
                  Download</a>

                                                </li>
                                                <li>
                                                    <a href="/" className="dropdown-item" >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>2</td>
                                        <td>01/01/2021</td>
                                        <td>400.00 SAR</td>
                                        <td>William Harris</td>
                                        <td><span className="badge bg-danger">Rejected</span></td>
                                        <td>
                                            <OrderView showViewButton={true} />

                                            <OrderUpdate showUpdateButton={true} />

                                            <button
                                                className="btn btn-default btn-sm"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                title="Download"
                                            >
                                                <i className="bi bi-download"></i>
                                            </button>

                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item" >
                                                        <i className="bi bi-download"></i>
                  Download</a>

                                                </li>
                                                <li>
                                                    <a href="/" className="dropdown-item" >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>3</td>
                                        <td>01/01/2021</td>
                                        <td>400.00 SAR</td>
                                        <td>Sharon Lessman</td>
                                        <td>
                                            <span className="badge bg-success">Accepted</span>
                                        </td>

                                        <td>
                                            <OrderView showViewButton={true} />

                                            <OrderUpdate showUpdateButton={true} />

                                            <button
                                                className="btn btn-default btn-sm"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                title="Download"
                                            >
                                                <i className="bi bi-download"></i>
                                            </button>

                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item" >
                                                        <i className="bi bi-download"></i>
                  Download</a>

                                                </li>
                                                <li>
                                                    <a href="/" className="dropdown-item" >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>5</td>
                                        <td>01/01/2021</td>
                                        <td>400.00 SAR</td>
                                        <td>William Harris</td>
                                        <td>
                                            <span className="badge bg-success">Accepted</span>
                                        </td>
                                        <td>
                                            <OrderView showViewButton={true} />

                                            <OrderUpdate showUpdateButton={true} />

                                            <button
                                                className="btn btn-default btn-sm"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                title="Download"
                                            >
                                                <i className="bi bi-download"></i>
                                            </button>

                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item"  >
                                                        <i className="bi bi-download"></i>
                  Download</a>

                                                </li>
                                                <li>
                                                    <a href="/" className="dropdown-item"  >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>6</td>
                                        <td>01/01/2021</td>
                                        <td>400.00 SAR</td>
                                        <td>Sharon Lessman</td>
                                        <td>
                                            <span className="badge bg-success">Accepted</span>
                                        </td>
                                        <td>
                                            <OrderView showViewButton={true} />

                                            <OrderUpdate showUpdateButton={true} />
                                            <button
                                                className="btn btn-default btn-sm"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                title="Download"
                                            >
                                                <i className="bi bi-download"></i>
                                            </button>

                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item"  >
                                                        <i className="bi bi-download"></i>
                  Download</a>

                                                </li>
                                                <li>
                                                    <a href="/" className="dropdown-item"  >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>7</td>
                                        <td>01/01/2021</td>
                                        <td>400.00 SAR</td>
                                        <td>Christina Mason</td>
                                        <td>
                                            <span className="badge bg-success">Accepted</span>
                                        </td>
                                        <td>
                                            <OrderView showViewButton={true} />

                                            <OrderUpdate showUpdateButton={true} />

                                            <button
                                                className="btn btn-default btn-sm"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                title="Download"
                                            >
                                                <i className="bi bi-download"></i>
                                            </button>

                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item"  >
                                                        <i className="bi bi-download"></i>
                  Download</a>

                                                </li>
                                                <li>
                                                    <a href="/" className="dropdown-item"  >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>8</td>
                                        <td>01/01/2021</td>
                                        <td>400.00 SAR</td>
                                        <td>William Harris</td>
                                        <td>
                                            <span className="badge bg-warning">In progress</span>
                                        </td>
                                        <td>
                                            <OrderView showViewButton={true} />

                                            <OrderUpdate showUpdateButton={true} />

                                            <button
                                                className="btn btn-default btn-sm"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                title="Download"
                                            >
                                                <i className="bi bi-download"></i>
                                            </button>

                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item"  >
                                                        <i className="bi bi-download"></i>
                  Download</a>

                                                </li>
                                                <li>
                                                    <a href="/" className="dropdown-item"  >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <nav aria-label="Page navigation example">
                                <ul className="pagination">
                                    <li className="page-item disabled">
                                        <a href="/" className="page-link"  >Previous</a>
                                    </li>
                                    <li className="page-item active">
                                        <a href="/" className="page-link"  >1</a>
                                    </li>
                                    <li className="page-item">
                                        <a href="/" className="page-link"  >2</a>
                                    </li>
                                    <li className="page-item">
                                        <a href="/" className="page-link"  >3</a>
                                    </li>
                                    <li className="page-item">
                                        <a href="/" className="page-link"  >Next</a>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>;
    }
}

export default OrderIndex;