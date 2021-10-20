import React from 'react';
import CustomerCreate from './create.js';
import CustomerView from './view.js';
import CustomerUpdate from './update.js';

class CustomerIndex extends React.Component {

    render() {
        return <div className="container-fluid p-0">
            <div className="row">
                <div className="col">
                    <h1 className="h3">Customers</h1>
                </div>

                <div className="col text-end">
                    <CustomerCreate showCreateButton={true} />
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
                                        <th style={{ width: "16 %" }}>Name</th>
                                        <th style={{ width: "16 %" }}>E-mail</th>
                                        <th style={{ width: "40 %" }}>Phone</th>
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
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody className="text-center">
                                    <tr>
                                        <td>Customer 1</td>
                                        <td>Customer1@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <CustomerView showViewButton={true} />

                                            <CustomerUpdate showUpdateButton={true} />


                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item" >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>

                                        <td>Customer 2</td>
                                        <td>Customer2@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <CustomerView showViewButton={true} />

                                            <CustomerUpdate showUpdateButton={true} />


                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item" >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>

                                        <td>Customer 3</td>
                                        <td>Customer3@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <CustomerView showViewButton={true} />

                                            <CustomerUpdate showUpdateButton={true} />


                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item" >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>

                                        <td>Customer 4</td>
                                        <td>Customer4@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <CustomerView showViewButton={true} />

                                            <CustomerUpdate showUpdateButton={true} />


                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item" >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>

                                        <td>Customer 5</td>
                                        <td>Customer5@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <CustomerView showViewButton={true} />

                                            <CustomerUpdate showUpdateButton={true} />


                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item" >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>

                                        <td>Customer 6</td>
                                        <td>Customer6@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <CustomerView showViewButton={true} />

                                            <CustomerUpdate showUpdateButton={true} />


                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item" >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>

                                        <td>Customer 7</td>
                                        <td>Customer7@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <CustomerView showViewButton={true} />

                                            <CustomerUpdate showUpdateButton={true} />


                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item" >
                                                        <i className="bi bi-trash"></i>
                  Delete</a>

                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                                    <tr>

                                        <td>Customer 8</td>
                                        <td>Customer8@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <CustomerView showViewButton={true} />

                                            <CustomerUpdate showUpdateButton={true} />


                                            <button
                                                className="btn btn-outline-secondary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                            ></button>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <a href="/" className="dropdown-item" >
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

export default CustomerIndex;