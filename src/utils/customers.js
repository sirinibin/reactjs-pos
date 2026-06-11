import React, { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Modal } from "react-bootstrap";
import Draggable from "react-draggable";
import CustomerIndex from "../customer/index.js";

const Customers = forwardRef((props, ref) => {
    const dragRef = useRef(null);
    const [show, SetShow] = useState(false);

    useImperativeHandle(ref, () => ({
        open() {
            SetShow(true);
        },
    }));

    function handleClose() {
        SetShow(false);
    }

    const handleSelected = (customer) => {
        if (props.onSelectCustomer) {
            props.onSelectCustomer(customer);
        }
        SetShow(false);
    };

    // Stable reference — prevents Modal from unmounting/remounting dialog on every render
    const DraggableDialog = useCallback(({ children, ...dialogProps }) => (
        <Draggable handle=".modal-header" nodeRef={dragRef} defaultPosition={{ x: 0, y: 0 }}>
            <div
                ref={dragRef}
                className="modal-dialog modal-xl"
                {...dialogProps}
                style={{
                    position: "fixed",
                    top: "5%",
                    left: "15%",
                    margin: "0",
                    zIndex: 1055,
                    width: "70%",
                }}
            >
                <div className="modal-content">{children}</div>
            </div>
        </Draggable>
    ), []);

    return (
        <Modal
            show={show}
            size="xl"
            onHide={handleClose}
            animation={false}
            scrollable={true}
            backdrop={false}
            keyboard={false}
            centered={false}
            enforceFocus={false}
            dialogAs={DraggableDialog}
        >
            <Modal.Header>
                <Modal.Title>Select Customer</Modal.Title>
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
                <CustomerIndex
                    enableSelection={true}
                    onSelectCustomer={handleSelected}
                    showToastMessage={props.showToastMessage}
                />
            </Modal.Body>
        </Modal>
    );
});

export default Customers;
