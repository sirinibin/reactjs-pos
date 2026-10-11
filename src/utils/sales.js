import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal } from "react-bootstrap";
import "react-datepicker/dist/react-datepicker.css";
import Draggable from "react-draggable";
import OrderIndex from "./../order/index.js";
import { useTranslation } from 'react-i18next';

// Defined once at module level: an inline arrow passed as dialogAs is a new
// component type on every render, so React rebuilt the modal body (and refetched
// any list inside it) whenever the parent re-rendered.
const PickerDialog = ({ children, ...props }) => {
    const dragRef = useRef(null);
    return (
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
                    zIndex: 1090,
                    width: "65%",           // Full width inside container
                }}
            >
                <div className="modal-content">{children}</div>
            </div>
        </Draggable>
    );
};

const Sales = forwardRef((props, ref) => {
    const { t } = useTranslation('common');
    let [selectedCustomers, setSelectedCustomers] = useState([]);
    let [selectedPaymentStatusList, setSelectedPaymentStatusList] = useState([]);
    let [enableSelection, setEnableSelection] = useState(false);

    useImperativeHandle(ref, () => ({
        open(enableSelectionValue, selectedCustomersValue, selectedPaymentStatusListValue) {
            enableSelection = enableSelectionValue;
            setEnableSelection(enableSelection);

            if (selectedCustomersValue?.length > 0) {
                selectedCustomers = selectedCustomersValue;
                setSelectedCustomers([...selectedCustomers]);
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
        props.onSelectSale(selected); // Send to parent
        handleClose();
    };



    return (
        <>
            <Modal show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}
                backdrop={false}
                keyboard={false}
                centered={false}
                enforceFocus={false}
                style={{ zIndex: 1090 }}
                dialogAs={PickerDialog}
            >
                <Modal.Header>
                    <Modal.Title>{enableSelection ? t("Select Sale") : t("Sales")}</Modal.Title>
                    <div className="col align-self-end text-end">
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label={t("Close")}
                        ></button>

                    </div>
                </Modal.Header>
                <Modal.Body>
                    <>
                        <OrderIndex
                            enableSelection={enableSelection}
                            onSelectSale={handleSelected}
                            selectedCustomers={selectedCustomers}
                            selectedPaymentStatusList={selectedPaymentStatusList}
                        />
                    </>
                </Modal.Body>
            </Modal>
        </>);


});

export default Sales;

