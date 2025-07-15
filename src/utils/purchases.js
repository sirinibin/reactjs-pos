import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal } from "react-bootstrap";
import "react-datepicker/dist/react-datepicker.css";
import Draggable from "react-draggable";
import PurchaseIndex from "./../purchase/index.js";


const Purchases = forwardRef((props, ref) => {
    const dragRef = useRef(null);
    let [selectedVendors, setSelectedVendors] = useState([]);
    let [selectedPaymentStatusList, setSelectedPaymentStatusList] = useState([]);
    let [enableSelection, setEnableSelection] = useState(false);

    useImperativeHandle(ref, () => ({
        open(enableSelectionValue, selectedVendorsValue, selectedPaymentStatusListValue) {
            enableSelection = enableSelectionValue;
            setEnableSelection(enableSelection);

            if (selectedVendorsValue?.length > 0) {
                selectedVendors = selectedVendorsValue;
                setSelectedVendors([...selectedVendors]);
            }

            if (selectedPaymentStatusListValue) {
                selectedPaymentStatusList = selectedPaymentStatusListValue;
                setSelectedPaymentStatusList([...selectedPaymentStatusList]);
            }

            SetShow(true);
        },
    }));

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    const handleSelected = (selected) => {
        props.onSelectPurchase(selected); // Send to parent
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
                    <Modal.Title>{enableSelection ? "Select Purchase" : "Purchases"}</Modal.Title>
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
                        <PurchaseIndex
                            enableSelection={enableSelection}
                            onSelectPurchase={handleSelected}
                            selectedVendors={selectedVendors}
                            selectedPaymentStatusList={selectedPaymentStatusList}
                        />
                    </>
                </Modal.Body>
            </Modal>
        </>);


});

export default Purchases;

