import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import ProductCategoryCreate from './../product_category/create.js';

class ProductUpdate extends React.Component {

    state = {
        show: false,
    };

    handleClose = () => {
        this.setState({
            show: false,
        });
    };

    handleShow = () => {
        this.setState({
            show: true,
        });
    };

    render() {
        return <>
            {this.props.showUpdateButton && (
                <button className="btn btn-default btn-sm" onClick={this.handleShow}>
                    <i className="bi bi-pencil"></i>
                </button>
            )}
            <Modal show={this.state.show} scrollable={true} size="lg" onHide={this.handleClose} animation={false}>
                <Modal.Header>
                    <Modal.Title>Update Product #123</Modal.Title>

                    <div className="col align-self-end text-end">
                        <button
                            type="button"
                            className="btn-close"
                            onClick={this.handleClose}
                            aria-label="Close"
                        ></button>

                    </div>
                </Modal.Header>
                <Modal.Body>
                    <form className="row g-3 needs-validation" >
                        <div className="col-md-6">
                            <label className="form-label"
                            >Product Name*</label>

                            <div className="input-group mb-3">
                                <input type="text" value="Product 1" className="form-control" placeholder="Product Name" aria-label="Select Business" aria-describedby="button-addon1" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Business.
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >Product Name(in Arabic)*</label
                            >

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" placeholder="Product Name in Arabic" aria-label="Select Client" aria-describedby="button-addon2" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Client.
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >Item CODE*</label>

                            <div className="input-group mb-3">
                                <input type="text" value="ABC-1" className="form-control" placeholder="Item CODE" aria-label="Select Business" aria-describedby="button-addon1" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Business.
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label"
                            >Category*</label>

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" id="validationCustom01" placeholder="Select Category" aria-label="Select Business" aria-describedby="button-addon1" />
                                <ProductCategoryCreate showCreateButton={true} />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Business.
                                    </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >Wholsale Unit Price in Business 1*</label
                            >

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" placeholder="Whole Price" aria-label="Select Client" aria-describedby="button-addon2" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Client.
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >Wholsale Unit Price in Business 2*</label
                            >

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" placeholder="Whole Price" aria-label="Select Client" aria-describedby="button-addon2" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Client.
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label"
                            >Retail Unit Price in Business 1*</label
                            >

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" placeholder="Retail Price" aria-label="Select Client" aria-describedby="button-addon2" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Client.
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label"
                            >Retail Unit Price in Business 2*</label
                            >

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" placeholder="Retail Price" aria-label="Select Client" aria-describedby="button-addon2" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Client.
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label"
                            >Quantity/Stock in Business1*</label>

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" placeholder="Quantity/Stock in Business1" aria-label="Select Business" aria-describedby="button-addon1" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Business.
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >Quantity/Stock in Business2*</label>

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" placeholder="Quantity/Stock in Business2" aria-label="Select Business" aria-describedby="button-addon1" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Business.
                                </div>
                            </div>
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={this.handleClose}>
                        Close
                </Button>
                    <Button variant="primary" onClick={this.handleClose}>
                        Save Changes
                </Button>
                </Modal.Footer>
            </Modal>
        </>;
    }
}

export default ProductUpdate;