import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import ProductPurchaseHistoryTable from "../product/purchase_history.js";
import DraggableHistoryModal from "./DraggableHistoryModal.js";
import PurchaseCreate from "../purchase/create.js";

const ProductPurchaseHistory = forwardRef((props, ref) => {
    let [product, setProduct] = useState({});
    let [selectedVendors, setSelectedVendors] = useState([]);
    const [show, setShow] = useState(false);
    const tableRef = useRef();

    // Direct purchase form (used by openById — no history table shown)
    const [directPurchaseShow, setDirectPurchaseShow] = useState(false);
    const [directPurchaseId, setDirectPurchaseId] = useState(null);
    const directPurchaseRef = useRef();

    useEffect(() => {
        if (directPurchaseShow && directPurchaseId && directPurchaseRef.current) {
            setTimeout(() => {
                directPurchaseRef.current.open(directPurchaseId);
            }, 100);
        }
    }, [directPurchaseShow, directPurchaseId]);

    useImperativeHandle(ref, () => ({
        open(model, selectedVendorsValue) {
            product = model;
            setProduct(product);
            selectedVendors = [];
            setSelectedVendors([]);
            if (selectedVendorsValue?.length > 0) {
                selectedVendors = selectedVendorsValue;
                setSelectedVendors([...selectedVendorsValue]);
            }
            setShow(true);
        },
        openById(purchaseId) {
            if (directPurchaseShow && directPurchaseId === purchaseId) {
                // already open for same purchase — just ensure it's visible
                directPurchaseRef.current?.open(purchaseId);
                return;
            }
            setDirectPurchaseId(purchaseId);
            setDirectPurchaseShow(true);
        },
    }));

    return (
        <>
            {directPurchaseShow && (
                <PurchaseCreate
                    fromHistory={true}
                    modalClass="above-product-form"
                    ref={directPurchaseRef}
                    onClose={() => {
                        setDirectPurchaseShow(false);
                        setDirectPurchaseId(null);
                    }}
                />
            )}
            <DraggableHistoryModal
                show={show}
                onClose={() => setShow(false)}
                title={`Purchase History of ${product?.name}${product?.name_in_arabic ? " / " + product?.name_in_arabic : ""}`}
                extraClass={props.extraClass}
            >
                {show && <ProductPurchaseHistoryTable ref={tableRef} model={product} selectedVendors={selectedVendors} subFormModalClass={props.extraClass === "order-inner-history-modal" ? "above-inner-history-form" : ""} />}
            </DraggableHistoryModal>
        </>
    );
});

export default ProductPurchaseHistory;
