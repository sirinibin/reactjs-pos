import React from 'react';
import { Modal, Button } from 'react-bootstrap';


class SignatureCreate extends React.Component {

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
                <Button hide={true} onClick={this.handleShow} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
            )}
            <Modal show={this.state.show} scrollable={true} size="lg" onHide={this.handleClose} animation={false}>
                <Modal.Header>
                    <Modal.Title>Create New Signature</Modal.Title>

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
                                <input type="text" className="form-control" placeholder="Name" aria-label="Select Store" aria-describedby="button-addon1" />
                                <div className="valid-feedback">Looks good!</div>
                                <div className="invalid-feedback">
                                    Please provide a valid Store.
                                </div>
                            </div>
                        </div>


                        <div className="col-md-6">
                            <label className="form-label"
                            >Signature*</label
                            >

                            <div className="input-group mb-3">
                                <input type="file" className="form-control" placeholder="Signature" aria-label="Select Client" aria-describedby="button-addon2" />
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

export default SignatureCreate;