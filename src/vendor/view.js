import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { Modal, Table, Button } from 'react-bootstrap';
import ImageGallery from '../utils/ImageGallery.js';


const VendorView = forwardRef((props, ref) => {
    const timerRef = useRef(null);
    const ImageGalleryRef = useRef();
    useImperativeHandle(ref, () => ({
        async open(id) {
            if (id) {
                await getVendor(id);
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    ImageGalleryRef.current.open();
                }, 300);
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
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    async function getVendor(id) {
        console.log("inside get Vendor");
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

        await fetch('/v1/vendor/' + id + "?" + queryParams, requestOptions)
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
        <Modal show={show} fullscreen onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Header>
                <Modal.Title>Details of Vendor #{model.name} </Modal.Title>

                <div className="col align-self-end text-end">
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
                            <th>Name: </th><td> {model.name}</td>
                            <th>Name(in Arabic): </th><td> {model.name_in_arabic}</td>
                        </tr>
                        <tr>
                            <th>Title: </th><td> {model.title}</td>
                            <th>Title(in Arabic): </th><td> {model.title_in_arabic}</td>
                        </tr>
                        <tr>
                            <th>Address: </th><td> {model.address}</td>
                            <th>Address in Arabic: </th><td> {model.address_in_arabic}</td>
                        </tr>
                        <tr>
                            <th>Phone: </th><td> {model.phone}</td>
                            <th>Phone in Arabic: </th><td> {model.phone_in_arabic}</td>
                        </tr>
                        <tr>
                            <th>Registration Number(C.R NO.): </th><td> {model.registration_number}</td>
                            <th>Registration Number(C.R NO.)(in Arabic): </th><td> {model.registration_number_in_arabic}</td>
                        </tr>
                        <tr>
                            <th>VAT No: </th><td> {model.vat_no}</td>
                            <th>VAT No(in Arabic): </th><td> {model.vat_no_in_arabic}</td>
                        </tr>
                        <tr>
                            <th>Created At: </th><td> {model.created_at}</td>
                            <th>Updated At: </th><td> {model.updated_at}</td>
                        </tr>
                        <tr>
                            <th>Created By: </th><td> {model.created_by_name}</td>
                            <th>Updated By: </th><td> {model.updated_by_name}</td>
                        </tr>
                        <tr>
                            <th>E-mail: </th><td> {model.email}</td>
                            <th>VAT %: </th><td> {model.vat_percent + "%"}</td>
                        </tr>
                    </tbody>
                </Table>

                <div className="col-md-12">
                    <label className="form-label">Vendor photos</label>
                    <ImageGallery ref={ImageGalleryRef} id={model.id} storeID={model.store_id} storedImages={model.images} modelName={"vendor"} />
                </div>

                {model.national_address &&
                    <span>
                        < h2 > National Address</h2>

                        <Table striped bordered hover responsive="lg">
                            <tbody>
                                <tr>
                                    <th>Application Number: </th><td> {model.national_address.application_no}</td>
                                    <th>Application Number(Arabic): </th><td> {model.national_address.application_no_arabic}</td>
                                </tr>
                                <tr>
                                    <th>Service Number: </th><td> {model.national_address.service_no}</td>
                                    <th>Service Number(Arabic): </th><td> {model.national_address.service_no_arabic}</td>
                                </tr>
                                <tr>
                                    <th>Customer Account Number: </th><td> {model.national_address.customer_account_no}</td>
                                    <th>Customer Account Number(Arabic): </th><td> {model.national_address.customer_account_no_arabic}</td>
                                </tr>
                                <tr>
                                    <th>Building Number: </th><td> {model.national_address.building_no}</td>
                                    <th>Building Number(Arabic): </th><td> {model.national_address.building_no_arabic}</td>
                                </tr>
                                <tr>
                                    <th>Street Name: </th><td> {model.national_address.street_name}</td>
                                    <th>Street Name(Arabic): </th><td> {model.national_address.street_name_arabic}</td>
                                </tr>
                                <tr>
                                    <th>District Name: </th><td> {model.national_address.district_name}</td>
                                    <th>District Name(Arabic): </th><td> {model.national_address.district_name_arabic}</td>
                                </tr>
                                <tr>
                                    <th>City Name: </th><td> {model.national_address.city_name}</td>
                                    <th>City Name(Arabic): </th><td> {model.national_address.city_name_arabic}</td>
                                </tr>
                                <tr>
                                    <th>ZipCode: </th><td> {model.national_address.zipcode}</td>
                                    <th>ZipCode(Arabic): </th><td> {model.national_address.zipcode_arabic}</td>
                                </tr>
                                <tr>
                                    <th>Additional Number: </th><td> {model.national_address.additional_no}</td>
                                    <th>Additional Number(Arabic): </th><td> {model.national_address.additional_no_arabic}</td>
                                </tr>
                                <tr>
                                    <th>Unit Number: </th><td> {model.national_address.unit_no}</td>
                                    <th>Unit Number(Arabic): </th><td> {model.national_address.unit_no_arabic}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </span>
                }


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

export default VendorView;