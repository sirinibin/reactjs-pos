import React from 'react';
import ProductCategoryCreate from './create.js';
import ProductCategoryView from './view.js';
import ProductCategoryUpdate from './update.js';

class ProductCategoryIndex extends React.Component {

    render() {
        return <div className="container-fluid p-0">
            <div className="row">
                <div className="col">
                    <h1 className="h3">Product Categories </h1>
                </div>

                <div className="col text-end">
                    <ProductCategoryCreate showCreateButton={true} />
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
                                        <td>ProductCategory 1</td>
                                        <td>
                                            <ProductCategoryView showViewButton={true} />
                                            <ProductCategoryUpdate showUpdateButton={true} />
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
                                        <td>ProductCategory 2</td>
                                        <td>
                                            <ProductCategoryView showViewButton={true} />
                                            <ProductCategoryUpdate showUpdateButton={true} />
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
                                        <td>ProductCategory 3</td>
                                        <td>
                                            <ProductCategoryView showViewButton={true} />
                                            <ProductCategoryUpdate showUpdateButton={true} />
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
                                        <td>ProductCategory 4</td>
                                        <td>
                                            <ProductCategoryView showViewButton={true} />
                                            <ProductCategoryUpdate showUpdateButton={true} />
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
                                        <td>ProductCategory 5</td>
                                        <td>
                                            <ProductCategoryView showViewButton={true} />
                                            <ProductCategoryUpdate showUpdateButton={true} />
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
                                        <td>ProductCategory 6</td>
                                        <td>
                                            <ProductCategoryView showViewButton={true} />
                                            <ProductCategoryUpdate showUpdateButton={true} />
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
                                        <td>ProductCategory 7</td>
                                        <td>
                                            <ProductCategoryView showViewButton={true} />
                                            <ProductCategoryUpdate showUpdateButton={true} />
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
                                        <td>ProductCategory 8</td>
                                        <td>
                                            <ProductCategoryView showViewButton={true} />
                                            <ProductCategoryUpdate showUpdateButton={true} />
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
                                        <td>ProductCategory 9</td>
                                        <td>
                                            <ProductCategoryView showViewButton={true} />
                                            <ProductCategoryUpdate showUpdateButton={true} />
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
                                        <td>ProductCategory 10</td>
                                        <td>
                                            <ProductCategoryView showViewButton={true} />
                                            <ProductCategoryUpdate showUpdateButton={true} />
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

export default ProductCategoryIndex;