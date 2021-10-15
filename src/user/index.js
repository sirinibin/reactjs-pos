import React from 'react';
import UserCreate from './create.js';
import UserView from './view.js';
import UserUpdate from './update.js';

class UserIndex extends React.Component {

    render() {
        return <div className="container-fluid p-0">
            <div className="row">
                <div className="col">
                    <h1 className="h3">Users</h1>
                </div>

                <div className="col text-end">
                    <UserCreate showCreateButton={true} />
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
                                        <th style={{ width: "16 %" }}>E-mail</th>
                                        <th style={{ width: "16 %" }}>Mobile</th>
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
                                        <td>User 1</td>
                                        <td>user1@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <UserView showViewButton={true} />
                                            <UserUpdate showUpdateButton={true} />
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
                                        <td>User 2</td>
                                        <td>user2@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <UserView showViewButton={true} />
                                            <UserUpdate showUpdateButton={true} />
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
                                        <td>User 3</td>
                                        <td>user3@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <UserView showViewButton={true} />
                                            <UserUpdate showUpdateButton={true} />
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
                                        <td>User 4</td>
                                        <td>user4@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <UserView showViewButton={true} />
                                            <UserUpdate showUpdateButton={true} />
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
                                        <td>User 5</td>
                                        <td>user5@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <UserView showViewButton={true} />
                                            <UserUpdate showUpdateButton={true} />
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
                                        <td>User 6</td>
                                        <td>user6@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <UserView showViewButton={true} />
                                            <UserUpdate showUpdateButton={true} />
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
                                        <td>User 7</td>
                                        <td>user7@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <UserView showViewButton={true} />
                                            <UserUpdate showUpdateButton={true} />
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
                                        <td>User 8</td>
                                        <td>user8@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <UserView showViewButton={true} />
                                            <UserUpdate showUpdateButton={true} />
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
                                        <td>User 9</td>
                                        <td>user9@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <UserView showViewButton={true} />
                                            <UserUpdate showUpdateButton={true} />
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
                                        <td>User 10</td>
                                        <td>user10@gmail.com</td>
                                        <td>+919633977699</td>
                                        <td>
                                            <UserView showViewButton={true} />
                                            <UserUpdate showUpdateButton={true} />
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

export default UserIndex;