import React from 'react';
import { Modal, Button, Table } from 'react-bootstrap';


class ProductView extends React.Component {

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
                    <Modal.Title>Product #123 Details</Modal.Title>

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
                            <th>Product Name:</th><td> ABC</td>
                            <th>Product Name(in Arabic):</th><td> ABC</td>

                        </tr>
                        <tr>
                            <th>Item Code:</th><td> ABC-1</td>
                            <th>Category:</th><td> Category</td>
                        </tr>
                        <tr>
                            <th>Wholsale Unit Price in Store 1:</th><td> 200 SAR</td>
                            <th>Retail Unit Price in Store 1:</th><td> 300 SAR</td>
                        </tr>
                        <tr>
                            <th>Wholsale Unit Price in Store 2:</th><td> 250 SAR</td>
                            <th>Retail Unit Price in Store 2:</th><td> 350 SAR</td>
                        </tr>
                        <tr>
                            <th>Quantity/Stock in Store1:</th><td> 2</td>
                            <th>Quantity/Stock in Store2:</th><td> 3</td>
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

export default ProductView;