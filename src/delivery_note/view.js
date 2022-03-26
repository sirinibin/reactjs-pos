import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal, Button, Table } from 'react-bootstrap';
import Cookies from "universal-cookie";
import NumberFormat from "react-number-format";
import DeliveryNotePreview from './preview.js';
import DeliveryNotePrint from './print.js';

const DeliveryNoteView = forwardRef((props, ref) => {


    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getDeliveryNote(id);
                SetShow(true);
            }

        },

    }));


    let [model, setModel] = useState({});
    const cookies = new Cookies();


    let [totalPrice, setTotalPrice] = useState(0.0);
    let [netTotal, setNetTotal] = useState(0.00);
    let [totalQuantity, setTotalQuantity] = useState(0);
    let [vatPrice, setVatPrice] = useState(0.00);

    function getDeliveryNote(id) {
        console.log("inside get DeliveryNote");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };


        fetch('/v1/delivery-note/' + id, requestOptions)
            .then(async response => {

                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                // setErrors({});

                console.log("Response:");
                console.log(data);

                model = data.result;

                setModel({ ...model });
            })
            .catch(error => {
                // setErrors(error);
            });
    }

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    const PreviewRef = useRef();
    function openPreview() {
        PreviewRef.current.open(model);
    }

    const PrintRef = useRef();
    function openPrint() {
        PrintRef.current.open(model);
    }

    return (<>
        <DeliveryNotePreview ref={PreviewRef} />
        <DeliveryNotePrint ref={PrintRef} />
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Header>
                <Modal.Title>Details of  Delivery Note #{model.code}</Modal.Title>

                <div className="col align-self-end text-end">
                    <Button variant="primary" onClick={openPrint}>
                        <i className="bi bi-printer"></i> Print
                    </Button>
                    &nbsp;  &nbsp;
                    <Button variant="primary" onClick={openPreview}>
                        <i className="bi bi-display"></i> E-Invoice
                    </Button>
                    &nbsp;  &nbsp;&nbsp; &nbsp;&nbsp;
                    <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openCreateForm();
                    }}>
                        <i className="bi bi-plus"></i> Create
                    </Button>
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
                <Table striped bordered hover responsive="xl">
                    <tbody>
                        <tr>
                            <th>Store:</th><td> {model.store_name}</td>
                            <th>Customer:</th><td> {model.customer_name}</td>
                            <th>Delivered by:</th><td> {model.delivered_by_name}</td>
                        </tr>
                        <tr>
                            <th>Date:</th><td> {model.date_str}</td>
                            <th>Created At:</th><td> {model.created_at}</td>
                            <th>Updated At:</th><td> {model.updated_at}</td>
                        </tr>
                        <tr>
                            <th>Created By:</th><td> {model.created_by_name}</td>
                            <th>Updated By:</th><td> {model.updated_by_name}</td>
                        </tr>
                    </tbody>
                </Table>

                <div className="table-responsive" style={{ overflowX: "auto" }}>
                    <table className="table table-striped table-sm table-bordered">
                        <thead>
                            <tr className="text-center">
                                <th>SI No.</th>
                                <th>Part No.</th>
                                <th>Name</th>
                                <th>Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {model.products && model.products.map((product, index) => (
                                <tr key={index} className="text-center">
                                    <td>{index + 1}</td>
                                    <td>{product.part_number}</td>
                                    <td>{product.name}{product.name_in_arabic ? " / " + product.name_in_arabic : ""}</td>
                                    <td>{product.quantity}  {product.unit ? product.unit : ""} </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

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

export default DeliveryNoteView;