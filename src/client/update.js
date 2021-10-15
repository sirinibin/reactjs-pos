import React from 'react';
import { Modal, Button } from 'react-bootstrap';


class ClientUpdate extends React.Component {

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
                    <Modal.Title>Update Client #123</Modal.Title>

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
                            >Client Name*</label>

                            <div className="input-group mb-3">
                                <input type="text" value="Client 1" className="form-control" placeholder="Client Name" aria-label="Select Business" aria-describedby="button-addon1" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Business.
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >Client Name(in Arabic)</label
                            >

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" placeholder="Client Name in Arabic" aria-label="Select Client" aria-describedby="button-addon2" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Client.
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >VAT No.</label>

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" placeholder="VAT No." aria-label="Select Business" aria-describedby="button-addon1" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Business.
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >VAT No.(in Arabic)</label
                            >

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" placeholder="VAT No. in Arabic" aria-label="Select Client" aria-describedby="button-addon2" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Client.
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label"
                            >Phone</label
                            >
                            <div className="input-group mb-3">
                                <input type="text" className="form-control" placeholder="Phone" aria-label="Select Client" aria-describedby="button-addon2" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Client.
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label"
                            >Phone(in Arabic)</label
                            >
                            <div className="input-group mb-3">
                                <input type="text" className="form-control" placeholder="Phone in Arabic" aria-label="Select Client" aria-describedby="button-addon2" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Client.
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label"
                            >E-mail</label>

                            <div className="input-group mb-3">
                                <input type="text" className="form-control" id="validationCustom01" placeholder="E-mail" aria-label="Select Business" aria-describedby="button-addon1" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Business.
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label"
                            >Address</label>

                            <div className="input-group mb-3">
                                <textarea type="text" className="form-control" placeholder="Address" aria-label="Select Business" aria-describedby="button-addon1" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Business.
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label"
                            >Address(in Arabic)</label
                            >

                            <div className="input-group mb-3">
                                <textarea type="text" className="form-control" placeholder="Address in Arabic" aria-label="Select Client" aria-describedby="button-addon2" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Client.
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

export default ClientUpdate;