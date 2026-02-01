import React, { useState, useRef, forwardRef, useEffect, useImperativeHandle } from "react";
import { Modal } from "react-bootstrap";
import "react-datepicker/dist/react-datepicker.css";
import Draggable from "react-draggable";
import ProductPurchaseReturnHistoryTable from "../product/purchase_return_history.js";

const ProductPurchaseReturnHistory = forwardRef((props, ref) => {
    const dragRef = useRef(null);
    let [product, setProduct] = useState({});
    let [selectedVendors, setSelectedVendors] = useState([]);

    useImperativeHandle(ref, () => ({
        open(model, selectedVendorsValue) {
            product = model;
            setProduct(product);

            if (selectedVendorsValue?.length > 0) {
                selectedVendors = selectedVendorsValue;
                setSelectedVendors([...selectedVendorsValue]);
            }

            SetShow(true);
        },
    }));

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };


    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                SetShow(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);



    const ProductPurchaseReturnHistoryTableRef = useRef();

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
                    <Modal.Title>
                        <Modal.Title>Purchase Return History of {product?.name} {product?.name_in_arabic ? " / " + product?.name_in_arabic : ""}</Modal.Title>
                    </Modal.Title>
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
                        {show && <ProductPurchaseReturnHistoryTable
                            ref={ProductPurchaseReturnHistoryTableRef}
                            model={product}
                            selectedVendors={selectedVendors}
                        />}
                    </>
                </Modal.Body>
            </Modal>
        </>);


});

export default ProductPurchaseReturnHistory;

