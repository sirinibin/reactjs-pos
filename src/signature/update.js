import React from 'react';
import { Modal, Button } from 'react-bootstrap';


class SignatureUpdate extends React.Component {

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
                    <Modal.Title>Update Signature #Signature1</Modal.Title>

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
                            >Name*</label>

                            <div className="input-group mb-3">
                                <input type="text" value="Signature 1" className="form-control" placeholder="Name" aria-label="Select Store" aria-describedby="button-addon1" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Store.
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label"
                            >Signature</label
                            >

                            <div className="input-group mb-3">
                                <input type="file" className="form-control" placeholder="Password" aria-label="Select Client" aria-describedby="button-addon2" />
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

export default SignatureUpdate;