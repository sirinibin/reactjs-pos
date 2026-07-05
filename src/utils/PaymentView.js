import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Table, Button } from 'react-bootstrap';
import { ObjectToSearchQueryParams } from './queryUtils.js';
import { formatInStoreTimezone } from './dateUtils.js';

/**
 * Generic payment/discount view modal.
 * Props:
 *   apiPath         – string, e.g. "/v1/sales-payment"
 *   title           – function(model) → string
 *   renderFirstRow  – function(model) → JSX (<th>/<td> pairs for all first-row cells)
 *   renderSecondRow – (optional) function(model) → JSX, defaults to Date/Created/Updated row
 *   createFormArg   – function(props, model) → entity to pass to props.openCreateForm
 *   openCreateForm  – (optional) function from parent
 *   openUpdateForm  – function from parent
 */
const PaymentView = forwardRef((props, ref) => {
    const { apiPath, title, renderFirstRow, renderSecondRow, createFormArg } = props;

    const defaultSecondRow = (m) => (<>
        <th>Date :</th><td> {formatInStoreTimezone(m.date)} </td>
        <th>Created By:</th><td> {m.created_by_name}</td>
        <th>Created At:</th><td> {formatInStoreTimezone(m.created_at)}</td>
        <th>Updated At:</th><td> {formatInStoreTimezone(m.updated_at)}</td>
    </>);

    let [model, setModel] = useState({});
    const [show, setShow] = useState(false);

    useImperativeHandle(ref, () => ({
        open(id) {
            if (id) {
                fetchPayment(id);
                setShow(true);
            }
        },
    }));

    function handleClose() { setShow(false); }

    function fetchPayment(id) {
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
        const queryParams = ObjectToSearchQueryParams(searchParams);
        fetch(`${apiPath}/${id}?${queryParams}`, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();
                if (!response.ok) return Promise.reject(data && data.errors);
                model = data.result;
                setModel({ ...model });
            })
            .catch(() => {});
    }

    return (
        <>
            <Modal show={show} size="lg" onHide={handleClose} animation={false} scrollable={true}>
                <Modal.Header>
                    <Modal.Title>{title(model)}</Modal.Title>
                    <div className="col align-self-end text-end">
                        {props.openCreateForm ? (
                            <Button variant="primary" onClick={() => {
                                handleClose();
                                props.openCreateForm(createFormArg ? createFormArg(props, model) : model);
                            }}>
                                <i className="bi bi-plus"></i> Create
                            </Button>
                        ) : ""}
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
                            <tr>{renderFirstRow(model)}</tr>
                            <tr>{(renderSecondRow || defaultSecondRow)(model)}</tr>
                            <tr>
                                <th>Updated By:</th><td> {model.updated_by_name}</td>
                            </tr>
                        </tbody>
                    </Table>
                </Modal.Body>
            </Modal>
        </>
    );
});

export default PaymentView;
