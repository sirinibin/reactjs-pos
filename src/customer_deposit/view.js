import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal, Table } from 'react-bootstrap';
import { Button } from "react-bootstrap";
import CustomerDepositPreview from './preview.js';

const CustomerDepositView = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getCustomerDeposit(id);
                SetShow(true);
            }
        },

    }));


    let [model, setModel] = useState({});


    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=` + object[key];
            })
            .join("&");
    }

    function getCustomerDeposit(id) {
        console.log("inside get CustomerDeposit");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };



        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);


        fetch('/v1/customer-deposit/' + id + "?" + queryParams, requestOptions)
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



    const PreviewRef = useRef();
    function openPreview() {
        PreviewRef.current.open(model, undefined, "customer_deposit");
    }

    function sendWhatsAppMessage() {
        PreviewRef.current.open(model, "whatsapp", "whatsapp_customer_deposit");
    }



    return (<>
        <CustomerDepositPreview ref={PreviewRef} />
        <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Header>
                <Modal.Title>Details of Customer Receivable #{model.code} </Modal.Title>

                <div className="col align-self-end text-end">
                    &nbsp;&nbsp;
                    <Button variant="primary" onClick={openPreview}>
                        <i className="bi bi-printer"></i> Print
                    </Button>
                    &nbsp;&nbsp;
                    <Button className={`btn btn-success btn-sm`} style={{}} onClick={sendWhatsAppMessage}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                            <path d="M13.601 2.326A7.875 7.875 0 0 0 8.036 0C3.596 0 0 3.597 0 8.036c0 1.417.37 2.805 1.07 4.03L0 16l3.993-1.05a7.968 7.968 0 0 0 4.043 1.085h.003c4.44 0 8.036-3.596 8.036-8.036 0-2.147-.836-4.166-2.37-5.673ZM8.036 14.6a6.584 6.584 0 0 1-3.35-.92l-.24-.142-2.37.622.63-2.31-.155-.238a6.587 6.587 0 0 1-1.018-3.513c0-3.637 2.96-6.6 6.6-6.6 1.764 0 3.42.69 4.67 1.94a6.56 6.56 0 0 1 1.93 4.668c0 3.637-2.96 6.6-6.6 6.6Zm3.61-4.885c-.198-.1-1.17-.578-1.352-.644-.18-.066-.312-.1-.444.1-.13.197-.51.644-.626.775-.115.13-.23.15-.428.05-.198-.1-.837-.308-1.594-.983-.59-.525-.99-1.174-1.11-1.372-.116-.198-.012-.305.088-.403.09-.09.198-.23.298-.345.1-.115.132-.197.2-.33.065-.13.032-.247-.017-.345-.05-.1-.444-1.07-.61-1.46-.16-.384-.323-.332-.444-.338l-.378-.007c-.13 0-.344.048-.525.23s-.688.672-.688 1.64c0 .967.704 1.9.802 2.03.1.13 1.386 2.116 3.365 2.963.47.203.837.324 1.122.414.472.15.902.13 1.24.08.378-.057 1.17-.48 1.336-.942.165-.462.165-.858.116-.943-.048-.084-.18-.132-.378-.23Z" />
                        </svg>
                    </Button>
                    &nbsp;&nbsp;


                    {props.openCreateForm ? <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openCreateForm();
                    }}>
                        <i className="bi bi-plus"></i> Create
                    </Button> : ""}
                    &nbsp;&nbsp;
                    {props.openUpdateForm ? <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openUpdateForm(model.id);
                    }}>
                        <i className="bi bi-pencil"></i> Edit
                    </Button> : ""}

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
                            <th>Code:</th><td> {model.code}</td>
                            <th>Date:</th><td> {model.date}</td>
                            <th>Description:</th><td> {model.description}</td>
                            <th>Amount</th><td> {model.amount}</td>
                            <th>Customer</th><td> {model.customer_name}</td>
                            <th>Payment Method:</th><td> {model.payment_method}</td>
                        </tr>
                        <tr>
                            <th>Created At:</th><td> {model.created_at}</td>
                            <th>Updated At:</th><td> {model.updated_at}</td>
                            <th>Created By:</th><td> {model.created_by_name}</td>
                            <th>Updated By:</th><td> {model.updated_by_name}</td>
                        </tr>
                    </tbody>
                </Table>
                <h4>Images</h4>
                <div className="table-responsive" style={{ overflowX: "auto" }}>
                    <table className="table table-striped table-sm table-bordered">
                        <thead>
                            <tr className="text-center">
                                <th>SI No.</th>
                                <th>Image</th>
                            </tr>
                        </thead>
                        <tbody>
                            {model.images && model.images.map((image, index) => (
                                <tr key={index} className="text-center">
                                    <td>{index + 1}</td>
                                    <td>
                                        <img alt="CustomerDeposit" src={image + "?" + (Date.now())} key={image} style={{ width: 300, height: 300 }} />
                                    </td>
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

export default CustomerDepositView;