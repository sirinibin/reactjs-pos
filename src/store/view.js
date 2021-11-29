import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Button, Table } from 'react-bootstrap';
import Cookies from "universal-cookie";

const StoreView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getStore(id);
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

    const [isProcessing, setProcessing] = useState(false);


    function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        setProcessing(true);
        fetch('/v1/store/' + id, requestOptions)
            .then(async response => {
                setProcessing(false);
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
                setProcessing(false);
                // setErrors(error);
            });
    }


    return (<>
        <Modal show={show} size="lg" onHide={handleClose} animation={false}>
            <Modal.Header>
                <Modal.Title>Details of Store #{model.name} </Modal.Title>

                <div className="col align-self-end text-end">
                    {/*
                        <button
                            className="btn btn-primary mb-3"
                            data-bs-toggle="modal"
                            data-bs-target="#previewStoreModal"
                        >
                            <i className="bi bi-display"></i> Preview
                        </button> */}
                    <button
                        type="button"
                        className="btn-close"
                        onClick={handleClose}
                        aria-label="Close"
                    ></button>

                </div>
            </Modal.Header>
            <Modal.Body>
                <Table striped bstoreed hover responsive="lg">
                    <tr>
                        <th>Name:</th><td> {model.name}</td>
                        <th>Name(in Arabic):</th><td> {model.name_in_arabic}</td>
                    </tr>
                    <tr>
                        <th>Title:</th><td> {model.title}</td>
                        <th>Title(in Arabic):</th><td> {model.title_in_arabic}</td>
                    </tr>
                    <tr>
                        <th>Address:</th><td> {model.address}</td>
                        <th>Address in Arabic:</th><td> {model.address_in_arabic}</td>
                    </tr>
                    <tr>
                        <th>Phone:</th><td> {model.phone}</td>
                        <th>Phone in Arabic:</th><td> {model.phone_in_arabic}</td>
                    </tr>
                    <tr>
                        <th>VAT No:</th><td> {model.vat_no}</td>
                        <th>VAT No(in Arabic):</th><td> {model.vat_no_in_arabic}</td>
                    </tr>
                    <tr>
                        <th>Created At:</th><td> {model.created_at}</td>
                        <th>Updated At:</th><td> {model.updated_at}</td>
                    </tr>
                    <tr>
                        <th>Created By:</th><td> {model.created_by_name}</td>
                        <th>Updated By:</th><td> {model.updated_by_name}</td>
                    </tr>
                    <tr>
                        <th>E-mail:</th><td> {model.email}</td>
                        <th>VAT %:</th><td> {model.vat_percent + "%"}</td>
                    </tr>

                </Table>
                <div>Logo:<img src={model.logo} style={{ width: 200, height: 200 }} /></div>

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

export default StoreView;