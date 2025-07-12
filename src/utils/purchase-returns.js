import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";


import PurchaseReturnIndex from "../purchase_return/index.js";

import "react-datepicker/dist/react-datepicker.css";
import { Modal } from "react-bootstrap";
import Draggable from "react-draggable";

const PurchaseReturns = forwardRef((props, ref) => {
    const dragRef = useRef(null);
    const [show, SetShow] = useState(false);

    let [selectedVendors, setSelectedVendors] = useState([]);
    let [selectedPaymentStatusList, setSelectedPaymentStatusList] = useState([]);

    useImperativeHandle(ref, () => ({
        open(selectedVendorsValue, selectedPaymentStatusListValue) {
            if (selectedVendorsValue?.length > 0) {
                selectedVendors = selectedVendorsValue;
                setSelectedVendors(selectedVendors);
            }

            if (selectedPaymentStatusListValue?.length > 0) {
                selectedPaymentStatusList = selectedPaymentStatusListValue;
                setSelectedPaymentStatusList(selectedPaymentStatusList);
            }


            getStore(localStorage.getItem("store_id"));
            SetShow(true);
        },
    }));


    function handleClose() {
        SetShow(false);
    };




    let [store, setStore] = useState({});

    function getStore(id) {
        console.log("inside get Store");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem("access_token"),
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

                store = data.result;
                setStore({ ...store });
            })
            .catch(error => {

            });
    }


    const handleSelected = (selected) => {
        props.onSelectPurchaseReturn(selected); // Send to parent
        handleClose();
    };

    return (
        <>
            <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}
                backdrop={false}                // ✅ Allow editing background
                keyboard={false}
                centered={false}                // ❌ disable auto-centering
                enforceFocus={false}            // ✅ allow focus outside
                dialogAs={({ children, ...props }) => (
                    <Draggable handle=".modal-header" nodeRef={dragRef}>
                        <div
                            ref={dragRef}
                            className="modal-dialog modal-xl"    // ✅ preserve Bootstrap xl class
                            {...props}
                            style={{
                                position: "absolute",
                                top: "10%",
                                left: "20%",
                                transform: "translate(-50%, -50%)",
                                margin: "0",
                                zIndex: 1055,
                                width: "65%",           // Full width inside container
                            }}
                        >
                            <div className="modal-content">{children}</div>
                        </div>
                    </Draggable>
                )}
            >
                <Modal.Header>
                    <Modal.Title>Select Purchase Return</Modal.Title>

                    <div className="col align-self-end text-end">
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label="Close"
                        ></button>

                    </div>
                </Modal.Header>
                <Modal.Body>
                    <>
                        <PurchaseReturnIndex
                            onSelectPurchaseReturn={handleSelected}
                            selectedVendors={selectedVendors}
                            selectedPaymentStatusList={selectedPaymentStatusList}
                        />
                    </>
                </Modal.Body>
            </Modal>
        </>);


});

export default PurchaseReturns;

