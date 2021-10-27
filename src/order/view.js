import React from 'react';
import OrderPreview from './preview.js';
import { Modal, Button, Table } from 'react-bootstrap';


class OrderView extends React.Component {

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
                        <OrderPreview />
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
                            <th>Store:</th><td> Store1</td>
                            <th>Client:</th><td> Client1</td>
                            <th>Delivered by:</th><td> User1</td>
                        </tr>
                        <tr>
                            <th>Date:</th><td> 14 Oct 2021</td>
                            <th>VAT %:</th><td> 10.00</td>
                            <th>Discount %:</th><td> 12.00 SAR</td>
                        </tr>
                        <tr>
                            <th>Created At:</th><td> 14 Oct 2021 12:24:32</td>
                            <th>Updated At:</th><td> 14 Oct 2021 12:24:32</td>
                        </tr>
                        <tr>
                            <th>Created By:</th><td> User 1</td>
                            <th>Updated By:</th><td> User 1</td>
                        </tr>
                        <tr><th colspan="3">Products:</th></tr>
                        <tr>
                            <th>SI No.</th>
                            <th>Item Code</th>
                            <th>Name</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total Amount</th>

                        </tr>
                        <tr>
                            <td>1</td>
                            <td>P1</td>
                            <td>ABC-1</td>
                            <td>1</td>
                            <td>50.00 SAR</td>
                            <td>50.00 SAR</td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td>P2</td>
                            <td>ABC-2</td>
                            <td>2</td>
                            <td>100.00 SAR</td>
                            <td>200.00 SAR</td>
                        </tr>
                        <tr>
                            <td>3</td>
                            <td>P3</td>
                            <td>ABC-3</td>
                            <td>2</td>
                            <td>150.00 SAR</td>
                            <td>300.00 SAR</td>
                        </tr>
                        <tr>
                            <td>4</td>
                            <td>P4</td>
                            <td>ABC-4</td>
                            <td>2</td>
                            <td>200.00 SAR</td>
                            <td>400.00 SAR</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td></td>
                            <th></th>
                            <th>7</th>
                            <th>Total:</th>
                            <th>950.00 SAR</th>
                        </tr>
                        <tr>
                            <td></td>
                            <td></td>
                            <th></th>
                            <th>VAT:</th>
                            <th>10%</th>
                            <th>95.00 SAR</th>
                        </tr>
                        <tr>
                            <td></td>
                            <td></td>
                            <th></th>
                            <th></th>
                            <th>Discount:</th>
                            <th>100.00 SAR</th>
                        </tr>
                        <tr>
                            <td></td>
                            <td></td>
                            <th></th>
                            <th></th>
                            <th>Net Total:</th>
                            <th>850.00 SAR</th>
                        </tr>
                    </Table>
                    {/*
                    <form className="row g-3 needs-validation" >
                        
                  
                        <div className="col-md-6">
                            <label className="form-label"
                            >Delivered By*</label
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
                       

                    </form>
                    */}
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

export default OrderView;