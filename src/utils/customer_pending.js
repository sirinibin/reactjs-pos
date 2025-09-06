import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Modal } from "react-bootstrap";
import "react-datepicker/dist/react-datepicker.css";
import Draggable from "react-draggable";
import OrderIndex from "../order/index.js";
import SalesReturnIndex from "../sales_return/index.js";
import QuotationIndex from "../quotation/index.js";
import QuotationSalesReturnIndex from "../quotation_sales_return/index.js";
import PurchaseIndex from "../purchase/index.js";
import PurchaseReturnIndex from "../purchase_return/index.js";
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Badge from 'react-bootstrap/Badge';
import { trimTo2Decimals } from "../utils/numberUtils";
import Amount from "../utils/amount.js";
//import { set } from "date-fns";

const CustomerPending = forwardRef((props, ref) => {
    const dragRef = useRef(null);
    let [selectedCustomers, setSelectedCustomers] = useState([]);
    let [selectedVendors, setSelectedVendors] = useState([]);
    let [selectedPaymentStatusList, setSelectedPaymentStatusList] = useState([]);
    let [enableSelection, setEnableSelection] = useState(false);

    let [customer, setCustomer] = useState({});
    let [vendor, setVendor] = useState({});

    useImperativeHandle(ref, () => ({
        open(enableSelectionValue, customerValue) {
            customer = customerValue
            setCustomer(customer);

            enableSelection = enableSelectionValue;
            setEnableSelection(enableSelection);


            selectedCustomers = [
                {
                    id: customer.id,
                    name: customer.name,
                    vat_no: customer.vat_no,
                    search_label: customer.search_label,
                }
            ];

            setSelectedCustomers([...selectedCustomers]);

            if (selectedCustomers?.length > 0) {
                getVendor(selectedCustomers[0].name, selectedCustomers[0].vat_no);
            }


            selectedPaymentStatusList = [
                {
                    id: "not_paid",
                    name: "Not Paid",
                },
                {
                    id: "paid_partially",
                    name: "Paid partially",
                }
            ];
            setSelectedPaymentStatusList([...selectedPaymentStatusList]);

            selectedVendors = [];
            setSelectedVendors([...selectedVendors]);

            SetShow(true);
        },
    }));


    function ObjectToSearchQueryParams(object) {
        return Object.keys(object)
            .map(function (key) {
                return `search[${key}]=${object[key]}`;
            })
            .join("&");
    }

    const [show, SetShow] = useState(false);

    function handleClose() {
        SetShow(false);
    };

    const handleSelected = (selected) => {
        props.onSelectSale(selected); // Send to parent
        handleClose();
    };

    const handleUpdated = () => {
        getCustomer(customer?.id)
        if (customer?.vat_no) {
            getVendor(customer?.name, customer?.vat_no);
        }

        if (props.handleUpdated) {
            props.handleUpdated();
        }
    };

    // props.onSelectSale(selected); // Send to parent
    //     handleClose();

    /*
    let [creditSales, setCreditSales] = useState(0);

    const handleCreditSalesLoaded = (creditValue) => {
        alert("okk" + creditValue);
        setCreditSales(creditValue);
        console.log("Credit value loaded:", creditValue);
    };*/

    async function getVendor(name, vat_no) {
        if (!vat_no || !name) {
            return;
        }
        console.log("inside get Customer");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        await fetch('/v1/vendor/vat_no/name?vat_no=' + vat_no + '&name=' + name + "&" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Customer Response:");
                console.log(data);
                let vendorValue = data.result;
                vendor = vendorValue;
                setVendor(vendor);

                selectedVendors = [
                    {
                        id: vendorValue.id,
                        name: vendorValue.name,
                        search_label: vendorValue.search_label,
                    }
                ];
                setSelectedVendors([...selectedVendors]);


            })
            .catch(error => {

            });
    }

    async function getCustomer(id) {
        console.log("inside get Customer");
        const requestOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('access_token'),
            },
        };

        let searchParams = {};
        if (localStorage.getItem("store_id")) {
            searchParams.store_id = localStorage.getItem("store_id");
        }
        let queryParams = ObjectToSearchQueryParams(searchParams);

        await fetch('/v1/customer/' + id + "?" + queryParams, requestOptions)
            .then(async response => {
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const data = isJson && await response.json();

                // check for error response
                if (!response.ok) {
                    const error = (data && data.errors);
                    return Promise.reject(error);
                }

                console.log("Customer Response:");
                console.log(data);
                let customerData = data.result;
                customer = customerData
                setCustomer(customer);

            })
            .catch(error => {

            });
    }


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
                    <Modal.Title>{enableSelection ? "Select Sale" : "Customer Pendings "}

                        <Badge bg="danger">
                            <Amount amount={trimTo2Decimals(customer.credit_balance)} />
                        </Badge>
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

                        <Tabs
                            defaultActiveKey="sales"
                            id="uncontrolled-tab-example"
                            className="mb-3"
                        >
                            <Tab eventKey="sales" title={
                                <>
                                    Sales <Badge bg={customer?.stores ? customer?.stores[localStorage.getItem("store_id")]?.["sales_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                        <Amount amount={customer?.stores ? trimTo2Decimals(customer?.stores[localStorage.getItem("store_id")]?.["sales_balance_amount"]) : 0} />
                                    </Badge>
                                </>
                            }>
                                <OrderIndex
                                    handleUpdated={handleUpdated}
                                    enableSelection={enableSelection}
                                    onSelectSale={handleSelected}
                                    selectedCustomers={selectedCustomers}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}
                                />
                            </Tab>
                            <Tab eventKey="salesReturn" title={
                                <>
                                    Sales Return <Badge bg={customer?.stores ? customer?.stores[localStorage.getItem("store_id")]?.["sales_return_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                        <Amount amount={customer?.stores ? trimTo2Decimals(customer?.stores[localStorage.getItem("store_id")]?.["sales_return_balance_amount"]) : 0} />
                                    </Badge>
                                </>
                            }>
                                <SalesReturnIndex
                                    handleUpdated={handleUpdated}
                                    enableSelection={enableSelection}
                                    onSelectSale={handleSelected}
                                    selectedCustomers={selectedCustomers}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}
                                />
                            </Tab>
                            <Tab eventKey="quotation_sales" title={
                                <>
                                    Qtn. Sales <Badge bg={customer?.stores ? customer?.stores[localStorage.getItem("store_id")]?.["quotation_invoice_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                        <Amount amount={customer?.stores ? trimTo2Decimals(customer?.stores[localStorage.getItem("store_id")]?.["quotation_invoice_balance_amount"]) : 0} />
                                    </Badge>
                                </>
                            }>
                                <QuotationIndex
                                    handleUpdated={handleUpdated}
                                    enableSelection={enableSelection}
                                    onSelectSale={handleSelected}
                                    type={"invoice"}
                                    selectedCustomers={selectedCustomers}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}

                                />
                            </Tab>
                            <Tab eventKey="quotation_sales_return" title={
                                <>
                                    Qtn. Sales Return <Badge bg={customer?.stores ? customer?.stores[localStorage.getItem("store_id")]?.["quotation_sales_return_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                        <Amount amount={customer?.stores ? trimTo2Decimals(customer?.stores[localStorage.getItem("store_id")]?.["quotation_sales_return_balance_amount"]) : 0} />
                                    </Badge>
                                </>
                            }>
                                <QuotationSalesReturnIndex
                                    handleUpdated={handleUpdated}
                                    enableSelection={enableSelection}
                                    onSelectSale={handleSelected}
                                    type={"invoice"}
                                    selectedCustomers={selectedCustomers}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}

                                />
                            </Tab>
                            <Tab eventKey="purchase" title={
                                <>
                                    Purchases <Badge bg={vendor?.stores ? vendor?.stores[localStorage.getItem("store_id")]?.["purchase_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                        <Amount amount={vendor?.stores ? trimTo2Decimals(vendor?.stores[localStorage.getItem("store_id")]?.["purchase_balance_amount"]) : 0} />
                                    </Badge>
                                </>
                            }

                                disabled={!selectedVendors?.length}>
                                <PurchaseIndex
                                    handleUpdated={handleUpdated}
                                    enableSelection={enableSelection}
                                    selectedVendors={selectedVendors}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}
                                />
                            </Tab>
                            <Tab eventKey="purchase_return"
                                title={
                                    <>
                                        Purchases Returns <Badge bg={vendor?.stores ? vendor?.stores[localStorage.getItem("store_id")]?.["purchase_return_balance_amount"] > 0 ? "danger" : "secondary" : "secondary"}>
                                            <Amount amount={vendor?.stores ? trimTo2Decimals(vendor?.stores[localStorage.getItem("store_id")]?.["purchase_return_balance_amount"]) : 0} />
                                        </Badge>
                                    </>
                                }
                                disabled={!selectedVendors?.length}>
                                <PurchaseReturnIndex
                                    handleUpdated={handleUpdated}
                                    enableSelection={enableSelection}
                                    selectedVendors={selectedVendors}
                                    selectedPaymentStatusList={selectedPaymentStatusList}
                                    pendingView={true}
                                />
                            </Tab>
                        </Tabs>

                    </>
                </Modal.Body>
            </Modal>
        </>);


});

export default CustomerPending;

