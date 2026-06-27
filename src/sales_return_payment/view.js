import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Table, Button } from 'react-bootstrap';

const countryTimezoneMap = {
    'SA': 'Asia/Riyadh', 'AE': 'Asia/Dubai', 'KW': 'Asia/Kuwait',
    'QA': 'Asia/Qatar', 'BH': 'Asia/Bahrain', 'OM': 'Asia/Muscat',
    'IN': 'Asia/Kolkata', 'PK': 'Asia/Karachi', 'BD': 'Asia/Dhaka',
    'LK': 'Asia/Colombo', 'NP': 'Asia/Kathmandu', 'MY': 'Asia/Kuala_Lumpur',
    'SG': 'Asia/Singapore', 'PH': 'Asia/Manila', 'ID': 'Asia/Jakarta',
    'EG': 'Africa/Cairo', 'JO': 'Asia/Amman', 'LB': 'Asia/Beirut',
    'IQ': 'Asia/Baghdad', 'IR': 'Asia/Tehran', 'TR': 'Europe/Istanbul',
    'GB': 'Europe/London', 'DE': 'Europe/Berlin', 'FR': 'Europe/Paris',
    'US': 'America/New_York', 'CA': 'America/Toronto', 'AU': 'Australia/Sydney',
};

function formatInStoreTimezone(dateStr) {
    if (!dateStr) return '';
    const tz = countryTimezoneMap[localStorage.getItem('store_country_code')] || 'UTC';
    const tzLabel = tz.replace(/_/g, ' ');
    try {
        const d = new Date(dateStr);
        const formatted = d.toLocaleString('en-US', {
            timeZone: tz,
            year: 'numeric', month: 'short', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true,
        });
        return `${formatted} (${tzLabel})`;
    } catch {
        return dateStr;
    }
}

const SalesReturnPaymentView = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                getSalesReturnPayment(id);
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

    function getSalesReturnPayment(id) {
        console.log("inside get SalesReturnPayment");
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

        fetch('/v1/sales-return-payment/' + id + "?" + queryParams, requestOptions)
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
                <Modal.Title>Details of Sales Return Payment  of Sales return #{model.sales_return_code} </Modal.Title>

                <div className="col align-self-end text-end">
                    {props.openCreateForm ? <Button variant="primary" onClick={() => {
                        handleClose();
                        props.openCreateForm(props.sales_return);
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
                            <th>Sales Return ID:</th><td> {model.sales_return_code}</td>
                            <th>Sales Order ID:</th><td> {model.order_code}</td>
                            <th>Amount:</th><td> {model.amount}</td>
                            <th>Payment Method:</th><td> {model.method}</td>
                            <th>Store Name:</th><td> {model.store_name}</td>
                        </tr>
                        <tr>
                            <th>Date :</th><td>  {formatInStoreTimezone(model.date)} </td>
                            <th>Created By:</th><td> {model.created_by_name}</td>
                            <th>Created At:</th><td> {formatInStoreTimezone(model.created_at)}</td>
                            <th>Updated At:</th><td> {formatInStoreTimezone(model.updated_at)}</td>
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

export default SalesReturnPaymentView;