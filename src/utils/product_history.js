import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import ProductHistoryTable from "./../product/product_history.js";
import DraggableHistoryModal from "./DraggableHistoryModal.js";

const ProductHistory = forwardRef((props, ref) => {
    let [product, setProduct] = useState({});
    let [selectedCustomers, setSelectedCustomers] = useState([]);
    let [selectedVendors, setSelectedVendors] = useState([]);
    const [show, setShow] = useState(false);
    const tableRef = useRef();

    useImperativeHandle(ref, () => ({
        open(model, selectedCustomersValue, selectedVendorsValue) {
            product = model;
            setProduct(product);
            selectedCustomers = [];
            setSelectedCustomers([]);
            selectedVendors = [];
            setSelectedVendors([]);
            if (selectedCustomersValue?.length > 0) {
                selectedCustomers = selectedCustomersValue;
                setSelectedCustomers([...selectedCustomers]);
            } else if (selectedVendorsValue?.length > 0) {
                selectedVendors = selectedVendorsValue;
                setSelectedVendors(selectedVendorsValue);
            }
            setShow(true);
        },
    }));

    return (
        <DraggableHistoryModal
            show={show}
            onClose={() => setShow(false)}
            title={`History of ${product?.name}${product?.name_in_arabic ? " / " + product?.name_in_arabic : ""}`}
        >
            {show && (
                <ProductHistoryTable
                    ref={tableRef}
                    model={product}
                    selectedCustomers={selectedCustomers}
                    selectedVendors={selectedVendors}
                />
            )}
        </DraggableHistoryModal>
    );
});

export default ProductHistory;
