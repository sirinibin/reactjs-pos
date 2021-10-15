import React from 'react';
import { Modal, Button, Table } from 'react-bootstrap';


class UserView extends React.Component {

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
                    <Modal.Title>Order #123 Details</Modal.Title>

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
                            <th>ID:</th><td> 123</td>
                            <th>Name:</th><td> Business1</td>
                            <th>Email:</th><td> Client1</td>
                            <th>Mobile:</th><td> User1</td>
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

export default UserView;