import React from 'react';
import SignatureCreate from './create.js';
import SignatureView from './view.js';
import SignatureUpdate from './update.js';

class SignatureIndex extends React.Component {

    render() {
        return <div className="container-fluid p-0">
            <div className="row">
                <div className="col">
                    <h1 className="h3">Signatures</h1>
                </div>

                <div className="col text-end">
                    <SignatureCreate showCreateButton={true} />
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
                                        <th style={{ width: "10 %" }}>Name</th>
                                        <th style={{ width: "40 %" }}>Actions</th>
                                    </tr>
                                </thead>
                                <thead>
                                    <tr className="text-center">
                                        <th>
                                            <input type="text" className="form-control" />
                                        </th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody className="text-center">
                                    <tr>
                                        <td>Signature 1</td>
                                        <td>
                                            <SignatureView showViewButton={true} />
                                            <SignatureUpdate showUpdateButton={true} />
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
                                        <td>Signature 2</td>
                                        <td>
                                            <SignatureView showViewButton={true} />
                                            <SignatureUpdate showUpdateButton={true} />
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
                                        <td>Signature 3</td>
                                        <td>
                                            <SignatureView showViewButton={true} />
                                            <SignatureUpdate showUpdateButton={true} />
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
                                        <td>Signature 4</td>
                                        <td>
                                            <SignatureView showViewButton={true} />
                                            <SignatureUpdate showUpdateButton={true} />
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
                                        <td>Signature 5</td>
                                        <td>
                                            <SignatureView showViewButton={true} />
                                            <SignatureUpdate showUpdateButton={true} />
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
                                        <td>Signature 6</td>
                                        <td>
                                            <SignatureView showViewButton={true} />
                                            <SignatureUpdate showUpdateButton={true} />
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
                                        <td>Signature 7</td>
                                        <td>
                                            <SignatureView showViewButton={true} />
                                            <SignatureUpdate showUpdateButton={true} />
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
                                        <td>Signature 8</td>
                                        <td>
                                            <SignatureView showViewButton={true} />
                                            <SignatureUpdate showUpdateButton={true} />
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
                                        <td>Signature 9</td>
                                        <td>
                                            <SignatureView showViewButton={true} />
                                            <SignatureUpdate showUpdateButton={true} />
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
                                        <td>Signature 10</td>
                                        <td>
                                            <SignatureView showViewButton={true} />
                                            <SignatureUpdate showUpdateButton={true} />
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

export default SignatureIndex;