import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Table, Button } from 'react-bootstrap';
import Cookies from "universal-cookie";
import { format } from "date-fns";

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


    function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/store/' + id, requestOptions)
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
                <Modal.Title>Details of Store #{model.name} </Modal.Title>

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
                            <td><b>Zatca Phase</b><br />{model.zatca?.phase ? "Phase " + model.zatca?.phase : "Phase 1"}</td>
                            <td><b>Name</b><br /> {model.name}</td>
                            <td><b>Name(in Arabic)</b><br />{model.name_in_arabic}</td>
                            <td><b>Business category</b><br /> {model.business_category}</td>
                            <td><b>Branch Code</b><br />{model.code}</td>
                            <td><b>Branch Name</b><br />{model.branch_name}</td>
                        </tr>
                        <tr>
                            <td><b>Title</b><br /> {model.title}</td>
                            <td><b>Title(in Arabic)</b><br /> {model.title_in_arabic}</td>
                            <td><b>Registration Number(C.R NO.)</b><br /> {model.registration_number}</td>
                            <td><b>Registration Number(C.R NO.)(in Arabic)</b><br />{model.registration_number_in_arabic}</td>
                            <td><b>Address</b><br />{model.address}</td>
                            <td><b>Address in Arabic</b><br /> {model.address_in_arabic}</td>
                        </tr>
                        <tr>
                            <td><b>Zipcode</b><br />{model.zipcode}</td>
                            <td><b>Zipcode in arabic</b><br />{model.zipcode_in_arabic}</td>
                            <td><b>Phone</b><br />{model.phone}</td>
                            <td><b>Phone in Arabic</b><br />{model.phone_in_arabic}</td>
                            <td><b>VAT No</b><br /> {model.vat_no}</td>
                            <td><b>VAT No(in Arabic)</b><br /> {model.vat_no_in_arabic}</td>
                        </tr>
                        <tr>
                            <td><b>Created At</b><br /> {model.created_at}</td>
                            <td><b>Updated At</b><br /> {model.updated_at}</td>
                            <td><b>Created By</b><br />{model.created_by_name}</td>
                            <td><b>Updated By</b><br />{model.updated_by_name}</td>
                            <td><b>E-mail</b><br />{model.email}</td>
                            <td><b>VAT %</b><br />{model.vat_percent + "%"}</td>
                        </tr>
                        <tr>
                            <td><b>Connected to ZATCA</b><br />{model.zatca?.connected ? "YES" : "NO"}</td>
                            <td><b>Last connected at</b><br />{model.zatca?.last_connected_at ? format(
                                new Date(model.zatca?.last_connected_at),
                                "MMM dd yyyy h:mm:ssa"
                            ) : "Not set"}</td>
                        </tr>
                    </tbody>
                </Table>
                <div>Logo:<br /><img alt="Logo" src={process.env.REACT_APP_API_URL + model.logo + "?" + (Date.now())} key={model.logo} style={{ width: 100, height: 100 }} ></img></div>

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
                <h2> Serial Numbers</h2>

                <span>
                    <Table striped bordered hover responsive="lg">
                        <thead>
                            <tr>
                                <th>Model</th>
                                <th>Prefix</th>
                                <th>Padding count</th>
                                <th>Counting start from</th>
                            </tr>
                        </thead>
                        <tbody>
                            {model.sales_serial_number && <tr>
                                <td>Sales</td>
                                <td> {model.sales_serial_number.prefix}</td>
                                <td> {model.sales_serial_number.padding_count}</td>
                                <td> {model.sales_serial_number.start_from_count}</td>
                            </tr>}
                            {model.sales_return_serial_number && <tr>
                                <td>Sales Return</td>
                                <td> {model.sales_return_serial_number.prefix}</td>
                                <td> {model.sales_return_serial_number.padding_count}</td>
                                <td> {model.sales_return_serial_number.start_from_count}</td>
                            </tr>}
                            {model.purchase_serial_number && <tr>
                                <td>Purchase</td>
                                <td> {model.purchase_serial_number.prefix}</td>
                                <td> {model.purchase_serial_number.padding_count}</td>
                                <td> {model.purchase_serial_number.start_from_count}</td>
                            </tr>}
                            {model.purchase_return_serial_number && <tr>
                                <td>Purchase Return</td>
                                <td> {model.purchase_return_serial_number.prefix}</td>
                                <td> {model.purchase_return_serial_number.padding_count}</td>
                                <td> {model.purchase_return_serial_number.start_from_count}</td>
                            </tr>}
                            {model.quotation_serial_number && <tr>
                                <td>Quotation Return</td>
                                <td> {model.quotation_serial_number.prefix}</td>
                                <td> {model.quotation_serial_number.padding_count}</td>
                                <td> {model.quotation_serial_number.start_from_count}</td>
                            </tr>}
                        </tbody>
                    </Table>
                </span>
                <h5> Zatca connection failures</h5>

                <span>
                    <Table striped bordered hover responsive="lg">

                        <tbody>
                            <tr>
                                <td><b>Zatca Connection failed count</b><br />{model.zatca?.connection_failed_count}</td>
                                <td><b>Zatca Connection last failed at</b><br />{model.zatca?.connection_last_failed_at ? format(
                                    new Date(model.zatca?.connection_last_failed_at),
                                    "MMM dd yyyy h:mm:ssa"
                                ) : "Not set"}</td>
                                <td>
                                    <b>Connection errors:</b>
                                    <ol>
                                        {model.zatca?.connection_errors &&
                                            model.zatca?.connection_errors.map((error) => (
                                                <li>{error}</li>
                                            ))}
                                    </ol>
                                </td>

                            </tr>

                        </tbody>
                    </Table>
                </span>



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