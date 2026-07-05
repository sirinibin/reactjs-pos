import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import ProductPurchaseReturnHistoryTable from "../product/purchase_return_history.js";
import DraggableHistoryModal from "./DraggableHistoryModal.js";

const ProductPurchaseReturnHistory = forwardRef((props, ref) => {
    let [product, setProduct] = useState({});
    let [selectedVendors, setSelectedVendors] = useState([]);
    const [show, setShow] = useState(false);
    const tableRef = useRef();

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
    }));

    return (
        <DraggableHistoryModal
            show={show}
            onClose={() => setShow(false)}
            title={`Purchase Return History of ${product?.name}${product?.name_in_arabic ? " / " + product?.name_in_arabic : ""}`}
        >
            {show && <ProductPurchaseReturnHistoryTable ref={tableRef} model={product} selectedVendors={selectedVendors} />}
        </DraggableHistoryModal>
    );
});

export default ProductPurchaseReturnHistory;
