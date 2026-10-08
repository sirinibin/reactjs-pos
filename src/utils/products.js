import React, { useState, useRef, useCallback, forwardRef, useEffect, useImperativeHandle } from "react";
import { Modal } from "react-bootstrap";
import "react-datepicker/dist/react-datepicker.css";
import Draggable from "react-draggable";
import ProductIndex from "../product/index.js";
import ServiceIndex from "../service/index.js";
import ServiceCreate from "../service/create.js";


const Products = forwardRef((props, ref) => {
    const dragRef = useRef(null);
    const serviceCreateRef = useRef();
    const [serviceRefreshKey, setServiceRefreshKey] = useState(0);
    // ref to the Bootstrap Modal — .current.dialog is the outer .modal div
    const selectionModalRef = useRef();

    const DraggableDialog = useCallback(({ children, ...dialogProps }) => (
        <Draggable handle=".modal-header" nodeRef={dragRef} defaultPosition={{ x: 0, y: 0 }}>
            <div
                ref={dragRef}
                {...dialogProps}
                className={`modal-dialog modal-xl ${dialogProps.className || ""}`}
                style={{
                    position: "absolute",
                    top: "5%",
                    left: "15%",
                    margin: "0",
                    width: "70%",
                    maxHeight: "90vh",
                }}
            >
                <div className="modal-content">{children}</div>
            </div>
        </Draggable>
    ), []);

    let [enableSelection, setEnableSelection] = useState(false);
    let [type, setType] = useState("");
    let [product, setProduct] = useState({});
    let [isService, setIsService] = useState(false);

    useImperativeHandle(ref, () => ({
        open(enableSelectionValue, productType, model, serviceOnly = false) {
            enableSelection = enableSelectionValue;
            setEnableSelection(enableSelection);

            type = productType;
            setType(type);

            product = model;
            setProduct(product);

            isService = serviceOnly;
            setIsService(isService);

            SetShow(true);
        },
    }));

    const [show, SetShow] = useState(false);

    // Force the selection modal's outer div z-index:
    //   1085 normally (below pw-modal-wrap at 1095/1096)
    //   1096 in pendingView (above the pendingView edit form at 1090/1095)
    useEffect(() => {
        if (show) {
            requestAnimationFrame(() => {
                if (selectionModalRef.current?.dialog) {
                    const zIndex = props.pendingView ? '1096' : '1085';
                    selectionModalRef.current.dialog.style.setProperty('z-index', zIndex, 'important');
                }
            });
        }
    }, [show, props.pendingView]);

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
            {/* Rendered outside the selection modal so ServiceCreate portals to body
                as an independent sibling — not inside the selection modal's stacking context. */}
            <ServiceCreate
                ref={serviceCreateRef}
                showToastMessage={props.showToastMessage}
                refreshList={() => setServiceRefreshKey(k => k + 1)}
            />

            <Modal ref={selectionModalRef} show={show} size="xl" onHide={handleClose} animation={false} scrollable={true}
                backdrop={false}                // ✅ Allow editing background
                keyboard={false}
                centered={false}                // ❌ disable auto-centering
                enforceFocus={false}            // ✅ allow focus outside
                dialogAs={DraggableDialog}
                className="products-modal-wrap above-sales-modal"
            >
                <Modal.Header>
                    <Modal.Title>
                        {enableSelection ? "Select" : ""}

                        {type && product && type === "linked_products" ? ` Linked Products of #${product.name}` : isService ? " Services" : " Products"}
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
                        {isService ? (
                            <ServiceIndex
                                enableSelection={enableSelection}
                                onSelectServices={handleSelected}
                                onOpenCreate={() => serviceCreateRef.current?.open()}
                                refreshTrigger={serviceRefreshKey}
                            />
                        ) : (
                            <ProductIndex
                                enableSelection={enableSelection}
                                type={type}
                                model={product}
                                isService={false}
                                onSelectProducts={handleSelected}
                            />
                        )}
                    </>
                </Modal.Body>
            </Modal>
        </>);


});

export default Products;
