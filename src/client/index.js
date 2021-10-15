import React from 'react';
import ClientCreate from './create.js';
import ClientView from './view.js';
import ClientUpdate from './update.js';

class ClientIndex extends React.Component {

    render() {
        return <div className="container-fluid p-0">
            <div className="row">
                <div className="col">
                    <h1 className="h3">Clients</h1>
                </div>

                <div className="col text-end">
                    <ClientCreate showCreateButton={true} />
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
                                        <td>Client 1</td>
                                        <td>client1@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <ClientView showViewButton={true} />

                                            <ClientUpdate showUpdateButton={true} />


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

                                        <td>Client 2</td>
                                        <td>client2@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <ClientView showViewButton={true} />

                                            <ClientUpdate showUpdateButton={true} />


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

                                        <td>Client 3</td>
                                        <td>client3@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <ClientView showViewButton={true} />

                                            <ClientUpdate showUpdateButton={true} />


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

                                        <td>Client 4</td>
                                        <td>client4@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <ClientView showViewButton={true} />

                                            <ClientUpdate showUpdateButton={true} />


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

                                        <td>Client 5</td>
                                        <td>client5@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <ClientView showViewButton={true} />

                                            <ClientUpdate showUpdateButton={true} />


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

                                        <td>Client 6</td>
                                        <td>client6@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <ClientView showViewButton={true} />

                                            <ClientUpdate showUpdateButton={true} />


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

                                        <td>Client 7</td>
                                        <td>client7@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <ClientView showViewButton={true} />

                                            <ClientUpdate showUpdateButton={true} />


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

                                        <td>Client 8</td>
                                        <td>client8@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <ClientView showViewButton={true} />

                                            <ClientUpdate showUpdateButton={true} />


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

export default ClientIndex;