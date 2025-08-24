import React, { useState, useRef, forwardRef, useEffect, useImperativeHandle } from "react";
import { Modal } from "react-bootstrap";
import "react-datepicker/dist/react-datepicker.css";
import Draggable from "react-draggable";
import ProductIndex from "../product/index.js";


const Products = forwardRef((props, ref) => {
    const dragRef = useRef(null);
    // let [selectedCustomers, setSelectedCustomers] = useState([]);
    // let [selectedPaymentStatusList, setSelectedPaymentStatusList] = useState([]);
    let [enableSelection, setEnableSelection] = useState(false);
    let [type, setType] = useState("");
    let [product, setProduct] = useState({});

    useImperativeHandle(ref, () => ({
        open(enableSelectionValue, productType, model) {
            enableSelection = enableSelectionValue;
            setEnableSelection(enableSelection);

            type = productType;
            setType(type);

            product = model;
            setProduct(product);

            /*
            if (selectedCustomersValue?.length > 0) {
                selectedCustomers = selectedCustomersValue;
                setSelectedCustomers([...selectedCustomers]);
            }

            if (selectedPaymentStatusListValue) {
                selectedPaymentStatusList = selectedPaymentStatusListValue;
                setSelectedPaymentStatusList([...selectedPaymentStatusList]);
            }
                */

            SetShow(true);
        },
    }));

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    const handleSelected = (selected) => {
        if (props.onSelectProducts) {
            props.onSelectProducts(selected);
        }
        handleClose();
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
                        {enableSelection ? "Select" : ""}

                        {type && product && type === "linked_products" ? ` Linked Products of #${product.name}` : " Products"}
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
                        <ProductIndex
                            enableSelection={enableSelection}
                            type={type}
                            model={product}
                            onSelectProducts={handleSelected}
                        />
                    </>
                </Modal.Body>
            </Modal>
        </>);


});

export default Products;

