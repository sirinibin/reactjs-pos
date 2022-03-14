import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import PurchaseReturnedPreview from "./preview.js";
import { Modal, Button, Form } from "react-bootstrap";
import StoreCreate from "../store/create.js";
import VendorCreate from "../vendor/create.js";
import ProductCreate from "../product/create.js";
import UserCreate from "../user/create.js";
import SignatureCreate from "../signature/create.js";
import Cookies from "universal-cookie";
import { Typeahead } from "react-bootstrap-typeahead";
import NumberFormat from "react-number-format";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import { Spinner } from "react-bootstrap";
import PurchaseReturnedView from "./view.js";
import ProductView from "../product/view.js";
import PurchaseView from "./../purchase/view.js";


const PurchaseReturnedCreate = forwardRef((props, ref) => {

    useImperativeHandle(ref, () => ({
        open(id) {

            selectedProducts = [];
            setSelectedProducts([]);

            selectedPurchaseReturnedByUsers = [];
            setSelectedPurchaseReturnedByUsers([]);

            selectedPurchaseReturnedBySignatures = [];
            setSelectedPurchaseReturnedBySignatures([]);


            formData = {
                vat_percent: 15.0,
                discount: 0.0,
                discountValue: 0.0,
                discount_percent: 0.0,
                is_discount_percent: false,
                date_str: format(new Date(), "MMM dd yyyy"),
                signature_date_str: format(new Date(), "MMM dd yyyy"),
                status: "purchase_returned",
            };
            if (cookies.get("user_id")) {
                selectedPurchaseReturnedByUsers = [{
                    id: cookies.get("user_id"),
                    name: cookies.get("user_name"),
                }];
                formData.purchase_returned_by = cookies.get("user_id");
                setFormData({ ...formData });
                setSelectedPurchaseReturnedByUsers([...selectedPurchaseReturnedByUsers]);
            }

            setFormData({ ...formData });


            if (id) {
                getPurchase(id);
            }
            setShow(true);
        },

    }));


    useEffect(() => {
        const listener = event => {
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                console.log("Enter key was pressed. Run your function.");
                // event.preventDefault();

                var form = event.target.form;
                if (form && event.target) {
                    var index = Array.prototype.indexOf.call(form, event.target);
                    if (form && form.elements[index + 1]) {
                        form.elements[index + 1].focus();
                        event.preventDefault();
                    }
                }
            }
        };
        document.addEventListener("keydown", listener);
        return () => {
            document.removeEventListener("keydown", listener);
        };
    }, []);

    const selectedDate = new Date();

    //const history = useHistory();
    let [errors, setErrors] = useState({});
    const [isProcessing, setProcessing] = useState(false);
    const cookies = new Cookies();

    //fields
    let [formData, setFormData] = useState({
        vat_percent: 10.0,
        discount: 0.0,
        discountValue: 0.0,
        discount_percent: 0.0,
        is_discount_percent: false,
        date_str: format(new Date(), "MMM dd yyyy"),
        signature_date_str: format(new Date(), "MMM dd yyyy"),
        status: "purchase_returned",
    });


    let [selectedProducts, setSelectedProducts] = useState([]);

    //Purchase Returned By Auto Suggestion
    const [purchaseReturnedByUserOptions, setPurchaseReturnedByUserOptions] = useState([]);
    let [selectedPurchaseReturnedByUsers, setSelectedPurchaseReturnedByUsers] = useState([]);
    const [isPurchaseReturnedByUsersLoading, setIsPurchaseReturnedByUsersLoading] = useState(false);

    //Purchase Returned By Signature Auto Suggestion
    const [purchaseReturnedBySignatureOptions, setPurchaseReturnedBySignatureOptions] =
        useState([]);
    let [selectedPurchaseReturnedBySignatures, setSelectedPurchaseReturnedBySignatures] =
        useState([]);
    const [isPurchaseReturnedBySignaturesLoading, setIsPurchaseReturnedBySignaturesLoading] =
        useState(false);

    const [show, setShow] = useState(false);

    function handleClose() {
        setShow(false);
    }

    useEffect(() => {
        let at = cookies.get("access_token");
        if (!at) {
            // history.push("/dashboard/purchasereturneds");
            window.location = "/";
        }
    });


    function getPurchase(id) {
        console.log("inside get PurchaseReturned");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': cookies.get('access_token'),
            },
        };

        fetch('/v1/purchase/' + id, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                setErrors({});

                console.log("Response:");
                console.log(data);

                let purchase = data.result;
                formData = {
                    date_str: format(new Date(), "MMM dd yyyy"),
                    signature_date_str: format(new Date(), "MMM dd yyyy"),
                    purchase_id: purchase.id,
                    purchase_code: purchase.code,
                    vendor_invoice_no: purchase.vendor_invoice_no,
                    store_id: purchase.store_id,
                    vendor_id: purchase.vendor_id,
                    vat_percent: purchase.vat_percent,
                    status: purchase.status,
                    purchase_returned_by: purchase.order_placed_by,
                    purchase_returned_by_signature_id: purchase.order_placed_by_signature_id,
                    is_discount_percent: purchase.is_discount_percent,
                    discount_percent: purchase.discount_percent,
                };

                formData.discount = (purchase.discount - purchase.return_discount);

                if (formData.is_discount_percent) {
                    formData.discountValue = formData.discount_percent;
                } else {
                    formData.discountValue = formData.discount;
                }

                formData.status = "purchase_returned";

                setFormData({ ...formData });
                console.log("formData1.status:", formData.status);


                let selectedProductsTemp = purchase.products;

                selectedProducts = [];
                for (let i = 0; i < selectedProductsTemp.length; i++) {
                    selectedProductsTemp[i].selected = false;
                    let purchasedQty = selectedProductsTemp[i].quantity - selectedProductsTemp[i].quantity_returned;
                    selectedProductsTemp[i].quantity = purchasedQty;

                    if (purchasedQty > 0) {
                        selectedProducts.push(selectedProductsTemp[i]);
                    }
                }


                setSelectedProducts([...selectedProducts]);

                setFormData({ ...formData });
                reCalculate();
                setFormData({ ...formData });


            })
            .catch(error => {
                setProcessing(false);
                setErrors(error);
            });
    }

    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    async function suggestUsers(searchTerm) {
        console.log("Inside handle suggestUsers");
        setPurchaseReturnedByUserOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return;
        }

        var params = {
            name: searchTerm,
        };
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };

        let Select = "select=id,name";
        setIsPurchaseReturnedByUsersLoading(true);
        let result = await fetch(
            "/v1/user?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setPurchaseReturnedByUserOptions(data.result);
        setIsPurchaseReturnedByUsersLoading(false);
    }

    async function suggestSignatures(searchTerm) {
        console.log("Inside handle suggestSignatures");
        setPurchaseReturnedBySignatureOptions([]);

        console.log("searchTerm:" + searchTerm);
        if (!searchTerm) {
            return;
        }

        var params = {
            name: searchTerm,
        };
        var queryString = ObjectToSearchQueryParams(params);
        if (queryString !== "") {
            queryString = "&" + queryString;
        }

        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
        };

        let Select = "select=id,name";
        setIsPurchaseReturnedBySignaturesLoading(true);
        let result = await fetch(
            "/v1/signature?" + Select + queryString,
            requestOptions
        );
        let data = await result.json();

        setPurchaseReturnedBySignatureOptions(data.result);
        setIsPurchaseReturnedBySignaturesLoading(false);
    }

    function handleCreate(event) {
        console.log("formData.status:" + formData.status);
        event.preventDefault();
        console.log("Inside handle Create");
        console.log("selectedProducts:", selectedProducts);

        formData.products = [];
        for (var i = 0; i < selectedProducts.length; i++) {
            if (!selectedProducts[i].selected) {
                continue
            }

            formData.products.push({
                product_id: selectedProducts[i].product_id,
                quantity: parseFloat(selectedProducts[i].quantity),
                unit: selectedProducts[i].unit,
                purchasereturn_unit_price: parseFloat(selectedProducts[i].purchase_unit_price),
            });
        }

        formData.discount = parseFloat(formData.discount);
        formData.discount_percent = parseFloat(formData.discount_percent);

        formData.vat_percent = parseFloat(formData.vat_percent);
        console.log("formData.discount:", formData.discount);

        let endPoint = "/v1/purchase-return";
        let method = "POST";
        if (formData.id) {
            endPoint = "/v1/purchase-return/" + formData.id;
            method = "PUT";
        }


        const requestOptions = {
            method: method,
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/json",
                Authorization: cookies.get("access_token"),
            },
            body: JSON.stringify(formData),
        };

        setProcessing(true);
        fetch(endPoint, requestOptions)
            .then(async (response) => {
                const isJson = response.headers
                    .get("content-type")
                    ?.includes("application/json");
                const data = isJson && (await response.json());

                // check for error response
                if (!response.ok) {
                    // get error message from body or default to response status
                    const error = data && data.errors;
                    //const error = data.errors
                    return Promise.reject(error);
                }

                setErrors({});
                setProcessing(false);

                console.log("Response:");
                console.log(data);
                props.showToastMessage("Purchase Return Created Successfully!", "success");
                if (props.refreshList) {
                    props.refreshList();
                }
                handleClose();
                openDetailsView(data.result.id);
            })
            .catch((error) => {
                setProcessing(false);
                console.log("Inside catch");
                console.log(error);
                setErrors({ ...error });
                console.error("There was an error!", error);
                props.showToastMessage("Error Creating PurchaseReturned!", "danger");
            });
    }


    let [totalPrice, setTotalPrice] = useState(0.0);

    function findTotalPrice() {
        totalPrice = 0.00;
        for (var i = 0; i < selectedProducts.length; i++) {
            if (!selectedProducts[i].selected) {
                continue;
            }
            totalPrice +=
                parseFloat(selectedProducts[i].purchase_unit_price) *
                parseFloat(selectedProducts[i].quantity);
        }
        totalPrice = totalPrice.toFixed(2);
        setTotalPrice(totalPrice);
    }

    let [vatPrice, setVatPrice] = useState(0.00);

    function findVatPrice() {
        if (totalPrice > 0) {
            vatPrice = ((parseFloat(formData.vat_percent) / 100) * parseFloat(totalPrice)).toFixed(2);;
            console.log("vatPrice:", vatPrice);
            setVatPrice(vatPrice);
        }

    }


    let [netTotal, setNetTotal] = useState(0.00);

    function findNetTotal() {
        if (totalPrice > 0) {
            netTotal = (parseFloat(totalPrice) + parseFloat(vatPrice) - parseFloat(formData.discount)).toFixed(2);
            setNetTotal(netTotal);
        }

    }

    let [discountPercent, setDiscountPercent] = useState(0.00);

    function findDiscountPercent() {
        if (!formData.discountValue) {
            formData.discount = 0.00;
            formData.discount_percent = 0.00;
            setFormData({ ...formData });
            return;
        }

        formData.discount = formData.discountValue;

        if (formData.discount > 0 && totalPrice > 0) {
            discountPercent = parseFloat(parseFloat(formData.discount / totalPrice) * 100).toFixed(2);
            setDiscountPercent(discountPercent);
            formData.discount_percent = discountPercent;
            setFormData({ ...formData });
        }

    }

    function findDiscount() {
        if (!formData.discountValue) {
            formData.discount = 0.00;
            formData.discount_percent = 0.00;
            setFormData({ ...formData });
            return;
        }

        formData.discount_percent = formData.discountValue;

        if (formData.discount_percent > 0 && totalPrice > 0) {
            formData.discount = parseFloat(totalPrice * parseFloat(formData.discount_percent / 100)).toFixed(2);
        }
        setFormData({ ...formData });
    }


    function reCalculate() {
        findTotalPrice();
        findVatPrice();
        if (formData.is_discount_percent) {
            findDiscount();
        } else {
            findDiscountPercent();
        }
        findNetTotal();
    }

    const DetailsViewRef = useRef();
    function openDetailsView(id) {
        DetailsViewRef.current.open(id);
    }

    const StoreCreateFormRef = useRef();

    const ProductCreateFormRef = useRef();
    function openProductCreateForm() {
        ProductCreateFormRef.current.open();
    }

    function openProductUpdateForm(id) {
        ProductCreateFormRef.current.open(id);
    }

    const VendorCreateFormRef = useRef();

    const UserCreateFormRef = useRef();
    function openUserCreateForm() {
        UserCreateFormRef.current.open();
    }


    const SignatureCreateFormRef = useRef();
    function openSignatureCreateForm() {
        SignatureCreateFormRef.current.open();
    }

    const ProductDetailsViewRef = useRef();
    function openProductDetailsView(id) {
        ProductDetailsViewRef.current.open(id);
    }

    const PurchaseDetailsViewRef = useRef();
    function openPurchaseDetailsView(id) {
        PurchaseDetailsViewRef.current.open(id);
    }


    return (
        <>
            <ProductView ref={ProductDetailsViewRef} openUpdateForm={openProductUpdateForm} openCreateForm={openProductCreateForm} />
            <ProductCreate ref={ProductCreateFormRef} showToastMessage={props.showToastMessage} openDetailsView={openProductDetailsView} />



            <PurchaseReturnedView ref={DetailsViewRef} />
            <StoreCreate ref={StoreCreateFormRef} showToastMessage={props.showToastMessage} />
            <UserCreate ref={UserCreateFormRef} showToastMessage={props.showToastMessage} />
            <SignatureCreate ref={SignatureCreateFormRef} showToastMessage={props.showToastMessage} />
            <VendorCreate ref={VendorCreateFormRef} showToastMessage={props.showToastMessage} />
            <PurchaseView ref={PurchaseDetailsViewRef} />
            <Modal show={show} size="xl" onHide={handleClose} animation={false} backdrop="static" scrollable={true}>
                <Modal.Header>
                    <Modal.Title>
                        {formData.purchase_code ? "Create Purchase Return for Purchase " : ""}
                        <span style={{
                            textDecoration: "underline",
                            color: "blue",
                            cursor: "pointer",
                        }}
                            onClick={() => {
                                openPurchaseDetailsView(formData.purchase_id);
                            }}> {formData.purchase_code ? "#" + formData.purchase_code : ""} </span>
                    </Modal.Title>

                    <div className="col align-self-end text-end">
                        <PurchaseReturnedPreview />
                        <Button variant="primary" className="mb-3" onClick={handleCreate} >
                            {isProcessing ?
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden={true}
                                /> + " Creating..."

                                : ""
                            }
                            {formData.id ? "Update" : "Create"}

                        </Button>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={handleClose}
                            aria-label="Close"
                        ></button>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    {selectedProducts.length === 0 && "Already Returned All purchased products"}

                    {selectedProducts.length > 0 && <form className="row g-3 needs-validation" onSubmit={handleCreate}>

                        <h2>Select Products</h2>
                        {errors["product_id"] && (
                            <div style={{ color: "red" }}>
                                <i className="bi bi-x-lg"> </i>
                                {errors["product_id"]}
                            </div>
                        )}
                        <div className="table-responsive" style={{ overflowX: "auto" }}>
                            <table className="table table-striped table-sm table-bordered">
                                <thead>
                                    <tr className="text-center">
                                        <th>Select</th>
                                        <th>SI No.</th>
                                        <th>Part No.</th>
                                        <th>Name</th>
                                        <th>Qty</th>
                                        <th>Purchase Return Unit Price</th>
                                        <th>Purchase Return Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProducts.map((product, index) => (
                                        <tr className="text-center">
                                            <td>
                                                <input type="checkbox" checked={selectedProducts[index].selected} onChange={(e) => {
                                                    console.log("e.target.value:", e.target.value)
                                                    selectedProducts[index].selected = !selectedProducts[index].selected;
                                                    setSelectedProducts([...selectedProducts]);
                                                    reCalculate();
                                                }} />
                                            </td>
                                            <td>{index + 1}</td>
                                            <td>{product.part_number}</td>
                                            <td style={{
                                                textDecoration: "underline",
                                                color: "blue",
                                                cursor: "pointer",
                                            }}
                                                onClick={() => {
                                                    openProductDetailsView(product.product_id);
                                                }}>{product.name}
                                            </td>
                                            <td style={{ width: "125px" }}>

                                                <input type="number" value={product.quantity} className="form-control"

                                                    placeholder="Quantity" onChange={(e) => {
                                                        errors["quantity_" + index] = "";
                                                        setErrors({ ...errors });
                                                        if (!e.target.value) {
                                                            errors["quantity_" + index] = "Invalid Quantity";
                                                            selectedProducts[index].quantity = e.target.value;
                                                            setSelectedProducts([...selectedProducts]);
                                                            setErrors({ ...errors });
                                                            console.log("errors:", errors);
                                                            return;
                                                        }

                                                        if (e.target.value === 0) {
                                                            errors["quantity_" + index] = "Quantity should be >0";
                                                            selectedProducts[index].quantity = parseFloat(e.target.value);
                                                            setSelectedProducts([...selectedProducts]);
                                                            setErrors({ ...errors });
                                                            console.log("errors:", errors);
                                                            return;
                                                        }

                                                        product.quantity = parseFloat(e.target.value);
                                                        reCalculate();

                                                        selectedProducts[index].quantity = parseFloat(e.target.value);
                                                        console.log("selectedProducts[index].quantity:", selectedProducts[index].quantity);
                                                        setSelectedProducts([...selectedProducts]);
                                                        reCalculate();

                                                    }} /> {selectedProducts[index].unit ? selectedProducts[index].unit : "Units"}
                                                {errors["quantity_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["quantity_" + index]}
                                                    </div>
                                                )}
                                                {((selectedProducts[index].quantity) && !errors["quantity_" + index]) ? (
                                                    <div style={{ color: "green" }}>
                                                        <i className="bi bi-check-lg"> </i>
                                                        Looks good!
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td style={{ width: "150px" }}>

                                                <input type="number" value={product.purchase_unit_price} className="form-control"

                                                    placeholder="Purchase Return Unit Price" onChange={(e) => {
                                                        errors["purchasereturned_unit_price_" + index] = "";
                                                        setErrors({ ...errors });

                                                        if (!e.target.value) {
                                                            errors["purchasereturned_unit_price_" + index] = "Invalid Purchase Return Unit Price";
                                                            selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                            setSelectedProducts([...selectedProducts]);
                                                            setErrors({ ...errors });
                                                            return;
                                                        }

                                                        if (e.target.value === 0) {
                                                            errors["purchasereturned_unit_price_" + index] = "Purchase Return Unit Price should be >0";
                                                            selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                            setSelectedProducts([...selectedProducts]);
                                                            setErrors({ ...errors });
                                                            return;
                                                        }

                                                        selectedProducts[index].purchase_unit_price = parseFloat(e.target.value);
                                                        console.log("selectedProducts[index].purchase_unit_price:", selectedProducts[index].purchase_unit_price);
                                                        setSelectedProducts([...selectedProducts]);
                                                        reCalculate();

                                                    }} /> SAR
                                                {errors["purchasereturned_unit_price_" + index] && (
                                                    <div style={{ color: "red" }}>
                                                        <i className="bi bi-x-lg"> </i>
                                                        {errors["purchasereturned_unit_price_" + index]}
                                                    </div>
                                                )}
                                                {(selectedProducts[index].purchasereturned_unit_price && !errors["purchasereturned_unit_price_" + index]) ? (
                                                    <div style={{ color: "green" }}>
                                                        <i className="bi bi-check-lg"> </i>
                                                        Looks good!
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td>
                                                <NumberFormat
                                                    value={(product.purchase_unit_price * product.quantity).toFixed(2)}
                                                    displayType={"text"}
                                                    thousandSeparator={true}
                                                    suffix={" SAR"}
                                                    renderText={(value, props) => value}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan="5"></td>
                                        <th className="text-end">Total</th>
                                        <td className="text-center">
                                            <NumberFormat
                                                value={totalPrice}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="5" className="text-end">
                                            VAT
                                        </th>
                                        <td className="text-center">{formData.vat_percent + "%"}</td>
                                        <td className="text-center">
                                            <NumberFormat
                                                value={vatPrice}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <th colSpan="6" className="text-end">
                                            Discount(  {formData.discount_percent + "%"})
                                        </th>
                                        <td className="text-center">
                                            <NumberFormat
                                                value={formData.discount}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan="5"></td>
                                        <th className="text-end">Net Total</th>
                                        <th className="text-center">
                                            <NumberFormat
                                                value={netTotal}
                                                displayType={"text"}
                                                thousandSeparator={true}
                                                suffix={" SAR"}
                                                renderText={(value, props) => value}
                                            />
                                        </th>
                                    </tr>
                                </tbody>
                            </table>
                        </div>


                        <div className="col-md-6">
                            <label className="form-label">Date*</label>

                            <div className="input-group mb-3">
                                <DatePicker
                                    id="date_str"
                                    value={formData.date_str}
                                    selected={selectedDate}
                                    className="form-control"
                                    dateFormat="MMM dd yyyy"
                                    onChange={(value) => {
                                        formData.date_str = format(new Date(value), "MMM dd yyyy");
                                        setFormData({ ...formData });
                                    }}
                                />

                                {errors.date_str && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.date_str}
                                    </div>
                                )}
                                {formData.date_str && !errors.date_str && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">VAT %*</label>

                            <div className="input-group mb-3">
                                <input
                                    value={formData.vat_percent}
                                    type='number'
                                    onChange={(e) => {
                                        console.log("Inside onchange vat percent");
                                        if (isNaN(e.target.value)) {
                                            errors["vat_percent"] = "Invalid Quantity";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["vat_percent"] = "";
                                        setErrors({ ...errors });

                                        formData.vat_percent = e.target.value;
                                        setFormData({ ...formData });
                                        reCalculate();
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                    id="validationCustom01"
                                    placeholder="VAT %"
                                    aria-label="Select Store"
                                    aria-describedby="button-addon1"
                                />
                                {errors.vat_percent && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.vat_percent}
                                    </div>
                                )}
                                {formData.vat_percent && !errors.vat_percent && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Discount*</label>
                            <Form.Check
                                type="switch"
                                id="custom-switch"
                                label="%"
                                value={formData.is_discount_percent}
                                checked={formData.is_discount_percent ? "checked" : null}
                                onChange={(e) => {
                                    formData.is_discount_percent = !formData.is_discount_percent;
                                    console.log("e.target.value:", formData.is_discount_percent);
                                    setFormData({ ...formData });
                                    reCalculate();
                                }}
                            />
                            <div className="input-group mb-3">
                                <input
                                    value={formData.discountValue}
                                    type='number'
                                    onChange={(e) => {
                                        if (e.target.value === 0) {
                                            formData.discountValue = e.target.value;
                                            reCalculate();
                                            setFormData({ ...formData });
                                            errors["discount"] = "";
                                            setErrors({ ...errors });

                                            return;
                                        }

                                        if (!e.target.value) {
                                            console.log("inside invalid");
                                            formData.discountValue = "";
                                            errors["discount"] = "Invalid Discount";
                                            setFormData({ ...formData });
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["discount"] = "";
                                        setErrors({ ...errors });

                                        console.log("e.target.value:", e.target.value);
                                        formData.discountValue = e.target.value;

                                        reCalculate();
                                        setFormData({ ...formData });
                                    }}
                                    className="form-control"
                                    id="validationCustom02"
                                    placeholder="Discount"
                                    aria-label="Select Customer"
                                    aria-describedby="button-addon2"
                                />
                                {errors.discount && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.discount}
                                    </div>
                                )}
                                {!errors.discount && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>

                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Status*</label>

                            <div className="input-group mb-3">
                                <select
                                    onChange={(e) => {
                                        console.log("Inside onchange status");
                                        if (!e.target.value) {
                                            errors["status"] = "Invalid Status";
                                            setErrors({ ...errors });
                                            return;
                                        }

                                        errors["status"] = "";
                                        setErrors({ ...errors });

                                        formData.status = e.target.value;
                                        setFormData({ ...formData });
                                        console.log(formData);
                                    }}
                                    className="form-control"
                                >
                                    <option value="purchase_returned">Purchase Returned</option>
                                    <option value="pending">Pending</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="dispatched">Dispatched</option>
                                </select>
                                {errors.status && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.status}
                                    </div>
                                )}
                                {formData.status && !errors.status && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">Purchase Returned By*</label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="purchase_returned_by"
                                    labelKey="name"
                                    isLoading={isPurchaseReturnedByUsersLoading}
                                    isInvalid={errors.purchase_returned_by ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.purchase_returned_by = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.purchase_returned_by = "Invalid User Selected";
                                            setErrors(errors);
                                            setFormData({ ...formData });
                                            setSelectedPurchaseReturnedByUsers([]);
                                            return;
                                        }
                                        formData.purchase_returned_by = selectedItems[0].id;
                                        setFormData({ ...formData });
                                        setSelectedPurchaseReturnedByUsers(selectedItems);
                                    }}
                                    options={purchaseReturnedByUserOptions}
                                    placeholder="Select User"
                                    selected={selectedPurchaseReturnedByUsers}
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestUsers(searchTerm);
                                    }}
                                />
                                <Button hide={true.toString()} onClick={openUserCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.purchase_returned_by ? (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i> {errors.purchase_returned_by}
                                    </div>
                                ) : null}
                                {formData.purchase_returned_by && !errors.purchase_returned_by && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>Looks good!
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">
                                Purchase Returned By Signature(Optional)
                            </label>

                            <div className="input-group mb-3">
                                <Typeahead
                                    id="purchase_returned_by_signature_id"
                                    labelKey="name"
                                    isLoading={isPurchaseReturnedBySignaturesLoading}
                                    isInvalid={errors.purchase_returned_by_signature_id ? true : false}
                                    onChange={(selectedItems) => {
                                        errors.purchase_returned_by_signature_id = "";
                                        setErrors(errors);
                                        if (selectedItems.length === 0) {
                                            errors.purchase_returned_by_signature_id =
                                                "Invalid Signature Selected";
                                            setErrors(errors);
                                            setFormData({ ...formData });
                                            setSelectedPurchaseReturnedBySignatures([]);
                                            return;
                                        }
                                        formData.purchase_returned_by_signature_id = selectedItems[0].id;
                                        setFormData({ ...formData });
                                        setSelectedPurchaseReturnedBySignatures(selectedItems);
                                    }}
                                    options={purchaseReturnedBySignatureOptions}
                                    placeholder="Select Signature"
                                    selected={selectedPurchaseReturnedBySignatures}
                                    highlightOnlyResult={true}
                                    onInputChange={(searchTerm, e) => {
                                        suggestSignatures(searchTerm);
                                    }}
                                />

                                <Button hide={true.toString()} onClick={openSignatureCreateForm} className="btn btn-outline-secondary btn-primary btn-sm" type="button" id="button-addon1"> <i className="bi bi-plus-lg"></i> New</Button>
                                {errors.purchase_returned_by_signature_id ? (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>{" "}
                                        {errors.purchase_returned_by_signature_id}
                                    </div>
                                ) : null}
                                {formData.purchase_returned_by_signature_id &&
                                    !errors.purchase_returned_by_signature_id && (
                                        <div style={{ color: "green" }}>
                                            <i className="bi bi-check-lg"> </i> Looks good!
                                        </div>
                                    )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Signature Date(Optional)</label>

                            <div className="input-group mb-3">
                                <DatePicker
                                    id="signature_date_str"
                                    value={formData.signature_date_str}
                                    selected={selectedDate}
                                    className="form-control"
                                    dateFormat="MMM dd yyyy"
                                    onChange={(value) => {
                                        formData.signature_date_str = format(new Date(value), "MMM dd yyyy");
                                        setFormData({ ...formData });
                                    }}
                                />

                                {errors.signature_date_str && (
                                    <div style={{ color: "red" }}>
                                        <i className="bi bi-x-lg"> </i>
                                        {errors.signature_date_str}
                                    </div>
                                )}
                                {formData.signature_date_str && !errors.signature_date_str && (
                                    <div style={{ color: "green" }}>
                                        <i className="bi bi-check-lg"> </i>
                                        Looks good!
                                    </div>
                                )}
                            </div>
                        </div>


                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                            <Button variant="primary" onClick={handleCreate} >
                                {isProcessing ?
                                    <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden={true}
                                    /> + " Creating..."

                                    : formData.id ? "Update" : "Create"
                                }
                            </Button>
                        </Modal.Footer>
                    </form>}
                </Modal.Body>

            </Modal>


        </>
    );
});

export default PurchaseReturnedCreate;
