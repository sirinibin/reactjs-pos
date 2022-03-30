import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Table, Button } from 'react-bootstrap';
import Cookies from "universal-cookie";

const PurchasePaymentView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getPurchasePayment(id);
                SetShow(true);
            }

        },

    }));


    let [model, setModel] = useState({});
    const cookies = new Cookies();

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    function getPurchasePayment(id) {
        console.log("inside get PurchasePayment");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/purchase-payment/' + id, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Response:");
                console.log(data);

                model = data.result;

                setModel({ ...model });
            })
            .catch(error => {
                // setErrors(error);
            });
    }


    return (<>
        <Modal show={show} size="lg" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Header>
                <Modal.Title>Details of Purchase Payment  of Order #{model.order_code} </Modal.Title>

                <div className="col align-self-end text-end">
                    {props.openCreateForm ? <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openCreateForm(props.order);
                    }}>
                        <i className="bi bi-plus"></i> Create
                    </Button> : ""}
                    &nbsp;&nbsp;
                    <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openUpdateForm(model.id);
                    }}>
                        <i className="bi bi-pencil"></i> Edit
                    </Button>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={handleClose}
                        aria-label="Close"
                    ></button>

                </div>
            </Modal.Header>
            <Modal.Body>
                <Table striped bordered hover responsive="lg">
                    <tbody>
                        <tr>
                            <th>Order ID:</th><td> {model.order_code}</td>
                            <th>Amount:</th><td> {model.amount}</td>
                            <th>Payment Method:</th><td> {model.method}</td>
                            <th>Store Name:</th><td> {model.store_name}</td>
                        </tr>
                        <tr>
                            <th>Created By:</th><td> {model.created_by_name}</td>
                            <th>Created At:</th><td> {model.created_at}</td>
                            <th>Updated At:</th><td> {model.updated_at}</td>
                        </tr>
                        <tr>

                            <th>Updated By:</th><td> {model.updated_by_name}</td>
                        </tr>
                    </tbody>
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
    </>);

});

export default PurchasePaymentView;