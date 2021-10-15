import React from 'react';
import { Modal, Button, Table } from 'react-bootstrap';


class ClientView extends React.Component {

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
            {this.props.showViewButton && (
                <Button className="btn btn-primary btn-sm" onClick={this.handleShow} >
                    <i className="bi bi-eye"></i>
                </Button>
            )}
            <Modal show={this.state.show} size="lg" onHide={this.handleClose} animation={false}>
                <Modal.Header>
                    <Modal.Title>Client #123 Details</Modal.Title>

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
                    <Table striped bordered hover responsive="lg">
                        <tr>
                            <th>Client Name:</th><td> Client1</td>
                            <th>Client Name(in Arabic):</th><td> Client1</td>
                        </tr>
                        <tr>
                            <th>VAT No:</th><td> 765474770678</td>
                            <th>VAT No(in Arabic):</th><td> 765474770678</td>
                        </tr>
                        <tr>
                            <th>Phone:</th><td> 9633977699</td>
                            <th>Phone in Arabic:</th><td> 9633977699</td>
                        </tr>
                        <tr>
                            <th>E-mail:</th><td> sirinibin2006@gmail.com</td>
                            <th>Address:</th><td> Address here</td>
                        </tr>
                        <tr>
                            <th>Address in Arabic:</th><td> Address in arabic here</td>
                        </tr>
                        <tr>
                            <th>Created At:</th><td> 14 Oct 2021 12:24:32</td>
                            <th>Updated At:</th><td> 14 Oct 2021 12:24:32</td>
                        </tr>
                        <tr>
                            <th>Created By:</th><td> User 1</td>
                            <th>Updated By:</th><td> User 1</td>
                        </tr>

                    </Table>

                </Modal.Body>
                {/*
                <Modal.Footer>
                    <Button variant="secondary" onClick={this.handleClose}>
                        Close
                </Button>
                    <Button variant="primary" onClick={this.handleClose}>
                        Save Changes
                </Button>
                </Modal.Footer>
                */}
            </Modal>
        </>;
    }
}

export default ClientView;