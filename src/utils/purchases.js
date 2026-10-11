import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal } from "react-bootstrap";
import "react-datepicker/dist/react-datepicker.css";
import Draggable from "react-draggable";
import PurchaseIndex from "./../purchase/index.js";
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

const Purchases = forwardRef((props, ref) => {
    const { t } = useTranslation('common');
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
                backdrop={false}
                keyboard={false}
                centered={false}
                enforceFocus={false}
                style={{ zIndex: 1090 }}
                dialogAs={PickerDialog}
            >
                <Modal.Header>
                    <Modal.Title>{enableSelection ? t("Select Purchase") : t("Purchases")}</Modal.Title>
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

