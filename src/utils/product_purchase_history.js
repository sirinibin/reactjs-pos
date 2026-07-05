import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import ProductPurchaseHistoryTable from "../product/purchase_history.js";
import DraggableHistoryModal from "./DraggableHistoryModal.js";

const ProductPurchaseHistory = forwardRef((props, ref) => {
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
            title={`Purchase History of ${product?.name}${product?.name_in_arabic ? " / " + product?.name_in_arabic : ""}`}
        >
            {show && <ProductPurchaseHistoryTable ref={tableRef} model={product} selectedVendors={selectedVendors} />}
        </DraggableHistoryModal>
    );
});

export default ProductPurchaseHistory;
