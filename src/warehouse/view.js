import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Table, Button } from 'react-bootstrap';

const WarehouseView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getWarehouse(id);
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
                return `search[${key}]=` + encodeURIComponent(object[key]);
            })
            .join("&");
    }


    function getWarehouse(id) {
        console.log("inside get Warehouse");
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

        fetch('/v1/warehouse/' + id + "?" + queryParams, requestOptions)
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
        <Modal show={show} size="xl" fullscreen onHide={handleClose} animation={false} scrollable={true}>
            <Modal.Header>
                <Modal.Title>Details of Warehouse #{model.name} </Modal.Title>

                <div className="col align-self-end text-end">
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
                <Table striped bordered hover responsive="lg">
                    <tbody>
                        <tr>
                            <td><b>Name</b><br /> {model.name}</td>
                            <td><b>Name(in Arabic)</b><br />{model.name_in_arabic}</td>
                            <td><b>Code</b><br />{model.code}</td>
                        </tr>

                        <tr>

                            <td><b>Phone</b><br />{model.phone}</td>
                            <td><b>Phone in Arabic</b><br />{model.phone_in_arabic}</td>

                        </tr>
                        <tr>
                            <td><b>Created At</b><br /> {model.created_at}</td>
                            <td><b>Updated At</b><br /> {model.updated_at}</td>
                            <td><b>Created By</b><br />{model.created_by_name}</td>
                            <td><b>Updated By</b><br />{model.updated_by_name}</td>
                            <td><b>E-mail</b><br />{model.email}</td>
                        </tr>
                    </tbody>
                </Table>
                {model.national_address &&
                    <span>
                        < h2 > National Address</h2>

                        <Table striped bordered hover responsive="lg">
                            <tbody>
                                <tr>
                                    <th>Building Number<br /> </th><td> {model.national_address.building_no}</td>
                                    <th>Building Number(Arabic)<br /> </th><td> {model.national_address.building_no_arabic}</td>
                                </tr>
                                <tr>
                                    <th>Street Name<br /> </th><td> {model.national_address.street_name}</td>
                                    <th>Street Name(Arabic)<br /> </th><td> {model.national_address.street_name_arabic}</td>
                                </tr>
                                <tr>
                                    <th>District Name<br /> </th><td> {model.national_address.district_name}</td>
                                    <th>District Name(Arabic)<br /> </th><td> {model.national_address.district_name_arabic}</td>
                                </tr>
                                <tr>
                                    <th>City Name:<br /> </th><td> {model.national_address.city_name}</td>
                                    <th>City Name(Arabic)<br /> </th><td> {model.national_address.city_name_arabic}</td>
                                </tr>
                                <tr>
                                    <th>ZipCode<br /> </th><td> {model.national_address.zipcode}</td>
                                    <th>ZipCode(Arabic)<br /> </th><td> {model.national_address.zipcode_arabic}</td>
                                </tr>
                                <tr>
                                    <th>Additional Number<br /> </th><td> {model.national_address.additional_no}</td>
                                    <th>Additional Number(Arabic)<br /> </th><td> {model.national_address.additional_no_arabic}</td>
                                </tr>
                                <tr>
                                    <th>Unit Number<br /> </th><td> {model.national_address.unit_no}</td>
                                    <th>Unit Number(Arabic)<br /> </th><td> {model.national_address.unit_no_arabic}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </span>
                }

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

export default WarehouseView;