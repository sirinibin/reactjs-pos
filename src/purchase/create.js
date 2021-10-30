import React from 'react';
import PurchasePreview from './preview.js';
import { Modal, Button } from 'react-bootstrap';
import StoreCreate from '../store/create.js';
import VendorCreate from '../vendor/create.js';
import ProductCreate from '../product/create.js';
import UserCreate from '../user/create.js';
import SignatureCreate from './../signature/create.js';


class PurchaseCreate extends React.Component {

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
            {this.props.showCreateButton && (
                <Button hide={true} variant="primary" className="btn btn-primary mb-3" onClick={this.handleShow}>
                    <i className="bi bi-plus-lg"></i> Create
                </Button>
            )}
            <Modal show={this.state.show} size="xl" onHide={this.handleClose} animation={false}>
                <Modal.Header>
                    <Modal.Title>Create New Purchase</Modal.Title>

                    <div className="col align-self-end text-end">
                        <PurchasePreview />
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
                            >Vendor/Supplier*</label>

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" id="validationCustom01" placeholder="Vendor/Supplier" aria-label="Select Store" aria-describedby="button-addon1" />
                                <VendorCreate showCreateButton={true} />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Store.
                                    </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >Purchased to Store*</label>

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" id="validationCustom01" placeholder="Select Store" aria-label="Select Store" aria-describedby="button-addon1" />
                                <StoreCreate showCreateButton={true} />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Store.
                                    </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >Purchase Date*</label>

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" id="validationCustom01" placeholder="Purchase Date" aria-label="Select Store" aria-describedby="button-addon1" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Store.
                                    </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >VAT %*</label>

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" value="10.00" id="validationCustom01" placeholder="VAT %" aria-label="Select Store" aria-describedby="button-addon1" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Store.
                                    </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >Discount*</label
                            >

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" value="0.00" id="validationCustom02" placeholder="Discount" aria-label="Select Customer" aria-describedby="button-addon2" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Customer.
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >Status*</label>

                            <div className="input-group mb-3">
                                <select className="form-control">
                                    <option>Order Placed</option>
                                    <option>Delivered</option>
                                    <option>Pending</option>
                                    <option>Cancelled</option>
                                    <option>Dispatched</option>
                                </select>

                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Store.
                                    </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label"
                            >Product*</label
                            >

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" id="validationCustom03" placeholder="Select Product" aria-label="Select Product" aria-describedby="button-addon3" />
                                <ProductCreate showCreateButton={true} />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Product.
                               </div>
                            </div>
                        </div>

                        <div className="col-md-1">
                            <label className="form-label"
                            >Qty*</label
                            >
                            <input
                                type="text"
                                className="form-control"
                                id="validationCustom04"
                                placeholder="Quantity"
                                defaultValue="1"

                            />

                            <div className="valid-feedback">Looks good!</div>
                            <div className="invalid-feedback">
                                Please provide a valid Quantity.
                            </div>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label"
                            >Unit Price*</label
                            >
                            <input
                                type="text"
                                className="form-control"
                                id="validationCustom04"
                                placeholder="Price"
                                defaultValue="100.00"

                            />

                            <div className="valid-feedback">Looks good!</div>
                            <div className="invalid-feedback">
                                Please provide a valid Quantity.
                            </div>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label"
                            >Selling Unit Price*</label
                            >
                            <input
                                type="text"
                                className="form-control"
                                id="validationCustom04"
                                placeholder="Price"
                                defaultValue="100.00"

                            />

                            <div className="valid-feedback">Looks good!</div>
                            <div className="invalid-feedback">
                                Please provide a valid Quantity.
                            </div>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">
                                &nbsp;</label
                            >
                            <button className="btn-primary form-control"><i className="bi bi-plus-lg"></i> ADD</button>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label"
                            >Order Placed By*</label
                            >

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" id="validationCustom06" placeholder="Select User" aria-label="Select User" aria-describedby="button-addon4" />
                                <UserCreate showCreateButton={true} />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid User.
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label"
                            >Order placed By Signature(Optional)</label
                            >

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" id="validationCustom06" placeholder="Select Signature" aria-label="Select User" aria-describedby="button-addon4" />
                                <SignatureCreate showCreateButton={true} />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid User.
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
                        Create
                </Button>
                </Modal.Footer>
            </Modal>
        </>;
    }
}

export default PurchaseCreate;